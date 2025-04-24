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
        <h2 class="text-xl font-semibold mb-2">{{ invite.campaignId.name }}</h2>
        <p class="text-sm text-gray-500 mb-4">Invited by {{ invite.createdBy.email }}</p>

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
import { useActorStore } from '../stores/actor.store.mjs';
import { useAuthStore } from '../stores/auth.store.mjs';
import type { IActor } from '@dungeon-lab/shared/dist/index.mjs';
import api from '../api/axios.mjs';

const router = useRouter();
const actorStore = useActorStore();
const authStore = useAuthStore();

const loading = ref(false);
const error = ref<string | null>(null);
const invites = ref<any[]>([]);
const showCharacterSelect = ref(false);
const loadingCharacters = ref(false);
const compatibleCharacters = ref<IActor[]>([]);
const selectedInvite = ref<any>(null);

async function fetchInvites() {
  loading.value = true;
  error.value = null;

  try {
    const response = await api.get('/api/my-invites');
    invites.value = response.data;
  } catch (err: any) {
    error.value = err.response?.data?.message || err.message || 'Failed to fetch invites';
  } finally {
    loading.value = false;
  }
}

async function loadCompatibleCharacters(gameSystemId: string) {
  loadingCharacters.value = true;

  try {
    await actorStore.fetchActors();
    compatibleCharacters.value = actorStore.actors.filter(
      (actor: IActor) =>
        actor.gameSystemId === gameSystemId && actor.createdBy === authStore.user?.id
    );
  } catch (err: any) {
    error.value = err.response?.data?.message || err.message || 'Failed to load characters';
  } finally {
    loadingCharacters.value = false;
  }
}

async function handleAccept(invite: any) {
  selectedInvite.value = invite;
  await loadCompatibleCharacters(invite.campaignId.gameSystemId);
  showCharacterSelect.value = true;
}

async function handleDecline(invite: any) {
  try {
    await api.post(`/api/invites/${invite.id}/respond`, {
      status: 'declined',
    });

    // Remove from list
    invites.value = invites.value.filter(i => i.id !== invite.id);
  } catch (err: any) {
    error.value = err.response?.data?.message || err.message || 'Failed to decline invite';
  }
}

async function selectCharacter(character: IActor) {
  if (!selectedInvite.value) return;

  try {
    await api.post(`/api/invites/${selectedInvite.value.id}/respond`, {
      status: 'accepted',
      actorId: character.id,
    });

    // Remove from list and close modal
    invites.value = invites.value.filter(i => i.id !== selectedInvite.value.id);
    showCharacterSelect.value = false;

    // Navigate to campaign
    router.push(`/campaigns/${selectedInvite.value.campaignId.id}`);
  } catch (err: any) {
    error.value = err.response?.data?.message || err.message || 'Failed to accept invite';
  }
}

function createNewCharacter() {
  if (!selectedInvite.value) return;

  router.push({
    path: '/actors/new',
    query: {
      gameSystemId: selectedInvite.value.campaignId.gameSystemId,
      returnTo: '/invites',
    },
  });
}

onMounted(fetchInvites);
</script>
