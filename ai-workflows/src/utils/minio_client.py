"""
MinIO client utility for Dungeon Lab workflows.
"""

import os
import io
from minio import Minio


def get_minio_client():
    """
    Initialize and return a Minio client using environment variables.
    """
    minio_endpoint = os.environ.get("MINIO_ENDPOINT")
    minio_port = os.environ.get("MINIO_PORT")
    minio_use_ssl = os.environ.get("MINIO_USE_SSL", "false").lower() == "true"
    minio_access_key = os.environ.get("MINIO_ACCESS_KEY")
    minio_secret_key = os.environ.get("MINIO_SECRET_KEY")

    print(f"MinIO endpoint: {minio_endpoint}")

    if not all([minio_endpoint, minio_port, minio_access_key, minio_secret_key]):
        raise RuntimeError("Missing one or more required MinIO environment variables.")

    return Minio(
        f"{minio_endpoint}:{minio_port}",
        access_key=minio_access_key,
        secret_key=minio_secret_key,
        secure=minio_use_ssl,
    )


def upload_to_minio(object_name, data, content_type="application/octet-stream"):
    """
    Upload data to MinIO. Ensures the bucket exists.
    Args:
        object_name: Object path in bucket
        data: Bytes to upload
        content_type: MIME type
    Returns:
        Public object path (not full URL)
    """
    bucket = os.environ.get("MINIO_BUCKET_NAME")
    client = get_minio_client()
    minio_public_url = os.environ.get("MINIO_PUBLIC_URL")
    minio_bucket = os.environ.get("MINIO_BUCKET_NAME")
    # Ensure bucket exists
    found = client.bucket_exists(bucket)
    if not found:
        client.make_bucket(bucket)
    # Wrap data in BytesIO for file-like interface
    data_stream = io.BytesIO(data)
    # Upload the object
    client.put_object(
        bucket,
        object_name,
        data=data_stream,
        length=len(data),
        content_type=content_type,
    )
    # Construct the public URL
    content_url = f"{minio_public_url}/{minio_bucket}/{object_name}"
    return content_url
