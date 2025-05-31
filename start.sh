#!/bin/bash

echo "🚀 Starting Interview Recording Backend..."

# Check if virtual environment exists
if [ ! -d ".venv" ]; then
    echo "Creating virtual environment..."
    uv venv .venv
fi

# Activate virtual environment
source .venv/bin/activate

# Install dependencies
echo "📦 Installing dependencies..."
uv pip install -r requirements.txt

# Set Flask environment variables for hot reload
export FLASK_DEBUG=1
export FLASK_ENV=development

# Start backend server
echo "🔧 Starting backend server on port 8000 with hot reload..."
cd backend
python main.py

echo "✅ Backend started!"
echo "   Backend API: http://localhost:8000/api/health"
echo ""
echo "🔄 Hot reload is active - files will automatically reload on save"
echo "Press Ctrl+C to stop the server..." 