from typing import List, Dict, Any
from sqlalchemy.orm import Session
from models.chat import ChatMessage

class ChatRepository:
    def create_message(self, db: Session, message_data: Dict[str, Any]) -> ChatMessage:
        """Create a new chat message"""
        message = ChatMessage(**message_data)
        db.add(message)
        db.commit()
        db.refresh(message)
        return message
    
    def get_messages_by_user(self, db: Session, user_id: int, limit: int = 50) -> List[ChatMessage]:
        """Get chat messages for a user"""
        return (
            db.query(ChatMessage)
            .filter(ChatMessage.user_id == user_id)
            .order_by(ChatMessage.timestamp.desc())
            .limit(limit)
            .all()
        )
    
    def get_message_by_id(self, db: Session, message_id: str) -> ChatMessage:
        """Get message by message ID"""
        return db.query(ChatMessage).filter(ChatMessage.message_id == message_id).first()
