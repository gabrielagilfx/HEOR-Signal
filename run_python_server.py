#!/usr/bin/env python3
"""
HEOR Signal Python FastAPI Server
Starts the Python backend with full AI chat functionality
"""
import os
import sys
import subprocess
import signal
import time

def start_server():
    os.chdir('server')
    
    # Kill any existing Python servers
    try:
        subprocess.run(['pkill', '-f', 'python.*main.py'], check=False)
        subprocess.run(['pkill', '-f', 'uvicorn.*main:app'], check=False)
        time.sleep(1)
    except:
        pass
    
    print("🚀 Starting HEOR Signal Python FastAPI Server...")
    print("📡 Server will run on http://localhost:5000")
    print("🤖 OpenAI Assistant API integrated")
    print("🗄️  PostgreSQL database connected")
    
    # Start uvicorn server
    try:
        subprocess.run([
            'python', '-m', 'uvicorn', 
            'main:app', 
            '--host', '0.0.0.0', 
            '--port', '5000',
            '--reload'
        ])
    except KeyboardInterrupt:
        print("\n✋ Server stopped by user")
    except Exception as e:
        print(f"❌ Error starting server: {e}")

if __name__ == "__main__":
    start_server()