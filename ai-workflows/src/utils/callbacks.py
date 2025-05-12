"""
Shared utility functions for workflow callbacks.
"""

from datetime import datetime

import requests
from prefect import State, get_run_logger, context, Flow


# Import project config
from configs.prefect_config import (
    CALLBACK_BASE_URL,
    CALLBACK_AUTH_TOKEN,
)


def send_state_update(flow: Flow, flow_run, state: State):
    """
    Send a state update to the callback endpoint.
    """
    logger = get_run_logger()
    logger.info(
        "Sending state update for flow: %s, flow run: %s, state: %s",
        flow.name,
        flow_run.id,
        state.name,
    )

    try:
        result = state.result()
    except RuntimeError as e:
        logger.error("Failed to get result: %s", e)
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
        logger.info("State update sent: %s", state.name)
        return True
    except RuntimeError as e:
        logger.error("Failed to send state update: %s", e)
        return False


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
    logger = get_run_logger()

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
        logger.info("Progress update sent: %s (%s, %s)", message, progress, status)
        return True
    except RuntimeError as e:
        logger.error("Failed to send progress update: %s", e)
        return False


def update_status(status: str):
    """
    Update the status of the flow run.
    """
    logger = get_run_logger()
    logger.info("Updating status to: %s", status)
