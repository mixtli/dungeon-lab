#!/usr/bin/env python3
"""
Test script for GM Assistant FastAPI service.
"""
import asyncio
import httpx
import json
from config import config

async def test_api():
    """Test the GM Assistant API endpoints."""
    base_url = f"http://{config.api_host}:{config.api_port}"
    
    async with httpx.AsyncClient() as client:
        print(f"Testing GM Assistant API at {base_url}")
        
        # Test health endpoint
        print("\n1. Testing health endpoint...")
        try:
            response = await client.get(f"{base_url}/health")
            print(f"Status: {response.status_code}")
            print(f"Response: {response.json()}")
        except Exception as e:
            print(f"Health check failed: {e}")
            return
        
        # Test status endpoint
        print("\n2. Testing status endpoint...")
        try:
            response = await client.get(f"{base_url}/status")
            print(f"Status: {response.status_code}")
            print(f"Response: {response.json()}")
        except Exception as e:
            print(f"Status check failed: {e}")
        
        # Test chat endpoint
        print("\n3. Testing chat endpoint...")
        try:
            chat_request = {
                "message": "What are spell slots?",
                "session_id": "test-session-1"
            }
            response = await client.post(
                f"{base_url}/chat",
                json=chat_request,
                timeout=60.0
            )
            print(f"Status: {response.status_code}")
            result = response.json()
            print(f"Response: {result['response'][:200]}...")
            print(f"Processing time: {result['processing_time']:.2f}s")
        except Exception as e:
            print(f"Chat test failed: {e}")
        
        # Test session-specific endpoint
        print("\n4. Testing session-specific chat endpoint...")
        try:
            chat_request = {
                "message": "Can you tell me more about spell slot recovery?"
            }
            response = await client.post(
                f"{base_url}/chat/session/test-session-1",
                json=chat_request,
                timeout=60.0
            )
            print(f"Status: {response.status_code}")
            result = response.json()
            print(f"Response: {result['response'][:200]}...")
            print(f"Processing time: {result['processing_time']:.2f}s")
        except Exception as e:
            print(f"Session chat test failed: {e}")
        
        # Test sessions list
        print("\n5. Testing sessions list...")
        try:
            response = await client.get(f"{base_url}/chat/sessions")
            print(f"Status: {response.status_code}")
            print(f"Response: {response.json()}")
        except Exception as e:
            print(f"Sessions list failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_api()) 