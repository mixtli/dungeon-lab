<template>
  <div class="container mx-auto px-4 py-8">
    <h1 class="text-2xl font-bold mb-6">Campaign Invites</h1>

    <div v-if="loading" class="flex justify-center">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>

    <div v-else-if="error" class="text-red-600">
      {{ error }}
    </div>

    <div v-else-if="!invites.length" class="text-center text-gray-600">
      No pending invites found.
    </div>

    <div v-else class="grid gap-6">
      <div v-for="invite in invites" :key="invite.id" class="bg-white rounded-lg shadow p-6">
        <h2 class="text-xl font-semibold mb-2">
          {{ getCampaignName(invite) }}
        </h2>
        <p class="text-sm text-gray-500 mb-4">
          Invited by {{ getCreatorEmail(invite) }}
        </p>

        <div class="flex gap-4">
          <button
            class="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-opacity-50"
            @click="handleAccept(invite)"
          >
            Accept
          </button>
          <button
            class="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50"
            @click="handleDecline(invite)"
          >
            Decline
          </button>
        </div>
      </div>
    </div>

    <!-- Character Selection Modal -->
    <div
      v-if="showCharacterSelect"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4"
    >
      <div class="bg-white rounded-lg shadow-xl w-full max-w-lg">
        <div class="p-6">
          <h2 class="text-xl font-semibold mb-4">Select Character</h2>

          <div v-if="loadingCharacters" class="flex justify-center py-8">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>

          <div v-else-if="!compatibleCharacters.length" class="text-center py-8">
            <p class="mb-4">
              You don't have any characters compatible with this campaign's game system.
            </p>
            <button
              class="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-opacity-50"
              @click="createNewCharacter"
            >
              Create New Character
            </button>
          </div>

          <div v-else class="grid gap-4 max-h-96 overflow-y-auto">
            <div
              v-for="character in compatibleCharacters"
              :key="character.id"
              class="p-4 border rounded-lg cursor-pointer hover:bg-gray-50"
              @click="selectCharacter(character)"
            >
              <div class="flex items-center gap-4">
                <img
                  v-if="character.avatar && character.avatar.url"
                  :src="character.avatar.url"
                  class="w-12 h-12 rounded-full object-cover"
                  :alt="character.name"
                />
                <div
                  v-else
                  class="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center"
                >
                  <span class="text-xl">{{ character.name[0] }}</span>
                </div>
                <div>
                  <h3 class="font-semibold">{{ character.name }}</h3>
                  <p class="text-sm text-gray-600">{{ character.type }}</p>
                </div>
              </div>
            </div>
          </div>

          <div class="mt-6 flex justify-end">
            <button
              class="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50"
              @click="showCharacterSelect = false"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth.store.mjs';
import type { IActor } from '@dungeon-lab/shared/types/index.mjs';
import { InvitesClient, ActorsClient } from '@dungeon-lab/client/index.mjs';

const invitesClient = new InvitesClient();
const actorsClient = new ActorsClient();

const router = useRouter();
const authStore = useAuthStore();
const loading = ref(false);
const error = ref<string | null>(null);
const invites = ref<any[]>([]);
const showCharacterSelect = ref(false);
const loadingCharacters = ref(false);
const compatibleCharacters = ref<IActor[]>([]);
const selectedInvite = ref<any>(null);

// Helper functions to handle both populated and non-populated data structures
function getCampaignName(invite: any): string {
  if (typeof invite.campaignId === 'string') {
    return 'Campaign';
  }
  return invite.campaignId?.name || 'Campaign';
}

function getCreatorEmail(invite: any): string {
  if (typeof invite.createdBy === 'string') {
    return 'User';
  }
  return invite.createdBy?.email || 'User';
}

async function fetchInvites() {
  loading.value = true;
  error.value = null;

  try {
    const response = await invitesClient.getMyInvites();
    invites.value = response;
  } catch (err: any) {
    error.value = err.response?.data?.message || err.message || 'Failed to fetch invites';
  } finally {
    loading.value = false;
  }
}

async function loadCompatibleCharacters(gameSystemId: string) {
  loadingCharacters.value = true;

  try {
    // Use ActorsClient directly instead of store
    const actors = await actorsClient.getActors();
    compatibleCharacters.value = actors.filter(
      (actor: IActor) =>
        actor.gameSystemId === gameSystemId && 
        actor.createdBy === authStore.user?.id &&
        actor.type === 'character'
    );
  } catch (err: any) {
    error.value = err.response?.data?.message || err.message || 'Failed to load characters';
  } finally {
    loadingCharacters.value = false;
  }
}

async function handleAccept(invite: any) {
  selectedInvite.value = invite;
  const gameSystemId = typeof invite.campaignId === 'string' 
    ? null 
    : invite.campaignId.gameSystemId;
  
  if (gameSystemId) {
    await loadCompatibleCharacters(gameSystemId);
    showCharacterSelect.value = true;
  } else {
    error.value = "Could not determine game system. Please try again.";
  }
}

async function handleDecline(invite: any) {
  try {
    await invitesClient.respondToInvite(invite.id, { status: 'declined' });

    // Remove from list
    invites.value = invites.value.filter(i => i.id !== invite.id);
  } catch (err: any) {
    error.value = err.response?.data?.message || err.message || 'Failed to decline invite';
  }
}

async function selectCharacter(character: IActor) {
  if (!selectedInvite.value) return;

  try {
    await invitesClient.respondToInvite(selectedInvite.value.id, {
      status: 'accepted',
      actorId: character.id,
    });

    // Remove from list and close modal
    invites.value = invites.value.filter(i => i.id !== selectedInvite.value.id);
    showCharacterSelect.value = false;

    // Get campaign ID, handling both object and string formats
    const campaignId = typeof selectedInvite.value.campaignId === 'string'
      ? selectedInvite.value.campaignId
      : selectedInvite.value.campaignId.id;

    // Navigate to campaign
    if (campaignId) {
      router.push(`/campaigns/${campaignId}`);
    } else {
      error.value = "Could not determine campaign ID for navigation.";
    }
  } catch (err: any) {
    error.value = err.response?.data?.message || err.message || 'Failed to accept invite';
  }
}

function createNewCharacter() {
  if (!selectedInvite.value) return;

  const gameSystemId = typeof selectedInvite.value.campaignId === 'string'
    ? null
    : selectedInvite.value.campaignId.gameSystemId;

  if (!gameSystemId) {
    error.value = "Could not determine game system ID.";
    return;
  }

  router.push({
    path: '/actors/new',
    query: {
      gameSystemId,
      returnTo: '/invites',
    },
  });
}

onMounted(fetchInvites);
</script>
