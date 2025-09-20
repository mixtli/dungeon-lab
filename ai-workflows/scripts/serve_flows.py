
import sys
from pathlib import Path

# Add the project root to path
sys.path.insert(0, str(Path(__file__).parents[1].resolve()))

from src.flows.map_generation import generate_map_flow
from src.flows.feature_detection import detect_features_flow

# Serve the flows - this is the simplest approach for local development
if __name__ == "__main__":
    # This won't return until terminated
    generate_map_flow.serve(
        name="generate-map",
        tags=["map-generation", "dungeon-lab"],
    )
    
    # This won't run until the first serve() exits
    detect_features_flow.serve(
        name="detect-features",
        tags=["feature-detection", "dungeon-lab"],
    )
