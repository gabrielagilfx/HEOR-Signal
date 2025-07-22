#!/usr/bin/env python3
import os
import sys
import uvicorn

# Add server directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'server'))

# Change to server directory
os.chdir('server')

# Import the app
from main import app

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=5000, reload=False)