from sqlalchemy import Column, String, DateTime, ForeignKey, Boolean, ARRAY
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
from database import Base

class Thread(Base):
    __tablename__ = "threads"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    thread_id = Column(String, nullable=False)  # OpenAI thread ID
    title = Column(String, nullable=True)
    status = Column(String, default="active")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # New fields for thread-level onboarding and preferences
    onboarding_completed = Column(Boolean, default=False)
    selected_categories = Column(ARRAY(String), nullable=True)
    preference_expertise = Column(String, nullable=True)
    conversation_title = Column(String, nullable=True)
    last_activity = Column(DateTime(timezone=True), server_default=func.now())
    
    user = relationship("User")
    messages = relationship("Message", back_populates="thread")