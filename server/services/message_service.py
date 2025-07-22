from typing import List, Dict, Any
from sqlalchemy.orm import Session
from models.chat import Message
from models.thread import Thread
from models.user import User

class MessageService:
    
    def create_message(self, db: Session, user_id: str, thread_id: str, role: str, content: str) -> Message:
        """Create a new message"""
        message = Message(
            user_id=user_id,
            thread_id=thread_id,
            role=role,
            content=content
        )
        
        db.add(message)
        db.commit()
        db.refresh(message)
        
        return message
    
    def get_thread_messages(self, db: Session, thread_id: str) -> List[Message]:
        """Get all messages for a thread ordered by creation time"""
        return db.query(Message).filter(
            Message.thread_id == thread_id
        ).order_by(Message.created_at.asc()).all()
    
    def get_user_messages(self, db: Session, user_id: str) -> List[Message]:
        """Get all messages for a user across all threads"""
        return db.query(Message).filter(
            Message.user_id == user_id
        ).order_by(Message.created_at.asc()).all()
    
    def get_messages_for_user_session(self, db: Session, session_id: str) -> List[Dict[str, Any]]:
        """Get formatted messages for a user session"""
        # Get user
        user = db.query(User).filter(User.session_id == session_id).first()
        if not user:
            return []
        
        # Get user's active thread
        thread = db.query(Thread).filter(
            Thread.user_id == user.id,
            Thread.status == "active"
        ).first()
        
        if not thread:
            return []
        
        # Get messages
        messages = self.get_thread_messages(db, str(thread.id))
        
        # Format messages
        formatted_messages = []
        for msg in messages:
            formatted_messages.append({
                "id": str(msg.id),
                "role": msg.role,
                "content": msg.content,
                "timestamp": msg.created_at.isoformat() if msg.created_at is not None else None
            })
        
        return formatted_messages
    
    def delete_message(self, db: Session, message_id: str) -> bool:
        """Delete a message"""
        message = db.query(Message).filter(Message.id == message_id).first()
        if message:
            db.delete(message)
            db.commit()
            return True
        return False
    
    def get_latest_message(self, db: Session, thread_id: str) -> Message:
        """Get the most recent message in a thread"""
        return db.query(Message).filter(
            Message.thread_id == thread_id
        ).order_by(Message.created_at.desc()).first()