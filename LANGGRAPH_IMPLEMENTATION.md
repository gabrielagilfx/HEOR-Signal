# LangGraph News Agents Implementation

## Overview

This document describes the comprehensive LangGraph system implemented for the HEOR Signal platform. The system consists of four parallel agents that retrieve and analyze the latest news based on user preferences and expertise areas stored in the database. The system now features **personalized news delivery** that automatically adapts to each user's expertise and preferences.

## Architecture

### Core Components

1. **LangGraph Agents System** (`server/services/langgraph_agents.py`)
   - Four specialized agents running in parallel
   - **Database-integrated user preference system**
   - Multi-source news aggregation with fixed NIH API integration
   - Relevance scoring and filtering

2. **FastAPI Integration** (`server/controllers/news_controller.py`)
   - RESTful API endpoints with personalized news support
   - Background task processing
   - Real-time status updates

3. **React Frontend Integration** (`client/src/hooks/useNewsAgents.ts`)
   - Custom React hook for API integration
   - Personalized news fetching
   - State management for loading and error states

## Personalization System

### Database Integration

The system now automatically fetches user preferences from the database based on the user's session ID. This includes:

- **Expertise Areas**: Extracted from `preference_expertise` field
- **Therapeutic Areas**: Mapped from user expertise
- **Selected Categories**: From user's `selected_categories` field
- **Keywords**: Automatically generated based on expertise and categories

### User Preference Mapping

The system intelligently maps user expertise to relevant search parameters:

```python
expertise_mapping = {
    "oncology": {
        "therapeutic_areas": ["oncology", "cancer", "hematology"],
        "keywords": ["cancer treatment", "oncology drugs", "tumor", "chemotherapy"]
    },
    "cardiology": {
        "therapeutic_areas": ["cardiology", "cardiovascular"],
        "keywords": ["heart disease", "cardiovascular", "cardiac"]
    },
    "health economics": {
        "therapeutic_areas": ["general medicine"],
        "keywords": ["cost effectiveness", "health economics", "HEOR"]
    }
    # ... more mappings
}
```

## Four Parallel Agents

### 1. Regulatory Agent (`AgentCategory.REGULATORY`)
**Purpose**: Monitor regulatory alerts, FDA approvals, EMA decisions, and compliance news

**Data Sources**:
- SERP API for regulatory news
- RSS feeds from regulatory bodies

**Specialization**:
- FDA drug approvals and rejections
- EMA regulatory decisions
- Clinical trial phase updates
- Drug recalls and safety alerts
- Policy changes and guidance documents

### 2. Clinical Agent (`AgentCategory.CLINICAL`)
**Purpose**: Track clinical research, trial results, and medical breakthroughs

**Data Sources**:
- **Fixed NIH API v2** for clinical trials
- Medical journal RSS feeds
- Conference abstract databases

**NIH API Integration (FIXED)**:
- Now uses the correct ClinicalTrials.gov API v2 endpoint
- Endpoint: `https://clinicaltrials.gov/api/v2/studies`
- Improved data parsing and error handling
- Better integration with user preferences

### 3. Market Access Agent (`AgentCategory.MARKET_ACCESS`)
**Purpose**: Monitor payer decisions, reimbursement policies, and market access news

**Data Sources**:
- Health economics journals
- Payer organization websites
- Government health policy feeds

**Specialization**:
- Reimbursement decisions
- Health technology assessments (HTA)
- Payer coverage policies
- Drug pricing negotiations
- Market access strategies

### 4. Real-World Evidence Agent (`AgentCategory.RWE_PUBLIC_HEALTH`)
**Purpose**: Gather real-world evidence studies and public health data

**Data Sources**:
- Public health databases
- Real-world evidence studies
- Population health reports

**Specialization**:
- Real-world effectiveness studies
- Population health outcomes
- Health economic outcomes research
- Post-market surveillance data
- Comparative effectiveness research

## API Integration Updates

### NIH API Integration (FIXED)
- **New Endpoint**: `https://clinicaltrials.gov/api/v2/studies`
- **API Key**: `3b04360966005dfdf1f14d28ef9a17961908`
- **Purpose**: Clinical trial data and research updates
- **Improvements**: 
  - Updated to use ClinicalTrials.gov API v2
  - Better error handling and data parsing
  - Improved relevance scoring

