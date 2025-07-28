import uuid
import bcrypt
from typing import Optional
from sqlalchemy.orm import Session
from database import User
from models.thread import Thread
from services.openai_service import OpenAIService

class AuthService:
    def __init__(self):
        self.openai_service = OpenAIService()
    
    def hash_password(self, password: str) -> str:
        """Hash a password using bcrypt"""
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
        return hashed.decode('utf-8')
    
    def verify_password(self, password: str, hashed_password: str) -> bool:
        """Verify a password against its hash"""
        return bcrypt.checkpw(password.encode('utf-8'), hashed_password.encode('utf-8'))
    
    def get_user_by_email(self, db: Session, email: str) -> Optional[User]:
        """Get user by email"""
        return db.query(User).filter(User.email == email).first()
    
    def get_user_by_session_id(self, db: Session, session_id: str) -> Optional[User]:
        """Get user by session ID"""
        return db.query(User).filter(User.session_id == session_id).first()
    
    async def create_user(
        self, 
        db: Session, 
        name: str, 
        email: str, 
        password: str, 
        session_id: str
    ) -> User:
        """Create a new user with hashed password"""
        # Hash the password
        password_hash = self.hash_password(password)
        
        # Create OpenAI Assistant and Thread
        assistant_id = await self.openai_service.create_assistant()
        openai_thread_id = await self.openai_service.create_thread()
        
        # Create user
        user = User(
            name=name,
            email=email.lower(),
            password_hash=password_hash,
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
    
    def authenticate_user(self, db: Session, email: str, password: str) -> Optional[User]:
        """Authenticate user with email and password"""
        user = self.get_user_by_email(db, email.lower())
        
        if user and self.verify_password(password, user.password_hash):
            return user
        
        return None