# D&D 5e DM Helper RAG Pipeline

This project creates a Retrieval-Augmented Generation (RAG) pipeline for Dungeons & Dragons 5th Edition rules, creating a vector database that can be used by a DM helper chatbot.

## Features

- Loads and processes the D&D 5e SRD PDF using Docling
- Uses intelligent document chunking (DOC_CHUNKS) for better semantic segmentation
- Splits the content into manageable, logically coherent chunks
- Generates vector embeddings using Ollama (local LLM)
- Stores the embeddings in a Chroma vector database
- Provides test functionality to verify retrieval quality
- Includes an interactive query tool to ask D&D questions

## Content Processing Approach

The pipeline uses a two-step chunking approach:

1. **Docling's DOC_CHUNKS**: Splits the PDF into logical sections based on document structure
2. **RecursiveCharacterTextSplitter**: Further refines chunks to optimal size for embedding

This dual approach ensures:
- Chunks respect content boundaries (chapters, sections)
- Each chunk is semantically coherent
- Better retrieval relevance for the chatbot

## Quick Start

For the fastest setup, run the automated setup script:

```bash
cd gm_assistant
./setup.sh
```

This will install uv (if needed), create a virtual environment, install dependencies, and guide you through the remaining setup steps.

## Prerequisites

- [Ollama](https://ollama.ai/) installed and running locally
- Python 3.8+ installed
- Recommended embedding model: `nomic-embed-text` (install with `ollama pull nomic-embed-text`)
- Recommended LLM model: `llama3` or another model that can handle chat tasks (install with `ollama pull llama3`)

## Setup

### Using UV (Recommended)

1. Install [uv](https://docs.astral.sh/uv/) if you haven't already:
   ```bash
   curl -LsSf https://astral.sh/uv/install.sh | sh
   ```

2. Create and activate the virtual environment:
   ```bash
   cd gm_assistant
   uv venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   ```

3. Install the project and dependencies:
   ```bash
   uv pip install -e .
   ```

4. Ensure Ollama is running:
   ```bash
   ollama serve
   ```

### Using pip (Alternative)

1. Create a virtual environment:
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   ```

2. Install required packages:
   ```bash
   pip install -r requirements.txt
   ```

3. Ensure Ollama is running:
   ```bash
   ollama serve
   ```

### Final Setup Steps

The pipeline will download the PDF automatically. The first run might take longer as it downloads and processes the PDF.

## Usage

### Step 1: Generate the Vector Database

Run the import script to generate the vector database:

#### Using UV (with entry points):
```bash
gm-assistant-import
```

#### Using Python directly:
```bash
python src/import_dnd_rules.py
```

#### Command Line Options for Import

- `--model`: Specify Ollama embedding model (default: "nomic-embed-text")
- `--base-url`: Custom Ollama API URL (default: "http://localhost:11434")
- `--test-query`: Custom query for testing retrieval (default: "What are spell slots?")

Example:
```bash
gm-assistant-import --model=nomic-embed-text --test-query="How does combat work?"
# Or with Python:
python src/import_dnd_rules.py --model=nomic-embed-text --test-query="How does combat work?"
```

### Step 2: Query the Database

#### Interactive Agent

You can use the interactive agent:

#### Using UV (with entry points):
```bash
gm-assistant-agent
```

#### Using Python directly:
```bash
python src/agent.py
```

This will start an interactive session where you can ask D&D rules questions.

#### FastAPI Web Service

Run the assistant as a web service for integration with other applications:

#### Using UV (with entry points):
```bash
gm-assistant-api
```

#### Using Python directly:
```bash
python src/start_api.py
```

Or directly:
```bash
python src/api.py
```

The API will start on `http://localhost:8000` by default.

#### Command Line Options for Agent

- `--embed-model`: Ollama embedding model (default: "nomic-embed-text")
- `--llm-model`: Ollama LLM model for generating answers (default: "llama3")
- `--base-url`: Custom Ollama API URL (default: "http://localhost:11434")
- `--temperature`: Temperature for LLM responses (0.0-1.0, default: 0.0)
- `--query`: Single query to run (if not provided, interactive mode is started)

Example:
```bash
gm-assistant-agent --llm-model=llama3 --query="What are the rules for spellcasting?"
# Or with Python:
python src/agent.py --llm-model=llama3 --query="What are the rules for spellcasting?"
```

## API Documentation

### Endpoints

- `GET /health` - Health check endpoint
- `GET /status` - Detailed status with metrics and active sessions
- `POST /chat` - Main chat endpoint for D&D questions
- `POST /chat/session/{session_id}` - Chat with specific session ID
- `POST /chat/session/{session_id}/clear` - Clear conversation memory for session
- `GET /chat/sessions` - List all active sessions

### API Usage Examples

#### Health Check
```bash
curl http://localhost:8000/health
```

#### Chat Request
```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What are spell slots?", "session_id": "my-session"}'
```

#### Session-specific Chat
```bash
curl -X POST http://localhost:8000/chat/session/my-session \
  -H "Content-Type: application/json" \
  -d '{"message": "Tell me more about spell slot recovery"}'
```

### Test the API

Run the test script to verify all endpoints work correctly:

```bash
python src/test_api.py
```

### Configuration

The API can be configured using environment variables. Copy `env.example` to `.env` and modify as needed:

```bash
cp env.example .env
```

Available configuration options:

- `GM_ASSISTANT_HOST`: API host (default: "0.0.0.0")
- `GM_ASSISTANT_PORT`: API port (default: 8000)
- `GM_ASSISTANT_TEMPERATURE`: LLM temperature (default: 0.0)
- `GM_ASSISTANT_MAX_TOKENS`: Maximum tokens per response (default: 4096)
- `GM_ASSISTANT_SESSION_TIMEOUT`: Session timeout in seconds (default: 3600)
- `GM_ASSISTANT_MAX_SESSIONS`: Maximum concurrent sessions (default: 100)
- `GM_ASSISTANT_ENABLE_SOURCES`: Enable source citations (default: true)
- `GM_ASSISTANT_ENABLE_MEMORY`: Enable conversation memory (default: true)
- `OLLAMA_BASE_URL`: Ollama API URL (default: "http://localhost:11434")
- `OLLAMA_EMBED_MODEL`: Embedding model (default: "nomic-embed-text")
- `OLLAMA_LLM_MODEL`: LLM model (default: "llama3")

## Directory Structure

- `data/chroma_db/`: Contains the generated Chroma vector database

## Environment Variables (Optional)

You can set these environment variables to configure the default behavior:

- `OLLAMA_EMBED_MODEL`: Default embedding model name (default: "nomic-embed-text")
- `OLLAMA_LLM_MODEL`: Default LLM model name (default: "llama3")
- `OLLAMA_BASE_URL`: Default Ollama API URL (default: "http://localhost:11434")

## Next Steps

After setting up the RAG system, you can:

1. Integrate with web applications or Discord bots
2. Fine-tune prompts for D&D-specific responses
3. Add additional sourcebooks to enhance the knowledge base
4. Experiment with different Ollama models for improved performance 