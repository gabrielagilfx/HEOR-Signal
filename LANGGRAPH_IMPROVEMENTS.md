# LangGraph System Improvements

## Overview

This document outlines the major improvements made to the LangGraph news agents system to make it **personalized** and fix the **NIH API integration**. The system now automatically adapts to user preferences stored in the database and provides a seamless, personalized news experience.

## 🔧 Key Improvements

### 1. **Personalized News System** 
- ✅ **Database Integration**: Automatically fetches user preferences from the database
- ✅ **Intelligent Mapping**: Maps user expertise to relevant therapeutic areas and keywords
- ✅ **Category Enhancement**: Uses selected categories to enhance search terms
- ✅ **Seamless Experience**: No manual preference input required

### 2. **Fixed NIH API Integration**
- ✅ **Updated to API v2**: Now uses the correct `https://clinicaltrials.gov/api/v2/studies` endpoint
- ✅ **Improved Data Parsing**: Better handling of the new JSON structure
- ✅ **Enhanced Error Handling**: More robust error management
- ✅ **Better Integration**: Properly integrates with user preferences

### 3. **Enhanced User Experience**
- ✅ **New Personalized Endpoint**: `/api/news/fetch-personalized` using session_id
- ✅ **Backward Compatibility**: Legacy endpoints still work
- ✅ **Real-time Adaptation**: Updates when user preferences change
- ✅ **Clear Indicators**: Shows personalization status in UI

## 📁 Files Modified

### Backend Changes

#### `server/services/langgraph_agents.py`
- Added `_get_user_preferences_from_db()` method
- Added `run_parallel_agents_for_user()` method
- Fixed `_search_nih_clinical()` to use API v2
- Added intelligent expertise-to-keyword mapping

#### `server/controllers/news_controller.py`
- Added `/api/news/fetch-personalized` endpoint
- Updated test endpoint to use NIH API v2
- Maintained backward compatibility with existing endpoints

### Frontend Changes

#### `client/src/hooks/useNewsAgents.ts`
- Added `fetchPersonalizedNews()` method
- Updated interface for new functionality
- Maintained backward compatibility

#### `client/src/components/dashboard/heor-dashboard.tsx`
- Updated to use personalized news endpoint
- Removed manual preference configuration
- Added personalization status indicator

### Documentation

#### `LANGGRAPH_IMPLEMENTATION.md`
- Updated with personalization system details
- Added NIH API v2 information
- Updated API endpoint documentation
- Added new usage examples

## 🎯 Aggressive Personalization Enhancements

### Enhanced Relevance Filtering

The system now uses a **two-stage aggressive filtering process**:

#### Stage 1: Keyword Pre-filtering
- Creates comprehensive keyword sets from user expertise and therapeutic areas
- Calculates keyword match scores for quick filtering
- Prioritizes trusted sources (ClinicalTrials.gov, FDA, EMA)

#### Stage 2: Deep LLM Analysis
- **Much higher relevance threshold**: 0.65 (vs previous 0.4)
- **Personalized scoring criteria**:
  - Direct relevance to user's expertise area (40%)
  - Therapeutic area alignment (30%)
  - Actionable insights for HEOR work (20%)
  - Recency and impact potential (10%)

#### Personalization Boost System
- **Expertise matches**: +0.15 boost
- **Therapeutic area matches**: +0.12 boost
- **High-value keywords**: Up to +0.2 boost
  - "FDA approval": +0.2
  - "clinical trial results": +0.18
  - "breakthrough therapy": +0.15
  - "cost effectiveness": +0.15
- **Trusted sources**: Up to +0.15 boost

### Enhanced Query Generation

All agents now generate **5-7 highly targeted queries** instead of 3-5 generic ones:

#### Regulatory Agent Queries
```python
# Before (Generic)
"FDA approval oncology"
"regulatory guidance"

# After (Personalized)
"FDA approval oncology cost effectiveness"
"regulatory guidance oncology reimbursement" 
"EMA decision oncology market access"
```

#### Clinical Agent Queries
```python
# Before (Generic)
"clinical trial oncology"
"Phase III results"

# After (Personalized)
"Phase III oncology primary endpoint results"
"oncology breakthrough therapy designation FDA"
"clinical trial oncology cost effectiveness"
"real world evidence oncology outcomes"
```

#### Market Access Agent Queries
```python
# Before (Generic)
"payer coverage oncology"
"HEOR study"

# After (Personalized)
"ICER review oncology cost effectiveness 2024"
"oncology formulary coverage decision"
"Medicare reimbursement oncology policy"
"payer access oncology budget impact"
```

#### RWE Agent Queries
```python
# Before (Generic)
"real world evidence oncology"
"population health"

# After (Personalized)
"real world evidence oncology comparative effectiveness"
"oncology patient reported outcomes study"
"post market surveillance oncology safety"
"health economics oncology real world data"
```

### Results Quality Improvements

- **Reduced quantity, increased quality**: Top 8 items (vs previous 10)
- **Higher relevance threshold**: 0.65 minimum score
- **Better targeting**: Queries combine expertise + therapeutic areas + HEOR terms
- **Enhanced sorting**: Multi-factor ranking (relevance + recency + source trust)

## 🔍 Personalization Examples

### Example User: Oncology Health Economist

**Database Profile**:
- `preference_expertise`: "health economics"
- `selected_categories`: ["clinical", "market"]
- `therapeutic_areas`: ["oncology", "cancer"]

**Generated Queries**:
- "Phase III oncology primary endpoint results"
- "clinical trial oncology cost effectiveness"
- "ICER review oncology cost effectiveness 2024"
- "Medicare reimbursement oncology policy"

