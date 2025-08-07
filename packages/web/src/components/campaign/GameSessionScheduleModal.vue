<!-- eslint-disable vue/multi-word-component-names -->
<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useGameSessionStore } from '../../stores/game-session.store.mjs';
import { useAuthStore } from '../../stores/auth.store.mjs';
import { GameSessionsClient } from '@dungeon-lab/client/index.mjs';

const gameSessionClient = new GameSessionsClient();
const props = defineProps<{
  show: boolean;
  campaignId: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'created', sessionId: string): void;
}>();

const router = useRouter();
const gameSessionStore = useGameSessionStore();
const authStore = useAuthStore();

const loading = ref(false);
const error = ref<string | null>(null);
const scheduleType = ref<'now' | 'later'>('now');
const sessionName = ref('');
const sessionDescription = ref('');
const scheduledDate = ref('');
const scheduledTime = ref('');

// Computed min date (today)
const minDate = new Date().toISOString().split('T')[0];

async function handleSubmit() {
  if (!authStore.user?.id) {
    error.value = 'You must be logged in to create a game session';
    return;
  }

  if (!sessionName.value) {
    error.value = 'Session name is required';
    return;
  }

  if (scheduleType.value === 'later' && (!scheduledDate.value || !scheduledTime.value)) {
    error.value = 'Date and time are required for scheduled sessions';
    return;
  }

  loading.value = true;
  error.value = null;

  try {
    const sessionData = {
      name: sessionName.value,
      description: sessionDescription.value,
      campaignId: props.campaignId,
      gameMasterId: authStore.user.id,
      status: scheduleType.value === 'now' ? 'active' : 'paused',
      participantIds: [],
      characterIds: [],
      settings: {
        scheduledStart:
          scheduleType.value === 'later'
            ? new Date(`${scheduledDate.value}T${scheduledTime.value}`).toISOString()
            : undefined,
      },
    } as const;

    const session = await gameSessionClient.createGameSession(sessionData);

    if (session?.id) {
      emit('created', session.id);
      emit('close');
    }
  } catch (err) {
    console.error('Error creating game session:', err);
    error.value = gameSessionStore.error || 'Failed to create game session';
  } finally {
    loading.value = false;
  }
}

function handleClose() {
  // Reset form
  scheduleType.value = 'now';
  sessionName.value = '';
  sessionDescription.value = '';
  scheduledDate.value = '';
  scheduledTime.value = '';
  error.value = null;

  emit('close');
}
</script>

<template>
  <div
    v-if="show"
    class="fixed inset-0 z-50 overflow-y-auto"
    aria-labelledby="modal-title"
    role="dialog"
    aria-modal="true"
  >
    <div
      class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0"
    >
      <!-- Background overlay -->
      <div
        class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
        aria-hidden="true"
      ></div>

      <!-- Modal panel -->
      <div
        class="inline-block align-bottom modal-bg rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full"
      >
        <form @submit.prevent="handleSubmit">
          <div class="modal-bg px-4 pt-5 pb-4 sm:p-6">
            <div class="sm:flex sm:items-start">
              <div class="mt-3 text-center sm:mt-0 sm:text-left w-full">
                <h3 class="modal-header" id="modal-title">Schedule Game Session</h3>

                <div class="mt-4 space-y-4">
                  <!-- Session Type Selection -->
                  <div>
                    <label class="modal-label">Session Type</label>
                    <div class="mt-2 space-x-4">
                      <label class="inline-flex items-center">
                        <input
                          type="radio"
                          v-model="scheduleType"
                          value="now"
                          class="form-radio text-blue-600"
                        />
                        <span class="ml-2 modal-text">Start Now</span>
                      </label>
                      <label class="inline-flex items-center">
                        <input
                          type="radio"
                          v-model="scheduleType"
                          value="later"
                          class="form-radio text-blue-600"
                        />
                        <span class="ml-2 modal-text">Schedule for Later</span>
                      </label>
                    </div>
                  </div>

                  <!-- Session Name -->
                  <div>
                    <label for="sessionName" class="modal-label">Session Name</label>
                    <input
                      type="text"
                      id="sessionName"
                      v-model="sessionName"
                      class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      placeholder="Enter session name"
                      required
                    />
                  </div>

                  <!-- Session Description -->
                  <div>
                    <label for="sessionDescription" class="modal-label"
                      >Description (Optional)</label
                    >
                    <textarea
                      id="sessionDescription"
                      v-model="sessionDescription"
                      rows="3"
                      class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      placeholder="Enter session description"
                    ></textarea>
                  </div>

                  <!-- Date and Time Selection (for scheduled sessions) -->
                  <div v-if="scheduleType === 'later'" class="space-y-4">
                    <div>
                      <label for="sessionDate" class="modal-label">Date</label>
                      <input
                        type="date"
                        id="sessionDate"
                        v-model="scheduledDate"
                        :min="minDate"
                        class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      />
                    </div>
                    <div>
                      <label for="sessionTime" class="modal-label">Time</label>
                      <input
                        type="time"
                        id="sessionTime"
                        v-model="scheduledTime"
                        class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      />
                    </div>
                  </div>

                  <!-- Error Message -->
                  <div v-if="error" class="rounded-md bg-red-50 p-4">
                    <div class="flex">
                      <div class="ml-3">
                        <h3 class="text-sm font-medium text-red-800">
                          {{ error }}
                        </h3>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="modal-footer px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="submit"
              :disabled="loading"
              class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg
                v-if="loading"
                class="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                ></circle>
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              {{ scheduleType === 'now' ? 'Start Session' : 'Schedule Session' }}
            </button>
            <button
              type="button"
              class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white modal-button-secondary hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
              @click="handleClose"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
