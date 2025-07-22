from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from ..models.user import User

class UserRepository:
    def create(self, db: Session, user_data: Dict[str, Any]) -> User:
        """Create a new user"""
        user = User(**user_data)
        db.add(user)
        db.commit()
        db.refresh(user)
        return user
    
    def get_by_id(self, db: Session, user_id: int) -> Optional[User]:
        """Get user by ID"""
        return db.query(User).filter(User.id == user_id).first()
    
    def get_by_session_id(self, db: Session, session_id: str) -> Optional[User]:
        """Get user by session ID"""
        return db.query(User).filter(User.session_id == session_id).first()
    
    def update(self, db: Session, user_id: int, update_data: Dict[str, Any]) -> User:
        """Update user"""
        user = self.get_by_id(db, user_id)
        if user:
            for key, value in update_data.items():
                setattr(user, key, value)
            db.commit()
            db.refresh(user)
        return user
    
    def delete(self, db: Session, user_id: int) -> bool:
        """Delete user"""
        user = self.get_by_id(db, user_id)
        if user:
            db.delete(user)
            db.commit()
            return True
        return False
