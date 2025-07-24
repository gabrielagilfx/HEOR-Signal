# HEOR Signal Dashboard

## Overview

The HEOR Signal Dashboard is a full-stack web application designed for healthcare professionals to monitor critical pharmaceutical industry data through personalized alerts and AI-powered chat assistance. The system combines real-time data monitoring with intelligent categorization to help users track regulatory changes, clinical developments, market updates, and real-world evidence in the HEOR (Health Economics and Outcomes Research) space.

**Status**: ✅ FULLY OPERATIONAL - Application successfully running with Python backend, React frontend, OpenAI integration, and PostgreSQL database. User onboarding flow and chat interface working correctly as of July 22, 2025.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Full-Stack Architecture
The application is built with a **Python FastAPI backend** and React TypeScript frontend. The backend provides complete OpenAI Assistant API integration for intelligent HEOR chat functionality, with PostgreSQL database integration for user session management.

**Status**: ✅ PRODUCTION READY - Python backend fully operational with OpenAI GPT-4 Assistant API, database connectivity, and all chat functionality implemented. Node.js backend completely removed. Frontend React components working correctly with proper state management.

**Rationale**: Python backend provides superior AI/ML capabilities and OpenAI integration, essential for the HEOR Signal chat assistant functionality.

## Recent Changes

### July 24, 2025 - Professional Landing Page + Deferred Initialization
- **Landing Page**: Created professional landing page component with clean design showcasing HEOR Signal features
- **User Flow**: Landing page now appears first without any backend initialization
- **Deferred Initialization**: User session only initializes when "Let's Chat" button is clicked
- **Improved UX**: No unnecessary API calls or loading screens until user explicitly starts interaction
- **Hero Branding**: Updated assistant name from "HEOR Assistant" to "Hero" throughout interface
- **Dashboard Layout**: Implemented 2-column grid layout for news cards with single loading skeleton
- **Status**: ✅ FULLY FUNCTIONAL - Landing page to chat initialization flow working perfectly

### July 23, 2025 - Complete Dashboard Navigation Flow + UI Polish
- **Dashboard Navigation**: Implemented complete 3-second timer navigation from expertise validation to dashboard
- **Backend Integration**: Fixed user status endpoint to include preference_expertise field for proper dashboard validation
- **UI Polish**: Hidden onboarding header when dashboard is displayed to prevent duplicate headers
- **Status Refresh**: Added automatic user status refresh mechanism to sync frontend with backend changes
- **Complete Flow**: Full user journey works: categories → expertise → 3-second pause → dashboard display
- **Responsive Design**: Dashboard fully responsive with proper dark/light theme support
- **Status**: ✅ FULLY FUNCTIONAL - Complete onboarding to dashboard navigation working perfectly

### July 23, 2025 - Healthcare Expertise Validation + UI Improvements  
- **AI Validation**: Implemented OpenAI-powered expertise validation for ALL healthcare fields
- **Inclusive Criteria**: System now accepts any legitimate healthcare/medical expertise including clinical treatments (CAR-T, oncology), pharmaceutical, HEOR, public health, medical professions
- **Smooth Chat UX**: Fixed message flashing by implementing incremental message addition instead of full reload
- **UI Layout**: Moved send button inline with chat input for better user experience
- **Database Enhancement**: Added `preference_expertise` VARCHAR(500) field with cascading deletion
- **Production Builds**: Automated build process for deployment-ready assets

### July 22, 2025 - Fixed Frontend Initialization Loop
- **Issue**: React component was stuck in infinite loop during user session initialization
- **Root Cause**: useEffect dependency array causing repeated API calls when sessionId changed
- **Solution**: Added isInitialized state flag to prevent repeated initialization attempts
- **Result**: Application now loads properly, shows welcome message, and category selection works correctly
- **Status**: ✅ RESOLVED - Application fully functional

### Frontend Architecture
- **Framework**: React with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query for server state management
- **UI Library**: shadcn/ui components with Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming
- **Build Tool**: Vite for fast development and optimized builds

**Rationale**: This modern React stack provides excellent developer experience, type safety, and performance while maintaining flexibility for complex UI interactions.

### Backend Architecture
The system implements a dual-backend approach:

