import os
import uuid
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from passlib.context import CryptContext
from jose import JWTError, jwt
from database import User
from services.openai_service import OpenAIService

# Security configuration
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 7

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class AuthService:
    def __init__(self):
        self.openai_service = OpenAIService()
    
    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verify a password against its hash"""
        return pwd_context.verify(plain_password, hashed_password)
    
    def get_password_hash(self, password: str) -> str:
        """Hash a password"""
        return pwd_context.hash(password)
    
    def create_access_token(self, data: dict, expires_delta: Optional[timedelta] = None) -> str:
        """Create an access token"""
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt
    
    def create_refresh_token(self, data: dict) -> str:
        """Create a refresh token"""
        to_encode = data.copy()
        expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt
    
    def verify_token(self, token: str) -> Optional[Dict[str, Any]]:
        """Verify and decode a JWT token"""
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            return payload
        except JWTError:
            return None
    
    async def register_user(self, db: Session, email: str, password: str, name: str) -> User:
        """Register a new user"""
        # Check if user already exists
        existing_user = db.query(User).filter(User.email == email).first()
        if existing_user:
            raise ValueError("Email already registered")
        
        # Create OpenAI Assistant and Thread
        assistant_id = await self.openai_service.create_assistant()
        openai_thread_id = await self.openai_service.create_thread()
        
        # Create new user
        session_id = str(uuid.uuid4())
        user = User(
            email=email,
            name=name,
            password_hash=self.get_password_hash(password),
            session_id=session_id,
            assistant_id=assistant_id,
            selected_categories=[],
            onboarding_completed=False
        )
        
        try:
            db.add(user)
            db.commit()
            db.refresh(user)
            
            # Create thread linked to user
            from models.thread import Thread
            thread = Thread(
                user_id=user.id,
                thread_id=openai_thread_id,
                title="HEOR Signal Chat",
                status="active"
            )
            
            db.add(thread)
            db.commit()
            
            return user
        except IntegrityError:
            db.rollback()
            raise ValueError("Email already registered")
    
    async def authenticate_user(self, db: Session, email: str, password: str) -> Optional[User]:
        """Authenticate a user with email and password"""
        user = db.query(User).filter(User.email == email).first()
        if not user or not user.password_hash:
            return None
        
        if not self.verify_password(password, user.password_hash):
            return None
        
        return user
    
    def create_tokens(self, user: User) -> Dict[str, str]:
        """Create access and refresh tokens for a user"""
        access_token = self.create_access_token(
            data={"sub": str(user.id), "email": user.email, "name": user.name}
        )
        refresh_token = self.create_refresh_token(
            data={"sub": str(user.id), "email": user.email, "name": user.name}
        )
        
        return {
            "access_token": access_token,
            "refresh_token": refresh_token
        }
    
    async def get_user_by_token(self, db: Session, token: str) -> Optional[User]:
        """Get user from JWT token"""
        payload = self.verify_token(token)
        if payload is None:
            return None
        
        user_id = payload.get("sub")
        if user_id is None:
            return None
        
        user = db.query(User).filter(User.id == user_id).first()
        return user
    
    async def refresh_tokens(self, db: Session, refresh_token: str) -> Optional[Dict[str, str]]:
        """Refresh access token using refresh token"""
        payload = self.verify_token(refresh_token)
        if payload is None:
            return None
        
        user_id = payload.get("sub")
        if user_id is None:
            return None
        
        user = db.query(User).filter(User.id == user_id).first()
        if user is None:
            return None
        
        return self.create_tokens(user)
    
    async def logout_user(self, db: Session, token: str) -> bool:
        """Logout user (invalidate token)"""
        # In a production environment, you might want to add the token to a blacklist
        # For now, we'll just verify the token is valid
        payload = self.verify_token(token)
        return payload is not None