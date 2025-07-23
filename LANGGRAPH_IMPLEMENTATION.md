# LangGraph News Agents Implementation

## Overview

This document describes the comprehensive LangGraph system implemented for the HEOR Signal platform. The system consists of four parallel agents that retrieve and analyze the latest news based on user preferences and expertise areas.

## Architecture

### Core Components

1. **LangGraph Agents System** (`server/services/langgraph_agents.py`)
   - Four specialized agents running in parallel
   - User preference-based query generation
   - Multi-source news aggregation
   - Relevance scoring and filtering

2. **FastAPI Integration** (`server/controllers/news_controller.py`)
   - RESTful API endpoints
   - Background task processing
   - Real-time status updates

3. **React Frontend Integration** (`client/src/hooks/useNewsAgents.ts`)
   - Custom React hook for API integration
   - State management for loading and error states
   - Real-time updates

## Four Parallel Agents

### 1. Regulatory Agent (`AgentCategory.REGULATORY`)
**Purpose**: Monitor regulatory alerts, FDA approvals, EMA decisions, and compliance news

**Data Sources**:
- NIH API for clinical trial updates
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
- NIH API for clinical trials
- Medical journal RSS feeds
- Conference abstract databases

**Specialization**:
- Clinical trial results
- New treatment protocols
- Medical device approvals
- Biomarker discoveries
- Treatment efficacy studies

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

## User Preference System

### UserPreferences Structure
```python
@dataclass
class UserPreferences:
    expertise_areas: List[str]        # e.g., ["health economics", "market access"]
    therapeutic_areas: List[str]      # e.g., ["oncology", "cardiology"]
    regions: List[str]               # e.g., ["US", "EU", "Asia"]
    keywords: List[str]              # e.g., ["FDA approval", "drug pricing"]
    news_recency_days: int = 7       # Default: last 7 days
```

### Query Generation
Each agent generates specialized search queries based on:
- User's expertise areas
- Relevant therapeutic areas
- Geographic regions of interest
- Custom keywords
- Recency requirements

## API Integration

### NIH API Integration
- **API Key**: `3b04360966005dfdf1f14d28ef9a17961908`
- **Purpose**: Clinical trial data and research updates
- **Endpoints**: Clinical trials, research papers, grant information

### SERP API Integration
- **API Key**: `6a4387c40c2ca137f3cd364618e4e3eefd35d9a508f1c7093bb6edf0e951e764`
- **Purpose**: Google News search for regulatory and market news
- **Features**: Real-time news, filtering, relevance scoring

## Parallel Execution

### Workflow
1. **Initialization**: All four agents start simultaneously
2. **Query Generation**: Each agent generates specialized search queries
3. **Parallel Search**: Agents search their respective data sources concurrently
4. **Data Processing**: Results are filtered and scored for relevance
5. **Aggregation**: All results are combined with metadata

### Performance Benefits
- **Speed**: 4x faster than sequential execution
- **Efficiency**: Optimal resource utilization
- **Scalability**: Easy to add more agents
- **Reliability**: Isolated failure handling

## News Item Structure

```python
@dataclass
class NewsItem:
    id: str                    # Unique identifier
    title: str                 # News headline
    snippet: str               # Brief description
    source: str                # Publication source
    date: str                  # Publication date
    category: str              # Agent category
    url: str                   # Source URL
    relevance_score: float     # 0.0 - 1.0 relevance
    is_new: bool = True        # New vs. seen before
```

## API Endpoints

### Main News Endpoint
```http
POST /api/news/fetch
Content-Type: application/json

{
  "expertise_areas": ["health economics", "market access"],
  "therapeutic_areas": ["oncology", "cardiology"],
  "regions": ["US", "EU"],
  "keywords": ["FDA approval", "drug pricing"],
  "news_recency_days": 7
}
```

### Response Format
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

### Category-Specific Endpoints
- `POST /api/news/regulatory` - Regulatory news only
- `POST /api/news/clinical` - Clinical research only
- `POST /api/news/market` - Market access only
- `POST /api/news/rwe` - Real-world evidence only

### Utility Endpoints
- `GET /api/news/test-apis` - Test API connectivity
- `POST /api/news/preferences` - Save user preferences

## Frontend Integration

### React Hook Usage
```typescript
import { useNewsAgents } from '@/hooks/useNewsAgents';

function Dashboard() {
  const { newsData, loading, error, fetchNews } = useNewsAgents();
  
  const handleFetchNews = async () => {
    await fetchNews({
      expertise_areas: ["health economics"],
      therapeutic_areas: ["oncology"],
      regions: ["US"],
      keywords: ["FDA approval"],
      news_recency_days: 7
    });
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
The dashboard automatically:
- Fetches news when categories are selected
- Displays real-time loading states
- Shows error messages with retry options
- Updates news counters and indicators
- Provides relevance-based sorting

## Configuration

### Environment Variables
```bash
# OpenAI API (for query generation and relevance scoring)
OPENAI_API_KEY=your-openai-api-key

# News APIs
NIH_API_KEY=3b04360966005dfdf1f14d28ef9a17961908
SERP_API_KEY=6a4387c40c2ca137f3cd364618e4e3eefd35d9a508f1c7093bb6edf0e951e764

# Server Configuration
DATABASE_URL=postgresql://localhost/heor_signal
SECRET_KEY=your-secret-key
ENVIRONMENT=development
PORT=8000
```

## Error Handling

### Agent-Level Error Handling
- Individual agent failures don't affect others
- Graceful degradation with partial results
- Detailed error logging and reporting
- Automatic retry mechanisms

### API-Level Error Handling
- Rate limiting protection
- API key validation
- Timeout management
- Fallback data sources

## Performance Monitoring

### Metrics Tracked
- Individual agent execution time
- Total parallel processing time
- API response times
- Success/failure rates
- News item relevance scores

### Optimization Features
- Intelligent query caching
- Result deduplication
- Relevance-based filtering
- Configurable timeout limits

## Future Enhancements

### Planned Features
1. **Machine Learning Integration**
   - Personalized relevance scoring
   - User behavior learning
   - Predictive news recommendations

2. **Additional Data Sources**
   - More medical databases
   - International regulatory bodies
   - Social media sentiment analysis

3. **Advanced Analytics**
   - Trend analysis
   - Impact scoring
   - Competitive intelligence

4. **Real-time Updates**
   - WebSocket integration
   - Push notifications
   - Live news feeds

## Testing

The system includes comprehensive test coverage:
- Unit tests for individual agents
- Integration tests for API endpoints
- End-to-end tests for the full workflow
- Performance benchmarks

## Deployment

### Development
```bash
# Install dependencies
uv sync

# Start development server
cd server && python main.py

# Start frontend
npm run dev
```

### Production
- Docker containerization
- Environment-specific configurations
- Health check endpoints
- Monitoring and logging integration

---

This LangGraph implementation provides a robust, scalable, and efficient news intelligence system that can process multiple data sources in parallel while maintaining high relevance and user personalization.