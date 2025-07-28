from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import OperationalError, DisconnectionError, IntegrityError
from pydantic import BaseModel, EmailStr
import asyncio
import uuid
from database import get_db
from services.auth_service import AuthService

router = APIRouter(prefix="/api/auth", tags=["auth"])

class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

auth_service = AuthService()

@router.post("/register", response_model=Dict[str, Any])
async def register_user(
    request: RegisterRequest,
    db: Session = Depends(get_db)
):
    """Register a new user"""
    max_retries = 3
    retry_delay = 1  # seconds
    
    for attempt in range(max_retries):
        try:
            # Check if user already exists
            existing_user = auth_service.get_user_by_email(db, request.email)
            if existing_user:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="User with this email already exists"
                )
            
            # Create new user
            session_id = str(uuid.uuid4())
            user = await auth_service.create_user(
                db=db,
                name=request.name,
                email=request.email,
                password=request.password,
                session_id=session_id
            )
            
            return {
                "success": True,
                "session_id": user.session_id,
                "message": "User registered successfully"
            }
            
        except IntegrityError:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="User with this email already exists"
            )
        except (OperationalError, DisconnectionError) as e:
            if attempt < max_retries - 1:
                print(f"Database connection error (attempt {attempt + 1}/{max_retries}): {e}")
                await asyncio.sleep(retry_delay)
                retry_delay *= 2  # Exponential backoff
                continue
            else:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Database connection temporarily unavailable. Please try again."
                )
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error registering user: {str(e)}"
            )

@router.post("/login", response_model=Dict[str, Any])
async def login_user(
    request: LoginRequest,
    db: Session = Depends(get_db)
):
    """Login user"""
    max_retries = 3
    retry_delay = 1  # seconds
    
    for attempt in range(max_retries):
        try:
            user = auth_service.authenticate_user(db, request.email, request.password)
            
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid email or password"
                )
            
            return {
                "success": True,
                "session_id": user.session_id,
                "message": "Login successful"
            }
            
        except (OperationalError, DisconnectionError) as e:
            if attempt < max_retries - 1:
                print(f"Database connection error (attempt {attempt + 1}/{max_retries}): {e}")
                await asyncio.sleep(retry_delay)
                retry_delay *= 2  # Exponential backoff
                continue
            else:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Database connection temporarily unavailable. Please try again."
                )
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error logging in: {str(e)}"
            )