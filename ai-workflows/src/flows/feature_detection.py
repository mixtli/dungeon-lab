"""
Feature detection flow for map images using OpenAI and CV2.
"""

import os
from datetime import datetime
from typing import Dict, Any, List, Tuple
from io import BytesIO
import base64
import tempfile

import json
import cv2  # type: ignore[reportMissingModuleSource]
import numpy as np
import requests
from PIL import Image, ImageDraw

from prefect import task, get_run_logger
from prefect.artifacts import create_markdown_artifact, create_link_artifact
from openai import OpenAI

# Import shared utilities
from src.utils.callbacks import send_progress_update
from src.utils.minio_client import upload_to_minio
from src.utils.flow_wrappers import auto_hook_flow

from src.configs.prefect_config import (
    FEATURE_DETECTION_TIMEOUT,
)


@task(name="fetch_image", retries=2)
def fetch_image(image_url: str) -> bytes:
    """
    Fetch image data from a URL.

    Args:
        image_url: URL of the image to fetch

    Returns:
        Image data as bytes
    """
    logger = get_run_logger()
    logger.info("Fetching image from URL: %s", image_url)

    try:
        response = requests.get(image_url, timeout=30)
        response.raise_for_status()  # Raise exception for non-200 responses
        return response.content
    except Exception as e:
        logger.error("Error fetching image: %s", e)
        raise


@task(name="resize_image", retries=2)
def resize_image(image_bytes: bytes) -> Tuple[bytes, str]:
    """
    Resize the image to match one of the OpenAI supported sizes.

    Args:
        image_bytes: Original image as bytes

    Returns:
        Tuple of (resized image bytes, selected size description)
    """
    logger = get_run_logger()
    logger.info("Resizing image to match OpenAI supported dimensions")

    try:
        # Open the image using PIL
        image = Image.open(BytesIO(image_bytes))

        # Get original dimensions
        original_width, original_height = image.size
        original_aspect = original_width / original_height

        logger.info(
            f"Original image dimensions: {original_width}x{original_height}, aspect ratio: {original_aspect:.2f}"
        )

        # Define the OpenAI supported sizes
        supported_sizes = [
            {"name": "square", "width": 1024, "height": 1024, "aspect": 1.0},
            {"name": "landscape", "width": 1536, "height": 1024, "aspect": 1.5},
            {"name": "portrait", "width": 1024, "height": 1536, "aspect": 0.667},
        ]

        # Find the best matching size based on aspect ratio
        best_size = min(
            supported_sizes, key=lambda s: abs(s["aspect"] - original_aspect)
        )

        logger.info(
            f"Selected size: {best_size['name']} ({best_size['width']}x{best_size['height']})"
        )

        # Resize the image
        resized_image = image.resize(
            (best_size["width"], best_size["height"]), Image.LANCZOS
        )

        # Convert back to bytes
        resized_bytes = BytesIO()
        resized_image.save(resized_bytes, format=image.format or "PNG")
        resized_bytes.seek(0)

        return (
            resized_bytes.getvalue(),
            f"{best_size['name']} ({best_size['width']}x{best_size['height']})",
        )

    except Exception as e:
        logger.error(f"Error resizing image: {e}")
        raise


