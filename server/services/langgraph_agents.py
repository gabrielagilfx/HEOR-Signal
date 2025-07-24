import asyncio
import json
import httpx
import feedparser
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from enum import Enum
from sqlalchemy.orm import Session
from dateutil import parser as date_parser

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
        
        # Initialize the 12 specialized sub-agents (3 APIs × 4 domains)
        self.sub_agents = {
            # Regulatory agents
            "regulatory_serp": self._create_domain_api_agent("regulatory", "serp"),
            "regulatory_nih": self._create_domain_api_agent("regulatory", "nih"),
            "regulatory_clinical_data": self._create_domain_api_agent("regulatory", "clinical_data"),
            
            # Clinical agents
            "clinical_serp": self._create_domain_api_agent("clinical", "serp"),
            "clinical_nih": self._create_domain_api_agent("clinical", "nih"),
            "clinical_clinical_data": self._create_domain_api_agent("clinical", "clinical_data"),
            
            # Market agents
            "market_serp": self._create_domain_api_agent("market", "serp"),
            "market_nih": self._create_domain_api_agent("market", "nih"),
            "market_clinical_data": self._create_domain_api_agent("market", "clinical_data"),
            
            # RWE agents
            "rwe_serp": self._create_domain_api_agent("rwe", "serp"),
            "rwe_nih": self._create_domain_api_agent("rwe", "nih"),
            "rwe_clinical_data": self._create_domain_api_agent("rwe", "clinical_data"),
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

    def _create_domain_api_agent(self, domain: str, api: str) -> StateGraph:
        """Create a specialized agent for a specific domain-API combination"""
        workflow = StateGraph(AgentState)
        
        # Add nodes with domain and API specific methods
        workflow.add_node("generate_queries", self._create_query_generator(domain))
        workflow.add_node("search_api", self._create_api_searcher(domain, api))
        workflow.add_node("filter_relevance", self._create_relevance_filter(domain))
        workflow.add_node("finalize", self._finalize_results)
        
        # Simple linear workflow
        workflow.set_entry_point("generate_queries")
        workflow.add_edge("generate_queries", "search_api")
        workflow.add_edge("search_api", "filter_relevance")
        workflow.add_edge("filter_relevance", "finalize")
        workflow.add_edge("finalize", END)
        
        return workflow.compile()

    async def run_parallel_agents(self, user_preferences: UserPreferences) -> Dict[str, List[NewsItem]]:
        """Run all 12 sub-agents in parallel and aggregate results by domain"""
        tasks = []
        
        # Create tasks for all 12 sub-agents
        for agent_key, agent in self.sub_agents.items():
            domain = agent_key.split('_')[0]  # Extract domain from key like "regulatory_serp"
            category = self._get_category_enum(domain)
            
            state = AgentState(
                user_preferences=user_preferences,
                category=category
            )
            tasks.append(self._run_single_agent(agent, state, agent_key))
        
        # Run all 12 agents in parallel
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Group results by domain
        domain_results = {
            "regulatory": [],
            "clinical": [],
            "market": [],
            "rwe": []
        }
        
        for i, (agent_key, result) in enumerate(zip(self.sub_agents.keys(), results)):
            domain = agent_key.split('_')[0]
            
            if isinstance(result, Exception):
                print(f"Error in {agent_key} agent: {result}")
            else:
                domain_results[domain].extend(result.news_items)
        
        # Deduplicate within each domain
        for domain in domain_results:
            domain_results[domain] = self._deduplicate_news_items(domain_results[domain])
        
        return domain_results

    def _get_category_enum(self, domain: str) -> AgentCategory:
        """Convert domain string to AgentCategory enum"""
        mapping = {
            "regulatory": AgentCategory.REGULATORY,
            "clinical": AgentCategory.CLINICAL,
            "market": AgentCategory.MARKET_ACCESS,
            "rwe": AgentCategory.RWE_PUBLIC_HEALTH
        }
        return mapping.get(domain, AgentCategory.REGULATORY)

    def _validate_and_filter_dates(self, items: List[NewsItem]) -> List[NewsItem]:
        """Filter news items to only those within the last year and fix invalid/missing dates."""
        filtered = []
        now = datetime.now()
        one_year_ago = now - timedelta(days=365)
        for item in items:
            date_str = item.date
            parsed_date = None
            if date_str:
                try:
                    parsed_date = date_parser.parse(date_str, fuzzy=True)
                except Exception:
                    item.date = "Date not found"
            else:
                item.date = "Date not found"
            # Only include if date is valid and within the last year, or if date is not found (to not lose potentially relevant items)
            if parsed_date:
                if one_year_ago <= parsed_date <= now:
                    # Keep the original date string from the news site
                    item.date = date_str
                    filtered.append(item)
            else:
                # If date is not found, still include but with 'Date not found'
                filtered.append(item)
        return filtered

    def _deduplicate_news_items(self, items: List[NewsItem]) -> List[NewsItem]:
        """Remove duplicate news items based on title similarity and NCT IDs, and filter by date."""
        # First, filter and normalize dates
        items = self._validate_and_filter_dates(items)
        unique_items = []
        seen_titles = set()
        seen_nct_ids = set()
        
        for item in items:
            # Check for NCT ID duplicates (clinical trials)
            if item.id.startswith(('nih_', 'ctdata_')):
                nct_id = item.id.split('_', 1)[1] if '_' in item.id else item.id
                if nct_id in seen_nct_ids:
                    continue
                seen_nct_ids.add(nct_id)
            
            # Check for title duplicates
            title_key = item.title.lower()[:50]
            if title_key not in seen_titles:
                seen_titles.add(title_key)
                unique_items.append(item)
        
        # Sort by relevance score
        unique_items.sort(key=lambda x: x.relevance_score, reverse=True)
        return unique_items[:10]  # Top 10 per domain

    async def _run_single_agent(self, agent: StateGraph, initial_state: AgentState, agent_key: str = "") -> AgentState:
        """Run a single agent workflow"""
        try:
            result = await agent.ainvoke(initial_state.dict())
            return AgentState(**result)
        except Exception as e:
            print(f"Agent error in {agent_key}: {e}")
            initial_state.processing_status = "error"
            initial_state.error_message = str(e)
            return initial_state

    # Factory Methods for Creating Domain-API Specific Functions
    def _create_query_generator(self, domain: str):
        """Create a domain-specific query generator"""
        async def generate_queries(state: AgentState) -> AgentState:
            user_expertise = state.user_preferences.expertise_areas[0] if state.user_preferences.expertise_areas else "healthcare"
            selected_categories = state.user_preferences.keywords
            
            domain_focus = {
                "regulatory": "regulatory alerts, FDA approvals, EMA decisions, compliance alerts, drug recalls, policy changes",
                "clinical": "clinical trial results, Phase III trials, drug development, biomarker studies, treatment efficacy",
                "market": "payer coverage decisions, HEOR studies, cost-effectiveness, reimbursement, formulary changes",
                "rwe": "real-world evidence studies, population health, epidemiology, public health policy, outcomes research"
            }
            
            prompt = f"""
            Generate 4-5 highly specific search queries for {domain} news and updates.
            
            User's exact expertise: "{user_expertise}"
            Selected focus areas: {selected_categories}
            Regions: {', '.join(state.user_preferences.regions)}
            
            Create queries that are precisely tailored to their expertise area. Use domain-specific terminology.
            Focus on: {domain_focus.get(domain, "healthcare updates")}
            
            Return as JSON array of strings. Make each query specific to their expertise.
            """
            
            response = await self.llm.ainvoke([SystemMessage(content=prompt)])
            try:
                queries = json.loads(response.content)
                state.search_queries = queries if isinstance(queries, list) else [response.content]
            except:
                # Fallback queries using raw expertise
                state.search_queries = [
                    f"{domain} {user_expertise}",
                    f"{domain} updates {user_expertise}",
                    f"{domain} news {user_expertise}",
                    f"{domain} research {user_expertise}"
                ]
            
            return state
        
        return generate_queries

    def _create_api_searcher(self, domain: str, api: str):
        """Create a domain-API specific searcher"""
        async def search_api(state: AgentState) -> AgentState:
            if api == "serp":
                return await self._search_with_serp_api(state, domain)
            elif api == "nih":
                return await self._search_with_nih_api(state, domain)
            elif api == "clinical_data":
                return await self._search_with_clinical_data_api(state, domain)
            else:
                print(f"Unknown API: {api}")
                state.news_items = []
                return state
        
        return search_api

    def _create_relevance_filter(self, domain: str):
        """Create a domain-specific relevance filter"""
        async def filter_relevance(state: AgentState) -> AgentState:
            domain_focus = {
                "regulatory": "regulatory compliance and drug approval",
                "clinical": "clinical trials and drug development", 
                "market": "market access and payer decisions",
                "rwe": "real-world evidence and population health"
            }
            
            return await self._filter_relevance_generic(state, domain_focus.get(domain, "healthcare"))
        
        return filter_relevance

    # API-Specific Search Methods
    async def _search_with_serp_api(self, state: AgentState, domain: str) -> AgentState:
        """Search using SERP API with domain-specific focus"""
        news_items = []
        
        domain_suffixes = {
            "regulatory": "FDA EMA regulatory approval",
            "clinical": "clinical trial results",
            "market": "payer reimbursement coverage",
            "rwe": "real world evidence outcomes"
        }
        
        suffix = domain_suffixes.get(domain, "healthcare news")
        
        for query in state.search_queries:
            try:
                serp_results = await self._search_with_serp(f"{query} {suffix}", num_results=12)
                
                for item in serp_results:
                    news_item = NewsItem(
                        id=f"{domain}_serp_{hash(item['link'])}",
                        title=item.get('title', ''),
                        snippet=item.get('snippet', ''),
                        source=item.get('source', ''),
                        date=item.get('date', datetime.now().isoformat()),
                        category=state.category.value,
                        url=item.get('link', ''),
                        relevance_score=0.7
                    )
                    news_items.append(news_item)
                    
            except Exception as e:
                print(f"Error searching SERP for {domain}: {e}")
                continue
        
        state.news_items = news_items
        return state

    async def _search_with_nih_api(self, state: AgentState, domain: str) -> AgentState:
        """Search using NIH API with domain-specific focus"""
        clinical_items = []
        
        for query in state.search_queries:
            try:
                url = "https://clinicaltrials.gov/api/v2/studies"
                params = {
                    "query.term": query,
                    "pageSize": 15,
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
                            title=f"{title} ({domain.title()})",
                            snippet=summary[:300] if summary else "",
                            source="ClinicalTrials.gov NIH API",
                            date=start_date,
                            category=state.category.value,
                            url=f"https://clinicaltrials.gov/study/{nct_id}",
                            relevance_score=0.9
                        )
                        clinical_items.append(news_item)
                        
            except Exception as e:
                print(f"Error searching NIH for {domain}: {e}")
                continue
        
        state.news_items = clinical_items
        return state

    async def _search_with_clinical_data_api(self, state: AgentState, domain: str) -> AgentState:
        """Search using Clinical Data API with domain-specific focus"""
        clinical_data_items = []
        
        for query in state.search_queries:
            try:
                url = "https://clinicaltrials.gov/data-api/api"
                params = {
                    "expr": query,
                    "min_rnk": 1,
                    "max_rnk": 15,
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
                        
                        if status in ["Recruiting", "Active, not recruiting", "Completed", "Enrolling by invitation"]:
                            news_item = NewsItem(
                                id=f"ctdata_{nct_id}",
                                title=f"{title} ({status}) - {domain.title()}",
                                snippet=summary[:300] if summary else f"Clinical trial status: {status}",
                                source="ClinicalTrials.gov Data API",
                                date=start_date or datetime.now().isoformat(),
                                category=state.category.value,
                                url=f"https://clinicaltrials.gov/study/{nct_id}",
                                relevance_score=0.85
                            )
                            clinical_data_items.append(news_item)
                        
            except Exception as e:
                print(f"Error searching Clinical Data API for {domain}: {e}")
                continue
        
        state.news_items = clinical_data_items
        return state

    # Legacy Methods (keeping for compatibility)
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