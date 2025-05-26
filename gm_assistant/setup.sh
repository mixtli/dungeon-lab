#!/bin/bash

# GM Assistant Setup Script
# This script sets up the GM Assistant environment using uv

set -e

echo "🎲 Setting up GM Assistant..."

# Check if uv is installed
if ! command -v uv &> /dev/null; then
    echo "❌ uv is not installed. Installing uv..."
    curl -LsSf https://astral.sh/uv/install.sh | sh
    echo "✅ uv installed successfully"
    echo "⚠️  Please restart your terminal or run: source ~/.bashrc"
    echo "   Then run this script again."
    exit 0
fi

# Create virtual environment
echo "📦 Creating virtual environment..."
uv venv

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source .venv/bin/activate

# Install the project
echo "📥 Installing GM Assistant and dependencies..."
uv pip install -e .

# Copy environment file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp env.example .env
    echo "✅ Created .env file. Please review and modify as needed."
else
    echo "ℹ️  .env file already exists"
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Activate the virtual environment: source .venv/bin/activate"
echo "2. Ensure Ollama is running: ollama serve"
echo "3. Pull required models:"
echo "   - ollama pull nomic-embed-text"
echo "   - ollama pull llama3"
echo "4. Generate the vector database: gm-assistant-import"
echo "5. Start the API: gm-assistant-api"
echo "   Or use the interactive agent: gm-assistant-agent"
echo ""
echo "For more information, see the README.md file." 