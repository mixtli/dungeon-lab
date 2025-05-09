# AI Workflows for Dungeon Lab

This package contains Prefect workflows for AI-powered map generation and feature detection in Dungeon Lab.

## Features

- Map generation from textual descriptions
- Automatic feature detection (walls, doors, lights)
- UVTT format conversion

## Installation

```bash
# Create a virtual environment (recommended)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

## Development Setup

1. Set up environment variables in a `.env` file:
```
OPENAI_API_KEY=your-openai-key
PREFECT_API_URL=http://127.0.0.1:4200/api
```

2. Start Prefect server (in a separate terminal):
```bash
prefect server start
```

3. Register and run flows:
```bash
# Register a deployment
python -m src.flows.register

# Run a specific flow
prefect deployment run map-generation/generate-map
```

## Project Structure

- `src/flows/` - Prefect flow definitions
- `src/tasks/` - Reusable Prefect tasks
- `src/utils/` - Helper utilities and shared functions
- `configs/` - Configuration files
- `tests/` - Test suite 