1. **Node.js/Express Server** (`server/index.ts`):
   - Handles general API routing and middleware
   - Integrates with Vite for development
   - Uses in-memory storage with an abstracted storage interface

2. **Python/FastAPI Server** (`server/main.py`):
   - Manages AI integrations with OpenAI
   - Handles complex chat functionality
   - Implements robust service layer architecture

**Rationale**: The Python backend excels at AI/ML operations and data processing, while Node.js provides seamless integration with the frontend build process.

## Key Components

### Database Layer
- **ORM**: Drizzle ORM for TypeScript, SQLAlchemy for Python
- **Database**: PostgreSQL (configured for Neon Database)
- **Migration Management**: Drizzle Kit for schema migrations
- **Session Management**: PostgreSQL session store

**Rationale**: PostgreSQL provides robust data integrity and complex querying capabilities essential for healthcare data. Drizzle ORM offers excellent TypeScript integration while SQLAlchemy provides mature Python database interactions.

### Authentication & Session Management
- Session-based authentication using unique session IDs
- PostgreSQL session storage for persistence
- User initialization and status tracking

**Rationale**: Session-based auth is simpler to implement and manage than JWT tokens, especially for a dashboard application with persistent user preferences.

### AI Integration
- **OpenAI GPT-4 Integration**: For intelligent chat assistance
- **Assistant & Thread Management**: Maintains conversation context
- **Category-based Personalization**: Tailored responses based on user interests

**Rationale**: OpenAI's Assistants API provides sophisticated conversation management and context retention, essential for providing personalized HEOR guidance.

### UI Component System
- **Design System**: shadcn/ui with consistent theming
- **Accessibility**: Radix UI primitives ensure WCAG compliance
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Dark Mode Support**: CSS variables enable theme switching

**Rationale**: This approach ensures accessibility compliance (critical for healthcare applications) while maintaining design consistency and developer productivity.

## Data Flow

### User Onboarding Flow
1. User visits application → Session ID generated
2. User preferences collected → Stored in database
3. OpenAI Assistant & Thread created → Associated with user
4. Category selection → Personalizes future interactions

### Chat Interaction Flow
1. User sends message → Validated and stored
2. Message sent to OpenAI Assistant → Context-aware processing
3. Response received → Stored and displayed
4. Category-based filtering → Relevant information highlighted

### Data Persistence Flow
1. User interactions → PostgreSQL database
2. Session management → Connect-pg-simple
3. Real-time updates → TanStack Query invalidation
4. State synchronization → React Query cache management

## External Dependencies

### Core Technologies
- **Database**: PostgreSQL (Neon Database for cloud deployment)
- **AI Services**: OpenAI GPT-4 API
- **Authentication**: Session-based with PostgreSQL storage
- **Email/Notifications**: Not yet implemented (infrastructure ready)

### Development Tools
- **Build System**: Vite with TypeScript
- **Linting/Formatting**: ESLint and Prettier (implied by TypeScript setup)
- **Package Management**: npm with lock file
- **Development Environment**: Replit-optimized with hot reload

### Third-Party Libraries
- **UI Components**: Radix UI primitives
- **Styling**: Tailwind CSS with PostCSS
- **Date Handling**: date-fns for date manipulation
- **Form Management**: React Hook Form with Zod validation
- **Charts/Visualization**: Recharts (configured but not yet implemented)

## Deployment Strategy

### Production Build
- **Frontend**: Vite builds static assets to `dist/public`
- **Backend**: esbuild compiles Node.js server to `dist`
- **Database**: Drizzle migrations handle schema updates
- **Environment**: Production/development environment detection

### Development Environment
- **Hot Reload**: Vite HMR for frontend, tsx for backend
- **Database**: Development database URL configuration
- **API Proxy**: Vite proxies API requests to backend server
- **Error Handling**: Runtime error overlay for debugging

### Scalability Considerations
- **Database**: PostgreSQL connection pooling ready
- **Caching**: TanStack Query provides client-side caching
- **API Rate Limiting**: Structure ready for implementation
- **Session Storage**: PostgreSQL-based for horizontal scaling

**Rationale**: This deployment strategy balances development speed with production reliability, using modern tooling for optimal developer experience while maintaining production-ready architecture patterns.