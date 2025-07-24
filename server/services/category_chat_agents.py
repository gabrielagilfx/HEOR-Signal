import asyncio
import json
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from enum import Enum
from sqlalchemy.orm import Session
from pydantic import BaseModel

from langgraph.graph import StateGraph, END
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage

from config import settings
from database import get_db, User
from services.langgraph_agents import LangGraphNewsAgents, UserPreferences, NewsItem, AgentCategory


class ChatAgentCategory(Enum):
    REGULATORY_CHAT = "regulatory_chat"
    CLINICAL_CHAT = "clinical_chat" 
    MARKET_CHAT = "market_chat"
    RWE_CHAT = "rwe_chat"


@dataclass
class ChatContext:
    time_period: Optional[str] = None
    specific_topics: List[str] = None
    geographic_regions: List[str] = None
    news_sources: List[str] = None
    specific_requirements: List[str] = None
    parsed_intent: Dict[str, Any] = None


class ChatAgentState(BaseModel):
    user_preferences: UserPreferences
    category: ChatAgentCategory
    user_message: str
    context: ChatContext
    news_items: List[NewsItem] = []
    search_queries: List[str] = []
    processing_status: str = "pending"
    error_message: Optional[str] = None
    chat_response: str = ""


class CategoryChatAgent:
    def __init__(self, category: str):
        self.category = category
        self.llm = ChatOpenAI(
            model="gpt-4o-mini",
            temperature=0.3,
            openai_api_key=settings.openai_api_key
        )
        # Reuse existing LangGraph agents for actual news fetching
        self.existing_agents = LangGraphNewsAgents()
        
    def create_chat_workflow(self) -> StateGraph:
        """Create a chat-specific workflow that builds on existing agents"""
        workflow = StateGraph(ChatAgentState)
        
        # Chat-specific workflow nodes
        workflow.add_node("parse_user_intent", self._parse_user_intent)
        workflow.add_node("generate_dynamic_queries", self._generate_dynamic_queries)
        workflow.add_node("search_with_context", self._search_with_context)
        workflow.add_node("filter_and_rank", self._filter_and_rank)
        workflow.add_node("generate_response", self._generate_response)
        
        # Linear workflow for chat
        workflow.set_entry_point("parse_user_intent")
        workflow.add_edge("parse_user_intent", "generate_dynamic_queries")
        workflow.add_edge("generate_dynamic_queries", "search_with_context")
        workflow.add_edge("search_with_context", "filter_and_rank")
        workflow.add_edge("filter_and_rank", "generate_response")
        workflow.add_edge("generate_response", END)
        
        return workflow.compile()

    async def _parse_user_intent(self, state: ChatAgentState) -> ChatAgentState:
        """Parse user's chat message to understand intent and requirements"""
        prompt = f"""
        Parse this user message for {self.category} news:
        "{state.user_message}"
        
        Extract and return as JSON with these fields:
        {{
            "time_period": "recent/last week/last month/specific date range",
            "specific_topics": ["list", "of", "specific", "topics", "drugs", "conditions"],
            "geographic_regions": ["list", "of", "regions", "countries"],
            "news_sources": ["preferred", "news", "sources"],
            "specific_requirements": ["approvals", "trials", "recalls", "coverage", "etc"]
        }}
        
        Be specific and extract all relevant information from the user's request.
        """
        
        try:
            response = await self.llm.ainvoke([SystemMessage(content=prompt)])
            parsed_intent = json.loads(response.content)
            
            # Update context with parsed intent
            state.context = ChatContext(
                time_period=parsed_intent.get("time_period"),
                specific_topics=parsed_intent.get("specific_topics", []),
                geographic_regions=parsed_intent.get("geographic_regions", []),
                news_sources=parsed_intent.get("news_sources", []),
                specific_requirements=parsed_intent.get("specific_requirements", []),
                parsed_intent=parsed_intent
            )
        except Exception as e:
            # Fallback parsing
            state.context = ChatContext(
                time_period="recent",
                specific_topics=[],
                geographic_regions=[],
                news_sources=[],
                specific_requirements=[],
                parsed_intent={"error": str(e)}
            )
        
        return state

    async def _generate_dynamic_queries(self, state: ChatAgentState) -> ChatAgentState:
        """Generate search queries based on user's chat message and context"""
        intent = state.context.parsed_intent or {}
        
        prompt = f"""
        Generate 3-5 specific search queries for {self.category} news based on:
        
        User message: "{state.user_message}"
        Time period: {intent.get('time_period', 'recent')}
        Specific topics: {intent.get('specific_topics', [])}
        Geographic regions: {intent.get('geographic_regions', [])}
        Requirements: {intent.get('specific_requirements', [])}
        User expertise: {state.user_preferences.expertise_areas}
        
        Create highly specific queries that match the user's exact request.
        Focus on the category: {self.category}
        
        Return as JSON array of strings.
        """
        
        try:
            response = await self.llm.ainvoke([SystemMessage(content=prompt)])
            queries = json.loads(response.content)
            state.search_queries = queries if isinstance(queries, list) else [response.content]
        except:
            # Fallback queries
            state.search_queries = [
                f"{self.category} news {state.user_message}",
                f"{self.category} updates {state.user_message}",
                f"{self.category} latest {state.user_message}"
            ]
        
        return state

    async def _search_with_context(self, state: ChatAgentState) -> ChatAgentState:
        """Search using the dynamic queries with context awareness"""
        try:
            # Create a modified user preferences object with chat context
            chat_enhanced_preferences = UserPreferences(
                expertise_areas=state.user_preferences.expertise_areas,
                therapeutic_areas=state.user_preferences.therapeutic_areas,
                regions=state.context.geographic_regions or state.user_preferences.regions,
                keywords=state.context.specific_topics or state.user_preferences.keywords,
                news_recency_days=7  # Default, could be adjusted based on time_period
            )
            
            # Use existing agents but with our dynamic queries
            # We'll override the query generation by directly calling search methods
            category_mapping = {
                "regulatory": "regulatory",
                "clinical": "clinical", 
                "market": "market",
                "rwe": "rwe"
            }
            
            category = category_mapping.get(self.category, "regulatory")
            
            # Create a temporary state for the existing agent
            temp_state = AgentState(
                user_preferences=chat_enhanced_preferences,
                category=self.existing_agents._get_category_enum(category)
            )
            
            # Override the search queries with our dynamic ones
            temp_state.search_queries = state.search_queries
            
            # Use existing search methods but with our queries
            if category == "regulatory":
                temp_state = await self.existing_agents._search_regulatory_news(temp_state)
            elif category == "clinical":
                temp_state = await self.existing_agents._search_clinical_news(temp_state)
            elif category == "market":
                temp_state = await self.existing_agents._search_market_news(temp_state)
            elif category == "rwe":
                temp_state = await self.existing_agents._search_rwe_news(temp_state)
            
            # Transfer results to our chat state
            state.news_items = temp_state.news_items
            
        except Exception as e:
            state.error_message = f"Search error: {str(e)}"
            state.news_items = []
        
        return state

    async def _filter_and_rank(self, state: ChatAgentState) -> ChatAgentState:
        """Filter and rank results based on chat context"""
        if not state.news_items:
            return state
            
        try:
            # Use existing relevance filtering but with chat context
            category_mapping = {
                "regulatory": "regulatory",
                "clinical": "clinical", 
                "market": "market",
                "rwe": "rwe"
            }
            
            category = category_mapping.get(self.category, "regulatory")
            
            # Create temporary state for filtering
            temp_state = AgentState(
                user_preferences=state.user_preferences,
                category=self.existing_agents._get_category_enum(category)
            )
            temp_state.news_items = state.news_items
            
            # Apply existing relevance filters
            if category == "regulatory":
                temp_state = await self.existing_agents._filter_regulatory_relevance(temp_state)
            elif category == "clinical":
                temp_state = await self.existing_agents._filter_clinical_relevance(temp_state)
            elif category == "market":
                temp_state = await self.existing_agents._filter_market_relevance(temp_state)
            elif category == "rwe":
                temp_state = await self.existing_agents._filter_rwe_relevance(temp_state)
            
            # Update with filtered results
            state.news_items = temp_state.news_items
            
        except Exception as e:
            state.error_message = f"Filtering error: {str(e)}"
        
        return state

    async def _generate_response(self, state: ChatAgentState) -> ChatAgentState:
        """Generate a natural language response to the user"""
        intent = state.context.parsed_intent or {}
        
        prompt = f"""
        Generate a helpful, conversational response to the user's request for {self.category} news.
        
        Original request: "{state.user_message}"
        Parsed intent: {intent}
        Found {len(state.news_items)} relevant news items
        
        Provide:
        1. Acknowledge their specific request
        2. Summarize what you found (number of items, key themes)
        3. Highlight 2-3 most relevant findings
        4. Offer to provide more specific results or different filters if needed
        
        Keep it conversational and helpful. If no results found, suggest alternative searches.
        """
        
        try:
            response = await self.llm.ainvoke([SystemMessage(content=prompt)])
            state.chat_response = response.content
        except Exception as e:
            state.chat_response = f"I found {len(state.news_items)} relevant news items for your request. Please let me know if you'd like more specific information."
        
        return state


