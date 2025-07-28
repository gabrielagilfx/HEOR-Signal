from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import OperationalError, DisconnectionError
from pydantic import BaseModel
import asyncio
from database import get_db
from services.user_service import UserService
from services.auth_service import AuthService

router = APIRouter(prefix="/api/user", tags=["user"])

class InitUserRequest(BaseModel):
    session_id: Optional[str] = None

class ResetOnboardingRequest(BaseModel):
    session_id: str

user_service = UserService()
auth_service = AuthService()

@router.post("/init", response_model=Dict[str, Any])
async def initialize_user(
    request: InitUserRequest,
    db: Session = Depends(get_db)
):
    """Initialize or retrieve user session"""
    max_retries = 3
    retry_delay = 1  # seconds
    
    for attempt in range(max_retries):
        try:
            # For new sessions, we can create a user without session_id
            # For registered users, we expect a session_id
            user = await user_service.create_or_get_user(db, request.session_id)
            
            return {
                "success": True,
                "session_id": user.session_id,
                "onboarding_completed": bool(user.onboarding_completed),
                "selected_categories": list(user.selected_categories) if user.selected_categories else [],
                "preference_expertise": getattr(user, 'preference_expertise', None)
            }
            
        except (OperationalError, DisconnectionError) as e:
            if attempt < max_retries - 1:
                print(f"Database connection error (attempt {attempt + 1}/{max_retries}): {e}")
                await asyncio.sleep(retry_delay)
                retry_delay *= 2  # Exponential backoff
                continue
            else:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Database connection temporarily unavailable. Please try again."
                )
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error initializing user: {str(e)}"
            )

@router.post("/new-chat", response_model=Dict[str, Any])
async def create_new_chat(
    request: ResetOnboardingRequest,
    db: Session = Depends(get_db)
):
    """Create a new chat session for the user"""
    max_retries = 3
    retry_delay = 1  # seconds
    
    for attempt in range(max_retries):
        try:
            # Get user by session ID
            user = auth_service.get_user_by_session_id(db, request.session_id)
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User not found"
                )
            
            # Create new chat session
            user = await user_service.create_new_chat(db, user.id)
            
            return {
                "success": True,
                "session_id": user.session_id,
                "onboarding_completed": bool(user.onboarding_completed),
                "selected_categories": list(user.selected_categories) if user.selected_categories else [],
                "preference_expertise": getattr(user, 'preference_expertise', None)
            }
            
        except (OperationalError, DisconnectionError) as e:
            if attempt < max_retries - 1:
                print(f"Database connection error (attempt {attempt + 1}/{max_retries}): {e}")
                await asyncio.sleep(retry_delay)
                retry_delay *= 2  # Exponential backoff
                continue
            else:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Database connection temporarily unavailable. Please try again."
                )
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error resetting onboarding: {str(e)}"
            )

@router.get("/status/{session_id}", response_model=Dict[str, Any])
async def get_user_status(session_id: str, db: Session = Depends(get_db)):
    """Get user onboarding status"""
    max_retries = 3
    retry_delay = 1  # seconds
    
    for attempt in range(max_retries):
        try:
            user = await user_service.create_or_get_user(db, session_id)
            
            return {
                "session_id": user.session_id,
                "onboarding_completed": bool(user.onboarding_completed),
                "selected_categories": list(user.selected_categories) if user.selected_categories else [],
                "preference_expertise": getattr(user, 'preference_expertise', None)
            }
            
        except (OperationalError, DisconnectionError) as e:
            if attempt < max_retries - 1:
                print(f"Database connection error (attempt {attempt + 1}/{max_retries}): {e}")
                await asyncio.sleep(retry_delay)
                retry_delay *= 2  # Exponential backoff
                continue
            else:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Database connection temporarily unavailable. Please try again."
                )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error retrieving user status: {str(e)}"
            )