@task(name="outline_impassable_areas", timeout_seconds=300, retries=2)
def outline_impassable_areas(image_bytes: bytes, size_info: str) -> bytes:
    """
    Use OpenAI's GPT-image-1 to outline impassable areas in the map.

    Args:
        image_bytes: Resized map image as bytes
        size_info: Size information string (e.g., "square (1024x1024)")

    Returns:
        Modified image with outlined impassable areas as bytes
    """
    logger = get_run_logger()
    logger.info("Using GPT-image-1 to outline impassable areas")

    # Initialize OpenAI client
    client = OpenAI(
        api_key=os.environ.get("OPENAI_API_KEY"),
        organization=os.environ.get("OPENAI_ORGANIZATION"),
    )

    try:
        # Create a temporary file to hold the image
        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as temp:
            temp_file_path = temp.name
            temp.write(image_bytes)

        try:
            # Parse the size info to determine what size to request from OpenAI
            if "landscape" in size_info:
                api_size = "1536x1024"
            elif "portrait" in size_info:
                api_size = "1024x1536"
            else:
                api_size = "1024x1024"  # Default to square

            logger.info(f"Using OpenAI API size: {api_size}")

            # Use the temporary file for API call
            with open(temp_file_path, "rb") as image_file:
                response = client.images.edit(
                    model="gpt-image-1",
                    image=image_file,
                    prompt="""Draw thick black lines around all walls and
                    impassable areas in this map.
                    Make the lines clear, precise, and very thick (at least 5 pixels wide).
                    The lines should clearly define the boundaries of walkable and non-walkable areas.
                    All walls should be outlined with thick black lines.
                    The lines should be black with 100% opacity.
                    Remove everything else in the image except the black lines.
                    """,
                    n=1,
                    size=api_size,
                )

            # Decode the response
            result_image_base64 = response.data[0].b64_json
            result_image_bytes = base64.b64decode(result_image_base64)

            return result_image_bytes
        finally:
            # Clean up the temporary file
            if os.path.exists(temp_file_path):
                os.unlink(temp_file_path)

    except Exception as e:
        logger.error("OpenAI image edit failed: %s", e)
        raise RuntimeError(f"OpenAI image edit failed: {e}") from e


@task(name="highlight_portals", timeout_seconds=300, retries=2)
def highlight_portals(image_bytes: bytes) -> bytes:
    """
    Use OpenAI's GPT-image-1 to highlight portals and doors in the map.

    Args:
        image_bytes: Original map image as bytes

    Returns:
        Modified image with highlighted portals as bytes
    """
    # Commented out for now to focus only on wall detection
    pass
    '''
    logger = get_run_logger()
    logger.info("Using GPT-image-1 to highlight portals and doorways")

    # Initialize OpenAI client
    client = OpenAI(
        api_key=os.environ.get("OPENAI_API_KEY"),
        organization=os.environ.get("OPENAI_ORGANIZATION"),
    )

    try:
        # Create a temporary file to hold the image
        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as temp:
            temp_file_path = temp.name
            temp.write(image_bytes)

        try:
            # Use the temporary file for API call
            with open(temp_file_path, "rb") as image_file:
                response = client.images.edit(
                    model="gpt-image-1",
                    image=image_file,
                    prompt="""Draw thick black lines to mark all doorways, portals,
                    and passages between rooms in this map.
                    Make the lines clear, precise, and very thick (at least 5 pixels wide).
                    The lines should be black with 100% opacity.
                    Each doorway or portal should be marked with a single straight line.
                    Place the black line segment exactly at the transition point between rooms/areas.
                    Remove everything else in the image except the black lines.
                    """,
                    n=1,
                    size="1024x1024",
                )

            # Decode the response
            result_image_base64 = response.data[0].b64_json
            result_image_bytes = base64.b64decode(result_image_base64)

            return result_image_bytes
        finally:
            # Clean up the temporary file
            if os.path.exists(temp_file_path):
                os.unlink(temp_file_path)

    except Exception as e:
        logger.error("OpenAI image edit failed for portals: %s", e)
        raise RuntimeError(f"OpenAI image edit failed for portals: {e}") from e
    '''


