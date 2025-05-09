#!/usr/bin/env python
"""
CLI for Dungeon Lab AI Workflows.
"""

# TODO: Remove this file?  Do we really need a CLI?
import os
import sys
import argparse
import json
import uuid
from pathlib import Path

# Add the project root to the Python path
project_root = Path(__file__).resolve().parent
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))

from src.utils.env_setup import load_environment
from src.flows.map_generation import generate_map_flow
from src.flows.feature_detection import detect_features_flow

def parse_args():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(description="Dungeon Lab AI Workflows")
    subparsers = parser.add_subparsers(dest="command", help="Command to run")
    
    # Map generation command
    map_gen_parser = subparsers.add_parser("generate-map", help="Generate a map from a text description")
    map_gen_parser.add_argument("--description", "-d", required=True, help="Text description of the map")
    map_gen_parser.add_argument("--user-id", "-u", required=True, help="User ID")
    map_gen_parser.add_argument("--campaign-id", "-c", required=True, help="Campaign ID")
    map_gen_parser.add_argument("--width", "-w", type=int, default=30, help="Map width in grid cells")
    map_gen_parser.add_argument("--height", "-ht", type=int, default=20, help="Map height in grid cells")
    map_gen_parser.add_argument("--style", "-s", default="fantasy", help="Map style")
    map_gen_parser.add_argument("--theme", "-t", default="dungeon", help="Map theme")
    map_gen_parser.add_argument("--resolution", "-r", type=int, default=70, help="Pixels per grid cell")
    
    # Feature detection command
    detect_parser = subparsers.add_parser("detect-features", help="Detect features in an existing map image")
    detect_parser.add_argument("--image-path", "-i", required=True, help="Path to the map image")
    detect_parser.add_argument("--user-id", "-u", required=True, help="User ID")
    detect_parser.add_argument("--campaign-id", "-c", required=True, help="Campaign ID")
    detect_parser.add_argument("--pixels-per-grid", "-p", type=int, default=70, help="Pixels per grid cell")
    
    return parser.parse_args()

def main():
    """Main entry point."""
    # Load environment variables
    if not load_environment():
        print("Failed to load environment variables. Exiting.")
        sys.exit(1)
    
    # Parse arguments
    args = parse_args()
    
    # Generate a unique session ID
    session_id = str(uuid.uuid4())
    
    if args.command == "generate-map":
        # Prepare map generation input
        input_data = {
            "description": args.description,
            "userId": args.user_id,
            "campaignId": args.campaign_id,
            "width": args.width,
            "height": args.height,
            "style": args.style,
            "theme": args.theme,
            "resolution": args.resolution,
        }
        
        print(f"Starting map generation with session ID: {session_id}")
        result = generate_map_flow(session_id=session_id, input_data=input_data)
        print(json.dumps(result, indent=2))
        
    elif args.command == "detect-features":
        # Prepare feature detection input
        input_data = {
            "image_path": args.image_path,
            "userId": args.user_id,
            "campaignId": args.campaign_id,
            "pixels_per_grid": args.pixels_per_grid,
        }
        
        print(f"Starting feature detection with session ID: {session_id}")
        result = detect_features_flow(session_id=session_id, input_data=input_data)
        print(json.dumps(result, indent=2))
        
    else:
        print("No command specified. Use --help for available commands.")
        sys.exit(1)

if __name__ == "__main__":
    main() 