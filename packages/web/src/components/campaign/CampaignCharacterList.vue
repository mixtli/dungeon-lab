<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { PlusIcon, TrashIcon } from '@heroicons/vue/24/outline';
import { useCampaignStore } from '../../stores/campaign.store.mjs';
import { type IActor, type IAsset } from '@dungeon-lab/shared/types/index.mjs';
import { ActorsClient } from '@dungeon-lab/client/index.mjs';

const actorClient = new ActorsClient();


const props = defineProps({
  campaignId: {
    type: String,
    required: true
  },
  characters: {
    type: Array as () => IActor[],
    required: false,
    default: () => []
  }
});

const localCharacters = ref<IActor[]>(props.characters || []);
const router = useRouter();
const campaignStore = useCampaignStore();
const isLoading = ref(!props.characters);
const error = ref<string | null>(null);

const campaign = computed(() => campaignStore.currentCampaign);

onMounted(async () => {
  if (!props.characters && props.campaignId) {
    try {
      // Get member IDs from the campaign
      if (!campaign.value?.members || !campaign.value?.id) {
        throw new Error('No members found in campaign');
      }

      // Fetch each character individually and track non-existent members
      const nonExistentMembers = new Set<string>();
      const characterPromises = campaign.value.members.map(async memberId => {
        try {
          return await actorClient.getActor(memberId);
        } catch (err) {
          // Check if 404 error
          if (err instanceof Error && err.message.includes('404')) {
            nonExistentMembers.add(memberId);
          } else {
            console.warn(`Failed to fetch character ${memberId}:`, err);
          }
          return null;
        }
      });

      const results = await Promise.all(characterPromises);
      localCharacters.value = results.filter(
        (char): char is IActor => char !== null && char?.type === 'character'
      );

      // If we found any non-existent members, clean them up from the campaign
      if (nonExistentMembers.size > 0) {
        const updatedMembers = campaign.value.members.filter(id => !nonExistentMembers.has(id));
        await campaignStore.updateCampaign(String(campaign.value.id), {
          members: updatedMembers
        });
        console.info(`Removed ${nonExistentMembers.size} non-existent members from campaign`);
      }
    } catch (err) {
      console.error('Error loading characters:', err);
      error.value = 'Failed to load characters. Please try again later.';
    } finally {
      isLoading.value = false;
    }
  }
});

async function handleRemove(characterId: string) {
  if (!campaign.value?.id) return;

  try {
    // Update campaign with the character removed from members
    const updatedMembers = campaign.value.members.filter(id => id !== characterId);
    await campaignStore.updateCampaign(String(campaign.value.id), {
      members: updatedMembers
    });

    // Update local list
    localCharacters.value = localCharacters.value.filter(char => char.id !== undefined && char.id !== characterId);
  } catch (err) {
    console.error('Error removing character:', err);
    error.value = 'Failed to remove character. Please try again later.';
  }
}

function handleCreate() {
  router.push('/character/create');
}
</script>

<template>
  <div class="campaign-characters p-6">
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-xl font-semibold text-gray-900">Characters</h2>
      <button
        @click="handleCreate"
        class="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        <PlusIcon class="h-5 w-5 mr-2" />
        Add Character
      </button>
    </div>

    <!-- Error State -->
    <div v-if="error" class="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
      <p class="text-red-700">{{ error }}</p>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex justify-center items-center min-h-[200px]">
      <div
        class="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"
      ></div>
    </div>

    <!-- Empty State -->
    <div v-else-if="localCharacters.length === 0" class="text-center py-8 bg-gray-50 rounded-lg">
      <h3 class="text-lg font-medium text-gray-900 mb-2">No Characters Yet</h3>
      <p class="text-gray-500 mb-4">Add your first character to get started</p>
      <button
        @click="handleCreate"
        class="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        <PlusIcon class="h-5 w-5 mr-2" />
        Add Character
      </button>
    </div>

    <!-- Character List -->
    <div v-else class="bg-white rounded-lg border border-gray-200 divide-y divide-gray-200">
      <div
        v-for="character in localCharacters"
        :key="character.id || ''"
        class="flex items-center justify-between px-4 py-3 hover:bg-gray-50"
      >
        <div class="flex items-center">
          <div class="w-10 h-10 rounded-full overflow-hidden bg-gray-200 mr-3">
            <img
              v-if="character.avatarId && typeof character.avatarId === 'object'"
              :src="(character.avatarId as unknown as IAsset).url"
              :alt="character.name"
              class="w-full h-full object-cover"
            />
          </div>
          <span class="text-gray-900">{{ character.name }}</span>
        </div>
        <button
          v-if="character.id"
          @click="handleRemove(character.id)"
          class="p-2 text-gray-400 hover:text-red-500 focus:outline-none"
          title="Remove character from campaign"
        >
          <TrashIcon class="h-5 w-5" />
        </button>
      </div>
    </div>
  </div>
</template>
