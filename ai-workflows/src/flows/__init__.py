"""
This module contains the flows for the AI workflows.
"""

from src.flows.map_generation import generate_map_flow
from src.flows.map_editing import edit_map_flow
from src.flows.feature_detection import detect_features_flow

__all__ = ["generate_map_flow", "edit_map_flow", "detect_features_flow"]
