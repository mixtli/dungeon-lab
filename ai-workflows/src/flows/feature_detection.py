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
from PIL import Image, ImageDraw
from prefect import task, get_run_logger
from prefect.artifacts import create_markdown_artifact, Artifact
from openai import OpenAI



# Import shared utilities
from src.utils.callbacks import send_progress_update
from src.utils.flow_wrappers import auto_hook_flow
from src.utils.artifact_helpers import (
    create_link_artifact,
    create_image_artifact,
    fetch_artifact_data,
    fetch_image,
)


from src.configs.prefect_config import (
    FEATURE_DETECTION_TIMEOUT,
)


# Extract the href from a markdown link
def extract_href_from_markdown_link(markdown_link: str) -> str:
    return markdown_link.split("](")[1].split(")")[0]

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
            "Original image dimensions: %dx%d, aspect ratio: %.2f",
            original_width,
            original_height,
            original_aspect,
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
            "Selected size: %s (%dx%d)",
            best_size["name"],
            best_size["width"],
            best_size["height"],
        )

        # Resize the image
        resized_image = image.resize(
            (best_size["width"], best_size["height"]), Image.LANCZOS
        )

        # Convert back to bytes
        resized_bytes = BytesIO()
        resized_image.save(resized_bytes, format=image.format or "PNG")
        resized_bytes.seek(0)

        resized_artifact = create_image_artifact(
            content=resized_bytes.getvalue(),
            key="resized-image",
            content_type="image/png",
            description=f"Resized image to {best_size['name']} ({best_size['width']}x{best_size['height']})",
        )

        return resized_artifact

    except Exception as e:
        logger.error("Error resizing image: %s", e)
        raise


@task(name="outline_impassable_areas", timeout_seconds=300, retries=2)
def outline_impassable_areas(image_artifact: Artifact, mock: bool = False) -> Artifact:
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

    image_bytes = fetch_artifact_data(image_artifact)
    image = Image.open(BytesIO(image_bytes))
    if image.size == (1024, 1024):
        api_size = "1024x1024"
    elif image.size == (1536, 1024):
        api_size = "1536x1024"
    elif image.size == (1024, 1536):
        api_size = "1024x1536"
    else:
        raise ValueError(f"Unsupported image size: {image.size}")

    try:
        logger.info("Using OpenAI API size: %s", api_size)
        # Create a temporary file to hold the image
        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as temp:
            temp_file_path = temp.name
            temp.write(image_bytes)

        try:
            if not mock:
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
            else:
                result_image_bytes = fetch_image("http://localhost:9000/prefect/wall-outline-b86c82f9-9289-46a1-898f-2c51687e7653")

            wall_outline_artifact = create_image_artifact(
                content=result_image_bytes,
                key="wall-outline",
            )
            logger.info("Wall outline artifact: %s", wall_outline_artifact)

            return wall_outline_artifact
        finally:
            # Clean up the temporary file
            if os.path.exists(temp_file_path):
                os.unlink(temp_file_path)

    except Exception as e:
        logger.error("OpenAI image edit failed: %s", e)
        raise RuntimeError(f"OpenAI image edit failed: {e}") from e


@task(name="highlight_portals", timeout_seconds=300, retries=2)
def highlight_portals(image_bytes: bytes, mock: bool = False) -> Artifact:
    """
    Use OpenAI's GPT-image-1 to highlight portals and doors in the map.

    Args:
        image_bytes: Original map image as bytes

    Returns:
        Modified image with highlighted portals as bytes
    """
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

        # Determine the image size for the API
        image = Image.open(BytesIO(image_bytes))
        if image.size == (1024, 1024):
            api_size = "1024x1024"
        elif image.size == (1536, 1024):
            api_size = "1536x1024"
        elif image.size == (1024, 1536):
            api_size = "1024x1536"
        else:
            # Default to 1024x1024 if size doesn't match OpenAI's supported sizes
            api_size = "1024x1024"
            logger.warning(f"Image size {image.size} not directly supported, defaulting to {api_size}")

        try:
            if not mock:
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
                    size=api_size,
                )
                # Decode the response
                result_image_base64 = response.data[0].b64_json
                result_image_bytes = base64.b64decode(result_image_base64)
            else:
                result_image_bytes = fetch_image("http://localhost:9000/prefect/portal-highlight-e0a7e4d3-b28f-42c8-a5d0-e73d65e92eb6")


            portal_highlight_artifact = create_image_artifact(
                content=result_image_bytes,
                key="portal-highlight",
                content_type="image/png",
                description="Portal highlight image",
            )
            return portal_highlight_artifact
        finally:
            # Clean up the temporary file
            if os.path.exists(temp_file_path):
                os.unlink(temp_file_path)

    except Exception as e:
        logger.error("OpenAI image edit failed for portals: %s", e)
        raise RuntimeError(f"OpenAI image edit failed for portals: {e}") from e


