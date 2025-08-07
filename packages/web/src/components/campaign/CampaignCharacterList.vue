<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { PlusIcon, TrashIcon } from '@heroicons/vue/24/outline';
import { type ICharacter, type IActor, type IAsset, type ICampaign } from '@dungeon-lab/shared/types/index.mjs';
import { CampaignsClient } from '@dungeon-lab/client/index.mjs';

const campaignsClient = new CampaignsClient();

const props = defineProps({
  campaignId: {
    type: String,
    required: true
  },
  characters: {
    type: Array as () => ICharacter[],
    required: false,
    default: () => []
  }
});

const localCharacters = ref<ICharacter[]>(props.characters || []);
const router = useRouter();
const isLoading = ref(!props.characters);
const error = ref<string | null>(null);
const campaign = ref<ICampaign | null>(null);

onMounted(async () => {
  if (props.campaignId) {
    try {
      // Fetch campaign directly from API, which includes populated characters
      const campaignData = await campaignsClient.getCampaign(props.campaignId);
      console.log('Campaign data:', campaignData);
      campaign.value = campaignData;
      
      // Filter to only include actual characters
      if (campaignData.characters && Array.isArray(campaignData.characters)) {
        const allCharacters = campaignData.characters as (IActor | ICharacter)[];
        localCharacters.value = allCharacters.filter(
          (char): char is ICharacter => char !== null && char?.documentType === 'character'
        );
        console.log('Filtered characters:', localCharacters.value);
      } else {
        console.warn('No characters array found in campaign data');
      }
    } catch (err) {
      console.error('Error loading campaign:', err);
      error.value = 'Failed to load characters. Please try again later.';
    } finally {
      isLoading.value = false;
    }
  }
});

async function handleRemove(characterId: string) {
  if (!campaign.value?.id) return;

  try {
    // Remove character from campaign by clearing their campaignId
    // Note: This would typically be done through a character/document API client
    // For now, we'll use the campaign client's character management if available
    // TODO: Implement character.leaveCampaign() or document update API
    console.warn('Character removal not yet implemented with new architecture');
    error.value = 'Character removal feature needs to be updated for the new architecture';

    // Update local list for now
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
  <div class="campaign-characters bg-stone dark:bg-stone-700 p-6">
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-xl font-bold text-gold">👥 Characters</h2>
      <button
        @click="handleCreate"
        class="inline-flex items-center p-2 rounded-md text-gold hover:text-accent-700 hover:bg-accent-50 dark:hover:bg-accent-900 focus:outline-none transition-all duration-200 shadow-sm"
        title="Add Character"
      >
        <PlusIcon class="h-5 w-5" />
      </button>
    </div>

    <!-- Error State -->
    <div v-if="error" class="mb-6 bg-error-50 border border-error-200 rounded-md p-4">
      <p class="text-error-700">{{ error }}</p>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex justify-center items-center min-h-[200px]">
      <div
        class="animate-spin rounded-full h-12 w-12 border-4 border-dragon border-t-transparent shadow-lg"
      ></div>
    </div>

    <!-- Empty State -->
    <div v-else-if="localCharacters.length === 0" class="text-center py-8 bg-parchment dark:bg-obsidian rounded-lg border border-stone-300 dark:border-stone-600">
      <h3 class="text-lg font-bold text-dragon mb-2">⚔️ No Characters Yet</h3>
      <p class="text-ash dark:text-stone-300 mb-4">Add your first character to get started on your adventure</p>
      <button
        @click="handleCreate"
        class="inline-flex items-center p-2 rounded-md text-gold hover:text-accent-700 hover:bg-accent-50 dark:hover:bg-accent-900 focus:outline-none transition-all duration-200 shadow-sm"
        title="Add Character"
      >
        <PlusIcon class="h-5 w-5" />
      </button>
    </div>

    <!-- Character List -->
    <div v-else class="bg-parchment dark:bg-obsidian rounded-lg border border-stone-300 dark:border-stone-600 divide-y divide-stone-300 dark:divide-stone-600">
      <div
        v-for="character in localCharacters"
        :key="character.id || ''"
        class="flex items-center justify-between px-4 py-3 hover:bg-stone-100 dark:hover:bg-stone-600 transition-all duration-200"
      >
        <div class="flex items-center">
          <div class="w-10 h-10 rounded-full overflow-hidden bg-stone-200 dark:bg-stone-600 mr-3 border-2 border-gold">
            <img
              v-if="character.avatar && typeof character.avatar === 'object'"
              :src="(character.avatar as unknown as IAsset).url"
              :alt="character.name"
              class="w-full h-full object-cover"
            />
          </div>
          <span class="text-onyx dark:text-parchment font-medium">{{ character.name }}</span>
        </div>
        <button
          v-if="character.id"
          @click="handleRemove(character.id)"
          class="p-2 text-ash hover:text-dragon focus:outline-none transition-colors duration-200"
          title="Remove character from campaign"
        >
          <TrashIcon class="h-5 w-5" />
        </button>
      </div>
    </div>
  </div>
</template>
