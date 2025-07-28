from typing import Dict, Any, Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import OperationalError, DisconnectionError
from pydantic import BaseModel
import asyncio
from database import get_db
from services.thread_service import ThreadService
from services.auth_service import AuthService

router = APIRouter(prefix="/api/thread", tags=["thread"])

class CreateThreadRequest(BaseModel):
    session_id: str
    selected_categories: Optional[List[str]] = None
    preference_expertise: Optional[str] = None
    conversation_title: Optional[str] = None

class UpdateThreadPreferencesRequest(BaseModel):
    selected_categories: Optional[List[str]] = None
    preference_expertise: Optional[str] = None
    conversation_title: Optional[str] = None

thread_service = ThreadService()
auth_service = AuthService()

@router.post("/create", response_model=Dict[str, Any])
async def create_new_thread(
    request: CreateThreadRequest,
    db: Session = Depends(get_db)
):
    """Create a new thread for an existing user"""
    max_retries = 3
    retry_delay = 1  # seconds
    
    for attempt in range(max_retries):
        try:
            # Get the authenticated user
            user = auth_service.get_user_by_session_id(db, request.session_id)
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid session"
                )
            
            # Create new thread
            thread = await thread_service.create_new_thread(
                db=db,
                user_id=str(user.id),
                selected_categories=request.selected_categories,
                preference_expertise=request.preference_expertise,
                conversation_title=request.conversation_title
            )
            
            return {
                "success": True,
                "thread_id": str(thread.id),
                "thread_title": thread.conversation_title,
                "onboarding_completed": thread.onboarding_completed,
                "selected_categories": thread.selected_categories or [],
                "preference_expertise": thread.preference_expertise
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
                detail=f"Error creating thread: {str(e)}"
            )

@router.get("/user/{session_id}", response_model=Dict[str, Any])
async def get_user_threads(session_id: str, db: Session = Depends(get_db)):
    """Get all threads for a user"""
    max_retries = 3
    retry_delay = 1  # seconds
    
    for attempt in range(max_retries):
        try:
            # Get the authenticated user
            user = auth_service.get_user_by_session_id(db, session_id)
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid session"
                )
            
            # Get user threads
            threads = await thread_service.get_user_threads(db, str(user.id))
            
            thread_list = []
            for thread in threads:
                thread_list.append({
                    "id": str(thread.id),
                    "title": thread.conversation_title,
                    "created_at": thread.created_at.isoformat(),
                    "last_activity": thread.last_activity.isoformat() if thread.last_activity else None,
                    "onboarding_completed": thread.onboarding_completed,
                    "selected_categories": thread.selected_categories or [],
                    "preference_expertise": thread.preference_expertise
                })
            
            return {
                "success": True,
                "threads": thread_list
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
                detail=f"Error retrieving threads: {str(e)}"
            )

@router.put("/{thread_id}/preferences", response_model=Dict[str, Any])
async def update_thread_preferences(
    thread_id: str,
    request: UpdateThreadPreferencesRequest,
    db: Session = Depends(get_db)
):
    """Update thread preferences"""
    max_retries = 3
    retry_delay = 1  # seconds
    
    for attempt in range(max_retries):
        try:
            # Update thread preferences
            thread = await thread_service.update_thread_preferences(
                db=db,
                thread_id=thread_id,
                selected_categories=request.selected_categories,
                preference_expertise=request.preference_expertise,
                conversation_title=request.conversation_title
            )
            
            if not thread:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Thread not found"
                )
            
            return {
                "success": True,
                "thread_id": str(thread.id),
                "thread_title": thread.conversation_title,
                "onboarding_completed": thread.onboarding_completed,
                "selected_categories": thread.selected_categories or [],
                "preference_expertise": thread.preference_expertise
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
                detail=f"Error updating thread preferences: {str(e)}"
            )