def detect_lines_with_hough(gray_image: np.ndarray) -> List[List[Dict[str, int]]]:
    """
    Detect lines in a grayscale image using Canny edge detection and Hough transform.

    Args:
        gray_image: Grayscale image as numpy array

    Returns:
        List of line segments as lists of points
    """
    logger = get_run_logger()

    # Apply Canny edge detection
    edges = cv2.Canny(gray_image, 50, 150, apertureSize=3)  # type: ignore

    # Save edges for debugging
    cv2.imwrite("debug_edges.png", edges)  # type: ignore

    # Dilate edges to connect nearby lines
    kernel = np.ones((3, 3), np.uint8)
    dilated_edges = cv2.dilate(edges, kernel, iterations=1)  # type: ignore

    # Use probabilistic Hough Line Transform
    line_segments = []
    lines = cv2.HoughLinesP(  # type: ignore
        dilated_edges,
        rho=1,
        theta=np.pi / 180,
        threshold=20,
        minLineLength=20,
        maxLineGap=10,
    )

    if lines is not None:
        for line in lines:
            x1, y1, x2, y2 = line[0]
            # Convert to our point format
            line_coords = [{"x": x1, "y": y1}, {"x": x2, "y": y2}]
            line_segments.append(line_coords)

    logger.info(
        f"Detected {len(line_segments) if lines is not None else 0} Hough line segments"
    )

    return line_segments


def detect_contours(binary_image: np.ndarray) -> List[List[Tuple[int, int]]]:
    """
    Detect contours in a binary image.

    Args:
        binary_image: Binary image as numpy array

    Returns:
        List of contour segments as lists of points (each point is a tuple of (x, y) coordinates)
    """
    logger = get_run_logger()

    # Find ALL contours (including internal ones)
    contours, _ = cv2.findContours(binary_image, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)  # type: ignore

    logger.info(f"Found {len(contours)} contours in total")

    # Extract wall segments from contours
    contour_segments = []
    for cnt in contours:
        # Skip very small contours
        area = cv2.contourArea(cnt)  # type: ignore
        if area < 30:
            continue

        # Use a reasonable epsilon for approximation
        epsilon = 0.005 * cv2.arcLength(cnt, True)  # type: ignore
        approx = cv2.approxPolyDP(cnt, epsilon, True)  # type: ignore

        if (
            len(approx) >= 3
        ):  # Ensure there are enough points to form a meaningful shape
            # Convert NumPy int32 values to Python int
            line_coords = [(int(pt[0][0]), int(pt[0][1])) for pt in approx]
            contour_segments.append(line_coords)

    logger.info(f"Extracted {len(contour_segments)} contour segments")

    return contour_segments


@task(name="detect_wall_segments", retries=2)
def detect_wall_segments(wall_outline_artifact: Artifact) -> List[List[Tuple[int, int]]]:
    """
    Use OpenCV to detect wall segments from the outlined image.

    Args:
        image_bytes: Image with outlined walls as bytes

    Returns:
        List of wall segments as lists of points
    """
    image_bytes = fetch_artifact_data(wall_outline_artifact)
    logger = get_run_logger()
    logger.info("Using CV2 to detect wall segments")

    try:
        # Convert bytes to numpy array
        nparr = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)  # type: ignore

        # Get image dimensions
        height, width = image.shape[:2]
        logger.info(f"Image dimensions: {width}x{height}")

        # Convert to grayscale first for better processing
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)  # type: ignore

        # Create a binary image with adaptive thresholding for better line detection
        _, binary = cv2.threshold(gray, 25, 255, cv2.THRESH_BINARY_INV)  # type: ignore

        # Save binary image for debugging
        cv2.imwrite("debug_binary.png", binary)  # type: ignore

        # Method 1: Contour detection
        contour_segments = detect_contours(binary)

        # Method 2: Edge detection + Hough Lines
        # line_segments = detect_lines_with_hough(gray)

        # Combine both methods (prioritize contours, then add lines that aren't already covered)
        all_segments = contour_segments  # + line_segments
        logger.info(f"Total segments: {len(all_segments)}")

        return all_segments

    except Exception as e:
        logger.error("Error detecting wall segments: %s", e)
        raise


