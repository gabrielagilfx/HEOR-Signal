import uuid
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import Thread, User
from services.openai_service import OpenAIService

class ThreadService:
    def __init__(self):
        self.openai_service = OpenAIService()
    
    async def create_new_thread(
        self, 
        db: Session, 
        user_id: str, 
        selected_categories: Optional[List[str]] = None,
        preference_expertise: Optional[str] = None,
        conversation_title: Optional[str] = None
    ) -> Thread:
        """Create a new thread for an existing user"""
        
        # Create OpenAI Assistant and Thread
        assistant_id = await self.openai_service.create_assistant()
        openai_thread_id = await self.openai_service.create_thread()
        
        # Create new thread with user preferences
        thread = Thread(
            user_id=user_id,
            thread_id=openai_thread_id,
            title=conversation_title or "New Conversation",
            status="active",
            onboarding_completed=bool(selected_categories and len(selected_categories) > 0),
            selected_categories=selected_categories or [],
            preference_expertise=preference_expertise,
            conversation_title=conversation_title or "New Conversation"
        )
        
        db.add(thread)
        db.commit()
        db.refresh(thread)
        
        return thread
    
    async def get_user_threads(self, db: Session, user_id: str) -> List[Thread]:
        """Get all threads for a user"""
        return db.query(Thread).filter(
            Thread.user_id == user_id,
            Thread.status == "active"
        ).order_by(Thread.last_activity.desc()).all()
    
    async def get_thread_by_id(self, db: Session, thread_id: str) -> Optional[Thread]:
        """Get a specific thread by ID"""
        return db.query(Thread).filter(Thread.id == thread_id).first()
    
    async def update_thread_preferences(
        self, 
        db: Session, 
        thread_id: str, 
        selected_categories: Optional[List[str]] = None,
        preference_expertise: Optional[str] = None,
        conversation_title: Optional[str] = None
    ) -> Optional[Thread]:
        """Update thread preferences"""
        thread = await self.get_thread_by_id(db, thread_id)
        if thread:
            if selected_categories is not None:
                thread.selected_categories = selected_categories
                thread.onboarding_completed = len(selected_categories) > 0
            if preference_expertise is not None:
                thread.preference_expertise = preference_expertise
            if conversation_title is not None:
                thread.conversation_title = conversation_title
                thread.title = conversation_title
            
            db.commit()
            db.refresh(thread)
        
        return thread
    
    async def update_thread_activity(self, db: Session, thread_id: str) -> Optional[Thread]:
        """Update thread's last activity timestamp"""
        thread = await self.get_thread_by_id(db, thread_id)
        if thread:
            thread.last_activity = func.now()
            db.commit()
            db.refresh(thread)
        
        return thread