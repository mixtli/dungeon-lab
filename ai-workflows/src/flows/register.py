"""
Register Prefect deployments for Dungeon Lab map generator.
"""
import asyncio
import os
from pathlib import Path
import sys

# Add the project root to the Python path
project_root = Path(__file__).parents[2].resolve()
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))

from prefect.deployments import Deployment
from prefect.server.schemas.schedules import CronSchedule

# Import flows with proper paths
from src.flows.map_generation import generate_map_flow
from src.flows.feature_detection import detect_features_flow

from src.utils.env_setup import load_environment
from configs.prefect_config import PROJECT_NAME, DEFAULT_FLOW_RUNNER

async def register_deployments():
    """Register all deployments for the map generator."""
    # Ensure environment variables are loaded
    if not load_environment():
        print("Failed to load environment variables. Exiting.")
        return
    
    print(f"Registering deployments for project: {PROJECT_NAME}")
    
    # Register map generation flow
    map_gen_deployment = await Deployment.build_from_flow(
        flow=generate_map_flow,
        name="generate-map",
        version=os.getenv("PROJECT_VERSION", "0.1.0"),
        description="Generate a map from a text description",
        tags=["map-generation", "dungeon-lab"],
        work_queue_name="map-generation-queue",
        # Optional schedule (commented out by default)
        # schedule=CronSchedule(cron="0 0 * * *"),  # Daily at midnight
    )
    
    map_gen_id = await map_gen_deployment.apply()
    print(f"Registered map generation deployment with ID: {map_gen_id}")
    
    # Register feature detection flow
    feature_detection_deployment = await Deployment.build_from_flow(
        flow=detect_features_flow,
        name="detect-features",
        version=os.getenv("PROJECT_VERSION", "0.1.0"),
        description="Detect features in a map image",
        tags=["feature-detection", "dungeon-lab"],
        work_queue_name="map-generation-queue",
    )
    
    feature_id = await feature_detection_deployment.apply()
    print(f"Registered feature detection deployment with ID: {feature_id}")
    
    print("All deployments registered successfully")

if __name__ == "__main__":
    asyncio.run(register_deployments()) 