@task(name="detect_portal_segments", retries=2)
def detect_portal_segments(
    portal_outline_artifact: Artifact,
) -> List[Tuple[Tuple[int, int], Tuple[int, int]]]:
    """
    Use OpenCV to detect portal segments from the highlighted portal image.

    Args:
        portal_outline_artifact: Artifact containing highlighted portal image

    Returns:
        List of portal segments as pairs of endpoints
    """
    image_bytes = fetch_artifact_data(portal_outline_artifact)
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
                # Convert NumPy int32 to Python int
                x1, y1, x2, y2 = int(line[0][0]), int(line[0][1]), int(line[0][2]), int(line[0][3])
                portal_segments.append(((x1, y1), (x2, y2)))

        logger.info("Detected %d portal segments", len(portal_segments))
        return portal_segments

    except Exception as e:
        logger.error("Error detecting portal segments: %s", e)
        raise


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
        python_portal_segments = convert_numpy_to_python(portal_segments)

        # Create a dictionary for the JSON data
        feature_data = {
            "walls": python_wall_segments,
            "portals": python_portal_segments,
            "createdAt": datetime.utcnow().isoformat(),
        }

        # Convert to JSON
        json_data = json.dumps(feature_data, indent=2)
        return json_data.encode("utf-8")

    except Exception as e:
        logger.error("Error creating JSON: %s", e)
        raise


@task(name="draw_features_on_image", retries=1)
def draw_features_on_image(
    original_image_bytes: bytes,
    wall_segments: List[List[Tuple[int, int]]],
    portal_segments: List[Tuple[Tuple[int, int], Tuple[int, int]]],
    original_size: Tuple[int, int],
    resized_size: Tuple[int, int],
) -> Artifact:
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
    logger.info(
        f"Drawing features on original image: {len(wall_segments)} wall segments, {len(portal_segments)} portal segments"
    )

    try:
        # Open original image
        image = Image.open(BytesIO(original_image_bytes))
        draw = ImageDraw.Draw(image)

        # Calculate scaling factors
        scale_x = original_size[0] / resized_size[0]
        scale_y = original_size[1] / resized_size[1]

        logger.info(f"Scaling coordinates by factors: x={scale_x:.2f}, y={scale_y:.2f}")

        # Define multiple colors for walls to distinguish different segments
        wall_colors = [
            (255, 0, 0),  # Red
            (0, 255, 0),  # Green
            (0, 0, 255),  # Blue
            (255, 255, 0),  # Yellow
            (255, 0, 255),  # Magenta
            (0, 255, 255),  # Cyan
            (128, 0, 0),  # Dark Red
            (0, 128, 0),  # Dark Green
            (0, 0, 128),  # Dark Blue
        ]

        line_width = max(2, int(2 * min(scale_x, scale_y)))  # Scale line width
        logger.info(f"Using line width: {line_width}")

        # Draw wall segments with different colors
        for idx, points in enumerate(wall_segments):
            if len(points) >= 2:
                # Choose color based on segment index
                color = wall_colors[idx % len(wall_colors)]

                # Scale the coordinates to match the original image
                scaled_points = [
                    (int(p[0] * scale_x), int(p[1] * scale_y))
                    for p in points
                ]

                # Draw lines between consecutive points
                for i in range(len(scaled_points) - 1):
                    draw.line(
                        [
                            (scaled_points[i][0], scaled_points[i][1]),
                            (scaled_points[i + 1][0], scaled_points[i + 1][1]),
                        ],
                        fill=color,
                        width=line_width,
                    )

                # Connect last point to first point to close the contour
                if len(scaled_points) > 2:  # Only close if there are at least 3 points
                    draw.line(
                        [
                            (scaled_points[-1][0], scaled_points[-1][1]),
                            (scaled_points[0][0], scaled_points[0][1]),
                        ],
                        fill=color,
                        width=line_width,
                    )

        # Draw portal segments
        for start, end in portal_segments:
            # Scale coordinates
            scaled_start = (int(start[0] * scale_x), int(start[1] * scale_y))
            scaled_end = (int(end[0] * scale_x), int(end[1] * scale_y))
            
            draw.line(
                [scaled_start, scaled_end],
                fill=(0, 0, 255),  # Blue color for portals
                width=line_width,
            )

        # Convert back to bytes
        img_bytes = BytesIO()
        image.save(img_bytes, format="PNG")
        return create_image_artifact(
            content=img_bytes.getvalue(),
            key="feature-detected-image",
            content_type="image/png",
            description="Feature detected map image",
        )

    except Exception as e:
        logger.error("Error drawing features on image: %s", e)
        raise


