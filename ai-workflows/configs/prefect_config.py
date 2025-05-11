"""
Configuration settings for Prefect workflows.
"""
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file
env_path = Path(__file__).parents[1] / '.env'
load_dotenv(env_path)

# Prefect API configuration
PREFECT_API_URL = os.getenv("PREFECT_API_URL", "http://127.0.0.1:4200/api")

# Project configuration
PROJECT_NAME = "dungeon-lab-map-builder"

# Storage configuration
STORAGE_BLOCK_NAME = "dungeon-lab-storage"

# Notification configuration
NOTIFICATION_BLOCK_NAME = "dungeon-lab-notifications"

# Flow configuration
DEFAULT_FLOW_RUNNER = "process"  # Options: process, docker
FLOW_CONCURRENCY_LIMIT = 3

# OpenAI configuration
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_ORG_ID = os.getenv("OPENAI_ORG_ID", "")

# Callback settings
CALLBACK_BASE_URL = os.getenv("CALLBACK_BASE_URL", "http://localhost:3000/api")
CALLBACK_AUTH_TOKEN = os.getenv("CALLBACK_AUTH_TOKEN", "")

# Workflow timeouts (in seconds)
DEFAULT_TASK_TIMEOUT = 300  # 5 minutes
MAP_GENERATION_TIMEOUT = 600  # 10 minutes
FEATURE_DETECTION_TIMEOUT = 900  # 15 minutes
