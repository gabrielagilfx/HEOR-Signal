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
                expertise_areas=["health economics and market access"],
                therapeutic_areas=["general medicine"],
                regions=["US"],
                keywords=["healthcare", "medical"],
                news_recency_days=7
            )
        
        # Use raw preference_expertise directly instead of mapping
        raw_expertise = user.preference_expertise or "health economics and market access"
        selected_categories = user.selected_categories or []
        
        return UserPreferences(
            expertise_areas=[raw_expertise],  # Keep the raw expertise as-is
            therapeutic_areas=[raw_expertise],  # Use same for therapeutic areas
            regions=["US"],  # Default region
            keywords=selected_categories,  # Use selected categories as keywords
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
        workflow.add_node("search_clinical_data_api", self._search_clinical_data_api)
        workflow.add_node("search_general", self._search_clinical_news)
        workflow.add_node("merge_results", self._merge_clinical_results)
        workflow.add_node("filter_relevance", self._filter_clinical_relevance)
        workflow.add_node("finalize", self._finalize_results)
        
        workflow.set_entry_point("generate_queries")
        workflow.add_edge("generate_queries", "search_nih")
        workflow.add_edge("generate_queries", "search_clinical_data_api")
        workflow.add_edge("generate_queries", "search_general")
        workflow.add_edge("search_nih", "merge_results")
        workflow.add_edge("search_clinical_data_api", "merge_results")
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
        """Generate search queries for regulatory news"""
        user_expertise = state.user_preferences.expertise_areas[0] if state.user_preferences.expertise_areas else "healthcare"
        selected_categories = state.user_preferences.keywords
        
        prompt = f"""
        Generate 4-5 highly specific search queries for regulatory alerts and compliance news.
        
        User's exact expertise: "{user_expertise}"
        Selected focus areas: {selected_categories}
        Regions: {', '.join(state.user_preferences.regions)}
        
        Create queries that are precisely tailored to their expertise area. Use domain-specific terminology.
        Focus on: FDA approvals, EMA decisions, regulatory guidance, compliance alerts, drug recalls, policy changes.
        
        Return as JSON array of strings. Make each query specific to their expertise.
        """
        
        response = await self.llm.ainvoke([SystemMessage(content=prompt)])
        try:
            queries = json.loads(response.content)
            state.search_queries = queries if isinstance(queries, list) else [response.content]
        except:
            # Fallback queries using raw expertise
            state.search_queries = [
                f"FDA approval {user_expertise}",
                f"regulatory guidance {user_expertise}",
                f"EMA decision {user_expertise}",
                f"compliance alert {user_expertise}",
                "drug recall pharmaceutical"
            ]
        
        return state

    async def _generate_clinical_queries(self, state: AgentState) -> AgentState:
        """Generate search queries for clinical trial news"""
        user_expertise = state.user_preferences.expertise_areas[0] if state.user_preferences.expertise_areas else "healthcare"
        selected_categories = state.user_preferences.keywords
        
        prompt = f"""
        Generate 4-5 highly specific search queries for clinical trial updates and research news.
        
        User's exact expertise: "{user_expertise}"
        Selected focus areas: {selected_categories}
        
        Create queries that are precisely tailored to their expertise area. Use domain-specific terminology.
        Focus on: clinical trial results, Phase III trials, drug development, biomarker studies, treatment efficacy.
        
        Return as JSON array of strings. Make each query specific to their expertise.
        """
        
        response = await self.llm.ainvoke([SystemMessage(content=prompt)])
        try:
            queries = json.loads(response.content)
            state.search_queries = queries if isinstance(queries, list) else [response.content]
        except:
            # Fallback queries using raw expertise
            state.search_queries = [
                f"clinical trial {user_expertise}",
                f"Phase III results {user_expertise}",
                f"drug development {user_expertise}",
                f"biomarker study {user_expertise}",
                "treatment efficacy breakthrough"
            ]
        
        return state

    async def _generate_market_queries(self, state: AgentState) -> AgentState:
        """Generate search queries for market access news"""
        user_expertise = state.user_preferences.expertise_areas[0] if state.user_preferences.expertise_areas else "healthcare"
        selected_categories = state.user_preferences.keywords
        
        prompt = f"""
        Generate 4-5 highly specific search queries for market access and payer news.
        
        User's exact expertise: "{user_expertise}"
        Selected focus areas: {selected_categories}
        Regions: {', '.join(state.user_preferences.regions)}
        
        Create queries that are precisely tailored to their expertise area. Use domain-specific terminology.
        Focus on: payer coverage decisions, HEOR studies, cost-effectiveness, reimbursement, formulary changes.
        
        Return as JSON array of strings. Make each query specific to their expertise.
        """
        
        response = await self.llm.ainvoke([SystemMessage(content=prompt)])
        try:
            queries = json.loads(response.content)
            state.search_queries = queries if isinstance(queries, list) else [response.content]
        except:
            # Fallback queries using raw expertise
            state.search_queries = [
                f"payer coverage {user_expertise}",
                f"HEOR study {user_expertise}",
                f"reimbursement {user_expertise}",
                f"cost effectiveness {user_expertise}",
                "formulary coverage decision"
            ]
        
        return state

    async def _generate_rwe_queries(self, state: AgentState) -> AgentState:
        """Generate search queries for RWE and public health news"""
        user_expertise = state.user_preferences.expertise_areas[0] if state.user_preferences.expertise_areas else "healthcare"
        selected_categories = state.user_preferences.keywords
        
        prompt = f"""
        Generate 4-5 highly specific search queries for real-world evidence and public health news.
        
        User's exact expertise: "{user_expertise}"
        Selected focus areas: {selected_categories}
        
        Create queries that are precisely tailored to their expertise area. Use domain-specific terminology.
        Focus on: real-world evidence studies, population health, epidemiology, public health policy, outcomes research.
        
        Return as JSON array of strings. Make each query specific to their expertise.
        """
        
        response = await self.llm.ainvoke([SystemMessage(content=prompt)])
        try:
            queries = json.loads(response.content)
            state.search_queries = queries if isinstance(queries, list) else [response.content]
        except:
            # Fallback queries using raw expertise
            state.search_queries = [
                f"real world evidence {user_expertise}",
                f"population health {user_expertise}",
                f"epidemiology {user_expertise}",
                f"outcomes research {user_expertise}",
                "public health policy update"
            ]
        
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

    async def _search_clinical_data_api(self, state: AgentState) -> AgentState:
        """Search ClinicalTrials.gov Data API for clinical trial information"""
        clinical_data_items = []
        
        for query in state.search_queries:
            try:
                # Use the ClinicalTrials.gov Data API
                url = "https://clinicaltrials.gov/data-api/api"
                params = {
                    "expr": query,
                    "min_rnk": 1,
                    "max_rnk": 20,
                    "fmt": "json"
                }
                
                response = await self.http_client.get(url, params=params)
                if response.status_code == 200:
                    data = response.json()
                    studies = data.get("StudyFieldsResponse", {}).get("StudyFields", [])
                    
                    for study in studies:
                        nct_id = study.get("NCTId", [""])[0] if study.get("NCTId") else ""
                        title = study.get("BriefTitle", [""])[0] if study.get("BriefTitle") else ""
                        summary = study.get("BriefSummary", [""])[0] if study.get("BriefSummary") else ""
                        status = study.get("OverallStatus", [""])[0] if study.get("OverallStatus") else ""
                        start_date = study.get("StartDate", [""])[0] if study.get("StartDate") else ""
                        
                        # Only include active or recently completed studies
                        if status in ["Recruiting", "Active, not recruiting", "Completed", "Enrolling by invitation"]:
                            news_item = NewsItem(
                                id=f"ctdata_{nct_id}",
                                title=f"{title} ({status})",
                                snippet=summary[:300] if summary else f"Clinical trial status: {status}",
                                source="ClinicalTrials.gov Data API",
                                date=start_date or datetime.now().isoformat(),
                                category=state.category.value,
                                url=f"https://clinicaltrials.gov/study/{nct_id}",
                                relevance_score=0.85
                            )
                            clinical_data_items.append(news_item)
                        
            except Exception as e:
                print(f"Error searching Clinical Data API: {e}")
                continue
        
        # Add to existing news items
        if not hasattr(state, 'news_items'):
            state.news_items = []
        state.news_items.extend(clinical_data_items)
        
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
        
        # Add to existing news items
        if not hasattr(state, 'news_items'):
            state.news_items = []
        state.news_items.extend(general_items)
        
        return state

    async def _merge_clinical_results(self, state: AgentState) -> AgentState:
        """Merge NIH, Clinical Data API, and general clinical news results"""
        # Remove duplicates based on title similarity and NCT ID
        unique_items = []
        seen_titles = set()
        seen_nct_ids = set()
        
        for item in state.news_items:
            # Check for NCT ID duplicates (clinical trials)
            if item.id.startswith(('nih_', 'ctdata_')):
                nct_id = item.id.split('_', 1)[1] if '_' in item.id else item.id
                if nct_id in seen_nct_ids:
                    continue
                seen_nct_ids.add(nct_id)
            
            # Check for title duplicates
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
        """Generic relevance filtering using LLM"""
        if not state.news_items:
            return state
        
        user_expertise = state.user_preferences.expertise_areas[0] if state.user_preferences.expertise_areas else "healthcare"
        selected_categories = state.user_preferences.keywords
        
        # Batch process items for efficiency
        filtered_items = []
        
        for item in state.news_items[:20]:  # Limit to top 20 for performance
            try:
                prompt = f"""
                Rate the relevance of this news item for a professional with expertise in "{user_expertise}" who is interested in {domain_focus}.
                
                User's specific expertise: "{user_expertise}"
                Selected focus areas: {selected_categories}
                
                Title: {item.title}
                Snippet: {item.snippet}
                
                Consider how well this article matches their specific expertise area and professional interests.
                Return only a number between 0.0 and 1.0 representing relevance score.
                """
                
                response = await self.llm.ainvoke([SystemMessage(content=prompt)])
                try:
                    score = float(response.content.strip())
                    item.relevance_score = max(0.0, min(1.0, score))
                except:
                    item.relevance_score = 0.5  # Default score if parsing fails
                
                # Only include items above threshold
                if item.relevance_score >= 0.4:
                    filtered_items.append(item)
                    
            except Exception as e:
                print(f"Error filtering item: {e}")
                continue
        
        # Sort by relevance score and recency
        filtered_items.sort(key=lambda x: x.relevance_score, reverse=True)
        state.news_items = filtered_items[:10]  # Top 10 most relevant
        
        return state

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