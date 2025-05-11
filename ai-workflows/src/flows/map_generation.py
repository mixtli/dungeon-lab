"""
Map generation flow for Dungeon Lab.
"""

import os
from datetime import datetime
from typing import Dict, Any

# import base64
# import os
import json

# import openai
# import os
# import base64
# from openai import OpenAI

from minio import S3Error
from prefect import flow, task, get_run_logger, context
from prefect.artifacts import create_markdown_artifact, create_image_artifact

# Import shared utilities
from src.utils.callbacks import send_progress_update, send_state_update
from src.utils.minio_client import upload_to_minio

# Import project config
from configs.prefect_config import (
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

    required_fields = ["description"]
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
            logger.info("Using default value for %s: %s", key, value)

    return input_data


@task(name="generate_map_image", timeout_seconds=300, retries=2)
def generate_map_image(description: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
    """
    Generate a map image using OpenAI's new API (gpt-image-1 model), upload to MinIO,
    and create a Prefect image artifact.

    Args:
        description: Text description of the map
        parameters: Dict with width, height, style, theme, pixelsPerGrid
    Returns:
        Dictionary containing image data and metadata
    """

    logger = get_run_logger()
    logger.info("Generating map image with OpenAI (gpt-image-1)")

    # Prepare prompt
    prompt = (
        f"{description}\nStyle: {parameters.get('style', 'fantasy')}. "
        + f"Theme: {parameters.get('theme', 'dungeon')}."
    )

    # Calculate desired pixel size
    # width = parameters.get("width", 30)
    # height = parameters.get("height", 20)
    # pixels_per_grid = parameters.get("pixelsPerGrid", 70)
    # desired_width = width * pixels_per_grid
    # desired_height = height * pixels_per_grid

    # OpenAI supports only certain sizes (square)
    # allowed_sizes = [(256, 256), (512, 512), (1024, 1024)]

    # def closest_size(w, h):
    #     max_dim = max(w, h)
    #     closest = min(allowed_sizes, key=lambda s: abs(s[0] - max_dim))
    #     return f"{closest[0]}x{closest[1]}", closest[0], closest[1]

    # size_str, out_w, out_h = closest_size(desired_width, desired_height)
    # print(os.environ.get("MINIO_BUCKET_NAME"))
    # client = OpenAI(
    #     api_key=os.environ.get("OPENAI_API_KEY"),
    #     organization=os.environ.get("OPENAI_ORGANIZATION"),
    # )

    # size_str = "1024x1024"

    try:
        # Temporarily use a static image for testing to save API costs
        # response = client.images.generate(
        #     model="gpt-image-1",
        #     prompt=prompt,
        #     n=1,
        #     size=size_str
        # )
        # b64_image = response.data[0].b64_json
        # image_bytes = base64.b64decode(b64_image)

        with open("data/images/map.png", "rb") as image:
            image_bytes = image.read()
        logger.info("Map image generated and decoded from base64.")
    except Exception as e:
        logger.error("OpenAI image generation failed: %s", e)
        raise RuntimeError(f"OpenAI image generation failed: {e}") from e

    # MinIO config from environment
    minio_public_url = os.environ.get("MINIO_PUBLIC_URL")
    minio_bucket = os.environ.get("MINIO_BUCKET_NAME")
    if not all([minio_bucket, minio_public_url]):
        raise RuntimeError("Missing one or more required MinIO environment variables.")

    # Generate a unique object name
    timestamp = datetime.now().strftime("%Y%m%dT%H%M%S")
    object_name = f"maps/generated_map_{timestamp}.png"

    # Upload to MinIO
    try:
        upload_to_minio(object_name, image_bytes, content_type="image/png")
        logger.info("Image uploaded to MinIO: %s", object_name)
    except S3Error as e:
        logger.error("MinIO upload failed: %s", e)
        raise RuntimeError(f"MinIO upload failed: {e}") from e
    except Exception as e:
        logger.error("MinIO upload failed: %s", e)
        raise RuntimeError(f"MinIO upload failed: {e}") from e

    # Construct public URL
    image_url = f"{minio_public_url}/{minio_bucket}/{object_name}"
    print(f"Image URL: {image_url}")
    out_w = 1024
    out_h = 1024

    image_result = {
        "image_url": image_url,
        "created_at": datetime.now().isoformat(),
        "prompt": prompt,
        "width": out_w,
        "height": out_h,
        "style": parameters.get("style", "fantasy"),
        "theme": parameters.get("theme", "dungeon"),
    }

    # Create an artifact for the generated map (markdown preview)
    create_markdown_artifact(
        key="generated-map",
        markdown=f"""
        # Generated Map

        **Description**: {description}
        
        **Dimensions**: {out_w}x{out_h} pixels
        
        **Style**: {image_result['style']}
        
        **Theme**: {image_result['theme']}
        
        **URL**: [View Image]({image_result['image_url']})
        
        ![Map Image]({image_result['image_url']})
        """,
        description=f"Map generated from: {description[:50]}...",
    )

    # Optionally, create a Prefect image artifact if available
    try:

        create_image_artifact(
            key="generated-map-image",
            image_url=image_url,
            description=f"Generated map image for: {description[:50]}...",
        )
    except ImportError:
        logger.info("Prefect image artifact not available in this version.")
    except RuntimeError as e:
        logger.warning("Failed to create Prefect image artifact: %s", e)

    return image_result


@flow(
    name="generate-map",
    timeout_seconds=MAP_GENERATION_TIMEOUT,
    on_completion=[send_state_update],
    on_failure=[send_state_update],
    on_cancellation=[send_state_update],
    on_crashed=[send_state_update],
    on_running=[send_state_update],
)
def generate_map_flow(description: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
    """
    Main flow for generating a map.

    Args:
        input_data: Dictionary containing map generation parameters

    Returns:
        Dictionary containing the generated map data
    """

    logger = get_run_logger()
    logger.info("Starting map generation flow")

    flow_run_context = context.get_run_context()
    flow_run = flow_run_context.flow_run
    print(f"Flow run: {flow_run}")

    # Start progress tracking
    send_progress_update(
        status=flow_run.state.name,
        progress=0.0,
        message="Starting map generation workflow",
    )

    try:
        # Validate input
        # send_progress_update(
        #     status="running",
        #     progress=10.0,
        #     message="Input validated successfully"
        # )

        # Generate the map image
        image_result = generate_map_image(description, parameters)
        send_progress_update(
            status="running", progress=50.0, message="Map image generated successfully"
        )

        # Send completion update
        send_progress_update(
            status="completed",
            progress=100.0,
            message="Map generation workflow completed successfully",
        )

        logger.info("Map generation flow completed successfully")
        return image_result

    except Exception as e:
        logger.error("Map generation flow failed: %s", e)

        # Send failure update
        send_progress_update(
            status="failed",
            progress=0.0,
            message=f"Map generation workflow failed: {str(e)}",
        )

        # Re-raise the exception
        raise


if __name__ == "__main__":
    # Example usage
    example_input = {
        "width": 30,
        "height": 20,
        "style": "fantasy",
        "theme": "tavern",
        "resolution": 70,
    }

    result = generate_map_flow(
        parameters=example_input,
        description="A small tavern with a main room, a kitchen, and two bedrooms upstairs",
    )
    print(json.dumps(result, indent=2))
