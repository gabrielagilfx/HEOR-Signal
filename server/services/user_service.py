import uuid
from typing import Optional, List
from sqlalchemy.orm import Session
from models.user import User
from repositories.user_repository import UserRepository
from services.openai_service import OpenAIService

class UserService:
    def __init__(self):
        self.user_repository = UserRepository()
        self.openai_service = OpenAIService()
    
    async def create_or_get_user(self, db: Session, session_id: Optional[str] = None) -> User:
        """Create a new user or retrieve existing one"""
        if not session_id:
            session_id = str(uuid.uuid4())
        
        user = self.user_repository.get_by_session_id(db, session_id)
        
        if not user:
            # Create OpenAI Assistant and Thread
            assistant_id = await self.openai_service.create_assistant()
            thread_id = await self.openai_service.create_thread()
            
            user_data = {
                "session_id": session_id,
                "assistant_id": assistant_id,
                "thread_id": thread_id,
                "selected_categories": [],
                "onboarding_completed": False
            }
            
            user = self.user_repository.create(db, user_data)
        
        return user
    
    async def update_categories(self, db: Session, user_id: int, categories: List[str]) -> User:
        """Update user's selected categories"""
        update_data = {
            "selected_categories": categories,
            "onboarding_completed": len(categories) > 0
        }
        
        return self.user_repository.update(db, user_id, update_data)
    
    async def complete_onboarding(self, db: Session, user_id: int) -> User:
        """Mark onboarding as completed"""
        return self.user_repository.update(db, user_id, {"onboarding_completed": True})
