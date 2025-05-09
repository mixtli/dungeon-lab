"""
Map generation flow for Dungeon Lab.
"""
import os
import json
import requests
from datetime import datetime
from typing import Dict, Any, Optional

from prefect import flow, task, get_run_logger
from prefect.artifacts import create_markdown_artifact

# Import project config
from configs.prefect_config import (
    CALLBACK_BASE_URL,
    CALLBACK_AUTH_TOKEN,
    MAP_GENERATION_TIMEOUT,
)

@task(name="validate_input", retries=2, retry_delay_seconds=5)
def validate_input(input_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Validate the input data for map generation.
    
    Args:
        input_data: Dictionary containing map generation parameters
        
    Returns:
        Validated input data
    """
    logger = get_run_logger()
    logger.info("Validating input data")
    
    required_fields = ["description", "userId", "campaignId"]
    missing_fields = [field for field in required_fields if field not in input_data]
    
    if missing_fields:
        raise ValueError(f"Missing required fields: {', '.join(missing_fields)}")
    
    # Set default values if not provided
    defaults = {
        "width": 30,
        "height": 20,
        "style": "fantasy",
        "theme": "dungeon",
        "resolution": 70,
    }
    
    for key, value in defaults.items():
        if key not in input_data or not input_data[key]:
            input_data[key] = value
            logger.info(f"Using default value for {key}: {value}")
    
    return input_data

@task(name="send_progress_update", retries=3, retry_delay_seconds=5)
def send_progress_update(
    session_id: str, 
    status: str, 
    progress: float, 
    message: str,
    result: Optional[Dict[str, Any]] = None
) -> bool:
    """
    Send a progress update to the callback endpoint.
    
    Args:
        session_id: Unique workflow session ID
        status: Current status (e.g., "running", "completed", "failed")
        progress: Progress percentage (0-100)
        message: Progress message
        result: Optional result data
        
    Returns:
        True if the update was sent successfully
    """
    logger = get_run_logger()
    
    # Create payload
    payload = {
        "sessionId": session_id,
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
    
    try:
        # Send the update
        endpoint = f"{CALLBACK_BASE_URL}/workflows/progress"
        response = requests.post(endpoint, json=payload, headers=headers)
        response.raise_for_status()
        logger.info(f"Progress update sent: {message} ({progress}%)")
        return True
    except Exception as e:
        logger.error(f"Failed to send progress update: {e}")
        return False

@task(name="generate_map_image", timeout_seconds=300, retries=2)
def generate_map_image(input_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Generate a map image using OpenAI.
    
    Args:
        input_data: Dictionary containing map generation parameters
        
    Returns:
        Dictionary containing image data and metadata
    """
    logger = get_run_logger()
    logger.info("Generating map image")
    
    # This is a placeholder for the actual OpenAI API call
    # In a real implementation, you would use openai.images.generate()
    
    # Simulate OpenAI processing time
    import time
    time.sleep(5)
    
    # Mock response
    result = {
        "image_url": "https://example.com/image.png",
        "created_at": datetime.utcnow().isoformat(),
        "prompt": input_data["description"],
        "width": input_data["width"] * input_data["resolution"],
        "height": input_data["height"] * input_data["resolution"],
        "style": input_data["style"],
        "theme": input_data["theme"],
    }
    
    logger.info("Map image generated successfully")
    
    # Create an artifact for the generated map
    create_markdown_artifact(
        key="generated-map",
        markdown=f"""
        # Generated Map

        **Description**: {input_data['description']}
        
        **Dimensions**: {result['width']}x{result['height']} pixels
        
        **Style**: {result['style']}
        
        **Theme**: {result['theme']}
        
        **URL**: [View Image]({result['image_url']})
        """,
        description=f"Map generated from: {input_data['description'][:50]}...",
    )
    
    return result

@flow(name="generate-map", timeout_seconds=MAP_GENERATION_TIMEOUT)
def generate_map_flow(
    session_id: str,
    input_data: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Main flow for generating a map.
    
    Args:
        session_id: Unique workflow session ID
        input_data: Dictionary containing map generation parameters
        
    Returns:
        Dictionary containing the generated map data
    """
    logger = get_run_logger()
    logger.info(f"Starting map generation flow with session ID: {session_id}")
    
    # Start progress tracking
    send_progress_update(
        session_id=session_id,
        status="running",
        progress=0.0,
        message="Starting map generation workflow"
    )
    
    try:
        # Validate input
        validated_input = validate_input(input_data)
        send_progress_update(
            session_id=session_id,
            status="running",
            progress=10.0,
            message="Input validated successfully"
        )
        
        # Generate the map image
        image_result = generate_map_image(validated_input)
        send_progress_update(
            session_id=session_id,
            status="running",
            progress=50.0,
            message="Map image generated successfully"
        )
        
        # Prepare final result
        result = {
            "sessionId": session_id,
            "status": "completed",
            "userId": validated_input["userId"],
            "campaignId": validated_input["campaignId"],
            "image": image_result,
            "imageData": {
                "width": image_result["width"],
                "height": image_result["height"],
                "style": image_result["style"],
                "theme": image_result["theme"],
            },
            "createdAt": datetime.utcnow().isoformat(),
        }
        
        # Send completion update
        send_progress_update(
            session_id=session_id,
            status="completed",
            progress=100.0,
            message="Map generation workflow completed successfully",
            result=result
        )
        
        logger.info(f"Map generation flow completed successfully: {session_id}")
        return result
        
    except Exception as e:
        logger.error(f"Map generation flow failed: {e}")
        
        # Send failure update
        send_progress_update(
            session_id=session_id,
            status="failed",
            progress=0.0,
            message=f"Map generation workflow failed: {str(e)}"
        )
        
        # Re-raise the exception
        raise

if __name__ == "__main__":
    # Example usage
    example_input = {
        "description": "A small tavern with a main room, a kitchen, and two bedrooms upstairs",
        "userId": "user123",
        "campaignId": "campaign456",
        "width": 30,
        "height": 20,
        "style": "fantasy",
        "theme": "tavern",
        "resolution": 70,
    }
    
    result = generate_map_flow(session_id="test-session-001", input_data=example_input)
    print(json.dumps(result, indent=2)) 