@task(name="detect_wall_segments", retries=2)
def detect_wall_segments(image_bytes: bytes) -> List[List[Dict[str, int]]]:
    """
    Use OpenCV to detect wall segments from the outlined image.

    Args:
        image_bytes: Image with outlined walls as bytes

    Returns:
        List of wall segments as lists of points
    """
    logger = get_run_logger()
    logger.info("Using CV2 to detect wall segments")

    try:
        # Convert bytes to numpy array
        nparr = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)  # type: ignore

        # Convert image to HSV color space
        hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)  # type: ignore

        # Define black color range in HSV
        # Black is low value (brightness) in HSV
        lower_black = np.array([0, 0, 0])
        upper_black = np.array([180, 255, 30])  # Adjust the value threshold as needed

        # Create mask for black
        mask = cv2.inRange(hsv, lower_black, upper_black)  # type: ignore

        # Find contours of the black lines
        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)  # type: ignore

        # Extract simplified coordinate sets (approximate each contour to a polyline)
        wall_segments = []
        for cnt in contours:
            # Skip very small contours
            if cv2.contourArea(cnt) < 100:  # type: ignore
                continue

            epsilon = 1.0  # Tolerance for contour approximation
            approx = cv2.approxPolyDP(cnt, epsilon, False)  # type: ignore

            if len(approx) >= 2:
                line_coords = [
                    {"x": int(pt[0][0]), "y": int(pt[0][1])} for pt in approx
                ]
                wall_segments.append(line_coords)

        logger.info("Extracted %d wall segments", len(wall_segments))
        return wall_segments

    except Exception as e:
        logger.error("Error detecting wall segments: %s", e)
        raise


@task(name="detect_portal_segments", retries=2)
def detect_portal_segments(
    image_bytes: bytes,
) -> List[Tuple[Tuple[int, int], Tuple[int, int]]]:
    """
    Use OpenCV to detect portal segments from the highlighted portal image.

    Args:
        image_bytes: Image with highlighted portals as bytes

    Returns:
        List of portal segments as pairs of endpoints
    """
    # Commented out for now to focus only on wall detection
    return []
    """
    logger = get_run_logger()
    logger.info("Using CV2 to detect portal segments")

    try:
        # Convert bytes to numpy array
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)  # type: ignore

        # Convert to grayscale
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)  # type: ignore
        
        # Apply threshold to get binary image, focusing on the black lines
        _, binary = cv2.threshold(gray, 50, 255, cv2.THRESH_BINARY_INV)  # type: ignore

        # Use HoughLinesP to detect line segments
        lines = cv2.HoughLinesP(  # type: ignore
            binary, 1, np.pi / 180, threshold=50, minLineLength=20, maxLineGap=5
        )

        portal_segments: List[Tuple[Tuple[int, int], Tuple[int, int]]] = []
        if lines is not None:
            for line in lines:
                x1, y1, x2, y2 = line[0]
                portal_segments.append(((x1, y1), (x2, y2)))

        logger.info("Detected %d portal segments", len(portal_segments))
        return portal_segments

    except Exception as e:
        logger.error("Error detecting portal segments: %s", e)
        raise
    """


@task(name="save_features_to_json", retries=2)
def save_features_to_json(
    wall_segments: List[List[Dict[str, int]]],
    portal_segments: List[Tuple[Tuple[int, int], Tuple[int, int]]],
) -> bytes:
    """
    Convert wall and portal segments to JSON format.

    Args:
        wall_segments: List of wall segments as lists of points
        portal_segments: List of portal segments as pairs of endpoints

    Returns:
        JSON data as bytes
    """
    logger = get_run_logger()
    logger.info("Converting feature segments to JSON")

    try:
        # Convert NumPy types to Python native types for JSON serialization
        def convert_numpy_to_python(obj):
            """Convert NumPy types to native Python types for JSON serialization."""
            if isinstance(obj, (np.integer, np.int32, np.int64)):
                return int(obj)
            elif isinstance(obj, (np.floating, np.float32, np.float64)):
                return float(obj)
            elif isinstance(obj, (np.ndarray,)):
                return obj.tolist()
            elif isinstance(obj, (list, tuple)):
                return [convert_numpy_to_python(item) for item in obj]
            elif isinstance(obj, dict):
                return {
                    key: convert_numpy_to_python(value) for key, value in obj.items()
                }
            else:
                return obj

        # Convert the coordinate data
        python_wall_segments = convert_numpy_to_python(wall_segments)
        # Comment out portal segments since we're focusing only on walls
        # python_portal_segments = convert_numpy_to_python(portal_segments)

        # Create a dictionary for the JSON data
        feature_data = {
            "walls": python_wall_segments,
            # Comment out portals
            # "portals": python_portal_segments,
            "createdAt": datetime.utcnow().isoformat(),
        }

        # Convert to JSON
        json_data = json.dumps(feature_data, indent=2)
        return json_data.encode("utf-8")

    except Exception as e:
        logger.error("Error creating JSON: %s", e)
        raise


@task(name="upload_json_to_minio", retries=2)
def upload_json_to_minio(json_bytes: bytes, object_name: str) -> str:
    """
    Upload a JSON file to MinIO and return its URL.

    Args:
        json_bytes: JSON data as bytes
        object_name: MinIO object name

    Returns:
        Public URL of the uploaded JSON
    """
    logger = get_run_logger()
    logger.info("Uploading JSON to MinIO: %s", object_name)

    # MinIO config from environment
    minio_public_url = os.environ.get("MINIO_PUBLIC_URL")
    minio_bucket = os.environ.get("MINIO_BUCKET_NAME")

    if not all([minio_bucket, minio_public_url]):
        raise RuntimeError("Missing one or more required MinIO environment variables.")

    try:
        # Upload to MinIO
        upload_to_minio(object_name, json_bytes, content_type="application/json")
        json_url = f"{minio_public_url}/{minio_bucket}/{object_name}"
        logger.info("JSON uploaded successfully: %s", json_url)
        return json_url
    except Exception as e:
        logger.error("Error uploading JSON to MinIO: %s", e)
        raise


@task(name="draw_features_on_image", retries=1)
def draw_features_on_image(
    original_image_bytes: bytes,
    wall_segments: List[List[Dict[str, int]]],
    portal_segments: List[Tuple[Tuple[int, int], Tuple[int, int]]],
    original_size: Tuple[int, int],
    resized_size: Tuple[int, int],
) -> bytes:
    """
    Draw detected walls and portals on the original image.

    Args:
        original_image_bytes: Original map image as bytes
        wall_segments: List of wall segments as lists of points
        portal_segments: List of portal segments as pairs of endpoints
        original_size: Original image dimensions (width, height)
        resized_size: Resized image dimensions (width, height)

    Returns:
        Image with drawn features as bytes
    """
    logger = get_run_logger()
    logger.info("Drawing features on original image")

    try:
        # Open original image
        image = Image.open(BytesIO(original_image_bytes))
        draw = ImageDraw.Draw(image)

        # Calculate scaling factors
        scale_x = original_size[0] / resized_size[0]
        scale_y = original_size[1] / resized_size[1]

        logger.info(f"Scaling coordinates by factors: x={scale_x:.2f}, y={scale_y:.2f}")

        # Draw wall segments
        for points in wall_segments:
            if len(points) >= 2:
                # Scale the coordinates to match the original image
                scaled_points = [
                    {"x": int(p["x"] * scale_x), "y": int(p["y"] * scale_y)}
                    for p in points
                ]

                # Draw lines between consecutive points
                for i in range(len(scaled_points) - 1):
                    draw.line(
                        [
                            (scaled_points[i]["x"], scaled_points[i]["y"]),
                            (scaled_points[i + 1]["x"], scaled_points[i + 1]["y"]),
                        ],
                        fill=(255, 0, 0),  # Red color for walls
                        width=max(
                            2, int(2 * min(scale_x, scale_y))
                        ),  # Scale line width
                    )
                # Connect last point to first point
                draw.line(
                    [
                        (scaled_points[-1]["x"], scaled_points[-1]["y"]),
                        (scaled_points[0]["x"], scaled_points[0]["y"]),
                    ],
                    fill=(255, 0, 0),  # Red color for walls
                    width=max(2, int(2 * min(scale_x, scale_y))),  # Scale line width
                )

        # Portal segments are skipped/commented out for now
        # for start, end in portal_segments:
        #     draw.line(
        #         [start, end],
        #         fill=(0, 0, 255),  # Blue color for portals
        #         width=3,
        #     )

        # Convert back to bytes
        img_bytes = BytesIO()
        image.save(img_bytes, format="PNG")
        return img_bytes.getvalue()

    except Exception as e:
        logger.error("Error drawing features on image: %s", e)
        raise


