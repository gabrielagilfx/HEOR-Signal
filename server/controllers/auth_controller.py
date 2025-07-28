from typing import Dict, Any
from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from database import get_db, User
from auth import hash_password, verify_password, create_access_token, get_current_user
from services.openai_service import OpenAIService

router = APIRouter(prefix="/api/auth", tags=["authentication"])

class UserRegisterRequest(BaseModel):
    email: EmailStr
    password: str

class UserLoginRequest(BaseModel):
    email: EmailStr
    password: str

class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    email: str
    onboarding_completed: bool
    selected_categories: list
    preference_expertise: str = None

openai_service = OpenAIService()

@router.post("/register", response_model=AuthResponse)
async def register_user(
    request: UserRegisterRequest,
    db: Session = Depends(get_db)
):
    """Register a new user"""
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == request.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Hash password
    hashed_password = hash_password(request.password)
    
    # Create OpenAI Assistant and Thread
    assistant_id = await openai_service.create_assistant()
    openai_thread_id = await openai_service.create_thread()
    
    # Create user
    user = User(
        email=request.email,
        password_hash=hashed_password,
        assistant_id=assistant_id,
        selected_categories=[],
        onboarding_completed=False,
        is_authenticated=True
    )
    
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
    db.refresh(thread)
    
    # Create access token
    access_token = create_access_token(data={"sub": str(user.id)})
    
    return AuthResponse(
        access_token=access_token,
        user_id=str(user.id),
        email=user.email,
        onboarding_completed=user.onboarding_completed,
        selected_categories=user.selected_categories or [],
        preference_expertise=user.preference_expertise
    )

@router.post("/login", response_model=AuthResponse)
async def login_user(
    request: UserLoginRequest,
    db: Session = Depends(get_db)
):
    """Login user with email and password"""
    # Find user by email
    user = db.query(User).filter(User.email == request.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    # Verify password
    if not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    # Create access token
    access_token = create_access_token(data={"sub": str(user.id)})
    
    return AuthResponse(
        access_token=access_token,
        user_id=str(user.id),
        email=user.email,
        onboarding_completed=user.onboarding_completed,
        selected_categories=user.selected_categories or [],
        preference_expertise=user.preference_expertise
    )

@router.post("/logout")
async def logout_user():
    """Logout user (client should discard token)"""
    return {"message": "Successfully logged out"}

@router.get("/me", response_model=Dict[str, Any])
async def get_current_user_info(
    current_user: User = Depends(get_current_user)
):
    """Get current user information"""
    return {
        "user_id": str(current_user.id),
        "email": current_user.email,
        "onboarding_completed": current_user.onboarding_completed,
        "selected_categories": current_user.selected_categories or [],
        "preference_expertise": current_user.preference_expertise
    }