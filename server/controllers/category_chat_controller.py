from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Dict, Any, List

from database import get_db
from services.category_chat_agents import ChatAgentOrchestrator

router = APIRouter()


class CategoryChatRequest(BaseModel):
    session_id: str
    message: str


class CategoryChatResponse(BaseModel):
    success: bool
    response: str
    news_items: List[Dict[str, Any]]
    queries_used: List[str]
    error: str = None


@router.post("/api/chat/category/{category}/send", response_model=CategoryChatResponse)
async def send_category_chat(
    category: str,
    request: CategoryChatRequest,
    db: Session = Depends(get_db)
):
    """Handle category-specific chat requests"""
    
    # Validate category
    valid_categories = ["regulatory", "clinical", "market", "rwe"]
    if category not in valid_categories:
        raise HTTPException(status_code=400, detail=f"Invalid category. Must be one of: {valid_categories}")
    
    try:
        # Initialize chat orchestrator
        orchestrator = ChatAgentOrchestrator()
        
        # Handle the chat request
        result = await orchestrator.handle_category_chat(
            category=category,
            user_message=request.message,
            session_id=request.session_id,
            db=db
        )
        
        # Convert news items to dict format for JSON serialization
        news_items_dict = []
        for item in result.get("news_items", []):
            news_items_dict.append({
                "id": item.id,
                "title": item.title,
                "snippet": item.snippet,
                "source": item.source,
                "date": item.date,
                "category": item.category,
                "url": item.url,
                "relevance_score": item.relevance_score,
                "is_new": item.is_new
            })
        
        return CategoryChatResponse(
            success=result.get("success", False),
            response=result.get("response", ""),
            news_items=news_items_dict,
            queries_used=result.get("queries_used", []),
            error=result.get("error")
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat processing error: {str(e)}")


@router.get("/api/chat/category/{category}/messages/{session_id}")
async def get_category_chat_messages(
    category: str,
    session_id: str,
    db: Session = Depends(get_db)
):
    """Get chat message history for a specific category (placeholder for future implementation)"""
    
    # For now, return empty history - this can be extended later
    return {
        "success": True,
        "messages": [],
        "category": category,
        "session_id": session_id
    }