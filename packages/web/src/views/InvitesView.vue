<template>
  <div class="container mx-auto px-4 py-8">
    <h1 class="text-2xl font-bold mb-6 text-dragon">Campaign Invites</h1>

    <div v-if="loading" class="flex justify-center">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-dragon"></div>
    </div>

    <div v-else-if="error" class="text-error-700 dark:text-error-400">
      {{ error }}
    </div>

    <div v-else-if="!invites.length" class="text-center text-ash dark:text-stone-300">
      No pending invites found.
    </div>

    <div v-else class="grid gap-6">
      <div v-for="invite in invites" :key="invite.id" class="bg-stone dark:bg-stone-700 rounded-lg shadow-xl border border-stone-300 dark:border-stone-600 p-6">
        <h2 class="text-xl font-semibold mb-2 text-dragon dark:text-gold">
          {{ getCampaignName(invite) }}
        </h2>
        <p class="text-sm text-ash dark:text-stone-300 mb-4">
          Invited by {{ getCreatorEmail(invite) }}
        </p>

        <div class="flex gap-4">
          <button
            class="btn btn-primary"
            @click="handleAccept(invite)"
          >
            Accept
          </button>
          <button
            class="btn btn-outline"
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
      <div class="bg-stone dark:bg-stone-700 rounded-lg shadow-xl w-full max-w-lg border border-stone-300 dark:border-stone-600">
        <div class="p-6">
          <h2 class="text-xl font-semibold mb-4 text-dragon dark:text-gold">Select Character</h2>

          <div v-if="loadingCharacters" class="flex justify-center py-8">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-dragon"></div>
          </div>

          <div v-else-if="!compatibleCharacters.length" class="text-center py-8 text-onyx dark:text-parchment">
            <p class="mb-4">
              You don't have any characters compatible with this campaign's game system.
            </p>
            <button
              class="btn btn-primary"
              @click="createNewCharacter"
            >
              Create New Character
            </button>
          </div>

          <div v-else class="grid gap-4 max-h-96 overflow-y-auto">
            <div
              v-for="character in compatibleCharacters"
              :key="character.id"
              class="p-4 border border-stone-300 dark:border-stone-600 rounded-lg cursor-pointer hover:bg-stone-100 dark:hover:bg-stone-600 transition-colors"
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
                  class="w-12 h-12 rounded-full bg-stone-200 dark:bg-stone-600 flex items-center justify-center text-onyx dark:text-parchment"
                >
                  <span class="text-xl">{{ character.name[0] }}</span>
                </div>
                <div>
                  <h3 class="font-semibold text-dragon dark:text-gold">{{ character.name }}</h3>
                  <p class="text-sm text-ash dark:text-stone-300">{{ character.documentType }}</p>
                </div>
              </div>
            </div>
          </div>

          <div class="mt-6 flex justify-end">
            <button
              class="btn btn-outline"
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
/* eslint-disable @typescript-eslint/no-explicit-any */
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth.store.mjs';
import type { IActor } from '@dungeon-lab/shared/types/index.mjs';
import { InvitesClient, ActorsClient } from '@dungeon-lab/client/index.mjs';

// Define interface for campaign invite structure
interface Campaign {
  id: string;
  name: string;
  pluginId: string;
}

interface User {
  id: string;
  email: string;
}

// Update interface to match the actual API response
interface Invite {
  id: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  campaignId: string | Campaign;
  createdBy?: string | User;
  updatedBy?: string;
  expiresAt?: Date;
  email?: string; // Some invite responses have this field
}

const invitesClient = new InvitesClient();
const actorsClient = new ActorsClient();

const router = useRouter();
const authStore = useAuthStore();
const loading = ref(false);
const error = ref<string | null>(null);
const invites = ref<Invite[]>([]);
const showCharacterSelect = ref(false);
const loadingCharacters = ref(false);
const compatibleCharacters = ref<IActor[]>([]);
const selectedInvite = ref<Invite | null>(null);

// Helper functions to handle both populated and non-populated data structures
function getCampaignName(invite: Invite): string {
  if (typeof invite.campaignId === 'string') {
    return 'Campaign';
  }
  return invite.campaignId?.name || 'Campaign';
}

function getCreatorEmail(invite: Invite): string {
  if (typeof invite.createdBy === 'string') {
    return 'User';
  }
  return invite.createdBy?.email || 'User';
}

async function fetchInvites() {
  loading.value = true;
  error.value = null;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await invitesClient.getMyInvites() as unknown as Invite[];
    invites.value = response;
  } catch (err: unknown) {
    const errorObj = err as Error & { response?: { data?: { message?: string } } };
    error.value = errorObj.response?.data?.message || (errorObj as Error).message || 'Failed to fetch invites';
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
        actor.pluginId === gameSystemId && 
        actor.createdBy === authStore.user?.id &&
        actor.documentType === 'actor'
    );
  } catch (err: unknown) {
    const errorObj = err as Error & { response?: { data?: { message?: string } } };
    error.value = errorObj.response?.data?.message || (errorObj as Error).message || 'Failed to load characters';
  } finally {
    loadingCharacters.value = false;
  }
}

async function handleAccept(invite: Invite) {
  selectedInvite.value = invite;
  const gameSystemId = typeof invite.campaignId === 'string' 
    ? null 
    : invite.campaignId.pluginId;
  
  if (gameSystemId) {
    await loadCompatibleCharacters(gameSystemId);
    showCharacterSelect.value = true;
  } else {
    error.value = "Could not determine game system. Please try again.";
  }
}

async function handleDecline(invite: Invite) {
  try {
    await invitesClient.respondToInvite(invite.id, { status: 'declined' });

    // Remove from list
    invites.value = invites.value.filter(i => i.id !== invite.id);
  } catch (err: unknown) {
    const errorObj = err as Error & { response?: { data?: { message?: string } } };
    error.value = errorObj.response?.data?.message || (errorObj as Error).message || 'Failed to decline invite';
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
    invites.value = invites.value.filter(i => i.id !== selectedInvite.value?.id);
    showCharacterSelect.value = false;

    // Get campaign ID, handling both object and string formats
    const campaignId = selectedInvite.value && typeof selectedInvite.value.campaignId === 'string'
      ? selectedInvite.value.campaignId
      : (selectedInvite.value?.campaignId as Campaign)?.id;

    // Navigate to campaign
    if (campaignId) {
      router.push(`/campaigns/${campaignId}`);
    } else {
      error.value = "Could not determine campaign ID for navigation.";
    }
  } catch (err: unknown) {
    const errorObj = err as Error & { response?: { data?: { message?: string } } };
    error.value = errorObj.response?.data?.message || (errorObj as Error).message || 'Failed to accept invite';
  }
}

function createNewCharacter() {
  if (!selectedInvite.value) return;

  const gameSystemId = typeof selectedInvite.value.campaignId === 'string'
    ? null
    : selectedInvite.value.campaignId.pluginId;

  if (!gameSystemId) {
    error.value = "Could not determine game system ID.";
    return;
  }

  router.push({
    path: '/character/create',
    query: {
      gameSystemId,
      returnTo: '/invites',
    },
  });
}

onMounted(fetchInvites);
</script>
