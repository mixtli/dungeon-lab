"""
Feature detection flow for map images.
"""
import os
import json
from datetime import datetime
from typing import Dict, Any, Optional

from prefect import flow, task, get_run_logger
from prefect.artifacts import create_markdown_artifact

# Import shared utilities
from src.utils.callbacks import send_progress_update

from src.tasks.image_processing import (
    load_image,
    preprocess_image,
    detect_walls,
    detect_doors,
    detect_lights,
    create_uvtt_features,
)

from configs.prefect_config import (
    FEATURE_DETECTION_TIMEOUT,
)

@task(name="validate_input_image", retries=2, retry_delay_seconds=5)
def validate_input_image(input_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Validate the input data for feature detection.
    
    Args:
        input_data: Dictionary containing feature detection parameters
        
    Returns:
        Validated input data
    """
    logger = get_run_logger()
    logger.info("Validating input data for feature detection")
    
    required_fields = ["image_path", "userId", "campaignId"]
    missing_fields = [field for field in required_fields if field not in input_data]
    
    if missing_fields:
        raise ValueError(f"Missing required fields: {', '.join(missing_fields)}")
    
    # Validate image path
    image_path = input_data["image_path"]
    if not os.path.exists(image_path):
        raise FileNotFoundError(f"Image file not found: {image_path}")
    
    # Set default values if not provided
    defaults = {
        "pixels_per_grid": 70,
        "threshold": 127,
    }
    
    for key, value in defaults.items():
        if key not in input_data or not input_data[key]:
            input_data[key] = value
            logger.info(f"Using default value for {key}: {value}")
    
    return input_data

@flow(name="detect-features", timeout_seconds=FEATURE_DETECTION_TIMEOUT)
def detect_features_flow(
    input_data: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Main flow for detecting features in a map image.
    
    Args:
        input_data: Dictionary containing feature detection parameters
        
    Returns:
        Dictionary containing the detected features in UVTT format
    """
    logger = get_run_logger()
    logger.info(f"Starting feature detection flow")
    
    # Start progress tracking
    send_progress_update(
        status="running",
        progress=0.0,
        message="Starting feature detection workflow"
    )
    
    try:
        # Validate input
        validated_input = validate_input_image(input_data)
        send_progress_update(
            status="running",
            progress=5.0,
            message="Input validated successfully"
        )
        
        # Load the image
        image_path = validated_input["image_path"]
        img = load_image(image_path)
        send_progress_update(
            status="running",
            progress=10.0,
            message="Image loaded successfully"
        )
        
        # Preprocess the image
        preprocessed_img = preprocess_image(img)
        send_progress_update(
            status="running",
            progress=20.0,
            message="Image preprocessing completed"
        )
        
        # Detect walls
        walls = detect_walls(preprocessed_img)
        send_progress_update(
            status="running",
            progress=40.0,
            message=f"Detected {len(walls)} wall segments"
        )
        
        # Detect doors
        doors = detect_doors(preprocessed_img, walls)
        send_progress_update(
            status="running",
            progress=60.0,
            message=f"Detected {len(doors)} doors"
        )
        
        # Detect lights
        lights = detect_lights(img)
        send_progress_update(
            status="running",
            progress=80.0,
            message=f"Detected {len(lights)} light sources"
        )
        
        # Create UVTT features
        img_height, img_width = img.shape[:2]
        uvtt_data = create_uvtt_features(
            walls=walls,
            doors=doors,
            lights=lights,
            img_width=img_width,
            img_height=img_height
        )
        
        # Prepare final result
        result = {
            "status": "completed",
            "userId": validated_input["userId"],
            "campaignId": validated_input["campaignId"],
            "uvtt": uvtt_data,
            "stats": {
                "walls": len(walls),
                "doors": len(doors),
                "lights": len(lights),
            },
            "createdAt": datetime.utcnow().isoformat(),
        }

        
        # Create an artifact for the detected features
        create_markdown_artifact(
            key="detected-features",
            markdown=f"""
            # Detected Map Features
            
            **Image Path**: {image_path}
            
            **Dimensions**: {img_width}x{img_height} pixels
            
            ## Statistics
            
            - **Wall Segments**: {len(walls)}
            - **Doors**: {len(doors)}
            - **Light Sources**: {len(lights)}
            
            ## UVTT Data Preview
            
            ```json
            {json.dumps(uvtt_data, indent=2)[:500]}...
            ```
            """,
            description=f"Features detected in map image: {os.path.basename(image_path)}",
        )
        
        # Send completion update
        send_progress_update(
            status="completed",
            progress=100.0,
            message="Feature detection workflow completed successfully",
            result=result
        )
        
        logger.info(f"Feature detection flow completed successfully")
        return result
        
    except Exception as e:
        logger.error(f"Feature detection flow failed: {e}")
        
        # Send failure update
        send_progress_update(
            status="failed",
            progress=0.0,
            message=f"Feature detection workflow failed: {str(e)}"
        )
        
        # Re-raise the exception
        raise

if __name__ == "__main__":
    # Example usage
    example_input = {
        "image_path": "path/to/map.png",  # Replace with an actual image path
        "userId": "user123",
        "campaignId": "campaign456",
        "pixels_per_grid": 70,
    }
    
    # This will fail unless an actual image path is provided
    result = detect_features_flow(input_data=example_input)
    print(json.dumps(result, indent=2)) 