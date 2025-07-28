from typing import Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from services.auth_service import AuthService
from models.user import User

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])
auth_service = AuthService()

# Dependency to get current user
async def get_current_user(
    authorization: str = Depends(),
    db: Session = Depends(get_db)
):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token = authorization.replace("Bearer ", "")
    user = await auth_service.get_user_by_token(db, token)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user

@router.get("/", response_model=Dict[str, Any])
async def get_dashboard_data(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get dashboard data for authenticated user"""
    
    # Mock data for demonstration - in a real app, this would come from your database
    recent_alerts = [
        {
            "id": "1",
            "title": "FDA Approves New HEOR Study Design",
            "category": "Regulatory",
            "date": "2024-01-15",
            "priority": "high"
        },
        {
            "id": "2",
            "title": "Updated Guidelines for Cost-Effectiveness Analysis",
            "category": "Clinical",
            "date": "2024-01-14",
            "priority": "medium"
        },
        {
            "id": "3",
            "title": "New Real-World Evidence Publication",
            "category": "Research",
            "date": "2024-01-13",
            "priority": "low"
        }
    ]
    
    stats = {
        "totalAlerts": 15,
        "unreadAlerts": 3,
        "categories": len(current_user.selected_categories) if current_user.selected_categories else 0
    }
    
    return {
        "user": {
            "id": str(current_user.id),
            "email": current_user.email,
            "name": current_user.name,
            "session_id": current_user.session_id,
            "onboarding_completed": current_user.onboarding_completed,
            "selected_categories": current_user.selected_categories or [],
            "preference_expertise": current_user.preference_expertise
        },
        "recentAlerts": recent_alerts,
        "stats": stats
    }