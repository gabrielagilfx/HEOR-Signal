#!/usr/bin/env python3
"""
HEOR Signal Application Startup Script
Starts the complete HEOR Signal dashboard with Python FastAPI backend
"""
import os
import sys
import subprocess
import time
import signal
import threading
import requests
from pathlib import Path

def kill_existing_servers():
    """Kill any existing servers"""
    try:
        subprocess.run(['pkill', '-f', 'python.*main.py'], capture_output=True)
        subprocess.run(['pkill', '-f', 'uvicorn.*main:app'], capture_output=True)
        subprocess.run(['pkill', '-f', 'tsx.*server'], capture_output=True)
        time.sleep(1)
    except:
        pass

def build_frontend():
    """Build the React frontend"""
    print("📦 Building React frontend...")
    try:
        result = subprocess.run(['npm', 'run', 'build'], capture_output=True, text=True)
        if result.returncode == 0:
            print("✅ Frontend built successfully")
            return True
        else:
            print(f"❌ Frontend build failed: {result.stderr}")
            return False
    except Exception as e:
        print(f"❌ Error building frontend: {e}")
        return False

def start_python_server():
    """Start the Python FastAPI server"""
    print("🐍 Starting Python FastAPI server...")
    os.chdir('server')
    
    # Start the server
    try:
        process = subprocess.Popen([
            'python', '-m', 'uvicorn', 
            'main:app', 
            '--host', '0.0.0.0', 
            '--port', '5000',
            '--reload'
        ])
        
        # Wait for server to start
        time.sleep(3)
        
        # Test if server is running
        try:
            response = requests.get('http://localhost:5000/api/health', timeout=5)
            if response.status_code == 200:
                print("✅ Python FastAPI server running on http://localhost:5000")
                return process
            else:
                print(f"❌ Server health check failed: {response.status_code}")
                return None
        except requests.exceptions.RequestException as e:
            print(f"❌ Cannot connect to server: {e}")
            return None
            
    except Exception as e:
        print(f"❌ Error starting server: {e}")
        return None

def test_api_endpoints():
    """Test the API endpoints"""
    print("🧪 Testing API endpoints...")
    
    try:
        # Test health endpoint
        response = requests.get('http://localhost:5000/api/health')
        print(f"✅ Health check: {response.json()}")
        
        # Test user initialization
        response = requests.post('http://localhost:5000/api/user/init', 
                               json={'session_id': 'test_startup'})
        print(f"✅ User init: {response.json()}")
        
        # Test category selection
        response = requests.post('http://localhost:5000/api/chat/select-categories',
                               json={'session_id': 'test_startup', 
                                    'categories': ['regulatory_alerts']})
        print(f"✅ Category selection: {response.json()}")
        
        return True
        
    except Exception as e:
        print(f"❌ API test failed: {e}")
        return False

def main():
    """Main startup function"""
    print("🚀 Starting HEOR Signal Dashboard")
    print("=" * 50)
    
    # Kill existing servers
    kill_existing_servers()
    
    # Build frontend
    if not build_frontend():
        sys.exit(1)
    
    # Start Python server
    os.chdir('..')  # Go back to root
    server_process = start_python_server()
    
    if not server_process:
        print("❌ Failed to start server")
        sys.exit(1)
    
    # Test API endpoints
    os.chdir('..')  # Go back to root
    if test_api_endpoints():
        print("\n🎉 HEOR Signal Dashboard is ready!")
        print("📊 Frontend: http://localhost:5000")
        print("🔗 API: http://localhost:5000/api/health")
        print("🤖 OpenAI Assistant integrated")
        print("🗄️  PostgreSQL database connected")
        print("\nPress Ctrl+C to stop the server")
    else:
        print("❌ API tests failed")
        server_process.terminate()
        sys.exit(1)
    
    # Keep the server running
    try:
        server_process.wait()
    except KeyboardInterrupt:
        print("\n✋ Stopping HEOR Signal Dashboard...")
        server_process.terminate()
        print("👋 Goodbye!")

if __name__ == "__main__":
    main()