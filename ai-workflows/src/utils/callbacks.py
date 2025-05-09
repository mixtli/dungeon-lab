"""
Shared utility functions for workflow callbacks.
"""
import requests
from datetime import datetime
from typing import Dict, Any, Optional

from prefect import get_run_logger, context

# Import project config
from configs.prefect_config import (
    CALLBACK_BASE_URL,
    CALLBACK_AUTH_TOKEN,
)

def send_progress_update(
    status: str, 
    progress: float, 
    message: str,
    result: Optional[Dict[str, Any]] = None
) -> bool:
    """
    Send a progress update to the callback endpoint.
    
    Args:
        status: Current status (e.g., "running", "completed", "failed")
        progress: Progress percentage (0-100)
        message: Progress message
        result: Optional result data
        
    Returns:
        True if the update was sent successfully
    """
    logger = get_run_logger()
    
    try:
        # Get flow and flow_run context
        flow_run_context = context.get_run_context()
        flow_run = flow_run_context.flow_run
        flow = flow_run_context.flow

        # Create payload with full context
        payload = {
            "flow": {
                "id": flow.id,
                "name": flow.name,
                "labels": flow.labels,
                "created_at": str(flow.created_at) if hasattr(flow, 'created_at') else None,
                "updated_at": str(flow.updated_at) if hasattr(flow, 'updated_at') else None,
            },
            "flow_run": {
                "id": flow_run.id,
                "name": flow_run.name,
                "labels": flow_run.labels,
                "parameters": flow_run.parameters,
                "created_at": str(flow_run.created_at) if hasattr(flow_run, 'created_at') else None,
                "updated_at": str(flow_run.updated_at) if hasattr(flow_run, 'updated_at') else None,
                "state": str(flow_run.state) if hasattr(flow_run, 'state') else None,
            },
            "status": status,
            "progress": progress,
            "message": message,
            "timestamp": datetime.utcnow().isoformat(),
        }
        
        if result:
            payload["result"] = result
        
        # Create headers
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {CALLBACK_AUTH_TOKEN}",
        }
        
        # Send the update
        endpoint = f"{CALLBACK_BASE_URL}/api/workflows/callback/progress"
        response = requests.post(endpoint, json=payload, headers=headers)
        response.raise_for_status()
        logger.info(f"Progress update sent: {message} ({progress}%, {status})")
        return True
    except Exception as e:
        logger.error(f"Failed to send progress update: {e}")
        return False 