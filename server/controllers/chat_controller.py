import asyncio
from typing import Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db
from services.user_service import UserService
from services.openai_service import OpenAIService
from models.chat import Message
from models.thread import Thread

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

@router.post("/send", response_model=Dict[str, Any])
async def send_message(
    request: ChatRequest,
    db: Session = Depends(get_db)
):
    """Send a message to the chat assistant"""
    try:
        # Get or create user
        user = await user_service.create_or_get_user(db, request.session_id)
        
        # Get user's thread
        thread = db.query(Thread).filter(Thread.user_id == user.id).first()
        if not thread:
            raise HTTPException(status_code=500, detail="No thread found for user")
        
        # Save user message
        import uuid
        user_message = Message(
            user_id=user.id,
            thread_id=thread.id,
            role="user",
            content=request.message
        )
        db.add(user_message)
        db.commit()
        db.refresh(user_message)
        
        # Send to OpenAI
        await openai_service.send_message(thread.thread_id, request.message)
        assistant_response = await openai_service.run_assistant(
            str(user.assistant_id), 
            thread.thread_id
        )
        
        # Save assistant message
        assistant_message = Message(
            user_id=user.id,
            thread_id=thread.id,
            role="assistant",
            content=assistant_response
        )
        db.add(assistant_message)
        db.commit()
        db.refresh(assistant_message)
        
        return {
            "success": True,
            "message": assistant_response,
            "message_id": str(assistant_message.id)
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
            db, str(user.id), request.categories
        )
        
        # Generate confirmation message
        category_names = [cat.replace("_", " ").title() for cat in request.categories]
        confirmation_message = f"Perfect! I've configured your dashboard to monitor {len(request.categories)} data categories: {', '.join(category_names)}. Your personalized HEOR Signal dashboard is now being prepared."
        
        # Get user's thread
        thread = db.query(Thread).filter(Thread.user_id == user.id).first()
        if not thread:
            raise HTTPException(status_code=500, detail="No thread found for user")
        
        # Save assistant message
        import uuid
        assistant_message = Message(
            user_id=user.id,
            thread_id=thread.id,
            role="assistant", 
            content=confirmation_message
        )
        db.add(assistant_message)
        db.commit()
        db.refresh(assistant_message)
        
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

@router.get("/messages/{session_id}", response_model=Dict[str, Any])
async def get_messages(session_id: str, db: Session = Depends(get_db)):
    """Get chat messages for a user session"""
    try:
        from models.user import User
        
        # Get user
        user = db.query(User).filter(User.session_id == session_id).first()
        if not user:
            return {"success": True, "messages": []}
        
        # Get user's thread
        thread = db.query(Thread).filter(Thread.user_id == user.id).first()
        if not thread:
            return {"success": True, "messages": []}
        
        # Get messages for this thread
        messages = db.query(Message).filter(Message.thread_id == thread.id).order_by(Message.created_at).all()
        
        message_list = []
        for msg in messages:
            message_list.append({
                "id": str(msg.id),
                "role": msg.role,
                "content": msg.content,
                "timestamp": msg.created_at.isoformat() if msg.created_at is not None else None
            })
        
        return {
            "success": True,
            "messages": message_list
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving messages: {str(e)}"
        )


