#!/bin/bash
echo "Starting HEOR Signal development environment..."
echo "Backend: Python FastAPI on port 5000"
echo "Frontend: Vite dev server on port 3000"

# Kill any existing processes
pkill -f "python main.py" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true

# Start backend in background
cd server && python main.py &
BACKEND_PID=$!

# Wait for backend to start
sleep 2

# Start frontend in background
cd ../client && npx vite --port 3000 --host 0.0.0.0 &
FRONTEND_PID=$!

echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"
echo ""
echo "🚀 Development servers starting..."
echo "📡 API: http://localhost:5000"
echo "🌐 Frontend: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop both servers"

# Function to cleanup on exit
cleanup() {
    echo "Stopping servers..."
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    pkill -f "python main.py" 2>/dev/null || true
    pkill -f "vite" 2>/dev/null || true
    exit 0
}

# Set trap to cleanup on script exit
trap cleanup SIGINT SIGTERM

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID