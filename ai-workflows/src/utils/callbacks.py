"""
Shared utility functions for workflow callbacks.
"""

from datetime import datetime

import requests
from prefect import State, get_run_logger, context, Flow


# Import project config
from ..configs.prefect_config import (
    CALLBACK_BASE_URL,
    CALLBACK_AUTH_TOKEN,
)


def send_state_update(flow: Flow, flow_run, state: State):
    """
    Send a state update to the callback endpoint.
    """
    log(
        f"Sending state update for flow: {flow.name}, flow run: {flow_run.id}, state: {state.name}",
        level="info",
    )

    if state.is_completed():
        print("State is completed")
        result = state.result()
    else:
        result = None

    try:
        # Create payload with full context
        payload = {
            "flow": flow.name,
            "flow_run": str(flow_run.id),
            "user_id": flow_run.labels["userId"],
            "state": state.name,
            "result": result,
        }

        # Create headers
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {CALLBACK_AUTH_TOKEN}",
        }

        # Send the update
        endpoint = f"{CALLBACK_BASE_URL}/workflows/callback/state"
        response = requests.post(endpoint, json=payload, headers=headers, timeout=10)
        response.raise_for_status()
        log(f"State update sent: {state.name}", level="info")
        return True
    except RuntimeError as e:
        log(f"Failed to send state update: {e}", level="error")
        return False


def log(message: str, level: str = "info"):
    """
    Log a message.
    """
    try:
        logger = get_run_logger()
        if level == "info":
            logger.info(message)
        elif level == "error":
            logger.error(message)
        elif level == "warning":
            logger.warning(message)
        else:
            logger.info(message)
    except RuntimeError as e:
        print(f"Failed to log message: {e}")


def send_progress_update(
    status: str,
    progress: float,
    message: str,
) -> bool:
    """
    Send a progress update to the callback endpoint.

    Args:
        status: Current status (e.g., "running", "completed", "failed")
        progress: Progress percentage (0-100)
        message: Progress message
        result: Optional result data

    Returns:
        True if the update was sent successfully
    """

    try:
        # Get flow and flow_run context
        flow_run_context = context.get_run_context()
        flow_run = flow_run_context.flow_run
        flow = flow_run_context.flow.name
        print(f"Flow run: {flow_run}")

        # Create payload with full context
        payload = {
            "flow": flow,
            "flow_run": str(flow_run.id),
            "user_id": flow_run.labels["userId"],
            "status": flow_run.state.name,
            "progress": progress,
            "message": message,
            "timestamp": datetime.now().isoformat(),
        }

        # Create headers
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {CALLBACK_AUTH_TOKEN}",
        }

        # Send the update
        endpoint = f"{CALLBACK_BASE_URL}/workflows/callback/progress"
        response = requests.post(endpoint, json=payload, headers=headers, timeout=10)
        response.raise_for_status()
        log(f"Progress update sent: {message} ({progress}, {status})")
        return True
    except RuntimeError as e:
        log(f"Failed to send progress update: {e}", level="error")
        return False
