from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db
from services.user_service import UserService

router = APIRouter(prefix="/api/user", tags=["user"])

class InitUserRequest(BaseModel):
    session_id: Optional[str] = None

user_service = UserService()

@router.post("/init", response_model=Dict[str, Any])
async def initialize_user(
    request: InitUserRequest,
    db: Session = Depends(get_db)
):
    """Initialize or retrieve user session"""
    try:
        user = await user_service.create_or_get_user(db, request.session_id)
        
        return {
            "success": True,
            "session_id": user.session_id,
            "onboarding_completed": user.onboarding_completed,
            "selected_categories": list(user.selected_categories) if user.selected_categories else []
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error initializing user: {str(e)}"
        )

@router.get("/status/{session_id}", response_model=Dict[str, Any])
async def get_user_status(session_id: str, db: Session = Depends(get_db)):
    """Get user onboarding status"""
    try:
        user = await user_service.create_or_get_user(db, session_id)
        
        return {
            "session_id": user.session_id,
            "onboarding_completed": user.onboarding_completed,
            "selected_categories": list(user.selected_categories) if user.selected_categories else []
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving user status: {str(e)}"
        )
