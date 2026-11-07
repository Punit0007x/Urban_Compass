#!/bin/bash

# Urban Compass - Start both Frontend and Backend

echo "🏗️  Urban Compass - Starting Services"
echo "=================================="

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if backend venv exists
if [ -d "backend/venv" ]; then
    echo -e "${BLUE}>>> Backend virtualenv found${NC}"
else
    echo -e "${YELLOW}>>> Creating backend virtualenv...${NC}"
    cd backend && python3 -m venv venv && cd ..
fi

# Start backend in background
echo -e "${BLUE}>>> Starting Backend Server (port 8000)...${NC}"
cd backend
source venv/bin/activate
pip install -q -r requirements.txt 2>/dev/null
python3 main.py &
BACKEND_PID=$!
cd ..

# Wait for backend to start
sleep 3

# Start frontend
echo -e "${BLUE}>>> Starting Frontend (port 8080)...${NC}"
npm run dev &
FRONTEND_PID=$!

echo ""
echo -e "${GREEN}=================================="
echo -e "✅ Services Started!"
echo -e "=================================="
echo -e "Frontend: http://localhost:8080"
echo -e "Backend:  http://localhost:8000"
echo -e "API Docs: http://localhost:8000/docs"
echo ""
echo -e "Press Ctrl+C to stop all services"
echo -e "${NC}"

# Handle shutdown
cleanup() {
    echo -e "\n${YELLOW}>>> Shutting down services...${NC}"
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit 0
}

trap cleanup SIGINT SIGTERM

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID