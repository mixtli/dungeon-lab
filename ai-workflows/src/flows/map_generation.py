"""
Map generation flow for Dungeon Lab.
"""

import base64
import os
from datetime import datetime
from typing import Dict, Any
from prefect.artifacts import Artifact
# import base64
# import os
import json

# import openai
# import os
# import base64
# from openai import OpenAI

from openai import OpenAI
from prefect import task, get_run_logger, context
from src.utils.artifact_helpers import create_image_artifact

# Import shared utilities
from src.utils.callbacks import send_progress_update
from src.utils.flow_wrappers import auto_hook_flow

# Import project config
from src.configs.prefect_config import (
    MAP_GENERATION_TIMEOUT,
)


@task(name="generate_image", timeout_seconds=300, retries=2)
def generate_image(
    description: str, parameters: Dict[str, Any], mock: bool = False
) -> Artifact:
    """
    Generate an image from a description and parameters.
    """
    # Prepare prompt
    logger = get_run_logger()
    prompt = (
        f"{description}\nStyle: {parameters.get('style', 'fantasy')}. "
        + f"Theme: {parameters.get('theme', 'dungeon')}."
    )

    # Calculate desired pixel size
    width = parameters.get("width", 30)
    height = parameters.get("height", 20)
    pixels_per_grid = parameters.get("pixelsPerGrid", 70)
    desired_width = width * pixels_per_grid
    desired_height = height * pixels_per_grid

    # OpenAI supports only certain sizes (square)
    allowed_sizes = [(1024, 1024), (1536, 1024), (1024, 1536)]


    def closest_size(w, h):
        max_dim = max(w, h)
        closest = min(allowed_sizes, key=lambda s: abs(s[0] - max_dim))
        return f"{closest[0]}x{closest[1]}", closest[0], closest[1]

    size_str, out_w, out_h = closest_size(desired_width, desired_height)
    logger.info("Size: %s, Width: %s, Height: %s", size_str, out_w, out_h)
    client = OpenAI(
        api_key=os.environ.get("OPENAI_API_KEY"),
        organization=os.environ.get("OPENAI_ORGANIZATION"),
    )

    try:
        if not mock:
            response = client.images.generate(
                model="gpt-image-1", prompt=prompt, n=1, size=size_str
            )
            b64_image = response.data[0].b64_json
            image_bytes = base64.b64decode(b64_image)
        else:
            with open(
                os.path.join(
                    os.path.dirname(__file__), "../../data/images/old_ink_pot.png"
                ),
                "rb",
            ) as image:
                image_bytes = image.read()
        logger.info("Map image generated and decoded from base64.")
    except Exception as e:
        logger.error("OpenAI image generation failed: %s", e)
        raise RuntimeError(f"OpenAI image generation failed: {e}") from e
    image_artifact = create_image_artifact(
        key="generated-map-image",
        content=image_bytes,
        description=f"Generated map image for: {description[:50]}...",
    )
    return image_artifact



@auto_hook_flow(
    name="generate-map",
    timeout_seconds=MAP_GENERATION_TIMEOUT,
    persist_result=True,
)
def generate_map_flow(description: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
    """
    Main flow for generating a map.

    Args:
        input_data: Dictionary containing map generation parameters

    Returns:
        Dictionary containing the generated map data
    """

    description = "Generate a top down map for a table top roll playing game.  The map should not include a grid. " + description

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

        # Generate the map image
        image_artifact = generate_image(description, parameters, mock=False)


        send_progress_update(
            status="running", progress=50.0, message="Map image generated successfully"
        )

        image_result = {
            "image_url": image_artifact.data,
            "created_at": datetime.now().isoformat()
        }

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
