#!/usr/bin/env python3
"""
MinIO Initialization Script
Скрипт для инициализации MinIO: создание bucket'а и настройка политик
"""
import os
import sys
import time

import boto3
from botocore.client import Config
from botocore.exceptions import ClientError, NoCredentialsError


def get_env(key: str, default: str = "") -> str:
    """Get environment variable with default value"""
    return os.getenv(key, default)


def wait_for_minio(max_retries: int = 30, delay: int = 2):
    """
    Wait for MinIO to be ready

    Args:
        max_retries: Maximum number of retry attempts
        delay: Delay between retries in seconds
    """
    minio_endpoint = get_env("MINIO_ENDPOINT", "localhost:9000")
    minio_access_key = get_env("MINIO_ACCESS_KEY", "minioadmin")
    minio_secret_key = get_env("MINIO_SECRET_KEY", "minioadmin")
    minio_use_ssl = get_env("MINIO_USE_SSL", "false").lower() == "true"

    protocol = "https" if minio_use_ssl else "http"
    endpoint_url = f"{protocol}://{minio_endpoint}"

    s3_client = boto3.client(
        "s3",
        endpoint_url=endpoint_url,
        aws_access_key_id=minio_access_key,
        aws_secret_access_key=minio_secret_key,
        config=Config(signature_version="s3v4"),
        region_name=get_env("MINIO_REGION", "us-east-1"),
    )

    print(f"Waiting for MinIO at {endpoint_url}...")

    for attempt in range(1, max_retries + 1):
        try:
            # Try to list buckets to check if MinIO is ready
            s3_client.list_buckets()
            print("✓ MinIO is ready!")
            return s3_client
        except (ClientError, NoCredentialsError, Exception) as e:
            if attempt < max_retries:
                print(
                    f"  Attempt {attempt}/{max_retries}: MinIO not ready yet, waiting {delay}s..."
                )
                time.sleep(delay)
            else:
                print(f"✗ MinIO is not available after {max_retries} attempts")
                print(f"  Error: {e}")
                sys.exit(1)

    return s3_client


def create_bucket(s3_client, bucket_name: str):
    """
    Create bucket if it doesn't exist

    Args:
        s3_client: Boto3 S3 client
        bucket_name: Name of the bucket to create
    """
    try:
        # Check if bucket exists
        try:
            s3_client.head_bucket(Bucket=bucket_name)
            print(f"✓ Bucket '{bucket_name}' already exists")
            return True
        except ClientError as e:
            error_code = e.response.get("Error", {}).get("Code", "")
            if error_code == "404":
                # Bucket doesn't exist, create it
                print(f"Creating bucket '{bucket_name}'...")
                s3_client.create_bucket(Bucket=bucket_name)
                print(f"✓ Bucket '{bucket_name}' created successfully")
                return True
            else:
                print(f"✗ Error checking bucket: {e}")
                return False
    except Exception as e:
        print(f"✗ Error creating bucket: {e}")
        return False


def set_bucket_policy(s3_client, bucket_name: str, public_read: bool = False):
    """
    Set bucket policy (optional: make bucket public for read access)

    Args:
        s3_client: Boto3 S3 client
        bucket_name: Name of the bucket
        public_read: If True, allow public read access
    """
    if not public_read:
        print(f"  Bucket '{bucket_name}' is private (default)")
        return

    try:
        # Policy for public read access
        policy = {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Effect": "Allow",
                    "Principal": {"AWS": "*"},
                    "Action": ["s3:GetObject"],
                    "Resource": [f"arn:aws:s3:::{bucket_name}/*"],
                }
            ],
        }

        import json

        s3_client.put_bucket_policy(Bucket=bucket_name, Policy=json.dumps(policy))
        print(f"✓ Bucket '{bucket_name}' is now public for read access")
    except Exception as e:
        print(f"⚠ Warning: Could not set bucket policy: {e}")


def main():
    """Main initialization function"""
    minio_endpoint = get_env("MINIO_ENDPOINT", "localhost:9000")
    minio_access_key = get_env("MINIO_ACCESS_KEY", "minioadmin")
    minio_use_ssl = get_env("MINIO_USE_SSL", "false").lower() == "true"

    # All buckets that need to be initialized (from minio.go)
    buckets = [
        "user-photos",
        "verification-docs",
        "post-media",
        "donation-receipts",
        "chat-attachments",
    ]

    print("=" * 60)
    print("MinIO Initialization Script")
    print("=" * 60)
    print(f"Endpoint: {minio_endpoint}")
    print(f"Access Key: {minio_access_key}")
    print(f"Use SSL: {minio_use_ssl}")
    print(f"Buckets to create: {', '.join(buckets)}")
    print("=" * 60)
    print()

    # Wait for MinIO to be ready
    s3_client = wait_for_minio()

    # Create all required buckets
    success = True
    for bucket_name in buckets:
        if not create_bucket(s3_client, bucket_name):
            print(f"✗ Failed to create bucket: {bucket_name}")
            success = False

    if not success:
        print("✗ Some buckets failed to create")
        sys.exit(1)

    # Set bucket policy for public read access (через backend)
    # Buckets остаются приватными, доступ через backend API
    print()
    print("ℹ Buckets настроены как приватные")
    print("  Доступ к файлам через backend API: /files/{bucket}/{objectKey}")
    print("  Пример: http://localhost:8080/files/user-photos/users/1/photo.jpg")

    print()
    print("=" * 60)
    print("✓ MinIO initialization completed successfully!")
    print(f"✓ Created {len(buckets)} buckets")
    print("=" * 60)

if __name__ == "__main__":
    main()
