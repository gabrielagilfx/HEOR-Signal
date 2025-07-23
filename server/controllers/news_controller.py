from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import List, Dict, Optional
import asyncio
from datetime import datetime

from services.langgraph_agents import news_agents, UserPreferences, NewsItem

router = APIRouter(prefix="/api/news", tags=["news"])


class UserPreferencesRequest(BaseModel):
    expertise_areas: List[str]
    therapeutic_areas: List[str]
    regions: List[str]
    keywords: List[str]
    news_recency_days: int = 7


class NewsResponse(BaseModel):
    id: str
    title: str
    snippet: str
    source: str
    date: str
    category: str
    url: str
    relevance_score: float
    is_new: bool = True


class NewsAggregateResponse(BaseModel):
    regulatory: List[NewsResponse]
    clinical: List[NewsResponse]
    market: List[NewsResponse]
    rwe: List[NewsResponse]
    processing_time: float
    timestamp: str


@router.post("/fetch-parallel", response_model=NewsAggregateResponse)
async def fetch_news_parallel(preferences: UserPreferencesRequest):
    """
    Fetch news from all four agents in parallel based on user preferences
    """
    try:
        start_time = datetime.now()
        
        # Convert request to UserPreferences
        user_prefs = UserPreferences(
            expertise_areas=preferences.expertise_areas,
            therapeutic_areas=preferences.therapeutic_areas,
            regions=preferences.regions,
            keywords=preferences.keywords,
            news_recency_days=preferences.news_recency_days
        )
        
        # Run all agents in parallel
        results = await news_agents.run_parallel_agents(user_prefs)
        
        # Convert results to response format
        response_data = {
            "regulatory": [
                NewsResponse(
                    id=item.id,
                    title=item.title,
                    snippet=item.snippet,
                    source=item.source,
                    date=item.date,
                    category=item.category,
                    url=item.url,
                    relevance_score=item.relevance_score,
                    is_new=item.is_new
                ) for item in results.get("regulatory", [])
            ],
            "clinical": [
                NewsResponse(
                    id=item.id,
                    title=item.title,
                    snippet=item.snippet,
                    source=item.source,
                    date=item.date,
                    category=item.category,
                    url=item.url,
                    relevance_score=item.relevance_score,
                    is_new=item.is_new
                ) for item in results.get("clinical", [])
            ],
            "market": [
                NewsResponse(
                    id=item.id,
                    title=item.title,
                    snippet=item.snippet,
                    source=item.source,
                    date=item.date,
                    category=item.category,
                    url=item.url,
                    relevance_score=item.relevance_score,
                    is_new=item.is_new
                ) for item in results.get("market", [])
            ],
            "rwe": [
                NewsResponse(
                    id=item.id,
                    title=item.title,
                    snippet=item.snippet,
                    source=item.source,
                    date=item.date,
                    category=item.category,
                    url=item.url,
                    relevance_score=item.relevance_score,
                    is_new=item.is_new
                ) for item in results.get("rwe", [])
            ]
        }
        
        end_time = datetime.now()
        processing_time = (end_time - start_time).total_seconds()
        
        return NewsAggregateResponse(
            **response_data,
            processing_time=processing_time,
            timestamp=end_time.isoformat()
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching news: {str(e)}")


@router.post("/fetch-category/{category}")
async def fetch_news_single_category(
    category: str, 
    preferences: UserPreferencesRequest
):
    """
    Fetch news from a single category agent
    """
    try:
        if category not in ["regulatory", "clinical", "market", "rwe"]:
            raise HTTPException(status_code=400, detail="Invalid category")
        
        user_prefs = UserPreferences(
            expertise_areas=preferences.expertise_areas,
            therapeutic_areas=preferences.therapeutic_areas,
            regions=preferences.regions,
            keywords=preferences.keywords,
            news_recency_days=preferences.news_recency_days
        )
        
        # Run all agents and return only the requested category
        results = await news_agents.run_parallel_agents(user_prefs)
        
        category_results = results.get(category, [])
        
        return {
            "category": category,
            "news_items": [
                NewsResponse(
                    id=item.id,
                    title=item.title,
                    snippet=item.snippet,
                    source=item.source,
                    date=item.date,
                    category=item.category,
                    url=item.url,
                    relevance_score=item.relevance_score,
                    is_new=item.is_new
                ) for item in category_results
            ],
            "count": len(category_results),
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching {category} news: {str(e)}")


@router.get("/health")
async def health_check():
    """Health check for news service"""
    return {
        "status": "healthy",
        "service": "LangGraph News Agents",
        "agents": ["regulatory", "clinical", "market", "rwe"],
        "timestamp": datetime.now().isoformat()
    }


@router.get("/test-apis")
async def test_apis():
    """Test API connectivity"""
    try:
        # Test SERP API
        serp_test = await news_agents._search_with_serp("FDA approval test", num_results=1)
        serp_status = "connected" if serp_test else "error"
        
        # Test NIH API (ClinicalTrials.gov)
        try:
            async with news_agents.http_client as client:
                response = await client.get(
                    "https://clinicaltrials.gov/api/query/study_fields",
                    params={"expr": "cancer", "fields": "NCTId", "min_rnk": 1, "max_rnk": 1, "fmt": "json"}
                )
                nih_status = "connected" if response.status_code == 200 else "error"
        except:
            nih_status = "error"
        
        return {
            "serp_api": serp_status,
            "nih_api": nih_status,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error testing APIs: {str(e)}")