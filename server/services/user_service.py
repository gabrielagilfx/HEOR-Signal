import uuid
from typing import Optional, List
from sqlalchemy.orm import Session
from database import User
from models.thread import Thread
from services.openai_service import OpenAIService
from services.auth_service import AuthService

class UserService:
    def __init__(self):
        self.openai_service = OpenAIService()
        self.auth_service = AuthService()
    
    async def create_or_get_user(self, db: Session, session_id: Optional[str] = None) -> User:
        """Create a new user or retrieve existing one"""
        if not session_id:
            session_id = str(uuid.uuid4())
        
        user = db.query(User).filter(User.session_id == session_id).first()
        
        if not user:
            # Create OpenAI Assistant and Thread
            assistant_id = await self.openai_service.create_assistant()
            openai_thread_id = await self.openai_service.create_thread()
            
            # Create user first (session-based user without email/password)
            user = User(
                session_id=session_id,
                assistant_id=assistant_id,
                selected_categories=[],
                onboarding_completed=False
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

    async def create_new_chat(self, db: Session, user_id: str) -> User:
        """Create a new chat session for the user"""
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            # Create new OpenAI Thread for fresh chat
            openai_thread_id = await self.openai_service.create_thread()
            
            # Create new thread linked to user
            thread = Thread(
                user_id=user.id,
                thread_id=openai_thread_id,
                title="HEOR Signal Chat",
                status="active"
            )
            
            db.add(thread)
            db.commit()
            db.refresh(thread)
            
            # Reset onboarding status for fresh start
            user.onboarding_completed = False  # type: ignore
            user.selected_categories = []  # type: ignore
            user.preference_expertise = None  # type: ignore
            db.commit()
            db.refresh(user)
        return user
