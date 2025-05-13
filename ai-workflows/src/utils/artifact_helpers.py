"""
Artifact helper utilities for Dungeon Lab workflows.
"""

from typing import Optional, Union
from io import BytesIO
import uuid
import requests

from prefect.artifacts import (
    create_link_artifact as create_link_artifact_original,
    create_image_artifact as create_image_artifact_original,
    Artifact,
)
from prefect import task, get_run_logger

from src.utils.minio_client import upload_to_minio


def fetch_artifact_data(artifact: Artifact) -> bytes:
    """
    Fetch the data from an artifact via HTTP.
    """
    return requests.get(artifact.data, timeout=10).content


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


def create_link_artifact(
    content: Union[bytes, BytesIO],
    key: str,
    object_name: Optional[str] = None,
    content_type: str = "application/octet-stream",
    description: Optional[str] = None,
) -> Artifact:
    """
    Upload content to MinIO and create a link artifact.

    Args:
        content: Content to upload as bytes or BytesIO
        key: Key for the artifact
        object_name: MinIO object name
        content_type: MIME type of the content
        description: Optional description for the artifact

    Returns:
        URL of the uploaded content
    """
    # Convert BytesIO to bytes if needed
    if isinstance(content, BytesIO):
        content_bytes = content.getvalue()
    else:
        content_bytes = content

    if object_name is None:
        object_name = f"{key}-{uuid.uuid4()}"

    # Upload to MinIO
    content_url = upload_to_minio(object_name, content_bytes, content_type=content_type)

    # Create a link artifact
    create_link_artifact_original(
        key=key,
        link=content_url,
        description=description or f"Uploaded {object_name}",
    )

    return Artifact.get(key)


def create_image_artifact(
    content: Union[bytes, BytesIO],
    key: str,
    object_name: Optional[str] = None,
    content_type: str = "image/png",
    description: Optional[str] = None,
) -> Artifact:
    """
    Upload content to MinIO and create a link artifact.

    Args:
        content: Content to upload as bytes or BytesIO
        key: Key for the artifact
        object_name: MinIO object name
        content_type: MIME type of the content
        description: Optional description for the artifact

    Returns:
        URL of the uploaded content
    """
    # Convert BytesIO to bytes if needed
    if isinstance(content, BytesIO):
        content_bytes = content.getvalue()
    else:
        content_bytes = content

    if object_name is None:
        object_name = f"{key}-{uuid.uuid4()}"

    # Upload to MinIO
    content_url = upload_to_minio(object_name, content_bytes, content_type=content_type)

    # Create a link artifact
    create_image_artifact_original(
        key=key,
        image_url=content_url,
        description=description or f"Uploaded {object_name}",
    )

    res = Artifact.get(key)
    return res
