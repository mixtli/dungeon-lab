<!-- CampaignInviteModal.vue -->
<script setup lang="ts">
import { ref } from 'vue';
import { useCampaignStore } from '../../stores/campaign.store.mjs';
import type { IInvite } from '@dungeon-lab/shared/types/index.mjs';

const props = defineProps<{
  campaignId: string;
  show: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'invited'): void;
}>();

const campaignStore = useCampaignStore();
const email = ref('');
const error = ref<string | null>(null);
const loading = ref(false);

async function handleSubmit() {
  if (!email.value) {
    error.value = 'Please enter an email address';
    return;
  }

  loading.value = true;
  error.value = null;

  try {
    const inviteData: Omit<IInvite, 'id'> = {
      campaignId: props.campaignId,
      email: email.value,
      status: 'pending',
    };

    await campaignStore.sendInvite(inviteData);
    email.value = '';
    emit('invited');
    emit('close');
  } catch (err: any) {
    error.value = err.response?.data?.message || err.message || 'Failed to send invite';
    console.error('Error sending invite:', err);
  } finally {
    loading.value = false;
  }
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
                <h3 class="modal-header" id="modal-title">Invite to Campaign</h3>
                <div class="mt-4">
                  <label for="email" class="modal-label">Email Address</label>
                  <input
                    type="email"
                    name="email"
                    id="email"
                    v-model="email"
                    class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    placeholder="Enter email address"
                    required
                  />
                  <p v-if="error" class="mt-2 text-sm text-red-600">{{ error }}</p>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="submit"
              :disabled="loading"
              class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
            >
              <span v-if="loading">Sending...</span>
              <span v-else>Send Invite</span>
            </button>
            <button
              type="button"
              class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white modal-button-secondary hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
              @click="emit('close')"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
