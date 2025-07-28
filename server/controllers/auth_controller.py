from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from database import get_db, User
from services.auth_service import AuthService

router = APIRouter(prefix="/api/auth", tags=["authentication"])
security = HTTPBearer()
auth_service = AuthService()

# Request/Response models
class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class RefreshRequest(BaseModel):
    refresh_token: str

class AuthResponse(BaseModel):
    tokens: Dict[str, str]
    user: Dict[str, Any]

class LogoutResponse(BaseModel):
    message: str

# Dependency to get current user
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    token = credentials.credentials
    user = await auth_service.get_user_by_token(db, token)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user

@router.post("/register", response_model=AuthResponse)
async def register(
    request: RegisterRequest,
    db: Session = Depends(get_db)
):
    """Register a new user"""
    try:
        user = await auth_service.register_user(
            db, 
            request.email, 
            request.password, 
            request.name
        )
        
        tokens = auth_service.create_tokens(user)
        
        return AuthResponse(
            tokens=tokens,
            user={
                "id": str(user.id),
                "email": user.email,
                "name": user.name,
                "session_id": user.session_id,
                "onboarding_completed": user.onboarding_completed,
                "selected_categories": user.selected_categories or [],
                "preference_expertise": user.preference_expertise
            }
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed"
        )

@router.post("/login", response_model=AuthResponse)
async def login(
    request: LoginRequest,
    db: Session = Depends(get_db)
):
    """Login user"""
    user = await auth_service.authenticate_user(db, request.email, request.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    tokens = auth_service.create_tokens(user)
    
    return AuthResponse(
        tokens=tokens,
        user={
            "id": str(user.id),
            "email": user.email,
            "name": user.name,
            "session_id": user.session_id,
            "onboarding_completed": user.onboarding_completed,
            "selected_categories": user.selected_categories or [],
            "preference_expertise": user.preference_expertise
        }
    )

@router.post("/refresh", response_model=AuthResponse)
async def refresh_tokens(
    request: RefreshRequest,
    db: Session = Depends(get_db)
):
    """Refresh access token"""
    tokens = await auth_service.refresh_tokens(db, request.refresh_token)
    if not tokens:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Get user from refresh token
    payload = auth_service.verify_token(request.refresh_token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )
    
    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    
    return AuthResponse(
        tokens=tokens,
        user={
            "id": str(user.id),
            "email": user.email,
            "name": user.name,
            "session_id": user.session_id,
            "onboarding_completed": user.onboarding_completed,
            "selected_categories": user.selected_categories or [],
            "preference_expertise": user.preference_expertise
        }
    )

@router.post("/logout", response_model=LogoutResponse)
async def logout(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Logout user"""
    # In a production environment, you might want to add the token to a blacklist
    return LogoutResponse(message="Successfully logged out")

@router.get("/me", response_model=Dict[str, Any])
async def get_current_user_info(
    current_user = Depends(get_current_user)
):
    """Get current user information"""
    return {
        "id": str(current_user.id),
        "email": current_user.email,
        "name": current_user.name,
        "session_id": current_user.session_id,
        "onboarding_completed": current_user.onboarding_completed,
        "selected_categories": current_user.selected_categories or [],
        "preference_expertise": current_user.preference_expertise
    }