@task(name="create_uvtt_file", retries=2)
def create_uvtt_file(
    wall_segments: List[List[Tuple[int, int]]],
    portal_segments: List[Tuple[Tuple[int, int], Tuple[int, int]]],
    original_image_bytes: bytes,
    original_size: Tuple[int, int],
    pixels_per_grid: int = 70,  # Default value, can be overridden
) -> bytes:
    """
    Create a Universal VTT (UVTT) file from detected features.
    
    Args:
        wall_segments: List of wall segments as lists of points
        portal_segments: List of portal segments as pairs of endpoints
        original_image_bytes: Original map image as bytes
        original_size: Original image dimensions (width, height)
        pixels_per_grid: Number of pixels per grid square
        
    Returns:
        UVTT file as bytes
    """
    logger = get_run_logger()
    logger.info("Creating UVTT file from detected features")
    
    try:
        # Calculate map size in grid units
        width_in_squares = float(original_size[0] / pixels_per_grid)
        height_in_squares = float(original_size[1] / pixels_per_grid)
        
        # Convert wall segments to line_of_sight format (arrays of x,y points)
        line_of_sight = []
        for wall in wall_segments:
            # Use absolute coordinates without dividing by pixels_per_grid
            wall_points = []
            for point in wall:
                wall_points.append({
                    "x": int(point[0]),  # Ensure it's a Python int
                    "y": int(point[1])   # Ensure it's a Python int
                })
            line_of_sight.append(wall_points)
        
        # Convert portal segments to portals format
        portals = []
        for idx, (start, end) in enumerate(portal_segments):
            # Convert coordinates to native Python types
            start_x, start_y = int(start[0]), int(start[1])
            end_x, end_y = int(end[0]), int(end[1])
            
            # Calculate center position using absolute coordinates
            center_x = float((start_x + end_x) / 2)
            center_y = float((start_y + end_y) / 2)
            
            # Calculate angle
            dx = end_x - start_x
            dy = end_y - start_y
            rotation = float(np.arctan2(dy, dx))
            
            # Create portal object with absolute coordinates
            portal = {
                "position": {
                    "x": center_x,
                    "y": center_y
                },
                "bounds": [
                    {"x": start_x, "y": start_y},
                    {"x": end_x, "y": end_y}
                ],
                "rotation": rotation,
                "closed": False,
                "freestanding": False
            }
            portals.append(portal)
        
        # Create environment settings
        environment = {
            "baked_lighting": False,
            "ambient_light": "#ffffff"
        }
        
        # Encode the image to base64
        with BytesIO(original_image_bytes) as image_buffer:
            image = Image.open(image_buffer)
            # Convert to PNG if not already
            output_buffer = BytesIO()
            image.save(output_buffer, format="PNG")
            base64_image = base64.b64encode(output_buffer.getvalue()).decode('utf-8')
        
        # Assemble the UVTT format with native Python types
        uvtt_data = {
            "format": 1.0,  # Version number
            "resolution": {
                "map_origin": {
                    "x": 0.0,
                    "y": 0.0
                },
                "map_size": {
                    "x": width_in_squares,
                    "y": height_in_squares
                },
                "pixels_per_grid": int(pixels_per_grid)
            },
            "line_of_sight": line_of_sight,
            "portals": portals,
            "environment": environment,
            "image": base64_image,
            "software": "DungeonLab",
            "creator": "DungeonLab Feature Detection"
        }
        logger.info(f"UVTT data: {uvtt_data}")
        
        # Convert to JSON
        uvtt_json = json.dumps(uvtt_data).encode('utf-8')
        uvtt_artifact = create_link_artifact(
            content=uvtt_json,
            key="uvtt-file",
            content_type="application/uvtt",
            description="UVTT file",
        )
        return uvtt_artifact
        
    except Exception as e:
        logger.error("Error creating UVTT file: %s", e)
        raise