class ChatAgentOrchestrator:
    def __init__(self):
        self.chat_agents = {
            "regulatory": CategoryChatAgent("regulatory"),
            "clinical": CategoryChatAgent("clinical"),
            "market": CategoryChatAgent("market"),
            "rwe": CategoryChatAgent("rwe")
        }
    
    def _get_user_preferences_from_db(self, session_id: str, db: Session) -> UserPreferences:
        """Fetch user preferences from database - reusing existing method"""
        user = db.query(User).filter(User.session_id == session_id).first()
        
        if not user:
            return UserPreferences(
                expertise_areas=["health economics and market access"],
                therapeutic_areas=["oncology", "cardiovascular", "diabetes"],
                regions=["United States", "Europe"],
                keywords=["FDA", "clinical trials", "market access"],
                news_recency_days=7
            )
        
        return UserPreferences(
            expertise_areas=[user.preference_expertise] if user.preference_expertise else ["healthcare"],
            therapeutic_areas=user.selected_categories or ["oncology"],
            regions=["United States", "Europe"],  # Default regions
            keywords=user.selected_categories or ["FDA"],
            news_recency_days=7
        )
    
    async def handle_category_chat(
        self, 
        category: str, 
        user_message: str, 
        session_id: str,
        db: Session
    ) -> Dict[str, Any]:
        """Handle chat for a specific category"""
        
        # Get user preferences
        user_preferences = self._get_user_preferences_from_db(session_id, db)
        
        # Create chat state
        state = ChatAgentState(
            user_preferences=user_preferences,
            category=getattr(ChatAgentCategory, f"{category.upper()}_CHAT"),
            user_message=user_message,
            context=ChatContext()
        )
        
        # Run the chat agent
        agent = self.chat_agents[category]
        workflow = agent.create_chat_workflow()
        result = await workflow.ainvoke(state)
        
        return {
            "success": True,
            "response": result.chat_response,
            "news_items": result.news_items,
            "queries_used": result.search_queries,
            "error": result.error_message
        }
    
    async def close(self):
        """Clean up resources"""
        await self.chat_agents["regulatory"].existing_agents.close()