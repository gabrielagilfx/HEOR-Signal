from typing import List, Optional
from sqlalchemy.orm import Session
from models.thread import Thread
from services.openai_service import OpenAIService

class ThreadService:
    def __init__(self):
        self.openai_service = OpenAIService()
    
    async def get_user_thread(self, db: Session, user_id: str) -> Optional[Thread]:
        """Get the active thread for a user"""
        return db.query(Thread).filter(
            Thread.user_id == user_id,
            Thread.status == "active"
        ).first()
    
    async def create_thread_for_user(self, db: Session, user_id: str) -> Thread:
        """Create a new thread for a user"""
        # Create OpenAI thread
        openai_thread_id = await self.openai_service.create_thread()
        
        # Create database thread record
        thread = Thread(
            user_id=user_id,
            thread_id=openai_thread_id,
            title="HEOR Signal Chat",
            status="active"
        )
        
        db.add(thread)
        db.commit()
        db.refresh(thread)
        
        return thread
    
    async def get_or_create_thread(self, db: Session, user_id: str) -> Thread:
        """Get existing thread or create new one for user"""
        thread = await self.get_user_thread(db, user_id)
        
        if not thread:
            thread = await self.create_thread_for_user(db, user_id)
        
        return thread
    
    async def deactivate_thread(self, db: Session, thread_id: str) -> bool:
        """Deactivate a thread"""
        thread = db.query(Thread).filter(Thread.id == thread_id).first()
        if thread:
            # Update using SQLAlchemy update method
            db.query(Thread).filter(Thread.id == thread_id).update({"status": "inactive"})
            db.commit()
            return True
        return False
    
    def get_threads_for_user(self, db: Session, user_id: str) -> List[Thread]:
        """Get all threads for a user"""
        return db.query(Thread).filter(Thread.user_id == user_id).order_by(Thread.created_at.desc()).all()