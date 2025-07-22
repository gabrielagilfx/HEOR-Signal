from sqlalchemy import create_engine, MetaData
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from config import settings

engine = create_engine(settings.database_url)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Import models to register them with Base
from models.user import User
from models.chat import ChatMessage

# Export models for easy importing
__all__ = ['Base', 'engine', 'SessionLocal', 'get_db', 'User', 'ChatMessage']
