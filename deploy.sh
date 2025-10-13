#!/bin/bash

# Prepmate Deployment Script
# This script helps deploy Prepmate to production

set -e

echo "🚀 Prepmate Deployment Script"
echo "=============================="

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Please copy env.example to .env and configure it."
    exit 1
fi

# Check if required environment variables are set
if [ -z "$GEMINI_API_KEY" ]; then
    echo "❌ GEMINI_API_KEY not set in .env file"
    exit 1
fi

if [ -z "$MONGO_URI" ]; then
    echo "❌ MONGO_URI not set in .env file"
    exit 1
fi

if [ -z "$JWT_SECRET" ]; then
    echo "❌ JWT_SECRET not set in .env file"
    exit 1
fi

echo "✅ Environment variables configured"

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --only=production

# Install client dependencies
echo "📦 Installing client dependencies..."
cd client
npm ci --only=production
cd ..

# Build frontend
echo "🔨 Building frontend..."
cd client
npm run build
cd ..

# Run tests
echo "🧪 Running tests..."
npm test

# Start the application
echo "🚀 Starting Prepmate..."
npm start