@task(name="upload_image_to_minio", retries=2)
def upload_image_to_minio(image_bytes: bytes, object_name: str) -> str:
    """
    Upload an image to MinIO and return its URL.

    Args:
        image_bytes: Image data as bytes
        object_name: MinIO object name

    Returns:
        Public URL of the uploaded image
    """
    logger = get_run_logger()
    logger.info("Uploading image to MinIO: %s", object_name)

    # MinIO config from environment
    minio_public_url = os.environ.get("MINIO_PUBLIC_URL")
    minio_bucket = os.environ.get("MINIO_BUCKET_NAME")

    if not all([minio_bucket, minio_public_url]):
        raise RuntimeError("Missing one or more required MinIO environment variables.")

    try:
        # Upload to MinIO
        upload_to_minio(object_name, image_bytes, content_type="image/png")
        image_url = f"{minio_public_url}/{minio_bucket}/{object_name}"
        logger.info("Image uploaded successfully: %s", image_url)
        return image_url
    except Exception as e:
        logger.error("Error uploading image to MinIO: %s", e)
        raise


@auto_hook_flow(
    name="detect-map-features",
    timeout_seconds=FEATURE_DETECTION_TIMEOUT,
    persist_result=True,
)
def detect_features_flow(image_url: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
    """
    Main flow for detecting features in a map image using OpenAI and CV2.

    Args:
        input_data: Dictionary containing feature detection parameters

    Returns:
        Dictionary containing detected features and image URL
    """
    logger = get_run_logger()
    logger.info("Starting feature detection flow with OpenAI and CV2")

    # Start progress tracking
    send_progress_update(
        status="running", progress=0.0, message="Starting feature detection workflow"
    )

    try:
        # Step 1: Validate input
        send_progress_update(
            status="running", progress=5.0, message="Input validated successfully"
        )

        # Step 2: Fetch the image
        original_image_bytes = fetch_image(image_url)
        send_progress_update(
            status="running", progress=10.0, message="Image fetched successfully"
        )

        # Get original image dimensions
        original_image = Image.open(BytesIO(original_image_bytes))
        original_size = original_image.size  # (width, height)
        logger.info(f"Original image size: {original_size[0]}x{original_size[1]}")

        # Step 3: Resize the image
        resized_image_bytes, resized_size_description = resize_image(
            original_image_bytes
        )

        # Get resized dimensions
        resized_image = Image.open(BytesIO(resized_image_bytes))
        resized_size = resized_image.size  # (width, height)
        logger.info(f"Resized image size: {resized_size[0]}x{resized_size[1]}")

        send_progress_update(
            status="running",
            progress=15.0,
            message=f"Image resized to {resized_size_description}",
        )

        # Step 4: Generate wall outline image
        timestamp = datetime.now().strftime("%Y%m%dT%H%M%S")

        logger.info("Starting wall outline detection")
        send_progress_update(
            status="running", progress=20.0, message="Generating wall outlines"
        )
        wall_image_bytes = outline_impassable_areas(
            resized_image_bytes, resized_size_description
        )

        # Upload wall outline image
        wall_object_name = f"maps/wall_outline_{timestamp}.png"
        wall_image_url = upload_image_to_minio(wall_image_bytes, wall_object_name)
        create_link_artifact(
            key="wall-image-url",
            link=wall_image_url,
            description="Wall outline image",
        )

        # Skip portal highlight image generation/detection
        # Empty placeholder for portal segments
        portal_segments = []
        portal_image_url = None

        send_progress_update(
            status="running", progress=45.0, message="Generated outline images"
        )

        # Step 5: Use CV2 to detect wall features
        send_progress_update(
            status="running", progress=50.0, message="Detecting wall segments"
        )
        wall_segments = detect_wall_segments(wall_image_bytes)

        # Skip portal detection
        send_progress_update(
            status="running",
            progress=70.0,
            message=f"Detected {len(wall_segments)} wall segments",
        )

        # Step 6: Save features as JSON and upload
        send_progress_update(
            status="running",
            progress=75.0,
            message="Saving feature data as JSON",
        )
        json_bytes = save_features_to_json(wall_segments, portal_segments)
        json_object_name = f"maps/map_features_{timestamp}.json"
        json_url = upload_json_to_minio(json_bytes, json_object_name)

        create_link_artifact(
            key="features-json-url",
            link=json_url,
            description="JSON file with wall coordinates",
        )

        # Step 7: Draw features on the original image
        send_progress_update(
            status="running",
            progress=85.0,
            message="Drawing features on original image",
        )
        final_image_bytes = draw_features_on_image(
            original_image_bytes,
            wall_segments,
            portal_segments,
            original_size,
            resized_size,
        )

        # Step 8: Upload final image
        final_object_name = f"maps/feature_detected_map_{timestamp}.png"
        final_image_url = upload_image_to_minio(final_image_bytes, final_object_name)

        create_link_artifact(
            key="final-image-url",
            link=final_image_url,
            description="Final feature-detected map image",
        )

        # Prepare final result
        final_result = {
            "status": "completed",
            "image_url": final_image_url,
            "wall_segments_count": len(wall_segments),
            "wall_image_url": wall_image_url,
            "features_json_url": json_url,
            "original_size": f"{original_size[0]}x{original_size[1]}",
            "resized_size": f"{resized_size[0]}x{resized_size[1]}",
            "createdAt": datetime.utcnow().isoformat(),
        }

        # Create an artifact for the detected features
        create_markdown_artifact(
            key="detected-features",
            markdown=f"""
            # Detected Map Features
            
            **Original Image**: {image_url}
            **Feature-Detected Image**: {final_image_url}
            
            ## Statistics
            
            - **Wall Segments**: {len(wall_segments)}
            - **Original Size**: {original_size[0]}x{original_size[1]}
            - **Resized Size**: {resized_size[0]}x{resized_size[1]}
            
            ## Process Images
            
            - **Wall Outline Image**: [{wall_image_url}]({wall_image_url})
            - **Final Feature Image**: [{final_image_url}]({final_image_url})
            - **Features JSON**: [{json_url}]({json_url})
            
            ## Feature Data Preview
            
            ```json
            {json.dumps({"wall_segments_count": len(wall_segments)}, indent=2)}
            ```
            """,
            description="Features detected in map image",
        )

        # Send completion update
        send_progress_update(
            status="completed",
            progress=100.0,
            message="Feature detection workflow completed successfully",
        )

        logger.info("Feature detection flow completed successfully")
        return final_result

    except Exception as e:
        logger.error("Feature detection flow failed: %s", e)

        # Send failure update
        send_progress_update(
            status="failed",
            progress=0.0,
            message=f"Feature detection workflow failed: {str(e)}",
        )

        # Re-raise the exception
        raise


if __name__ == "__main__":
    # Example usage
    example_input = {
        "image_url": "http://example.com/path/to/map.png",  # Replace with an actual image URL
        "userId": "user123",
        "pixels_per_grid": 70,
    }

    # This will fail unless an actual image URL is provided
    # result = detect_features_flow(input_data=example_input)
    # print(json.dumps(result, indent=2))
