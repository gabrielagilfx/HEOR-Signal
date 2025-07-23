import asyncio
import json
import httpx
import feedparser
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from enum import Enum
from sqlalchemy.orm import Session

from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_community.tools import DuckDuckGoSearchRun
from pydantic import BaseModel

from config import settings
from database import get_db, User


class AgentCategory(Enum):
    REGULATORY = "regulatory"
    CLINICAL = "clinical" 
    MARKET_ACCESS = "market"
    RWE_PUBLIC_HEALTH = "rwe"


@dataclass
class UserPreferences:
    expertise_areas: List[str]
    therapeutic_areas: List[str]
    regions: List[str]
    keywords: List[str]
    news_recency_days: int = 7


@dataclass 
class NewsItem:
    id: str
    title: str
    snippet: str
    source: str
    date: str
    category: str
    url: str
    relevance_score: float
    is_new: bool = True


class AgentState(BaseModel):
    user_preferences: UserPreferences
    category: AgentCategory
    news_items: List[NewsItem] = []
    search_queries: List[str] = []
    processing_status: str = "pending"
    error_message: Optional[str] = None


class LangGraphNewsAgents:
    def __init__(self):
        self.llm = ChatOpenAI(
            model="gpt-4o-mini",
            temperature=0.3,
            openai_api_key=settings.openai_api_key
        )
        self.http_client = httpx.AsyncClient(timeout=30.0)
        
        # Initialize the four agent workflows
        self.agents = {
            AgentCategory.REGULATORY: self._create_regulatory_agent(),
            AgentCategory.CLINICAL: self._create_clinical_agent(),
            AgentCategory.MARKET_ACCESS: self._create_market_access_agent(),
            AgentCategory.RWE_PUBLIC_HEALTH: self._create_rwe_agent()
        }

    def _get_user_preferences_from_db(self, session_id: str, db: Session) -> UserPreferences:
        """Fetch user preferences from database and convert to UserPreferences object"""
        user = db.query(User).filter(User.session_id == session_id).first()
        
        if not user:
            # Return default preferences if user not found
            return UserPreferences(
                expertise_areas=["health economics", "market access"],
                therapeutic_areas=["oncology", "cardiology"],
                regions=["US", "EU"],
                keywords=["FDA approval", "clinical trial"],
                news_recency_days=7
            )
        
        # Parse user preferences from database fields
        expertise_areas = []
        therapeutic_areas = []
        regions = ["US"]  # Default region
        keywords = []
        
        # Extract expertise from preference_expertise field
        if user.preference_expertise:
            expertise_areas = [user.preference_expertise.lower()]
            
            # Map expertise to therapeutic areas and keywords
            expertise_mapping = {
                "oncology": {
                    "therapeutic_areas": ["oncology", "cancer", "hematology"],
                    "keywords": ["cancer treatment", "oncology drugs", "tumor", "chemotherapy"]
                },
                "cardiology": {
                    "therapeutic_areas": ["cardiology", "cardiovascular"],
                    "keywords": ["heart disease", "cardiovascular", "cardiac"]
                },
                "neurology": {
                    "therapeutic_areas": ["neurology", "neurological"],
                    "keywords": ["neurological disorders", "brain", "alzheimer"]
                },
                "diabetes": {
                    "therapeutic_areas": ["endocrinology", "diabetes"],
                    "keywords": ["diabetes", "insulin", "glucose"]
                },
                "health economics": {
                    "therapeutic_areas": ["general medicine"],
                    "keywords": ["cost effectiveness", "health economics", "HEOR"]
                },
                "market access": {
                    "therapeutic_areas": ["general medicine"],
                    "keywords": ["market access", "reimbursement", "payer"]
                }
            }
            
            # Get mapped areas based on expertise
            for key, mapping in expertise_mapping.items():
                if key in user.preference_expertise.lower():
                    therapeutic_areas.extend(mapping["therapeutic_areas"])
                    keywords.extend(mapping["keywords"])
        
        # Use selected categories to enhance preferences
        if user.selected_categories:
            for category in user.selected_categories:
                if category == "clinical":
                    keywords.extend(["clinical trial", "Phase III", "drug development"])
                elif category == "regulatory":
                    keywords.extend(["FDA approval", "regulatory", "compliance"])
                elif category == "market":
                    keywords.extend(["market access", "payer coverage", "reimbursement"])
                elif category == "rwe":
                    keywords.extend(["real world evidence", "population health"])
        
        # Remove duplicates and set defaults if empty
        expertise_areas = list(set(expertise_areas)) or ["health economics"]
        therapeutic_areas = list(set(therapeutic_areas)) or ["general medicine"]
        keywords = list(set(keywords)) or ["healthcare", "medical"]
        
        return UserPreferences(
            expertise_areas=expertise_areas,
            therapeutic_areas=therapeutic_areas,
            regions=regions,
            keywords=keywords,
            news_recency_days=7
        )

    async def run_parallel_agents_for_user(self, session_id: str, db: Session) -> Dict[str, List[NewsItem]]:
        """Run all four agents in parallel using user preferences from database"""
        # Get user preferences from database
        user_preferences = self._get_user_preferences_from_db(session_id, db)
        
        # Run agents with fetched preferences
        return await self.run_parallel_agents(user_preferences)

    def _create_regulatory_agent(self) -> StateGraph:
        """Create agent for regulatory alerts and compliance news"""
        workflow = StateGraph(AgentState)
        
        workflow.add_node("generate_queries", self._generate_regulatory_queries)
        workflow.add_node("search_news", self._search_regulatory_news)
        workflow.add_node("filter_relevance", self._filter_regulatory_relevance)
        workflow.add_node("finalize", self._finalize_results)
        
        workflow.set_entry_point("generate_queries")
        workflow.add_edge("generate_queries", "search_news")
        workflow.add_edge("search_news", "filter_relevance")
        workflow.add_edge("filter_relevance", "finalize")
        workflow.add_edge("finalize", END)
        
        return workflow.compile()

    def _create_clinical_agent(self) -> StateGraph:
        """Create agent for clinical trial updates"""
        workflow = StateGraph(AgentState)
        
        workflow.add_node("generate_queries", self._generate_clinical_queries)
        workflow.add_node("search_nih", self._search_nih_clinical)
        workflow.add_node("search_general", self._search_clinical_news)
        workflow.add_node("merge_results", self._merge_clinical_results)
        workflow.add_node("filter_relevance", self._filter_clinical_relevance)
        workflow.add_node("finalize", self._finalize_results)
        
        workflow.set_entry_point("generate_queries")
        workflow.add_edge("generate_queries", "search_nih")
        workflow.add_edge("generate_queries", "search_general")
        workflow.add_edge("search_nih", "merge_results")
        workflow.add_edge("search_general", "merge_results")
        workflow.add_edge("merge_results", "filter_relevance")
        workflow.add_edge("filter_relevance", "finalize")
        workflow.add_edge("finalize", END)
        
        return workflow.compile()

    def _create_market_access_agent(self) -> StateGraph:
        """Create agent for market access and payer news"""
        workflow = StateGraph(AgentState)
        
        workflow.add_node("generate_queries", self._generate_market_queries)
        workflow.add_node("search_news", self._search_market_news)
        workflow.add_node("filter_relevance", self._filter_market_relevance)
        workflow.add_node("finalize", self._finalize_results)
        
        workflow.set_entry_point("generate_queries")
        workflow.add_edge("generate_queries", "search_news")
        workflow.add_edge("search_news", "filter_relevance")
        workflow.add_edge("filter_relevance", "finalize")
        workflow.add_edge("finalize", END)
        
        return workflow.compile()

    def _create_rwe_agent(self) -> StateGraph:
        """Create agent for real-world evidence and public health news"""
        workflow = StateGraph(AgentState)
        
        workflow.add_node("generate_queries", self._generate_rwe_queries)
        workflow.add_node("search_news", self._search_rwe_news)
        workflow.add_node("filter_relevance", self._filter_rwe_relevance)
        workflow.add_node("finalize", self._finalize_results)
        
        workflow.set_entry_point("generate_queries")
        workflow.add_edge("generate_queries", "search_news")
        workflow.add_edge("search_news", "filter_relevance")
        workflow.add_edge("filter_relevance", "finalize")
        workflow.add_edge("finalize", END)
        
        return workflow.compile()

    async def run_parallel_agents(self, user_preferences: UserPreferences) -> Dict[str, List[NewsItem]]:
        """Run all four agents in parallel and return aggregated results"""
        tasks = []
        
        for category, agent in self.agents.items():
            state = AgentState(
                user_preferences=user_preferences,
                category=category
            )
            tasks.append(self._run_single_agent(agent, state))
        
        # Run all agents in parallel
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Process results
        final_results = {}
        for i, (category, result) in enumerate(zip(self.agents.keys(), results)):
            if isinstance(result, Exception):
                print(f"Error in {category.value} agent: {result}")
                final_results[category.value] = []
            else:
                final_results[category.value] = result.news_items
        
        return final_results

    async def _run_single_agent(self, agent: StateGraph, initial_state: AgentState) -> AgentState:
        """Run a single agent workflow"""
        try:
            result = await agent.ainvoke(initial_state.dict())
            return AgentState(**result)
        except Exception as e:
            print(f"Agent error: {e}")
            initial_state.processing_status = "error"
            initial_state.error_message = str(e)
            return initial_state

    # Query Generation Methods
    async def _generate_regulatory_queries(self, state: AgentState) -> AgentState:
        """Generate highly targeted search queries for regulatory news"""
        prompt = f"""
        You are a HEOR research specialist. Generate 4-6 HIGHLY SPECIFIC search queries for regulatory news.
        
        USER PROFILE:
        - Expertise: {', '.join(state.user_preferences.expertise_areas)}
        - Therapeutic Focus: {', '.join(state.user_preferences.therapeutic_areas)}
        - Key Interests: {', '.join(state.user_preferences.keywords)}
        
        REQUIREMENTS:
        - Combine therapeutic areas with regulatory terms
        - Include specific drug classes if relevant to expertise
        - Focus on actionable regulatory changes
        - Include cost/reimbursement regulatory aspects
        
        EXAMPLES OF GOOD QUERIES:
        - "FDA approval [therapeutic area] cost effectiveness"
        - "[expertise] regulatory guidance reimbursement"
        - "EMA decision [therapeutic area] market access"
        
        Return as JSON array of 4-6 specific query strings.
        """
        
        response = await self.llm.ainvoke([SystemMessage(content=prompt)])
        try:
            queries = json.loads(response.content)
            state.search_queries = queries if isinstance(queries, list) else [response.content]
        except:
            # Enhanced fallback queries with personalization
            personalized_queries = []
            for area in state.user_preferences.therapeutic_areas:
                personalized_queries.extend([
                    f"FDA approval {area} cost effectiveness",
                    f"regulatory guidance {area} reimbursement",
                    f"EMA decision {area} market access"
                ])
            
            # Add expertise-specific queries
            for expertise in state.user_preferences.expertise_areas:
                personalized_queries.append(f"{expertise} regulatory policy update")
            
            state.search_queries = personalized_queries[:6]
        
        return state

    async def _generate_clinical_queries(self, state: AgentState) -> AgentState:
        """Generate highly targeted search queries for clinical trial news"""
        prompt = f"""
        You are a clinical research expert. Generate 5-7 HIGHLY TARGETED search queries for clinical trial news.
        
        USER PROFILE:
        - Expertise: {', '.join(state.user_preferences.expertise_areas)}
        - Therapeutic Focus: {', '.join(state.user_preferences.therapeutic_areas)}
        - Key Interests: {', '.join(state.user_preferences.keywords)}
        
        REQUIREMENTS:
        - Combine specific therapeutic areas with trial phases
        - Include HEOR-relevant endpoints (cost, QoL, outcomes)
        - Focus on late-stage trials (Phase II/III) with commercial potential
        - Include real-world evidence studies
        - Target breakthrough/fast-track designations
        
        EXAMPLES OF TARGETED QUERIES:
        - "Phase III [therapeutic area] primary endpoint results"
        - "[therapeutic area] breakthrough therapy designation"
        - "clinical trial [area] cost effectiveness endpoint"
        - "real world evidence [area] outcomes study"
        
        Return as JSON array of 5-7 specific query strings.
        """
        
        response = await self.llm.ainvoke([SystemMessage(content=prompt)])
        try:
            queries = json.loads(response.content)
            state.search_queries = queries if isinstance(queries, list) else [response.content]
        except:
            # Enhanced fallback queries with personalization
            personalized_queries = []
            for area in state.user_preferences.therapeutic_areas:
                personalized_queries.extend([
                    f"Phase III {area} primary endpoint results",
                    f"{area} breakthrough therapy designation FDA",
                    f"clinical trial {area} cost effectiveness",
                    f"real world evidence {area} outcomes"
                ])
            
            # Add expertise-specific clinical queries
            for expertise in state.user_preferences.expertise_areas:
                if "economics" in expertise.lower():
                    personalized_queries.append(f"clinical trial {expertise} economic endpoint")
                else:
                    personalized_queries.append(f"{expertise} clinical trial results")
            
            state.search_queries = personalized_queries[:7]
        
        return state

    async def _generate_market_queries(self, state: AgentState) -> AgentState:
        """Generate highly targeted search queries for market access news"""
        prompt = f"""
        You are a market access specialist. Generate 5-7 HIGHLY SPECIFIC search queries for market access and payer news.
        
        USER PROFILE:
        - Expertise: {', '.join(state.user_preferences.expertise_areas)}
        - Therapeutic Focus: {', '.join(state.user_preferences.therapeutic_areas)}
        - Key Interests: {', '.join(state.user_preferences.keywords)}
        - Regions: {', '.join(state.user_preferences.regions)}
        
        REQUIREMENTS:
        - Focus on specific payer decisions in user's therapeutic areas
        - Include ICER reviews and HTA assessments
        - Target formulary changes and coverage policies
        - Include budget impact and cost-effectiveness studies
        - Focus on actionable market access changes
        
        EXAMPLES OF TARGETED QUERIES:
        - "ICER review [therapeutic area] cost effectiveness"
        - "[therapeutic area] formulary coverage decision 2024"
        - "Medicare coverage [area] reimbursement policy"
        - "payer access [area] budget impact model"
        
        Return as JSON array of 5-7 specific query strings.
        """
        
        response = await self.llm.ainvoke([SystemMessage(content=prompt)])
        try:
            queries = json.loads(response.content)
            state.search_queries = queries if isinstance(queries, list) else [response.content]
        except:
            # Enhanced fallback queries with personalization
            personalized_queries = []
            for area in state.user_preferences.therapeutic_areas:
                personalized_queries.extend([
                    f"ICER review {area} cost effectiveness 2024",
                    f"{area} formulary coverage decision",
                    f"Medicare reimbursement {area} policy",
                    f"payer access {area} budget impact"
                ])
            
            # Add expertise-specific market access queries
            for expertise in state.user_preferences.expertise_areas:
                personalized_queries.extend([
                    f"{expertise} market access strategy",
                    f"HEOR study {expertise} outcomes"
                ])
            
            state.search_queries = personalized_queries[:7]
        
        return state

    async def _generate_rwe_queries(self, state: AgentState) -> AgentState:
        """Generate highly targeted search queries for RWE and public health news"""
        prompt = f"""
        You are a real-world evidence researcher. Generate 5-7 HIGHLY TARGETED search queries for RWE and public health news.
        
        USER PROFILE:
        - Expertise: {', '.join(state.user_preferences.expertise_areas)}
        - Therapeutic Focus: {', '.join(state.user_preferences.therapeutic_areas)}
        - Key Interests: {', '.join(state.user_preferences.keywords)}
        
        REQUIREMENTS:
        - Focus on RWE studies with commercial/policy implications
        - Include comparative effectiveness research (CER)
        - Target patient-reported outcomes (PROs) and QoL studies
        - Include health economics outcomes research
        - Focus on post-market surveillance and safety studies
        
        EXAMPLES OF TARGETED QUERIES:
        - "real world evidence [therapeutic area] comparative effectiveness"
        - "[area] patient reported outcomes study 2024"
        - "post market surveillance [area] safety outcomes"
        - "health economics [area] real world data"
        
        Return as JSON array of 5-7 specific query strings.
        """
        
        response = await self.llm.ainvoke([SystemMessage(content=prompt)])
        try:
            queries = json.loads(response.content)
            state.search_queries = queries if isinstance(queries, list) else [response.content]
        except:
            # Enhanced fallback queries with personalization
            personalized_queries = []
            for area in state.user_preferences.therapeutic_areas:
                personalized_queries.extend([
                    f"real world evidence {area} comparative effectiveness",
                    f"{area} patient reported outcomes study",
                    f"post market surveillance {area} safety",
                    f"health economics {area} real world data"
                ])
            
            # Add expertise-specific RWE queries
            for expertise in state.user_preferences.expertise_areas:
                personalized_queries.extend([
                    f"{expertise} real world outcomes research",
                    f"population health {expertise} study"
                ])
            
            state.search_queries = personalized_queries[:7]
        
        return state

    # Search Methods
    async def _search_regulatory_news(self, state: AgentState) -> AgentState:
        """Search for regulatory news using SERP API"""
        news_items = []
        
        for query in state.search_queries:
            try:
                # Search using SERP API
                serp_results = await self._search_with_serp(
                    query + " FDA EMA regulatory", 
                    num_results=10
                )
                
                # Convert to NewsItem objects
                for item in serp_results:
                    news_item = NewsItem(
                        id=f"reg_{hash(item['link'])}",
                        title=item.get('title', ''),
                        snippet=item.get('snippet', ''),
                        source=item.get('source', ''),
                        date=item.get('date', datetime.now().isoformat()),
                        category=state.category.value,
                        url=item.get('link', ''),
                        relevance_score=0.8  # Will be refined in filtering
                    )
                    news_items.append(news_item)
                    
            except Exception as e:
                print(f"Error searching regulatory news: {e}")
                continue
        
        state.news_items = news_items
        return state

    async def _search_nih_clinical(self, state: AgentState) -> AgentState:
        """Search NIH databases for clinical trial information using updated API v2"""
        clinical_items = []
        
        for query in state.search_queries:
            try:
                # Use the new ClinicalTrials.gov API v2 REST endpoint
                url = "https://clinicaltrials.gov/api/v2/studies"
                params = {
                    "query.term": query,
                    "pageSize": 20,
                    "format": "json"
                }
                
                response = await self.http_client.get(url, params=params)
                if response.status_code == 200:
                    data = response.json()
                    studies = data.get("studies", [])
                    
                    for study in studies:
                        protocol_section = study.get("protocolSection", {})
                        identification_module = protocol_section.get("identificationModule", {})
                        description_module = protocol_section.get("descriptionModule", {})
                        status_module = protocol_section.get("statusModule", {})
                        
                        nct_id = identification_module.get("nctId", "")
                        title = identification_module.get("briefTitle", "")
                        summary = description_module.get("briefSummary", "")
                        start_date = status_module.get("startDateStruct", {}).get("date", "")
                        
                        news_item = NewsItem(
                            id=f"nih_{nct_id}",
                            title=title,
                            snippet=summary[:300] if summary else "",
                            source="ClinicalTrials.gov",
                            date=start_date,
                            category=state.category.value,
                            url=f"https://clinicaltrials.gov/study/{nct_id}",
                            relevance_score=0.9
                        )
                        clinical_items.append(news_item)
                        
            except Exception as e:
                print(f"Error searching NIH clinical (API v2): {e}")
                continue
        
        # Store in temporary attribute for merging
        state.news_items = clinical_items
        return state

    async def _search_clinical_news(self, state: AgentState) -> AgentState:
        """Search general news sources for clinical updates"""
        general_items = []
        
        for query in state.search_queries:
            try:
                # Search using SERP API with clinical focus
                serp_results = await self._search_with_serp(
                    query + " clinical trial results", 
                    num_results=15
                )
                
                for item in serp_results:
                    news_item = NewsItem(
                        id=f"clin_{hash(item['link'])}",
                        title=item.get('title', ''),
                        snippet=item.get('snippet', ''),
                        source=item.get('source', ''),
                        date=item.get('date', datetime.now().isoformat()),
                        category=state.category.value,
                        url=item.get('link', ''),
                        relevance_score=0.7
                    )
                    general_items.append(news_item)
                    
            except Exception as e:
                print(f"Error searching clinical news: {e}")
                continue
        
        # Merge with existing NIH results
        if hasattr(state, '_temp_clinical_items'):
            state.news_items.extend(state._temp_clinical_items)
        state.news_items.extend(general_items)
        
        return state

    async def _merge_clinical_results(self, state: AgentState) -> AgentState:
        """Merge NIH and general clinical news results"""
        # Remove duplicates based on title similarity
        unique_items = []
        seen_titles = set()
        
        for item in state.news_items:
            title_key = item.title.lower()[:50]  # Use first 50 chars for deduplication
            if title_key not in seen_titles:
                seen_titles.add(title_key)
                unique_items.append(item)
        
        state.news_items = unique_items
        return state

    async def _search_market_news(self, state: AgentState) -> AgentState:
        """Search for market access and payer news"""
        news_items = []
        
        for query in state.search_queries:
            try:
                # Search using SERP API
                serp_results = await self._search_with_serp(
                    query + " payer reimbursement coverage", 
                    num_results=12
                )
                
                for item in serp_results:
                    news_item = NewsItem(
                        id=f"mkt_{hash(item['link'])}",
                        title=item.get('title', ''),
                        snippet=item.get('snippet', ''),
                        source=item.get('source', ''),
                        date=item.get('date', datetime.now().isoformat()),
                        category=state.category.value,
                        url=item.get('link', ''),
                        relevance_score=0.8
                    )
                    news_items.append(news_item)
                    
            except Exception as e:
                print(f"Error searching market news: {e}")
                continue
        
        state.news_items = news_items
        return state

    async def _search_rwe_news(self, state: AgentState) -> AgentState:
        """Search for RWE and public health news"""
        news_items = []
        
        for query in state.search_queries:
            try:
                # Search using SERP API
                serp_results = await self._search_with_serp(
                    query + " real world evidence outcomes", 
                    num_results=12
                )
                
                for item in serp_results:
                    news_item = NewsItem(
                        id=f"rwe_{hash(item['link'])}",
                        title=item.get('title', ''),
                        snippet=item.get('snippet', ''),
                        source=item.get('source', ''),
                        date=item.get('date', datetime.now().isoformat()),
                        category=state.category.value,
                        url=item.get('link', ''),
                        relevance_score=0.8
                    )
                    news_items.append(news_item)
                    
            except Exception as e:
                print(f"Error searching RWE news: {e}")
                continue
        
        state.news_items = news_items
        return state

    # Filtering Methods
    async def _filter_regulatory_relevance(self, state: AgentState) -> AgentState:
        """Filter and score regulatory news for relevance"""
        return await self._filter_relevance_generic(state, "regulatory compliance and drug approval")

    async def _filter_clinical_relevance(self, state: AgentState) -> AgentState:
        """Filter and score clinical news for relevance"""
        return await self._filter_relevance_generic(state, "clinical trials and drug development")

    async def _filter_market_relevance(self, state: AgentState) -> AgentState:
        """Filter and score market access news for relevance"""
        return await self._filter_relevance_generic(state, "market access and payer decisions")

    async def _filter_rwe_relevance(self, state: AgentState) -> AgentState:
        """Filter and score RWE news for relevance"""
        return await self._filter_relevance_generic(state, "real-world evidence and population health")

    async def _filter_relevance_generic(self, state: AgentState, domain_focus: str) -> AgentState:
        """Enhanced personalized relevance filtering using aggressive LLM analysis"""
        if not state.news_items:
            return state
        
        # First pass: Quick keyword-based filtering
        pre_filtered_items = await self._pre_filter_by_keywords(state.news_items, state.user_preferences)
        
        # Second pass: Deep LLM analysis for personalization
        filtered_items = []
        
        for item in pre_filtered_items[:30]:  # Increased limit for better selection
            try:
                # Enhanced personalized prompt with specific criteria
                prompt = f"""
                You are an expert HEOR analyst. Analyze this news item for relevance to a professional with specific expertise.

                USER PROFILE:
                - Primary Expertise: {', '.join(state.user_preferences.expertise_areas)}
                - Therapeutic Focus: {', '.join(state.user_preferences.therapeutic_areas)}
                - Interest Keywords: {', '.join(state.user_preferences.keywords)}
                - Domain: {domain_focus}

                NEWS ITEM:
                Title: {item.title}
                Content: {item.snippet}
                Source: {item.source}

                SCORING CRITERIA (Rate 0.0-1.0):
                - Direct relevance to user's expertise area (40%)
                - Therapeutic area alignment (30%)
                - Actionable insights for HEOR work (20%)
                - Recency and impact potential (10%)

                PERSONALIZATION FACTORS:
                - Does this directly impact their therapeutic areas?
                - Would this news affect their daily HEOR work?
                - Is this something they would discuss with colleagues?
                - Does it mention specific drugs/treatments in their focus area?

                Be selective but fair - return scores 0.6+ for relevant content, 0.8+ for highly relevant.
                Return ONLY a number between 0.0 and 1.0.
                """
                
                response = await self.llm.ainvoke([SystemMessage(content=prompt)])
                try:
                    score = float(response.content.strip())
                    item.relevance_score = max(0.0, min(1.0, score))
                except:
                    item.relevance_score = 0.3  # Lower default for failed parsing
                
                # Apply additional personalization boost
                boosted_score = await self._apply_personalization_boost(item, state.user_preferences)
                item.relevance_score = min(1.0, boosted_score)
                
                # Balanced threshold for inclusion (selective but not too strict)
                if item.relevance_score >= 0.5:
                    filtered_items.append(item)
                    
            except Exception as e:
                print(f"Error filtering item: {e}")
                continue
        
        # Enhanced sorting with multiple factors
        filtered_items.sort(key=lambda x: (x.relevance_score, self._calculate_recency_score(x)), reverse=True)
        
        # Return top 10 most relevant (balanced quantity and quality)
        state.news_items = filtered_items[:10]
        
        return state

    async def _pre_filter_by_keywords(self, news_items: List[NewsItem], preferences: UserPreferences) -> List[NewsItem]:
        """Quick keyword-based pre-filtering to reduce LLM calls"""
        if not news_items:
            return news_items
        
        # Create comprehensive keyword sets
        all_keywords = set()
        for keyword in preferences.keywords:
            all_keywords.add(keyword.lower())
            # Add partial matches
            all_keywords.update(keyword.lower().split())
        
        for area in preferences.expertise_areas + preferences.therapeutic_areas:
            all_keywords.add(area.lower())
            all_keywords.update(area.lower().split())
        
        # Filter items that contain relevant keywords
        filtered_items = []
        for item in news_items:
            text_to_search = f"{item.title} {item.snippet}".lower()
            
            # Calculate keyword match score
            matches = sum(1 for keyword in all_keywords if keyword in text_to_search)
            keyword_score = min(matches / 3.0, 1.0)  # Normalize to 0-1
            
            # Include items with keyword matches or from trusted sources (more lenient)
            if keyword_score > 0.05 or item.source in ["ClinicalTrials.gov", "FDA", "EMA", "PubMed"]:
                item.relevance_score = keyword_score * 0.6  # Initial score
                filtered_items.append(item)
        
        return filtered_items

    async def _apply_personalization_boost(self, item: NewsItem, preferences: UserPreferences) -> float:
        """Apply personalization boost based on specific user preferences"""
        base_score = item.relevance_score
        boost = 0.0
        
        text_content = f"{item.title} {item.snippet}".lower()
        
        # Boost for exact expertise matches
        for expertise in preferences.expertise_areas:
            if expertise.lower() in text_content:
                boost += 0.1
        
        # Boost for therapeutic area matches
        for area in preferences.therapeutic_areas:
            if area.lower() in text_content:
                boost += 0.08
        
        # Boost for high-value keywords (more moderate boosts)
        high_value_keywords = {
            "fda approval": 0.15,
            "clinical trial results": 0.12,
            "breakthrough therapy": 0.1,
            "cost effectiveness": 0.1,
            "market access": 0.08,
            "reimbursement": 0.08,
            "heor": 0.06,
            "real world evidence": 0.06
        }
        
        for keyword, boost_value in high_value_keywords.items():
            if keyword in text_content:
                boost += boost_value
        
        # Boost for trusted sources (moderate boosts)
        trusted_sources = {
            "ClinicalTrials.gov": 0.08,
            "FDA": 0.1,
            "EMA": 0.08,
            "NEJM": 0.06,
            "The Lancet": 0.06,
            "PubMed": 0.05
        }
        
        for source, boost_value in trusted_sources.items():
            if source.lower() in item.source.lower():
                boost += boost_value
        
        return base_score + boost

    def _calculate_recency_score(self, item: NewsItem) -> float:
        """Calculate recency score for sorting"""
        try:
            # Try to parse the date and give recent items higher scores
            from datetime import datetime
            if item.date:
                # Simple recency boost - more recent = higher score
                return 0.1  # Small boost for recent items
            return 0.0
        except:
            return 0.0

    async def _finalize_results(self, state: AgentState) -> AgentState:
        """Finalize the agent results"""
        state.processing_status = "completed"
        return state

    # Utility Methods
    async def _search_with_serp(self, query: str, num_results: int = 10) -> List[Dict]:
        """Search using SERP API"""
        try:
            url = "https://serpapi.com/search"
            params = {
                "q": query,
                "api_key": settings.serp_api_key,
                "engine": "google",
                "num": num_results,
                "tbm": "nws",  # News search
                "tbs": f"qdr:w"  # Past week
            }
            
            response = await self.http_client.get(url, params=params)
            if response.status_code == 200:
                data = response.json()
                return data.get("news_results", [])
            else:
                print(f"SERP API error: {response.status_code}")
                return []
                
        except Exception as e:
            print(f"Error with SERP API: {e}")
            return []

    async def close(self):
        """Close HTTP client"""
        await self.http_client.aclose()


# Global instance
news_agents = LangGraphNewsAgents()