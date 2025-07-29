import asyncio
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import uvicorn
import os
from config import settings
from database import engine, Base, get_db
from controllers import chat_controller, user_controller, news_controller

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="HEOR Signal API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(chat_controller.router)
app.include_router(user_controller.router)
app.include_router(news_controller.router)

# Health check endpoint
@app.get("/api/health")
async def health_check():
    # Test database connection
    try:
        db = next(get_db())
        # Try a simple query to test connection
        from sqlalchemy import text
        db.execute(text("SELECT 1"))
        db.close()
        db_status = "healthy"
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"
    
    return {
        "status": "healthy", 
        "service": "HEOR Signal API",
        "database": db_status
    }

# Serve static files for production, proxy to Vite in development
if os.path.exists("../dist/public"):
    # Mount static assets (CSS, JS, images) at /assets
    app.mount("/assets", StaticFiles(directory="../dist/public/assets"), name="assets")
    
    # Serve the SPA for all non-API routes
    @app.get("/{path:path}")
    async def serve_spa(path: str):
        # If it's an API route, let FastAPI handle it normally
        if path.startswith("api/"):
            raise HTTPException(status_code=404, detail="API endpoint not found")
        # For all other routes, serve the React app
        return FileResponse("../dist/public/index.html")
    
    # Serve index.html for root path  
    @app.get("/")
    async def serve_index():
        return FileResponse("../dist/public/index.html")
else:
    @app.get("/")
    async def serve_root():
        return {"message": "HEOR Signal API running", "frontend": "Build frontend with 'npm run build'"}

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=5000,
        reload=settings.environment == "development"
    )
