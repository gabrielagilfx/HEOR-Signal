from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from sqlalchemy.exc import OperationalError, DisconnectionError
from pydantic import BaseModel
import asyncio
from database import get_db
from services.user_service import UserService
from auth import get_current_user, verify_token

router = APIRouter(prefix="/api/user", tags=["user"])

class InitUserRequest(BaseModel):
    session_id: Optional[str] = None

user_service = UserService()

@router.post("/init", response_model=Dict[str, Any])
async def initialize_user(
    request: InitUserRequest,
    db: Session = Depends(get_db),
    authorization: Optional[str] = Header(None)
):
    """Initialize or retrieve user session (supports both auth methods)"""
    max_retries = 3
    retry_delay = 1  # seconds
    
    for attempt in range(max_retries):
        try:
            # Check if user is authenticated via JWT
            if authorization and authorization.startswith("Bearer "):
                token = authorization.replace("Bearer ", "")
                payload = verify_token(token)
                if payload:
                    user_id = payload.get("sub")
                    user = await user_service.get_current_user(db, user_id)
                    if user:
                        return {
                            "success": True,
                            "user_id": str(user.id),
                            "email": user.email,
                            "onboarding_completed": bool(user.onboarding_completed),
                            "selected_categories": list(user.selected_categories) if user.selected_categories else [],
                            "preference_expertise": getattr(user, 'preference_expertise', None),
                            "is_authenticated": True
                        }
            
            # Fallback to session-based authentication
            user = await user_service.create_or_get_user(db, request.session_id)
            
            return {
                "success": True,
                "session_id": user.session_id,
                "onboarding_completed": bool(user.onboarding_completed),
                "selected_categories": list(user.selected_categories) if user.selected_categories else [],
                "preference_expertise": getattr(user, 'preference_expertise', None),
                "is_authenticated": False
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
                detail=f"Error initializing user: {str(e)}"
            )

@router.get("/status/{session_id}", response_model=Dict[str, Any])
async def get_user_status(
    session_id: str, 
    db: Session = Depends(get_db),
    authorization: Optional[str] = Header(None)
):
    """Get user onboarding status (supports both auth methods)"""
    max_retries = 3
    retry_delay = 1  # seconds
    
    for attempt in range(max_retries):
        try:
            # Check if user is authenticated via JWT
            if authorization and authorization.startswith("Bearer "):
                token = authorization.replace("Bearer ", "")
                payload = verify_token(token)
                if payload:
                    user_id = payload.get("sub")
                    user = await user_service.get_current_user(db, user_id)
                    if user:
                        return {
                            "user_id": str(user.id),
                            "email": user.email,
                            "onboarding_completed": bool(user.onboarding_completed),
                            "selected_categories": list(user.selected_categories) if user.selected_categories else [],
                            "preference_expertise": getattr(user, 'preference_expertise', None),
                            "is_authenticated": True
                        }
            
            # Fallback to session-based authentication
            user = await user_service.create_or_get_user(db, session_id)
            
            return {
                "session_id": user.session_id,
                "onboarding_completed": bool(user.onboarding_completed),
                "selected_categories": list(user.selected_categories) if user.selected_categories else [],
                "preference_expertise": getattr(user, 'preference_expertise', None),
                "is_authenticated": False
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
