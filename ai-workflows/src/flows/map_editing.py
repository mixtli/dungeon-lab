"""
Map editing flow for Dungeon Lab.
"""

import base64
import os
from datetime import datetime
from typing import Dict, Any
import tempfile

import json

from openai import OpenAI
from prefect import task, get_run_logger, context
from prefect.artifacts import Artifact

# Import shared utilities
from src.utils.callbacks import send_progress_update
from src.utils.artifact_helpers import fetch_artifact_data, fetch_image, create_image_artifact
from src.utils.flow_wrappers import auto_hook_flow

# Import project config
from src.configs.prefect_config import (
    MAP_GENERATION_TIMEOUT,  # Reusing the same timeout for now
)


def edit_image(
    original_image_bytes: bytes,
    edit_prompt: str,
    parameters: Dict[str, Any],
    mock: bool = False,
) -> bytes:
    """
    Edit an image based on a prompt using OpenAI's API.
    """
    logger = get_run_logger()

    # Prepare prompt with style information
    prompt = (
        f"{edit_prompt}\nStyle: {parameters.get('style', 'fantasy')}. "
        + f"Theme: {parameters.get('theme', 'dungeon')}."
    )

    logger.info("Editing image with prompt: %s", prompt)

    client = OpenAI(
        api_key=os.environ.get("OPENAI_API_KEY"),
        organization=os.environ.get("OPENAI_ORGANIZATION"),
    )

    try:
        if not mock:
            # Use a temporary file instead of BytesIO to ensure correct MIME type detection
            # The OpenAI SDK checks file extensions to determine MIME type
            with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as temp_file:
                temp_file.write(original_image_bytes)
                temp_file_path = temp_file.name

            try:
                # Use the temporary file for API call
                with open(temp_file_path, "rb") as image_file:
                    response = client.images.edit(
                        model="gpt-image-1",
                        image=[image_file],
                        prompt=prompt,
                        n=1,
                        size="1024x1024",  # Using fixed size for now
                    )

                # Extract the image data from the response
                b64_image = response.data[0].b64_json
                image_bytes = base64.b64decode(b64_image)
            finally:
                # Clean up the temporary file
                if os.path.exists(temp_file_path):
                    os.unlink(temp_file_path)
        else:
            # For mock mode, we'll simulate an edit by returning the original image
            # In a real implementation, you might want to apply some transformation
            image_bytes = original_image_bytes

        logger.info("Map image edited successfully")
        return image_bytes

    except RuntimeError as e:
        logger.error("OpenAI image editing failed: %s", e)
        # If editing fails, we'll implement a fallback where we generate a new image
        logger.info("Falling back to image generation")

        # Generate a new image based on the edit prompt
        try:
            if not mock:
                response = client.images.generate(
                    model="gpt-image-1",
                    prompt=f"A dungeon map. {prompt}",
                    n=1,
                    size="1024x1024",
                )
                b64_image = response.data[0].b64_json
                image_bytes = base64.b64decode(b64_image)
            else:
                # For mock mode, use a test image
                with open("data/images/map.png", "rb") as image:
                    image_bytes = image.read()

            logger.info("Fallback image generation successful")
            return image_bytes
        except Exception as fallback_error:
            logger.error("Fallback image generation failed: %s", fallback_error)
            raise RuntimeError(
                f"Map editing failed and fallback also failed: {fallback_error}"
            ) from fallback_error


@task(name="create_original_image_artifact", timeout_seconds=300, retries=2)
def create_original_image_artifact(original_image_url: str) -> Artifact:
    """
    Create an artifact for the original image.
    """
    image_bytes = fetch_image(original_image_url)
    return create_image_artifact(
        content=image_bytes,
        key="original-image",
        content_type="image/png",
    )


