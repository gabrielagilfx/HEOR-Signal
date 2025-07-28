import uuid
from typing import Optional, List
from sqlalchemy.orm import Session
from database import User
from models.thread import Thread
from services.openai_service import OpenAIService
from auth import get_current_user

class UserService:
    def __init__(self):
        self.openai_service = OpenAIService()
    
    async def create_or_get_user(self, db: Session, session_id: Optional[str] = None) -> User:
        """Create a new user or retrieve existing one (for session-based auth)"""
        if not session_id:
            session_id = str(uuid.uuid4())
        
        user = db.query(User).filter(User.session_id == session_id).first()
        
        if not user:
            # Create OpenAI Assistant and Thread
            assistant_id = await self.openai_service.create_assistant()
            openai_thread_id = await self.openai_service.create_thread()
            
            # Create user first
            user = User(
                session_id=session_id,
                assistant_id=assistant_id,
                selected_categories=[],
                onboarding_completed=False,
                is_authenticated=False
            )
            
            db.add(user)
            db.commit()
            db.refresh(user)
            
            # Create thread linked to user
            thread = Thread(
                user_id=user.id,
                thread_id=openai_thread_id,
                title="HEOR Signal Chat",
                status="active"
            )
            
            db.add(thread)
            db.commit()
            db.refresh(thread)
        
        return user
    
    async def get_current_user(self, db: Session, user_id: str) -> Optional[User]:
        """Get user by ID (for authenticated users)"""
        return db.query(User).filter(User.id == user_id).first()
    
    async def get_user_by_email(self, db: Session, email: str) -> Optional[User]:
        """Get user by email"""
        return db.query(User).filter(User.email == email).first()
    
    async def update_categories(self, db: Session, user_id: str, categories: List[str]) -> User:
        """Update user's selected categories"""
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            user.selected_categories = categories  # type: ignore
            user.onboarding_completed = len(categories) > 0  # type: ignore
            db.commit()
            db.refresh(user)
        return user
    
    async def update_preference_expertise(self, db: Session, user_id: str, preference_expertise: str) -> User:
        """Update user's preference/expertise"""
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            user.preference_expertise = preference_expertise  # type: ignore
            db.commit()
            db.refresh(user)
        return user

    async def complete_onboarding(self, db: Session, user_id: str) -> User:
        """Mark onboarding as completed"""
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            user.onboarding_completed = True  # type: ignore
            db.commit()
            db.refresh(user)
        return user
