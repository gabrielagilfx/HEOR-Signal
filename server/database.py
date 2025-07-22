from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from config import settings

# Create Base first
Base = declarative_base()

engine = create_engine(settings.database_url)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Import models after Base is defined to register them
from models.user import User
from models.chat import Message  
from models.thread import Thread

# Export everything for easy importing
__all__ = ['Base', 'engine', 'SessionLocal', 'get_db', 'User', 'Message', 'Thread']
