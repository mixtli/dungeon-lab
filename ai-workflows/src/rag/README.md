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

## Prerequisites

- [Ollama](https://ollama.ai/) installed and running locally
- Python 3.8+ installed
- Recommended embedding model: `nomic-embed-text` (install with `ollama pull nomic-embed-text`)
- Recommended LLM model: `llama3` or another model that can handle chat tasks (install with `ollama pull llama3`)

## Setup

1. Install required packages:
   ```
   pip install -r requirements.txt
   ```

2. Ensure Ollama is running:
   ```
   ollama serve
   ```

3. The pipeline will download the PDF automatically. The first run might take longer as it downloads and processes the PDF.

## Usage

### Step 1: Generate the Vector Database

Run the import script to generate the vector database:

```bash
python import_dnd_rules.py
```

#### Command Line Options for Import

- `--model`: Specify Ollama embedding model (default: "nomic-embed-text")
- `--base-url`: Custom Ollama API URL (default: "http://localhost:11434")
- `--test-query`: Custom query for testing retrieval (default: "What are spell slots?")

Example:
```bash
python import_dnd_rules.py --model=nomic-embed-text --test-query="How does combat work?"
```

### Step 2: Query the Database

After generating the vector database, you can query it using the query script:

```bash
python query_dnd_rules.py
```

This will start an interactive session where you can ask D&D rules questions.

#### Command Line Options for Querying

- `--embed-model`: Ollama embedding model (default: "nomic-embed-text")
- `--llm-model`: Ollama LLM model for generating answers (default: "llama3")
- `--base-url`: Custom Ollama API URL (default: "http://localhost:11434")
- `--temperature`: Temperature for LLM responses (0.0-1.0, default: 0.0)
- `--query`: Single query to run (if not provided, interactive mode is started)

Example:
```bash
python query_dnd_rules.py --llm-model=llama3 --query="What are the rules for spellcasting?"
```

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