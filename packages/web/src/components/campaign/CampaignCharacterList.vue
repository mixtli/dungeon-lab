<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { PlusIcon, TrashIcon } from '@heroicons/vue/24/outline';
import { type ICharacter, type IActor, type IAsset, type ICampaign } from '@dungeon-lab/shared/types/index.mjs';
import { CampaignsClient, CharactersClient } from '@dungeon-lab/client/index.mjs';
import CharacterSelectionDialog from '@/components/dialogs/CharacterSelectionDialog.vue';

const campaignsClient = new CampaignsClient();
const charactersClient = new CharactersClient();

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
const isLoading = ref(!props.characters);
const error = ref<string | null>(null);
const campaign = ref<ICampaign | null>(null);
const showCharacterDialog = ref(false);

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
    // Remove character from campaign
    await charactersClient.leaveCampaign(characterId);

    // Refresh the campaign data to reflect the removal
    const campaignData = await campaignsClient.getCampaign(props.campaignId);
    campaign.value = campaignData;
    
    if (campaignData.characters && Array.isArray(campaignData.characters)) {
      const allCharacters = campaignData.characters as (IActor | ICharacter)[];
      localCharacters.value = allCharacters.filter(
        (char): char is ICharacter => char !== null && char?.documentType === 'character'
      );
    }

    error.value = null;
  } catch (err) {
    console.error('Error removing character:', err);
    error.value = 'Failed to remove character. Please try again.';
  }
}

function handleCreate() {
  showCharacterDialog.value = true;
}

function handleDialogClose() {
  showCharacterDialog.value = false;
}

async function handleCharacterSelected(characterId: string) {
  if (!campaign.value?.id) return;
  
  try {
    // Add character to campaign
    await charactersClient.joinCampaign(characterId, {
      campaignId: campaign.value.id
    });

    // Refresh the campaign data to show the new character
    const campaignData = await campaignsClient.getCampaign(props.campaignId);
    campaign.value = campaignData;
    
    if (campaignData.characters && Array.isArray(campaignData.characters)) {
      const allCharacters = campaignData.characters as (IActor | ICharacter)[];
      localCharacters.value = allCharacters.filter(
        (char): char is ICharacter => char !== null && char?.documentType === 'character'
      );
    }

    showCharacterDialog.value = false;
    error.value = null;
  } catch (err) {
    console.error('Error adding character to campaign:', err);
    error.value = 'Failed to add character to campaign. Please try again.';
  }
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

    <!-- Character Selection Dialog -->
    <CharacterSelectionDialog
      v-if="showCharacterDialog"
      :campaign-id="campaignId"
      :existing-character-ids="localCharacters.map(c => c.id).filter(Boolean)"
      @close="handleDialogClose"
      @character-selected="handleCharacterSelected"
    />
  </div>
</template>
