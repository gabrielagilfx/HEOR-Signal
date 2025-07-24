from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import OperationalError, DisconnectionError
from pydantic import BaseModel
import asyncio
import re
from database import get_db
from services.user_service import UserService

router = APIRouter(prefix="/api/user", tags=["user"])

class InitUserRequest(BaseModel):
    session_id: Optional[str] = None

user_service = UserService()

def is_ssl_error(error_message: str) -> bool:
    """Check if the error is SSL-related"""
    ssl_patterns = [
        r"SSL connection has been closed unexpectedly",
        r"SSL error",
        r"ssl handshake",
        r"certificate verify failed",
        r"ssl alert",
        r"ssl error"
    ]
    error_lower = error_message.lower()
    return any(re.search(pattern, error_lower) for pattern in ssl_patterns)

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
            user = await user_service.create_or_get_user(db, request.session_id)
            
            return {
                "success": True,
                "session_id": user.session_id,
                "onboarding_completed": bool(user.onboarding_completed),
                "selected_categories": list(user.selected_categories) if user.selected_categories else [],
                "preference_expertise": getattr(user, 'preference_expertise', None)
            }
            
        except (OperationalError, DisconnectionError) as e:
            error_message = str(e)
            print(f"Database connection error (attempt {attempt + 1}/{max_retries}): {error_message}")
            
            if is_ssl_error(error_message):
                print(f"SSL-related database error detected: {error_message}")
                if attempt < max_retries - 1:
                    await asyncio.sleep(retry_delay)
                    retry_delay *= 2  # Exponential backoff
                    continue
                else:
                    raise HTTPException(
                        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                        detail="Database SSL connection issue. Please try again in a moment."
                    )
            else:
                if attempt < max_retries - 1:
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
            error_message = str(e)
            print(f"Database connection error (attempt {attempt + 1}/{max_retries}): {error_message}")
            
            if is_ssl_error(error_message):
                print(f"SSL-related database error detected: {error_message}")
                if attempt < max_retries - 1:
                    await asyncio.sleep(retry_delay)
                    retry_delay *= 2  # Exponential backoff
                    continue
                else:
                    raise HTTPException(
                        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                        detail="Database SSL connection issue. Please try again in a moment."
                    )
            else:
                if attempt < max_retries - 1:
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
