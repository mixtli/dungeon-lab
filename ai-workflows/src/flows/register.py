"""
Register Prefect deployments for Dungeon Lab map generator.
"""

import os
from pathlib import Path
import sys

# Import flows with proper paths
from src.flows.map_generation import generate_map_flow
from src.flows.map_editing import edit_map_flow
from src.flows.feature_detection import detect_features_flow

from src.utils.env_setup import load_environment
from src.configs.prefect_config import PROJECT_NAME


# Add the project root to the Python path
project_root = Path(__file__).parents[2].resolve()
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))


def register_deployments():
    """Register all deployments for the map generator."""
    # Ensure environment variables are loaded
    if not load_environment():
        print("Failed to load environment variables. Exiting.")
        return

    print(f"Registering deployments for project: {PROJECT_NAME}")

    # Register map generation flow using .serve() method
    print("Deploying map generation flow...")
    generate_map_flow.from_source(
        source=str(Path(__file__).parent.parent.parent),
        entrypoint="src/flows/map_generation.py:generate_map_flow",
    ).deploy(
        build=False,
        name="generate-map",
        tags=["map-generation", "dungeon-lab"],
        version=os.getenv("PROJECT_VERSION", "0.1.0"),
        work_pool_name="process-pool",
    )

    # Register map editing flow
    print("Deploying map editing flow...")
    edit_map_flow.from_source(
        source=str(Path(__file__).parent.parent.parent),
        entrypoint="src/flows/map_editing.py:edit_map_flow",
    ).deploy(
        build=False,
        name="edit-map",
        tags=["map-editing", "dungeon-lab"],
        version=os.getenv("PROJECT_VERSION", "0.1.0"),
        work_pool_name="process-pool",
    )

    # Register feature detection flow
    print("Deploying feature detection flow...")
    detect_features_flow.from_source(
        source=str(Path(__file__).parent.parent.parent),
        entrypoint="src/flows/feature_detection.py:detect_features_flow",
    ).deploy(
        build=False,
        name="detect-map-features",
        tags=["feature-detection", "dungeon-lab"],
        version=os.getenv("PROJECT_VERSION", "0.1.0"),
        work_pool_name="process-pool",
    )

    print("All deployments registered successfully")


if __name__ == "__main__":
    register_deployments()
