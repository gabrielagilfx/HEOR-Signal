import uuid
from typing import Optional, List
from sqlalchemy.orm import Session
from database import User
from services.openai_service import OpenAIService

class UserService:
    def __init__(self):
        self.openai_service = OpenAIService()
    
    async def create_or_get_user(self, db: Session, session_id: Optional[str] = None) -> User:
        """Create a new user or retrieve existing one"""
        if not session_id:
            session_id = str(uuid.uuid4())
        
        user = db.query(User).filter(User.session_id == session_id).first()
        
        if not user:
            # Create OpenAI Assistant and Thread
            assistant_id = await self.openai_service.create_assistant()
            thread_id = await self.openai_service.create_thread()
            
            user = User(
                session_id=session_id,
                assistant_id=assistant_id,
                thread_id=thread_id,
                selected_categories=[],
                onboarding_completed=False
            )
            
            db.add(user)
            db.commit()
            db.refresh(user)
        
        return user
    
    async def update_categories(self, db: Session, user_id: int, categories: List[str]) -> User:
        """Update user's selected categories"""
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            user.selected_categories = categories
            user.onboarding_completed = len(categories) > 0
            db.commit()
            db.refresh(user)
        return user
    
    async def complete_onboarding(self, db: Session, user_id: int) -> User:
        """Mark onboarding as completed"""
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            user.onboarding_completed = True
            db.commit()
            db.refresh(user)
        return user
