# Workflow Progress Tracking System

This document explains the workflow progress tracking system in DungeonLab, used for tracking progress of long-running AI tasks like map generation, character creation, and other asynchronous workflows.

## Overview

The Workflow System provides a standardized way to:

1. **Track progress** of long-running workflows in real-time
2. **Notify users** about status updates via WebSockets
3. **Handle different workflow types** with a consistent interface
4. **Support metadata** for workflow-specific additional information
5. **Maintain session context** across workflow steps

## Backend Implementation

### API Endpoint

Long-running workflows report progress via the following API endpoint:

```
POST /api/workflows/progress
```

#### Request Body

```json
{
  "session_id": "unique-session-identifier",
  "workflow_type": "map", // or "character", "encounter", etc.
  "step": "analyzing", // current step in the workflow
  "progress": 45, // 0-100 percentage
  "metadata": {
    // Optional workflow-specific data
    "estimated_time_remaining": 120,
    "prompt_tokens": 256,
    "details": "Processing forests and mountains"
  }
}
```

### Socket Events

The system emits socket events in the format:

```
workflow:progress:{type}
```

Where `{type}` is the workflow type (e.g., "map", "character", "encounter").

Example event names:
- `workflow:progress:map`
- `workflow:progress:character`
- `workflow:progress:encounter`

## Client Implementation

### Using the Workflow Progress Composable

The `useWorkflowProgress` composable provides a unified way to track workflow progress:

```typescript
import { useWorkflowProgress } from '@/composables/useWorkflowProgress';

// In your component
const { 
  sessionId,
  step,
  progress,
  metadata,
  startTime,
  estimatedTimeRemaining,
  isComplete,
  isInProgress,
  reset
} = useWorkflowProgress('map'); // Specify the workflow type
```

### Progress Component

The `MapGenerationProgress.vue` component visualizes the progress of map generation workflows. You can use it as:

```vue
<template>
  <MapGenerationProgress
    :step="step"
    :progress="progress"
    :startTime="startTime"
  />
</template>
```

## Adding New Workflow Types

To add a new workflow type:

1. **Add socket event definition** in `packages/shared/src/schemas/socket/index.mts`:

```typescript
'workflow:progress:your-type': z
  .function()
  .args(
    z.object({
      session_id: z.string(),
      step: z.string(),
      progress: z.number(),
      workflow_type: z.literal('your-type'),
      metadata: z.record(z.string(), z.unknown()).optional()
    })
  )
  .returns(z.void()),
```

2. **Create components/composables** specific to your workflow type as needed

3. **Update the UI** to handle the new workflow type

## Example: Reporting Progress from Prefect

Here's an example of reporting progress from a Prefect task:

```python
import requests

def report_progress(session_id, workflow_type, step, progress, metadata=None):
    """
    Report workflow progress to the DungeonLab API
    """
    url = "http://localhost:3000/api/workflows/progress"
    payload = {
        "session_id": session_id,
        "workflow_type": workflow_type,
        "step": step,
        "progress": progress,
        "metadata": metadata or {}
    }
    
    try:
        response = requests.post(url, json=payload)
        return response.json()
    except Exception as e:
        print(f"Error reporting progress: {e}")
        return None

# Example usage in a Prefect flow
@task
def analyze_map_description(session_id, description):
    # Report start of analysis
    report_progress(
        session_id=session_id,
        workflow_type="map",
        step="analyzing",
        progress=10,
        metadata={"description_length": len(description)}
    )
    
    # ... perform analysis ...
    
    # Report completion of analysis
    report_progress(
        session_id=session_id,
        workflow_type="map",
        step="analyzing",
        progress=100
    )
    
    return analysis_result
```

## Future Enhancements

See the [Map Builder Tasks](map-builder-tasks.md) document for planned enhancements to the workflow system, including:

- Workflow session management
- Targeted notifications
- History tracking
- Cancellation support
- Enhanced error handling 