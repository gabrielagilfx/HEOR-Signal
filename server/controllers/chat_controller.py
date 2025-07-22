import asyncio
from typing import Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db
from services.user_service import UserService
from services.openai_service import OpenAIService
from repositories.chat_repository import ChatRepository

router = APIRouter(prefix="/api/chat", tags=["chat"])

class ChatRequest(BaseModel):
    message: str
    session_id: str

class CategorySelectionRequest(BaseModel):
    categories: List[str]
    session_id: str

class ChatResponse(BaseModel):
    message: str
    role: str
    timestamp: str

user_service = UserService()
openai_service = OpenAIService()
chat_repository = ChatRepository()

@router.post("/send", response_model=Dict[str, Any])
async def send_message(
    request: ChatRequest,
    db: Session = Depends(get_db)
):
    """Send a message to the chat assistant"""
    try:
        # Get or create user
        user = await user_service.create_or_get_user(db, request.session_id)
        
        # Save user message
        existing_messages = chat_repository.get_messages_by_user(db, user.id)
        user_message_data = {
            "user_id": user.id,
            "message_id": f"user_{user.id}_{len(existing_messages)}",
            "role": "user",
            "content": request.message
        }
        chat_repository.create_message(db, user_message_data)
        
        # Send to OpenAI
        await openai_service.send_message(str(user.thread_id), request.message)
        assistant_response = await openai_service.run_assistant(
            str(user.assistant_id), 
            str(user.thread_id)
        )
        
        # Save assistant message
        updated_messages = chat_repository.get_messages_by_user(db, user.id)
        assistant_message_data = {
            "user_id": user.id,
            "message_id": f"assistant_{user.id}_{len(updated_messages)}",
            "role": "assistant",
            "content": assistant_response
        }
        assistant_message = chat_repository.create_message(db, assistant_message_data)
        
        return {
            "success": True,
            "message": assistant_response,
            "message_id": assistant_message.message_id
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing chat message: {str(e)}"
        )

@router.post("/select-categories", response_model=Dict[str, Any])
async def select_categories(
    request: CategorySelectionRequest,
    db: Session = Depends(get_db)
):
    """Update user's selected categories"""
    try:
        user = await user_service.create_or_get_user(db, request.session_id)
        
        # Update categories
        updated_user = await user_service.update_categories(
            db, int(user.id), request.categories
        )
        
        # Generate confirmation message
        category_names = [cat.replace("_", " ").title() for cat in request.categories]
        confirmation_message = f"Perfect! I've configured your dashboard to monitor {len(request.categories)} data categories: {', '.join(category_names)}. Your personalized HEOR Signal dashboard is now being prepared."
        
        # Save assistant message
        assistant_message_data = {
            "user_id": user.id,
            "message_id": f"assistant_{user.id}_categories",
            "role": "assistant", 
            "content": confirmation_message
        }
        chat_repository.create_message(db, assistant_message_data)
        
        return {
            "success": True,
            "message": confirmation_message,
            "categories": request.categories,
            "onboarding_completed": updated_user.onboarding_completed
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating categories: {str(e)}"
        )

@router.get("/messages/{session_id}", response_model=List[ChatResponse])
async def get_messages(session_id: str, db: Session = Depends(get_db)):
    """Get chat messages for a session"""
    try:
        user = await user_service.create_or_get_user(db, session_id)
        messages = chat_repository.get_messages_by_user(db, int(user.id))
        
        return [
            {
                "message": msg.content,
                "role": msg.role,
                "timestamp": msg.timestamp.isoformat()
            }
            for msg in reversed(messages)
        ]
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving messages: {str(e)}"
        )


