"""
Map editing flow for Dungeon Lab.
"""

import base64
import os
from datetime import datetime
from typing import Dict, Any
import tempfile

import json
import requests

from minio import S3Error
from openai import OpenAI
from prefect import task, get_run_logger, context
from prefect.artifacts import create_markdown_artifact, create_image_artifact

# Import shared utilities
from src.utils.callbacks import send_progress_update
from src.utils.minio_client import upload_to_minio
from src.utils.flow_wrappers import auto_hook_flow

# Import project config
from src.configs.prefect_config import (
    MAP_GENERATION_TIMEOUT,  # Reusing the same timeout for now
)


@task(name="validate_edit_input", retries=2, retry_delay_seconds=5)
def validate_edit_input(input_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Validate the input data for map editing.

    Args:
        input_data: Dictionary containing map editing parameters

    Returns:
        Validated input data
    """
    logger = get_run_logger()
    logger.info("Validating input data for map editing")

    required_fields = ["originalImageUrl", "editPrompt"]
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

    # Initialize parameters dict if not present
    if "parameters" not in input_data:
        input_data["parameters"] = {}

    # Apply defaults to parameters
    for key, value in defaults.items():
        if key not in input_data["parameters"] or not input_data["parameters"][key]:
            input_data["parameters"][key] = value
            logger.info("Using default value for %s: %s", key, value)

    return input_data


@task(name="download_original_image", retries=2, retry_delay_seconds=5)
def download_original_image(image_url: str) -> bytes:
    """
    Download the original image from the provided URL.

    Args:
        image_url: URL of the image to download

    Returns:
        Image bytes
    """
    logger = get_run_logger()
    logger.info("Downloading original image from URL: %s", image_url)

    try:
        response = requests.get(image_url, timeout=30)
        response.raise_for_status()
        return response.content
    except Exception as e:
        logger.error("Failed to download image: %s", e)
        raise RuntimeError(f"Failed to download image: {e}") from e


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


@task(name="process_map_edit", timeout_seconds=300, retries=2)
def process_map_edit(
    original_image_url: str, edit_prompt: str, parameters: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Process a map edit request by downloading the original image,
    applying the edit prompt, and uploading the result to MinIO.

    Args:
        original_image_url: URL of the original image
        edit_prompt: Text describing the edits to make
        parameters: Dict with style and other parameters

    Returns:
        Dictionary containing the edited image data and metadata
    """
    logger = get_run_logger()
    logger.info("Processing map edit")

    # Download the original image
    original_image_bytes = download_original_image(original_image_url)
    logger.info("Original image downloaded successfully")

    # Apply the edits to the image
    edited_image_bytes = edit_image(original_image_bytes, edit_prompt, parameters)
    logger.info("Image editing completed")

    # MinIO config from environment
    minio_public_url = os.environ.get("MINIO_PUBLIC_URL")
    minio_bucket = os.environ.get("MINIO_BUCKET_NAME")
    if not all([minio_bucket, minio_public_url]):
        raise RuntimeError("Missing one or more required MinIO environment variables.")

    # Generate a unique object name
    timestamp = datetime.now().strftime("%Y%m%dT%H%M%S")
    object_name = f"maps/edited_map_{timestamp}.png"

    # Upload to MinIO
    try:
        upload_to_minio(object_name, edited_image_bytes, content_type="image/png")
        logger.info("Edited image uploaded to MinIO: %s", object_name)
    except S3Error as e:
        logger.error("MinIO upload failed: %s", e)
        raise RuntimeError(f"MinIO upload failed: {e}") from e
    except Exception as e:
        logger.error("MinIO upload failed: %s", e)
        raise RuntimeError(f"MinIO upload failed: {e}") from e

    # Construct public URL
    image_url = f"{minio_public_url}/{minio_bucket}/{object_name}"
    print(f"Edited Image URL: {image_url}")

    # Define result information
    image_result = {
        "image_url": image_url,
        "created_at": datetime.now().isoformat(),
        "width": parameters.get("width", 30) * parameters.get("pixelsPerGrid", 70),
        "height": parameters.get("height", 20) * parameters.get("pixelsPerGrid", 70),
        "style": parameters.get("style", "fantasy"),
        "theme": parameters.get("theme", "dungeon"),
        "original_url": original_image_url,
    }

    # Create an artifact for the edited map
    create_markdown_artifact(
        key="edited-map",
        markdown=f"""
        # Edited Map

        **Original Map**: [View Original]({original_image_url})
        
        **Edit Prompt**: {edit_prompt}
        
        **Style**: {image_result['style']}
        
        **Theme**: {parameters.get('theme', 'dungeon')}
        
        **URL**: [View Edited Image]({image_result['image_url']})
        
        ![Edited Map Image]({image_result['image_url']})
        """,
        description=f"Map edited with prompt: {edit_prompt[:50]}...",
    )

    # Create a Prefect image artifact if available
    try:
        create_image_artifact(
            key="edited-map-image",
            image_url=image_url,
            description=f"Edited map image with prompt: {edit_prompt[:50]}...",
        )
    except ImportError:
        logger.info("Prefect image artifact not available in this version.")
    except RuntimeError as e:
        logger.warning("Failed to create Prefect image artifact: %s", e)

    return image_result


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
        # Process the edit
        send_progress_update(
            status="running", progress=30.0, message="Applying edit instructions to map"
        )

        # Perform the edit and get the result
        image_result = process_map_edit(original_image_url, edit_prompt, parameters)

        # Send completion update
        # send_progress_update(
        #     status="completed",
        #     progress=100.0,
        #     message="Map editing workflow completed successfully",
        # )

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
