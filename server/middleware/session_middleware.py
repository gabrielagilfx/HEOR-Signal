from typing import Optional, Dict, Any
from fastapi import HTTPException, status, Request, Response
from sqlalchemy.orm import Session
from database import get_db
from models.user import User
import uuid
from datetime import datetime, timedelta
import json

class SessionManager:
    def __init__(self):
        self.session_duration = timedelta(days=30)  # 30 days for persistent sessions
        
    def create_session(self, response: Response, user_id: str, session_id: str) -> None:
        """Create a new session and set httpOnly cookie"""
        # Set httpOnly cookie for security
        response.set_cookie(
            key="heor_session",
            value=session_id,
            max_age=int(self.session_duration.total_seconds()),
            httponly=True,  # Prevents XSS attacks
            secure=True,    # HTTPS only in production
            samesite="lax"  # CSRF protection
        )
    
    def get_session_from_cookie(self, request: Request) -> Optional[str]:
        """Extract session ID from httpOnly cookie"""
        return request.cookies.get("heor_session")
    
    def clear_session(self, response: Response) -> None:
        """Clear session cookie on logout"""
        response.delete_cookie(
            key="heor_session",
            httponly=True,
            secure=True,
            samesite="lax"
        )
    
    def validate_session(self, db: Session, session_id: str) -> Optional[User]:
        """Validate session and return user if valid"""
        if not session_id:
            return None
            
        user = db.query(User).filter(User.session_id == session_id).first()
        return user

session_manager = SessionManager()

def get_current_user(request: Request, db: Session) -> Optional[User]:
    """Get current user from session cookie"""
    session_id = session_manager.get_session_from_cookie(request)
    if not session_id:
        return None
    
    return session_manager.validate_session(db, session_id)

def require_auth(request: Request, db: Session) -> User:
    """Require authentication, raise exception if not authenticated"""
    user = get_current_user(request, db)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    return user