@auto_hook_flow(
    name="detect-map-features",
    timeout_seconds=FEATURE_DETECTION_TIMEOUT,
    persist_result=True,
)
def detect_features_flow(image_url: str, pixels_per_grid: int = 70) -> Dict[str, Any]:
    """
    Main flow for detecting features in a map image using OpenAI and CV2.

    Args:
        image_url: URL of the image to process
        pixels_per_grid: Number of pixels per grid square (default: 70)

    Returns:
        Dictionary containing detected features and image URL
    """

    # Temporary for testing
    image_url = "http://localhost:9000/prefect/original-image-c15b5c33-53e3-47ce-9415-d1d4abe8d660" 
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
        create_image_artifact(
            content=original_image_bytes,
            key="original-image",
            content_type="image/png",
            description="Original map image",
        )
        send_progress_update(
            status="running", progress=10.0, message="Image fetched successfully"
        )

        # Get original image dimensions
        original_image = Image.open(BytesIO(original_image_bytes))
        original_size = original_image.size  # (width, height)
        logger.info("Original image size: %dx%d", original_size[0], original_size[1])

        # Step 3: Resize the image
        resized_artifact = resize_image(original_image_bytes)
        resized_image_bytes = fetch_artifact_data(resized_artifact)
        # Get resized dimensions
        resized_image = Image.open(BytesIO(resized_image_bytes))
        resized_size = resized_image.size  # (width, height)
        logger.info("Resized image size: %dx%d", resized_size[0], resized_size[1])

        send_progress_update(
            status="running",
            progress=15.0,
            message=f"Image resized to {resized_size[0]}x{resized_size[1]}",
        )

        # Step 4: Generate wall outline and portal highlight images

        logger.info("Starting wall outline detection")
        send_progress_update(
            status="running", progress=20.0, message="Generating wall outlines"
        )
        wall_outline_artifact = outline_impassable_areas(resized_artifact, mock=True)

        logger.info("Starting portal detection")
        send_progress_update(
            status="running", progress=30.0, message="Generating portal highlights"
        )
        portal_highlight_artifact = highlight_portals(resized_image_bytes, mock=True)

        send_progress_update(
            status="running", progress=45.0, message="Generated outline images"
        )

        # Step 5: Use CV2 to detect features
        send_progress_update(
            status="running", progress=50.0, message="Detecting wall segments"
        )
        wall_segments = detect_wall_segments(wall_outline_artifact)

        send_progress_update(
            status="running", progress=60.0, message="Detecting portal segments"
        )
        portal_segments = detect_portal_segments(portal_highlight_artifact)

        send_progress_update(
            status="running",
            progress=70.0,
            message=f"Detected {len(wall_segments)} wall segments and {len(portal_segments)} portal segments",
        )

        # Step 7: Create UVTT file
        send_progress_update(
            status="running",
            progress=80.0,
            message="Creating UVTT file",
        )
        uvtt_artifact = create_uvtt_file(
            wall_segments,
            portal_segments,
            original_image_bytes,
            original_size,
            pixels_per_grid,
        )

        # Step 8: Draw features on the original image
        send_progress_update(
            status="running",
            progress=85.0,
            message="Drawing features on original image",
        )
        final_image_artifact = draw_features_on_image(
            original_image_bytes,
            wall_segments,
            portal_segments,
            original_size,
            resized_size,
        )


        # Prepare final result
        final_result = {
            "status": "completed",
            "image_url": final_image_artifact.data,
            "wall_segments_count": len(wall_segments),
            "portal_segments_count": len(portal_segments),
            "wall_image_url": wall_outline_artifact.data,
            "portal_image_url": portal_highlight_artifact.data,
            "uvtt_file_url": extract_href_from_markdown_link(uvtt_artifact.data),
            "original_size": f"{original_size[0]}x{original_size[1]}",
            "resized_size": f"{resized_size[0]}x{resized_size[1]}",
            "pixels_per_grid": pixels_per_grid,
            "createdAt": datetime.utcnow().isoformat(),
        }

        # Create an artifact for the detected features
        create_markdown_artifact(
            key="detected-features",
            markdown=f"""
# Detected Map Features

**Original Image**: {image_url}
**Feature-Detected Image**: {final_image_artifact.data}
**UVTT File**: {uvtt_artifact.data}

## Statistics

- **Wall Segments**: {len(wall_segments)}
- **Portal Segments**: {len(portal_segments)}
- **Original Size**: {original_size[0]}x{original_size[1]}
- **Resized Size**: {resized_size[0]}x{resized_size[1]}
- **Pixels Per Grid**: {pixels_per_grid}

## Process Images

- **Wall Outline Image**: [{wall_outline_artifact.data}]({wall_outline_artifact.data})
- **Portal Highlight Image**: [{portal_highlight_artifact.data}]({portal_highlight_artifact.data})
- **Final Feature Image**: [{final_image_artifact.data}]({final_image_artifact.data})
- **UVTT File**: [{uvtt_artifact.data}]({uvtt_artifact.data})

## Feature Data Preview

```json
{json.dumps({
    "wall_segments_count": len(wall_segments),
    "portal_segments_count": len(portal_segments),
    "pixels_per_grid": pixels_per_grid
}, indent=2)}
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
