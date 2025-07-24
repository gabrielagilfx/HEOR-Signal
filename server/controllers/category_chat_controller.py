from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session

from services.category_chat_service import category_chat_service
from database import get_db

router = APIRouter(prefix="/api/chat/category", tags=["category-chat"])


class CategoryChatRequest(BaseModel):
    session_id: str
    category: str
    message: str


class CategoryChatResponse(BaseModel):
    response: str
    news_items: List[Dict[str, Any]]
    suggestions: List[str]
    context_key: str


class CategoryChatHistoryResponse(BaseModel):
    messages: List[Dict[str, Any]]


@router.post("/{category}/send", response_model=CategoryChatResponse)
async def send_category_message(
    category: str,
    request: CategoryChatRequest,
    db: Session = Depends(get_db)
):
    """
    Send a message to a specific category chat
    """
    try:
        # Validate category
        valid_categories = ["regulatory", "clinical", "market", "rwe"]
        if category not in valid_categories:
            raise HTTPException(status_code=400, detail=f"Invalid category. Must be one of: {valid_categories}")
        
        # Process the message
        result = await category_chat_service.process_chat_message(
            session_id=request.session_id,
            category=category,
            message=request.message,
            db=db
        )
        
        return CategoryChatResponse(**result)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing category chat message: {str(e)}")


@router.get("/{category}/messages/{session_id}", response_model=CategoryChatHistoryResponse)
async def get_category_chat_history(
    category: str,
    session_id: str
):
    """
    Get chat history for a specific category
    """
    try:
        # Validate category
        valid_categories = ["regulatory", "clinical", "market", "rwe"]
        if category not in valid_categories:
            raise HTTPException(status_code=400, detail=f"Invalid category. Must be one of: {valid_categories}")
        
        # Get chat history
        messages = category_chat_service.get_chat_history(session_id, category)
        
        return CategoryChatHistoryResponse(messages=messages)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching category chat history: {str(e)}")


@router.delete("/{category}/messages/{session_id}")
async def clear_category_chat_history(
    category: str,
    session_id: str
):
    """
    Clear chat history for a specific category
    """
    try:
        # Validate category
        valid_categories = ["regulatory", "clinical", "market", "rwe"]
        if category not in valid_categories:
            raise HTTPException(status_code=400, detail=f"Invalid category. Must be one of: {valid_categories}")
        
        # Clear chat history
        category_chat_service.clear_chat_history(session_id, category)
        
        return {"message": f"Chat history cleared for category: {category}"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error clearing category chat history: {str(e)}")


@router.get("/{category}/suggestions")
async def get_category_suggestions(category: str):
    """
    Get suggested questions for a specific category
    """
    try:
        # Validate category
        valid_categories = ["regulatory", "clinical", "market", "rwe"]
        if category not in valid_categories:
            raise HTTPException(status_code=400, detail=f"Invalid category. Must be one of: {valid_categories}")
        
        # Get suggestions based on category
        from services.category_chat_service import AgentCategory
        
        category_enum_map = {
            "regulatory": AgentCategory.REGULATORY,
            "clinical": AgentCategory.CLINICAL,
            "market": AgentCategory.MARKET_ACCESS,
            "rwe": AgentCategory.RWE_PUBLIC_HEALTH
        }
        
        category_enum = category_enum_map.get(category)
        suggestions = category_chat_service._generate_suggestions(category_enum)
        
        return {"suggestions": suggestions}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching category suggestions: {str(e)}")