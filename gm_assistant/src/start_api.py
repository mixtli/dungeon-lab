#!/usr/bin/env python3
"""
Startup script for GM Assistant FastAPI service.
"""
import sys
import os

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from api import main

if __name__ == "__main__":
    main() 