@task(name="process_map_edit", timeout_seconds=300, retries=2)
def process_map_edit(
    original_image_artifact: Artifact, edit_prompt: str, parameters: Dict[str, Any]
) -> Artifact:
    """
    Process a map edit request by downloading the original image,
    applying the edit prompt, and uploading the result as an artifact.

    Args:
        original_image_url: URL of the original image
        edit_prompt: Text describing the edits to make
        parameters: Dict with style and other parameters

    Returns:
        Artifact containing the edited image URL
    """
    logger = get_run_logger()
    logger.info("Processing map edit")

    # Download the original image
    original_image_bytes = fetch_artifact_data(original_image_artifact)
    logger.info("Original image downloaded successfully")

    # Apply the edits to the image
    edited_image_bytes = edit_image(original_image_bytes, edit_prompt, parameters)
    logger.info("Image editing completed")

    # Generate a unique object name
    timestamp = datetime.now().strftime("%Y%m%dT%H%M%S")
    object_name = f"maps/edited_map_{timestamp}.png"

    # Create an artifact for the edited image
    edited_image_artifact = create_image_artifact(
        content=edited_image_bytes,
        key="edited-map-image",
        object_name=object_name,
        content_type="image/png",
        description=f"Map edited with prompt: {edit_prompt[:50]}...",
    )

    logger.info("Edited image uploaded as artifact: %s", edited_image_artifact.data)
    
    return edited_image_artifact


@auto_hook_flow(
    name="edit-map",
    timeout_seconds=MAP_GENERATION_TIMEOUT,  # Reusing same timeout for now
)
def edit_map_flow(
    original_image_url: str, edit_prompt: str, parameters: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Main flow for editing a map.

    Args:
        original_image_url: URL of the original map image to edit
        edit_prompt: Text describing the edits to make
        parameters: Dictionary containing map parameters

    Returns:
        Dictionary containing the edited map data
    """
    print("Starting map editing flow")
    logger = get_run_logger()
    logger.info("Starting map editing flow")

    flow_run_context = context.get_run_context()
    flow_run = flow_run_context.flow_run
    print(f"Flow run: {flow_run}")

    # Start progress tracking
    send_progress_update(
        status=flow_run.state.name,
        progress=0.0,
        message="Starting map editing workflow",
    )

    try:
        # Set default values if not provided
        defaults = {
            "width": 30,
            "height": 20,
            "style": "fantasy",
            "theme": "dungeon",
            "resolution": 70,
        }

        # Apply defaults to parameters
        for key, value in defaults.items():
            if key not in parameters or not parameters[key]:
                parameters[key] = value
                logger.info("Using default value for %s: %s", key, value)

        # Process the edit
        send_progress_update(
            status="running", progress=30.0, message="Applying edit instructions to map"
        )

        original_image_artifact = create_original_image_artifact(original_image_url)

        # Perform the edit and get the result
        edited_image_artifact = process_map_edit(original_image_artifact, edit_prompt, parameters)

        # Create result dictionary
        image_result = {
            "image_url": edited_image_artifact.data,
            "created_at": datetime.now().isoformat(),
            "width": parameters.get("width", 30) * parameters.get("pixelsPerGrid", 70),
            "height": parameters.get("height", 20) * parameters.get("pixelsPerGrid", 70),
            "style": parameters.get("style", "fantasy"),
            "theme": parameters.get("theme", "dungeon"),
            "original_url": original_image_url,
        }

        # Send completion update
        send_progress_update(
            status="completed",
            progress=100.0,
            message="Map editing workflow completed successfully",
        )

        logger.info("Map editing flow completed successfully")
        return image_result

    except Exception as e:
        logger.error("Map editing flow failed: %s", e)

        # Send failure update
        send_progress_update(
            status="failed",
            progress=0.0,
            message=f"Map editing workflow failed: {str(e)}",
        )

        # Re-raise the exception
        raise


if __name__ == "__main__":
    # Example usage
    example_parameters = {
        "width": 30,
        "height": 20,
        "style": "fantasy",
        "theme": "dungeon",
        "pixelsPerGrid": 70,
    }

    # This would be a URL to an existing map image
    EXAMPLE_IMAGE_URL = (
        "http://minio:9000/dungeon-lab/maps/generated_map_20250511T192849.png"
    )

    result = edit_map_flow(
        original_image_url=EXAMPLE_IMAGE_URL,
        edit_prompt="Add a secret passage on the east wall and a treasure chest in the north room",
        parameters=example_parameters,
    )
    print(json.dumps(result, indent=2))
