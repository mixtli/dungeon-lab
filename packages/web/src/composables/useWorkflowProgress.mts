import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useSocketStore } from '../stores/socket.store.mjs';

export interface WorkflowProgressData {
  session_id: string;
  step: string;
  progress: number;
  workflow_type: string;
  metadata?: Record<string, any>;
}

/**
 * Composable to track progress of various workflow types
 * @param workflowType The type of workflow to track (e.g., 'map', 'character', 'encounter')
 * @returns Reactive variables and utility functions for workflow progress
 */
export function useWorkflowProgress(workflowType: string) {
  const socketStore = useSocketStore();
  
  // Progress tracking state
  const sessionId = ref<string | null>(null);
  const step = ref('');
  const progress = ref(0);
  const metadata = ref<Record<string, any>>({});
  const startTime = ref<Date | null>(null);
  const estimatedTimeRemaining = ref<string | null>(null);
  
  // Computed properties
  const isComplete = computed(() => progress.value >= 100);
  const isInProgress = computed(() => progress.value > 0 && progress.value < 100);
  
  // Event name for this workflow type
  const eventName = `workflow:progress:${workflowType}`;
  
  // Handle progress update
  function handleProgressUpdate(data: WorkflowProgressData) {
    if (!sessionId.value) {
      sessionId.value = data.session_id;
      if (!startTime.value) {
        startTime.value = new Date();
      }
    }
    
    step.value = data.step;
    progress.value = data.progress;
    
    if (data.metadata) {
      metadata.value = data.metadata;
    }
    
    // Update estimated time remaining if we have a start time and progress is between 0-100%
    if (startTime.value && progress.value > 0 && progress.value < 100) {
      updateEstimatedTimeRemaining();
    }
  }
  
  // Estimate remaining time based on elapsed time and current progress
  function updateEstimatedTimeRemaining() {
    if (!startTime.value) return;
    
    const now = Date.now();
    const elapsed = now - startTime.value.getTime();
    const totalEstimated = elapsed / (progress.value / 100);
    const remaining = totalEstimated - elapsed;
    
    if (remaining > 0) {
      if (remaining < 60000) {
        estimatedTimeRemaining.value = `${Math.ceil(remaining / 1000)} seconds`;
      } else {
        estimatedTimeRemaining.value = `${Math.ceil(remaining / 60000)} minutes`;
      }
    } else {
      estimatedTimeRemaining.value = 'Finishing up...';
    }
  }
  
  // Reset state (useful when starting a new workflow)
  function reset() {
    sessionId.value = null;
    step.value = '';
    progress.value = 0;
    metadata.value = {};
    startTime.value = null;
    estimatedTimeRemaining.value = null;
  }
  
  // Set up socket event listeners
  onMounted(() => {
    if (socketStore.socket) {
      // Type assertion for custom events
      const socket = socketStore.socket as any;
      
      // Listen for workflow progress events
      socket.on(eventName, handleProgressUpdate);
    }
  });
  
  // Clean up event listeners
  onUnmounted(() => {
    if (socketStore.socket) {
      const socket = socketStore.socket as any;
      socket.off(eventName);
      
      if (workflowType === 'map') {
        socket.off('ai:map:progress');
      }
    }
  });
  
  return {
    sessionId,
    step,
    progress,
    metadata,
    startTime,
    estimatedTimeRemaining,
    isComplete,
    isInProgress,
    reset
  };
} 