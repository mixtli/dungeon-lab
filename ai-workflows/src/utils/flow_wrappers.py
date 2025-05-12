"""
Flow wrapper that automatically adds state hooks to all flows.
Used exactly like @flow but adds standard hooks.
"""

from prefect import flow as prefect_flow
from src.utils.callbacks import send_state_update


def auto_hook_flow(func=None, **kwargs):
    """
    Custom flow decorator that automatically adds state hooks to all flows.
    Used exactly like @flow but adds standard hooks.
    """

    def wrapper(flow_func):
        # Add all state hooks
        all_kwargs = {
            "on_completion": [send_state_update],
            "on_failure": [send_state_update],
            "on_cancellation": [send_state_update],
            "on_crashed": [send_state_update],
            "on_running": [send_state_update],
            **kwargs,  # Allow overriding defaults
        }

        # Apply the standard prefect flow decorator with our hooks
        return prefect_flow(**all_kwargs)(flow_func)

    # Handle both @auto_hook_flow and @auto_hook_flow() syntax
    if func is None:
        return wrapper
    return wrapper(func)
