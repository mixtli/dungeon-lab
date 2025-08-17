<template>
  <div class="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-gray-800 dark:to-gray-700 border border-amber-200 dark:border-gray-600 rounded-lg p-4 my-2">
    <!-- Header -->
    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center space-x-2">
        <div class="text-lg">⚠️</div>
        <h3 class="font-semibold text-gray-900 dark:text-white">Action Approval Required</h3>
        <span class="text-sm text-gray-600 dark:text-gray-300">
          from {{ approvalData.playerName }}
        </span>
      </div>
      <div class="text-xs text-gray-500 dark:text-gray-400">
        {{ formatTime(timestamp) }}
      </div>
    </div>

    <!-- Action Details -->
    <div class="space-y-2 mb-4">
      <div class="text-sm text-gray-700 dark:text-gray-300">
        <span class="font-medium">Action Type:</span> {{ formatActionType(approvalData.actionType) }}
      </div>
      <div class="text-sm text-gray-700 dark:text-gray-300">
        <span class="font-medium">Description:</span> {{ approvalData.description }}
      </div>
    </div>

    <!-- Action Buttons (only show if request is still pending) -->
    <div v-if="!isProcessed" class="flex space-x-3 pt-3 border-t border-amber-200 dark:border-gray-600">
      <button
        @click="handleApprove"
        :disabled="isLoading"
        class="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-4 py-2 rounded-md font-medium transition-colors"
      >
        <span v-if="isLoading && loadingAction === 'approve'" class="flex items-center justify-center">
          <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Approving...
        </span>
        <span v-else>Accept</span>
      </button>
      
      <button
        @click="handleDeny"
        :disabled="isLoading"
        class="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white px-4 py-2 rounded-md font-medium transition-colors"
      >
        <span v-if="isLoading && loadingAction === 'deny'" class="flex items-center justify-center">
          <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Denying...
        </span>
        <span v-else>Decline</span>
      </button>
    </div>

    <!-- Status indicator (if request has been processed) -->
    <div v-else class="pt-3 border-t border-amber-200 dark:border-gray-600">
      <div v-if="approvalStatus === 'approved'" class="flex items-center text-green-600 dark:text-green-400">
        <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
        </svg>
        <span class="font-medium">Request Approved</span>
      </div>
      <div v-else-if="approvalStatus === 'denied'" class="flex items-center text-red-600 dark:text-red-400">
        <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
        </svg>
        <span class="font-medium">Request Denied</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { ApprovalData } from '../../stores/chat.store.mts';
import { useNotificationStore } from '../../stores/notification.store.mjs';
import { gmActionHandlerService } from '../../services/gm-action-handler.service.mts';

interface Props {
  approvalData: ApprovalData;
  timestamp: string;
}

const props = defineProps<Props>();

const notificationStore = useNotificationStore();

// Component state
const isLoading = ref(false);
const loadingAction = ref<'approve' | 'deny' | null>(null);
const isProcessed = ref(false);
const approvalStatus = ref<'approved' | 'denied' | null>(null);

/**
 * Handle approval button click
 */
async function handleApprove() {
  if (isLoading.value) return;

  isLoading.value = true;
  loadingAction.value = 'approve';

  try {
    console.log('[ApprovalCard] Approving request via GMActionHandler:', props.approvalData.requestId);
    
    // Call GMActionHandler directly
    await gmActionHandlerService.approveRequest(props.approvalData.requestId);

    // Mark as processed
    isProcessed.value = true;
    approvalStatus.value = 'approved';

    notificationStore.addNotification({
      type: 'success',
      message: `Approved ${props.approvalData.playerName}'s ${formatActionType(props.approvalData.actionType)} request`,
      duration: 3000
    });

  } catch (error) {
    console.error('[ApprovalCard] Error approving request:', error);
    notificationStore.addNotification({
      type: 'error',
      message: 'Failed to approve request',
      duration: 4000
    });
  } finally {
    isLoading.value = false;
    loadingAction.value = null;
  }
}

/**
 * Handle denial button click
 */
async function handleDeny() {
  if (isLoading.value) return;

  isLoading.value = true;
  loadingAction.value = 'deny';

  try {
    console.log('[ApprovalCard] Denying request via GMActionHandler:', props.approvalData.requestId);
    
    // Call GMActionHandler directly
    await gmActionHandlerService.denyRequest(props.approvalData.requestId, 'Request denied by Game Master');

    // Mark as processed
    isProcessed.value = true;
    approvalStatus.value = 'denied';

    notificationStore.addNotification({
      type: 'info',
      message: `Denied ${props.approvalData.playerName}'s ${formatActionType(props.approvalData.actionType)} request`,
      duration: 3000
    });

  } catch (error) {
    console.error('[ApprovalCard] Error denying request:', error);
    notificationStore.addNotification({
      type: 'error',
      message: 'Failed to deny request',
      duration: 4000
    });
  } finally {
    isLoading.value = false;
    loadingAction.value = null;
  }
}

/**
 * Format action type for display
 */
function formatActionType(actionType: string): string {
  return actionType.split('-').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
}

/**
 * Format timestamp for display
 */
function formatTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
}
</script>

<style scoped>
/* Component-specific styles */
.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>