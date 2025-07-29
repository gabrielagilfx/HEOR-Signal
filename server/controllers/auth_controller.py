from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
import bcrypt
from database import get_db
from models.user import User
from services.user_service import UserService

router = APIRouter(prefix="/api/auth", tags=["auth"])

class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class AuthResponse(BaseModel):
    success: bool
    user_id: str
    session_id: str
    name: str
    email: str
    onboarding_completed: bool
    selected_categories: list
    preference_expertise: str = None

user_service = UserService()

def hash_password(password: str) -> str:
    """Hash password using bcrypt"""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    """Verify password against hash"""
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

@router.post("/register", response_model=Dict[str, Any])
async def register_user(
    request: RegisterRequest,
    db: Session = Depends(get_db)
):
    """Register a new user"""
    try:
        # Check if user already exists
        existing_user = db.query(User).filter(User.email == request.email).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Hash password
        hashed_password = hash_password(request.password)
        
        # Create user with authenticated session
        user = await user_service.create_authenticated_user(
            db=db,
            name=request.name,
            email=request.email,
            password=hashed_password
        )
        
        return {
            "success": True,
            "user_id": str(user.id),
            "session_id": user.session_id,
            "name": user.name,
            "email": user.email,
            "onboarding_completed": bool(user.onboarding_completed),
            "selected_categories": list(user.selected_categories) if user.selected_categories else [],
            "preference_expertise": getattr(user, 'preference_expertise', None)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error registering user: {str(e)}"
        )

@router.post("/login", response_model=Dict[str, Any])
async def login_user(
    request: LoginRequest,
    db: Session = Depends(get_db)
):
    """Login user"""
    try:
        # Find user by email
        user = db.query(User).filter(User.email == request.email).first()
        if not user or not user.password:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        
        # Verify password
        if not verify_password(request.password, user.password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        
        # Update session for login
        user = await user_service.refresh_user_session(db, str(user.id))
        
        return {
            "success": True,
            "user_id": str(user.id),
            "session_id": user.session_id,
            "name": user.name,
            "email": user.email,
            "onboarding_completed": bool(user.onboarding_completed),
            "selected_categories": list(user.selected_categories) if user.selected_categories else [],
            "preference_expertise": getattr(user, 'preference_expertise', None)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error logging in user: {str(e)}"
        )

@router.post("/logout", response_model=Dict[str, Any])
async def logout_user():
    """Logout user (for future session management)"""
    return {"success": True, "message": "Logged out successfully"}