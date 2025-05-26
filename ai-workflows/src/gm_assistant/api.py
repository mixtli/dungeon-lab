"""
FastAPI service for GM Assistant.
Provides HTTP endpoints for D&D 5e rules assistance.
"""
import asyncio
import logging
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import uvicorn

from agent import (
    load_vector_store, 
    create_conversation_chain, 
    query_rules
)
from config import config, DND_CONTEXT_PROMPT

# Configure logging
logging.basicConfig(
    level=getattr(logging, config.log_level),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Global variables for shared resources
vector_store = None
qa_chains: Dict[str, Any] = {}  # Session ID -> QA Chain
session_last_activity: Dict[str, datetime] = {}

# Pydantic models for request/response
class ChatRequest(BaseModel):
    message: str = Field(..., description="The user's question or message")
    session_id: Optional[str] = Field(None, description="Session ID for conversation memory")
    user_id: Optional[str] = Field(None, description="User ID for tracking")
    context: Optional[Dict[str, Any]] = Field(None, description="Additional context")

class MessageSource(BaseModel):
    title: str
    page: Optional[int] = None
    section: Optional[str] = None
    url: Optional[str] = None

class ChatResponse(BaseModel):
    response: str
    success: bool = True
    processing_time: float
    sources: Optional[List[MessageSource]] = None
    session_id: Optional[str] = None

class ErrorResponse(BaseModel):
    success: bool = False
    error: str
    error_code: str
    retry_after: Optional[int] = None

class HealthResponse(BaseModel):
    status: str
    timestamp: datetime
    version: str = "1.0.0"
    services: Dict[str, str]

class StatusResponse(BaseModel):
    status: str
    timestamp: datetime
    version: str = "1.0.0"
    services: Dict[str, str]
    active_sessions: int
    total_requests: int
    uptime_seconds: float

# Global counters
total_requests = 0
start_time = time.time()

async def cleanup_expired_sessions():
    """Remove expired sessions to prevent memory leaks."""
    global qa_chains, session_last_activity
    
    current_time = datetime.now()
    expired_sessions = []
    
    for session_id, last_activity in session_last_activity.items():
        if current_time - last_activity > timedelta(seconds=config.session_timeout):
            expired_sessions.append(session_id)
    
    for session_id in expired_sessions:
        if session_id in qa_chains:
            del qa_chains[session_id]
        if session_id in session_last_activity:
            del session_last_activity[session_id]
        logger.info(f"Cleaned up expired session: {session_id}")

async def periodic_cleanup():
    """Background task to periodically clean up expired sessions."""
    while True:
        try:
            await cleanup_expired_sessions()
            await asyncio.sleep(300)  # Run every 5 minutes
        except Exception as e:
            logger.error(f"Error in periodic cleanup: {e}")
            await asyncio.sleep(60)  # Wait 1 minute before retrying

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle."""
    global vector_store
    
    # Startup
    logger.info("Starting GM Assistant API service...")
    
    try:
        # Initialize vector store
        logger.info("Loading vector store...")
        vector_store = load_vector_store(
            model_name=config.embed_model,
            base_url=config.ollama_base_url
        )
        logger.info("Vector store loaded successfully")
        
        # Start background cleanup task
        cleanup_task = asyncio.create_task(periodic_cleanup())
        
        logger.info(f"GM Assistant API service started on {config.api_host}:{config.api_port}")
        
        yield
        
    except Exception as e:
        logger.error(f"Failed to initialize GM Assistant: {e}")
        raise
    finally:
        # Shutdown
        logger.info("Shutting down GM Assistant API service...")
        cleanup_task.cancel()
        try:
            await cleanup_task
        except asyncio.CancelledError:
            pass

# Create FastAPI app
app = FastAPI(
    title="GM Assistant API",
    description="D&D 5e Rules Assistant API",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Basic health check endpoint."""
    return HealthResponse(
        status="healthy",
        timestamp=datetime.now(),
        services={
            "vector_store": "healthy" if vector_store else "unavailable",
            "ollama": "unknown"  # Could add actual Ollama health check
        }
    )

@app.get("/status", response_model=StatusResponse)
async def detailed_status():
    """Detailed status endpoint with metrics."""
    return StatusResponse(
        status="healthy",
        timestamp=datetime.now(),
        services={
            "vector_store": "healthy" if vector_store else "unavailable",
            "ollama": "unknown"
        },
        active_sessions=len(qa_chains),
        total_requests=total_requests,
        uptime_seconds=time.time() - start_time
    )

@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest, background_tasks: BackgroundTasks):
    """Main chat endpoint for D&D rules assistance."""
    global total_requests, qa_chains, session_last_activity
    
    start_time_request = time.time()
    total_requests += 1
    
    try:
        if not vector_store:
            raise HTTPException(
                status_code=503,
                detail="Vector store not available"
            )
        
        # Get or create QA chain for session
        session_id = request.session_id or "default"
        
        if session_id not in qa_chains:
            if len(qa_chains) >= config.max_sessions:
                # Clean up expired sessions first
                await cleanup_expired_sessions()
                
                # If still at limit, reject new sessions
                if len(qa_chains) >= config.max_sessions:
                    raise HTTPException(
                        status_code=429,
                        detail="Maximum number of active sessions reached"
                    )
            
            # Create new conversation chain for this session
            qa_chains[session_id] = create_conversation_chain(
                vector_store,
                llm_model=config.llm_model,
                temperature=config.temperature,
                base_url=config.ollama_base_url,
                return_source_docs=config.enable_sources
            )
            logger.info(f"Created new session: {session_id}")
        
        # Update session activity
        session_last_activity[session_id] = datetime.now()
        
        # Process the query
        qa_chain = qa_chains[session_id]
        
        try:
            response_text = query_rules(request.message, qa_chain)
        except Exception as e:
            logger.error(f"Error processing query: {e}")
            raise HTTPException(
                status_code=500,
                detail="Error processing your request. Please try again."
            )
        
        processing_time = time.time() - start_time_request
        
        # TODO: Extract sources from response if enabled
        sources = None
        if config.enable_sources:
            # This would require modifying the agent.py to return sources
            # For now, we'll leave it as None
            pass
        
        return ChatResponse(
            response=response_text,
            processing_time=processing_time,
            sources=sources,
            session_id=session_id
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in chat endpoint: {e}")
        raise HTTPException(
            status_code=500,
            detail="An unexpected error occurred"
        )

@app.post("/chat/session/{session_id}")
async def chat_with_session(session_id: str, request: ChatRequest):
    """Chat endpoint with explicit session ID in URL."""
    # Override the session_id from the request
    request.session_id = session_id
    return await chat(request, BackgroundTasks())

@app.post("/chat/session/{session_id}/clear")
async def clear_session(session_id: str):
    """Clear conversation memory for a specific session."""
    global qa_chains, session_last_activity
    
    if session_id in qa_chains:
        del qa_chains[session_id]
    if session_id in session_last_activity:
        del session_last_activity[session_id]
    
    logger.info(f"Cleared session: {session_id}")
    return {"success": True, "message": f"Session {session_id} cleared"}

@app.get("/chat/sessions")
async def list_sessions():
    """List active sessions."""
    sessions = []
    current_time = datetime.now()
    
    for session_id, last_activity in session_last_activity.items():
        sessions.append({
            "session_id": session_id,
            "last_activity": last_activity.isoformat(),
            "idle_seconds": (current_time - last_activity).total_seconds()
        })
    
    return {
        "active_sessions": len(sessions),
        "sessions": sessions
    }

@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    """Custom HTTP exception handler."""
    return ErrorResponse(
        error=exc.detail,
        error_code=f"HTTP_{exc.status_code}",
        retry_after=30 if exc.status_code >= 500 else None
    )

def main():
    """Run the FastAPI server."""
    uvicorn.run(
        "api:app",
        host=config.api_host,
        port=config.api_port,
        reload=config.debug,
        log_level=config.log_level.lower()
    )

if __name__ == "__main__":
    main() 