### SERP API Integration
- **API Key**: `6a4387c40c2ca137f3cd364618e4e3eefd35d9a508f1c7093bb6edf0e951e764`
- **Purpose**: Google News search for regulatory and market news
- **Features**: Real-time news, filtering, relevance scoring

## API Endpoints

### New Personalized News Endpoint
```http
POST /api/news/fetch-personalized
Content-Type: application/json

{
  "session_id": "user-session-id"
}
```

**Response Format**:
```json
{
  "regulatory": [NewsItem...],
  "clinical": [NewsItem...],
  "market": [NewsItem...],
  "rwe": [NewsItem...],
  "processing_time": 2.5,
  "timestamp": "2024-01-23T18:45:00Z"
}
```

### Legacy Endpoint (Maintained for Backward Compatibility)
```http
POST /api/news/fetch-parallel
Content-Type: application/json

{
  "expertise_areas": ["health economics", "market access"],
  "therapeutic_areas": ["oncology", "cardiology"],
  "regions": ["US", "EU"],
  "keywords": ["FDA approval", "drug pricing"],
  "news_recency_days": 7
}
```

### Category-Specific Endpoints
- `POST /api/news/fetch-category/{category}` - Single category news

### Utility Endpoints
- `GET /api/news/test-apis` - Test API connectivity
- `GET /api/news/health` - Health check

## Frontend Integration

### Updated React Hook Usage
```typescript
import { useNewsAgents } from '@/hooks/useNewsAgents';

function Dashboard({ sessionId }: { sessionId: string }) {
  const { newsData, loading, error, fetchPersonalizedNews } = useNewsAgents();
  
  const handleFetchNews = async () => {
    // Automatically uses user preferences from database
    await fetchPersonalizedNews(sessionId);
  };
  
  return (
    <div>
      {loading && <LoadingSpinner />}
      {error && <ErrorAlert message={error} />}
      {newsData && <NewsDisplay data={newsData} />}
    </div>
  );
}
```

### Dashboard Integration
The dashboard now automatically:
- Fetches personalized news based on database preferences
- Shows personalization status indicator
- Updates when user preferences change
- Provides relevance-based sorting
- No longer requires manual preference input

## Key Improvements

### 1. Personalization
- **Automatic preference detection** from database
- **Intelligent keyword mapping** based on expertise
- **Dynamic therapeutic area assignment**
- **Category-based enhancement** of search terms

### 2. NIH API Fix
- **Updated to API v2** with correct endpoints
- **Improved data parsing** for better accuracy
- **Enhanced error handling** for reliability
- **Better integration** with user preferences

### 3. User Experience
- **Seamless personalization** without manual input
- **Real-time preference adaptation**
- **Clear personalization indicators**
- **Backward compatibility** maintained

## Configuration

### Environment Variables
```bash
# OpenAI API (for query generation and relevance scoring)
OPENAI_API_KEY=your-openai-api-key

# News APIs
NIH_API_KEY=3b04360966005dfdf1f14d28ef9a17961908
SERP_API_KEY=6a4387c40c2ca137f3cd364618e4e3eefd35d9a508f1c7093bb6edf0e951e764

# Database
DATABASE_URL=postgresql://localhost/heor_signal

# Server Configuration
SECRET_KEY=your-secret-key
ENVIRONMENT=development
PORT=8000
```

## Performance Monitoring

### Enhanced Metrics
- Individual agent execution time
- Database query performance
- User preference mapping accuracy
- NIH API v2 response times
- Personalization effectiveness

## Future Enhancements

### Planned Features
1. **Enhanced Personalization**
   - Learning from user interactions
   - Preference refinement over time
   - Cross-user similarity matching

2. **Advanced NIH Integration**
   - Additional NIH databases
   - Real-time trial status updates
   - Enhanced clinical data parsing

3. **Machine Learning Integration**
   - Personalized relevance scoring
   - User behavior learning
   - Predictive news recommendations

---

This updated LangGraph implementation provides a robust, personalized, and efficient news intelligence system that automatically adapts to user preferences while maintaining high reliability through the fixed NIH API integration.