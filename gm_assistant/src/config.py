"""
Configuration management for GM Assistant.
Supports both CLI and API usage.
"""
import os
from typing import Optional
from dotenv import load_dotenv

# Load environment variables
load_dotenv(verbose=True)

# Default models
DEFAULT_EMBED_MODEL = "nomic-embed-text"
DEFAULT_LLM_MODEL = "llama3"

# Default API settings
DEFAULT_API_HOST = "0.0.0.0"
DEFAULT_API_PORT = 8000

# Paths
CHROMA_PERSIST_DIR = os.path.join(os.path.dirname(__file__), "../../data/chroma_db")

class GMAssistantConfig:
    """Configuration class for GM Assistant settings."""
    
    def __init__(self):
        # Ollama settings
        self.ollama_base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
        self.embed_model = os.getenv("OLLAMA_EMBED_MODEL", DEFAULT_EMBED_MODEL)
        self.llm_model = os.getenv("OLLAMA_LLM_MODEL", DEFAULT_LLM_MODEL)
        
        # API settings
        self.api_host = os.getenv("GM_ASSISTANT_HOST", DEFAULT_API_HOST)
        self.api_port = int(os.getenv("GM_ASSISTANT_PORT", DEFAULT_API_PORT))
        
        # LLM settings
        self.temperature = float(os.getenv("GM_ASSISTANT_TEMPERATURE", "0.0"))
        self.max_tokens = int(os.getenv("GM_ASSISTANT_MAX_TOKENS", "4096"))
        
        # Session settings
        self.session_timeout = int(os.getenv("GM_ASSISTANT_SESSION_TIMEOUT", "3600"))  # 1 hour
        self.max_sessions = int(os.getenv("GM_ASSISTANT_MAX_SESSIONS", "100"))
        
        # Database settings
        self.chroma_persist_dir = os.getenv("CHROMA_PERSIST_DIR", CHROMA_PERSIST_DIR)
        
        # Feature flags
        self.enable_sources = os.getenv("GM_ASSISTANT_ENABLE_SOURCES", "true").lower() == "true"
        self.enable_memory = os.getenv("GM_ASSISTANT_ENABLE_MEMORY", "true").lower() == "true"
        
        # Logging
        self.log_level = os.getenv("LOG_LEVEL", "INFO").upper()
        self.debug = os.getenv("DEBUG", "false").lower() == "true"

# Global config instance
config = GMAssistantConfig()

# D&D context prompt
DND_CONTEXT_PROMPT = """
You are a knowledgeable Dungeons & Dragons 5th Edition Dungeon Master's assistant. 
Use the provided D&D rule information to answer questions accurately and helpfully.
If the answer isn't in the provided context, say you don't have that specific information
but offer general D&D knowledge if possible.

Previous conversation:
{chat_history}

Context information from the D&D 5e rules:
{context}

Current Question: {question}
""" 