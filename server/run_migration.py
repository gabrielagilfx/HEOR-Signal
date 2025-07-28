#!/usr/bin/env python3
"""
Simple script to add authentication columns to the users table
"""
import os
import sys
from sqlalchemy import create_engine, text
from config import settings

def run_migration():
    """Add authentication columns to users table"""
    engine = create_engine(settings.database_url)
    
    with engine.connect() as conn:
        # Add the new columns
        conn.execute(text("""
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS name VARCHAR,
            ADD COLUMN IF NOT EXISTS email VARCHAR,
            ADD COLUMN IF NOT EXISTS password_hash VARCHAR
        """))
        
        # Create indexes
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS ix_users_email ON users(email)
        """))
        
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS ix_users_name ON users(name)
        """))
        
        # Make email unique
        conn.execute(text("""
            ALTER TABLE users 
            ADD CONSTRAINT IF NOT EXISTS users_email_unique UNIQUE (email)
        """))
        
        conn.commit()
        print("Migration completed successfully!")

if __name__ == "__main__":
    run_migration()