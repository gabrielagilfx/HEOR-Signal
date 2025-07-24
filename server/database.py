from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from config import settings

# Create Base first
Base = declarative_base()

# Add connection pooling and timeout settings
engine = create_engine(
    settings.database_url,
    pool_size=10,  # Number of connections to maintain
    max_overflow=20,  # Additional connections that can be created
    pool_timeout=30,  # Timeout for getting connection from pool
    pool_recycle=3600,  # Recycle connections after 1 hour
    pool_pre_ping=True,  # Validate connections before use
    echo=False  # Set to True for SQL debugging
)
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