**Filtering Boosts**:
- News mentioning "oncology" gets +0.12 boost
- News mentioning "cost effectiveness" gets +0.15 boost
- News from "ClinicalTrials.gov" gets +0.1 boost
- Only news scoring 0.65+ after boosts is included

### Example User: Cardiology Market Access

**Database Profile**:
- `preference_expertise`: "market access"
- `selected_categories`: ["regulatory", "market"]
- `therapeutic_areas`: ["cardiology", "cardiovascular"]

**Generated Queries**:
- "FDA approval cardiology cost effectiveness"
- "regulatory guidance cardiology reimbursement"
- "ICER review cardiology cost effectiveness 2024"
- "cardiology formulary coverage decision"

**Result**: Highly targeted news about cardiovascular market access decisions, regulatory approvals with reimbursement implications, and HEOR studies specific to cardiology.

---

## 🚀 New API Endpoints

### Personalized News (New)
```http
POST /api/news/fetch-personalized
Content-Type: application/json

{
  "session_id": "user-session-id"
}
```

**Response**: Same format as existing endpoints, but content is personalized based on user's database preferences.

### Legacy Endpoints (Maintained)
- `POST /api/news/fetch-parallel` - Manual preferences
- `POST /api/news/fetch-category/{category}` - Single category
- `GET /api/news/test-apis` - API connectivity test
- `GET /api/news/health` - Health check

## 🧠 Intelligent Preference Mapping

The system now intelligently maps user expertise to relevant search parameters:

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

## 🔄 How It Works

### Before (Manual)
1. User selects categories
2. Frontend generates generic preferences
3. Agents search with generic terms
4. Results may not be relevant to user's expertise

### After (Personalized)
1. User selects categories
2. System fetches user's expertise from database
3. System maps expertise to relevant keywords/areas
4. Agents search with personalized, relevant terms
5. Results are highly relevant to user's specific expertise

## 🛠 NIH API v2 Integration

### Old Implementation (Broken)
```python
url = "https://clinicaltrials.gov/api/query/study_fields"
params = {
    "expr": query,
    "fields": "NCTId,BriefTitle,BriefSummary,StartDate,CompletionDate,Phase,Condition",
    "min_rnk": 1,
    "max_rnk": 20,
    "fmt": "json"
}
```

### New Implementation (Fixed)
```python
url = "https://clinicaltrials.gov/api/v2/studies"
params = {
    "query.term": query,
    "pageSize": 20,
    "format": "json"
}
```

### Improved Data Parsing
```python
# New structure handling
protocol_section = study.get("protocolSection", {})
identification_module = protocol_section.get("identificationModule", {})
description_module = protocol_section.get("descriptionModule", {})
status_module = protocol_section.get("statusModule", {})

nct_id = identification_module.get("nctId", "")
title = identification_module.get("briefTitle", "")
summary = description_module.get("briefSummary", "")
start_date = status_module.get("startDateStruct", {}).get("date", "")
```

## 🧪 Testing

Run the test script to verify all improvements:

```bash
cd /workspace
python3 test_improvements.py
```

Expected output:
```
🚀 Testing LangGraph Improvements
==================================================

🧪 Testing NIH API v2 integration...
✅ NIH API v2 working: Found X clinical trials
   Sample: Testing the Addition of KRT-232 (AMG 232) to Usual...
   Source: ClinicalTrials.gov
   URL: https://clinicaltrials.gov/study/NCT03031730

🧪 Testing user preference mapping...
✅ Expertise 'oncology' mapped correctly:
   Therapeutic areas: ['oncology', 'cancer', 'hematology']
   Keywords: ['cancer treatment', 'oncology drugs', 'tumor']...

🧪 Testing personalized news system...
✅ New personalized method exists
✅ User preference mapping method exists

==================================================
✅ All tests completed!

📋 Summary of improvements:
1. ✅ NIH API updated to v2 with correct endpoints
2. ✅ Database-integrated user preference system
3. ✅ Personalized news endpoint (/api/news/fetch-personalized)
4. ✅ Intelligent expertise-to-keyword mapping
5. ✅ Backward compatibility maintained
```

## 🎯 Benefits

### For Users
- **More Relevant News**: Content tailored to their specific expertise
- **Seamless Experience**: No manual preference configuration
- **Real-time Adaptation**: Updates automatically when preferences change
- **Better Clinical Data**: Fixed NIH integration provides accurate trial information

### For Developers
- **Cleaner Architecture**: Database-integrated preference system
- **Better Maintainability**: Centralized preference logic
- **Enhanced Reliability**: Fixed API integrations
- **Backward Compatibility**: Existing code continues to work

### For the System
- **Improved Performance**: More targeted searches
- **Higher Relevance**: Better matching of content to users
- **Scalable Architecture**: Easy to add new expertise mappings
- **Robust Integration**: Fixed NIH API ensures reliable data

## 🔮 Future Enhancements

1. **Machine Learning Integration**
   - Learn from user interactions
   - Improve relevance scoring over time
   - Predict user interests

2. **Advanced Personalization**
   - Cross-user similarity matching
   - Trending topics in user's field
   - Personalized notification preferences

3. **Enhanced NIH Integration**
   - Additional NIH databases
   - Real-time trial status updates
   - More detailed clinical data parsing

## 📞 Support

For questions about these improvements or issues with the personalized system, please refer to:

- **Documentation**: `LANGGRAPH_IMPLEMENTATION.md`
- **Test Script**: `test_improvements.py`
- **API Endpoints**: Updated in news controller
- **Frontend Integration**: Updated dashboard component

---

**Summary**: The LangGraph system now provides a fully personalized, database-integrated news experience with fixed NIH API integration, delivering highly relevant content to users based on their expertise and preferences.