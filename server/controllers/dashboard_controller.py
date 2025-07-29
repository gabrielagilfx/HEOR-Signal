from typing import Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db
from middleware.session_middleware import require_auth
from models.user import User

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

class NewsItem(BaseModel):
    title: str
    summary: str
    source: str
    date: str
    category: str

class DashboardData(BaseModel):
    news_items: List[NewsItem]
    alerts_count: int
    categories: List[str]

@router.get("", response_model=Dict[str, Any])
async def get_dashboard_data(
    request: Request,
    db: Session = Depends(get_db)
):
    """Get dashboard data for authenticated user"""
    user = require_auth(request, db)
    
    # For now, return mock data structure that matches frontend expectations
    # In production, this would fetch real data based on user's preferences
    mock_news_items = [
        {
            "title": "FDA Approves New Oncology Drug",
            "summary": "Recent approval demonstrates significant improvement in progression-free survival for advanced cancer patients.",
            "source": "FDA News",
            "date": "2025-07-29",
            "category": "Regulatory"
        },
        {
            "title": "Health Economics Study Shows Cost-Effectiveness",
            "summary": "Large-scale HEOR study provides evidence for improved patient outcomes and reduced healthcare costs.",
            "source": "HEOR Journal",
            "date": "2025-07-28",
            "category": "Economics"
        }
    ]
    
    return {
        "success": True,
        "news_items": mock_news_items,
        "alerts_count": 3,
        "categories": list(user.selected_categories) if user.selected_categories else []
    }