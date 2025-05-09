"""
Utility functions for environment setup and configuration.
"""
import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from prefect import get_client

# Add project root to Python path
def add_project_root_to_path():
    """Add the project root to the Python path."""
    project_root = Path(__file__).parents[2].resolve()
    if str(project_root) not in sys.path:
        sys.path.insert(0, str(project_root))

# Load environment variables
def load_environment():
    """Load environment variables from .env file."""
    project_root = Path(__file__).parents[2].resolve()
    env_path = project_root / '.env'
    load_dotenv(env_path)
    
    # Validate required environment variables
    required_vars = ["OPENAI_API_KEY"]
    missing_vars = [var for var in required_vars if not os.getenv(var)]
    
    if missing_vars:
        print(f"Error: Missing required environment variables: {', '.join(missing_vars)}")
        print(f"Please add them to your .env file at {env_path}")
        return False
    
    return True

# Connect to Prefect API
async def connect_to_prefect_api():
    """Connect to the Prefect API and return a client."""
    api_url = os.getenv("PREFECT_API_URL", "http://127.0.0.1:4200/api")
    
    try:
        client = get_client(api_url)
        await client.hello()
        print(f"Successfully connected to Prefect API at {api_url}")
        return client
    except Exception as e:
        print(f"Error connecting to Prefect API at {api_url}: {e}")
        print("Make sure the Prefect server is running")
        return None 