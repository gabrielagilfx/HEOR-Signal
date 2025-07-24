import asyncio
import json
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from enum import Enum
from sqlalchemy.orm import Session

from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
from pydantic import BaseModel

from config import settings
from database import get_db, User
from services.langgraph_agents import news_agents, UserPreferences, NewsItem, AgentCategory


@dataclass
class ChatMessage:
    id: str
    role: str  # 'user' or 'assistant'
    content: str
    timestamp: datetime
    category: str
    session_id: str


@dataclass
class CategoryChatContext:
    category: AgentCategory
    session_id: str
    chat_history: List[ChatMessage]
    user_preferences: UserPreferences
    last_news_fetch: Optional[datetime] = None
    current_filters: Dict[str, Any] = None


class CategoryChatService:
    def __init__(self):
        self.llm = ChatOpenAI(
            model="gpt-4o-mini",
            temperature=0.3,
            openai_api_key=settings.openai_api_key
        )
        self.chat_contexts: Dict[str, CategoryChatContext] = {}
        
    def _get_context_key(self, session_id: str, category: str) -> str:
        return f"{session_id}:{category}"
    
    def _get_user_preferences_from_db(self, session_id: str, db: Session) -> UserPreferences:
        """Fetch user preferences from database"""
        user = db.query(User).filter(User.session_id == session_id).first()
        
        if not user:
            return UserPreferences(
                expertise_areas=["health economics and market access"],
                therapeutic_areas=["oncology", "cardiovascular"],
                regions=["US", "EU"],
                keywords=["FDA", "clinical trials", "market access"],
                news_recency_days=7
            )
        
        return UserPreferences(
            expertise_areas=user.expertise_areas or ["health economics and market access"],
            therapeutic_areas=user.therapeutic_areas or ["oncology", "cardiovascular"],
            regions=user.regions or ["US", "EU"],
            keywords=user.keywords or ["FDA", "clinical trials", "market access"],
            news_recency_days=user.news_recency_days or 7
        )
    
    def _get_category_enum(self, category: str) -> AgentCategory:
        category_map = {
            "regulatory": AgentCategory.REGULATORY,
            "clinical": AgentCategory.CLINICAL,
            "market": AgentCategory.MARKET_ACCESS,
            "rwe": AgentCategory.RWE_PUBLIC_HEALTH
        }
        return category_map.get(category, AgentCategory.REGULATORY)
    
    def _create_system_prompt(self, category: AgentCategory, user_preferences: UserPreferences) -> str:
        category_descriptions = {
            AgentCategory.REGULATORY: "regulatory alerts, FDA approvals, safety alerts, and compliance updates",
            AgentCategory.CLINICAL: "clinical trial updates, research findings, and medical breakthroughs",
            AgentCategory.MARKET_ACCESS: "market access, payer news, pricing, and reimbursement updates",
            AgentCategory.RWE_PUBLIC_HEALTH: "real-world evidence, public health data, and epidemiological studies"
        }
        
        return f"""You are a specialized news assistant focused on {category_descriptions[category]} in healthcare and pharmaceuticals.

User Expertise: {', '.join(user_preferences.expertise_areas)}
Therapeutic Areas: {', '.join(user_preferences.therapeutic_areas)}
Regions: {', '.join(user_preferences.regions)}
Keywords: {', '.join(user_preferences.keywords)}

Your role is to:
1. Understand user queries about {category_descriptions[category]}
2. Generate relevant search queries to find the most recent and relevant news
3. Provide concise, informative responses with news items
4. Ask clarifying questions when needed
5. Suggest related topics or follow-up questions

Always focus on the {category} category and provide actionable insights."""
    
    async def process_chat_message(
        self, 
        session_id: str, 
        category: str, 
        message: str, 
        db: Session
    ) -> Dict[str, Any]:
        """Process a chat message for a specific category"""
        
        # Get or create chat context
        context_key = self._get_context_key(session_id, category)
        if context_key not in self.chat_contexts:
            user_preferences = self._get_user_preferences_from_db(session_id, db)
            category_enum = self._get_category_enum(category)
            
            self.chat_contexts[context_key] = CategoryChatContext(
                category=category_enum,
                session_id=session_id,
                chat_history=[],
                user_preferences=user_preferences,
                current_filters={}
            )
        
        context = self.chat_contexts[context_key]
        
        # Add user message to history
        user_msg = ChatMessage(
            id=f"msg_{len(context.chat_history) + 1}",
            role="user",
            content=message,
            timestamp=datetime.now(),
            category=category,
            session_id=session_id
        )
        context.chat_history.append(user_msg)
        
        # Process with LLM to understand intent and generate search queries
        system_prompt = self._create_system_prompt(context.category, context.user_preferences)
        
        # Prepare conversation history for LLM
        messages = [SystemMessage(content=system_prompt)]
        for msg in context.chat_history[-10:]:  # Last 10 messages for context
            if msg.role == "user":
                messages.append(HumanMessage(content=msg.content))
            else:
                messages.append(AIMessage(content=msg.content))
        
        # Add current user message
        messages.append(HumanMessage(content=message))
        
        # Get LLM response
        llm_response = await self.llm.ainvoke(messages)
        
        # Extract search queries from LLM response
        search_queries = self._extract_search_queries(llm_response.content, context.category)
        
        # Fetch news based on queries
        news_items = []
        if search_queries:
            news_items = await self._fetch_category_news(search_queries, context)
        
        # Generate final response
        final_response = self._generate_final_response(llm_response.content, news_items, context.category)
        
        # Add assistant response to history
        assistant_msg = ChatMessage(
            id=f"msg_{len(context.chat_history) + 1}",
            role="assistant",
            content=final_response,
            timestamp=datetime.now(),
            category=category,
            session_id=session_id
        )
        context.chat_history.append(assistant_msg)
        
        return {
            "response": final_response,
            "news_items": [self._news_item_to_dict(item) for item in news_items],
            "suggestions": self._generate_suggestions(context.category),
            "context_key": context_key
        }
    
    def _extract_search_queries(self, llm_response: str, category: AgentCategory) -> List[str]:
        """Extract search queries from LLM response"""
        # Simple extraction - in production, you'd want more sophisticated parsing
        queries = []
        
        # Look for quoted phrases or specific terms
        import re
        quoted_terms = re.findall(r'"([^"]*)"', llm_response)
        queries.extend(quoted_terms)
        
        # Add category-specific terms
        category_terms = {
            AgentCategory.REGULATORY: ["FDA", "regulatory", "approval", "safety alert"],
            AgentCategory.CLINICAL: ["clinical trial", "Phase", "study", "research"],
            AgentCategory.MARKET_ACCESS: ["market access", "payer", "reimbursement", "pricing"],
            AgentCategory.RWE_PUBLIC_HEALTH: ["real-world evidence", "epidemiology", "public health"]
        }
        
        # Extract key terms from response
        words = llm_response.lower().split()
        for term in category_terms.get(category, []):
            if any(word in term.lower() for word in words):
                queries.append(term)
        
        # If no specific queries found, use the original message
        if not queries:
            queries = [llm_response[:100]]  # First 100 chars as fallback
        
        return queries[:3]  # Limit to 3 queries
    
    async def _fetch_category_news(self, queries: List[str], context: CategoryChatContext) -> List[NewsItem]:
        """Fetch news for the specific category using existing agents"""
        try:
            # Use the existing news agents but focus on the specific category
            results = await news_agents.run_parallel_agents_for_user(context.session_id, get_db())
            
            category_key = context.category.value
            category_news = results.get(category_key, [])
            
            # Filter news based on queries
            filtered_news = []
            for item in category_news:
                item_text = f"{item.title} {item.snippet}".lower()
                if any(query.lower() in item_text for query in queries):
                    filtered_news.append(item)
            
            return filtered_news[:5]  # Return top 5 relevant items
            
        except Exception as e:
            print(f"Error fetching category news: {e}")
            return []
    
    def _generate_final_response(self, llm_response: str, news_items: List[NewsItem], category: AgentCategory) -> str:
        """Generate final response combining LLM response with news items"""
        if not news_items:
            return llm_response
        
        response_parts = [llm_response]
        response_parts.append("\n\n**Recent News:**")
        
        for i, item in enumerate(news_items[:3], 1):
            response_parts.append(f"{i}. **{item.title}**")
            response_parts.append(f"   {item.snippet}")
            response_parts.append(f"   Source: {item.source} | {item.date}")
            response_parts.append("")
        
        return "\n".join(response_parts)
    
    def _generate_suggestions(self, category: AgentCategory) -> List[str]:
        """Generate follow-up suggestions based on category"""
        suggestions_map = {
            AgentCategory.REGULATORY: [
                "Show me recent FDA approvals",
                "Any safety alerts this week?",
                "What's new in regulatory compliance?",
                "Tell me about breakthrough therapy designations"
            ],
            AgentCategory.CLINICAL: [
                "Show me Phase III trial results",
                "Any new clinical breakthroughs?",
                "What's happening in oncology trials?",
                "Tell me about COVID-19 research"
            ],
            AgentCategory.MARKET_ACCESS: [
                "Show me payer policy updates",
                "Any pricing news?",
                "What's new in reimbursement?",
                "Tell me about market access strategies"
            ],
            AgentCategory.RWE_PUBLIC_HEALTH: [
                "Show me real-world evidence studies",
                "Any public health updates?",
                "What's new in epidemiology?",
                "Tell me about health outcomes data"
            ]
        }
        
        return suggestions_map.get(category, [])
    
    def _news_item_to_dict(self, item: NewsItem) -> Dict[str, Any]:
        """Convert NewsItem to dictionary for JSON response"""
        return {
            "id": item.id,
            "title": item.title,
            "snippet": item.snippet,
            "source": item.source,
            "date": item.date,
            "category": item.category,
            "url": item.url,
            "relevance_score": item.relevance_score,
            "is_new": item.is_new
        }
    
    def get_chat_history(self, session_id: str, category: str) -> List[Dict[str, Any]]:
        """Get chat history for a category"""
        context_key = self._get_context_key(session_id, category)
        context = self.chat_contexts.get(context_key)
        
        if not context:
            return []
        
        return [
            {
                "id": msg.id,
                "role": msg.role,
                "content": msg.content,
                "timestamp": msg.timestamp.isoformat(),
                "category": msg.category
            }
            for msg in context.chat_history
        ]
    
    def clear_chat_history(self, session_id: str, category: str):
        """Clear chat history for a category"""
        context_key = self._get_context_key(session_id, category)
        if context_key in self.chat_contexts:
            self.chat_contexts[context_key].chat_history = []


# Global instance
category_chat_service = CategoryChatService()