<template>
  <!-- Modal overlay -->
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="actor-token-generator">
    <div class="header">
      <h3>Add Tokens</h3>
      <button @click="$emit('close')" class="close-button">×</button>
    </div>
    
    <div v-if="loadingActors" class="loading-state">
      <div class="spinner"></div>
      <p>Loading actors...</p>
    </div>
    
    <div v-else-if="error" class="error-state">
      <p>{{ error }}</p>
      <button @click="$emit('close')" class="cancel-button">Close</button>
    </div>
    
    <div v-else class="form-content">
      <div class="form-group">
        <label for="actor-select">Select Actor:</label>
        <select 
          id="actor-select" 
          v-model="selectedActorId"
          @change="onActorSelected"
          class="select-input"
        >
          <option disabled value="">Choose an actor...</option>
          <optgroup label="Player Characters">
            <option v-for="actor in pcActors" :key="actor.id" :value="actor.id">
              {{ actor.name }}
            </option>
          </optgroup>
          <optgroup label="NPCs">
            <option v-for="actor in npcActors" :key="actor.id" :value="actor.id">
              {{ actor.name }}
            </option>
          </optgroup>
          <optgroup label="Monsters">
            <option v-for="actor in monsterActors" :key="actor.id" :value="actor.id">
              {{ actor.name }}
            </option>
          </optgroup>
        </select>
      </div>
      
      <div v-if="selectedActor" class="actor-preview">
        <h4>{{ selectedActor.name }}</h4>
        <p class="actor-type">{{ selectedActor.type?.toUpperCase() }}</p>
        <div class="actor-stats" v-if="selectedActor.data?.stats">
          <span>HP: {{ selectedActor.data.stats.hitPoints || 'N/A' }}</span>
          <span>AC: {{ selectedActor.data.stats.armorClass || 'N/A' }}</span>
          <span>Speed: {{ selectedActor.data.stats.speed || 'N/A' }}</span>
        </div>
      </div>
      
      <div class="form-group">
        <label for="token-count">Number of Tokens:</label>
        <input 
          id="token-count" 
          type="number" 
          v-model="tokenCount" 
          min="1" 
          max="20"
          class="number-input"
        />
      </div>
      
      <div class="form-group">
        <label for="token-name">Custom Name (optional):</label>
        <input 
          id="token-name" 
          type="text" 
          v-model="tokenOptions.name" 
          placeholder="Leave blank to use actor name"
          class="text-input"
        />
        <small class="help-text">If creating multiple tokens, numbers will be appended</small>
      </div>
      
      <div class="form-group">
        <label for="token-scale">Scale:</label>
        <input 
          id="token-scale" 
          type="range" 
          v-model="tokenOptions.scale" 
          min="0.5" 
          max="2" 
          step="0.1"
          class="range-input"
        />
        <span class="scale-value">{{ tokenOptions.scale }}x</span>
      </div>
      
      <div class="form-group" v-if="isMonster">
        <label class="checkbox-label">
          <input type="checkbox" v-model="tokenOptions.randomizeHP" />
          Randomize HP (roll hit dice)
        </label>
      </div>
      
      <div class="form-group" v-if="isGM">
        <label class="checkbox-label">
          <input type="checkbox" v-model="tokenOptions.isHidden" />
          Start hidden from players
        </label>
      </div>
      
      <div class="form-group">
        <label for="placement-mode">Placement:</label>
        <select id="placement-mode" v-model="placementMode" class="select-input">
          <option value="click">Click to place each token</option>
          <option value="grid">Auto-arrange in grid</option>
          <option value="random">Random positions</option>
        </select>
      </div>
      
      <div class="form-actions">
        <button @click="$emit('close')" class="cancel-button">Cancel</button>
        <button 
          @click="createTokens" 
          :disabled="!selectedActorId || loading"
          class="create-button"
        >
          <span v-if="loading">Creating...</span>
          <span v-else>Create {{ tokenCount }} Token{{ tokenCount > 1 ? 's' : '' }}</span>
        </button>
      </div>
    </div>
    
    <div v-if="error" class="error-message">
      {{ error }}
    </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth.store.mjs';
import { useCampaignStore } from '@/stores/campaign.store.mjs';
import { useEncounterStore } from '@/stores/encounter.store.mjs';
import { CampaignsClient } from '@dungeon-lab/client/index.mjs';
import { ActorsClient } from '@dungeon-lab/client/index.mjs';
import type { IActor } from '@dungeon-lab/shared/types/index.mjs';

interface TokenOptions {
  name: string;
  isHidden: boolean;
  scale: number;
  randomizeHP: boolean;
}

const emit = defineEmits<{
  close: [];
  tokensCreated: [tokenIds: string[]];
}>();

const authStore = useAuthStore();
const campaignStore = useCampaignStore();
const encounterStore = useEncounterStore();

// API clients
const campaignsClient = new CampaignsClient();
const actorsClient = new ActorsClient();

// State
const selectedActorId = ref<string>('');
const tokenCount = ref(1);
const placementMode = ref<'click' | 'grid' | 'random'>('click');
const loading = ref(false);
const loadingActors = ref(false);
const error = ref<string | null>(null);

// Actor data fetched from API
const campaignCharacters = ref<IActor[]>([]);
const monsters = ref<IActor[]>([]);

const tokenOptions = ref<TokenOptions>({
  name: '',
  isHidden: false,
  scale: 1,
  randomizeHP: false
});

// All available actors (combined from campaign characters and monsters)
const allActors = computed(() => {
  return [...campaignCharacters.value, ...monsters.value];
});

// Computed
const selectedActor = computed(() => {
  if (!selectedActorId.value) return null;
  return allActors.value.find((actor: IActor) => actor.id === selectedActorId.value) || null;
});

const pcActors = computed(() => {
  return campaignCharacters.value.filter((actor: IActor) => actor.type === 'character');
});

const npcActors = computed(() => {
  return campaignCharacters.value.filter((actor: IActor) => actor.type === 'npc');
});

const monsterActors = computed(() => {
  return monsters.value;
});

const isMonster = computed(() => {
  return selectedActor.value?.type === 'monster';
});

const isGM = computed(() => {
  return authStore.user?.isAdmin || false;
});

// Methods
const onActorSelected = () => {
  if (selectedActor.value) {
    // Reset name when selecting new actor
    tokenOptions.value.name = '';
    error.value = null;
  }
};

const createTokens = async () => {
  if (!selectedActorId.value || !selectedActor.value) return;
  
  loading.value = true;
  error.value = null;
  
  try {
    const tokenIds: string[] = [];
    
    // Validate that we have a valid image URL
    const imageUrl = selectedActor.value.token?.url || selectedActor.value.avatar?.url;
    if (!imageUrl) {
      throw new Error('No token or avatar image available for this actor');
    }

    for (let i = 0; i < tokenCount.value; i++) {
      const tokenName = tokenOptions.value.name || selectedActor.value.name;
      const finalName = tokenCount.value > 1 ? `${tokenName} ${i + 1}` : tokenName;
      
      // Create token using createTokenFromActor
      await encounterStore.createTokenFromActor({
        actorId: selectedActorId.value,
        name: finalName,
        isVisible: !tokenOptions.value.isHidden,
        position: { x: 0, y: 0, elevation: 0 } // Position will be set by the placement mode later
      });
    }

    // Close the modal and notify parent
    emit('tokensCreated', tokenIds);
    emit('close');
  } catch (err) {
    console.error('Failed to create tokens:', err);
    error.value = err instanceof Error ? err.message : 'Failed to create tokens';
  } finally {
    loading.value = false;
  }
};

// Load actors when component mounts
onMounted(async () => {
  loadingActors.value = true;
  error.value = null;
  
  try {
    // Get campaign ID from the encounter or campaign store
    let campaignId: string | undefined = encounterStore.currentEncounter?.campaignId;
    if (!campaignId && campaignStore.currentCampaign?.id) {
      campaignId = campaignStore.currentCampaign.id.toString();
    }
    
    if (campaignId) {
      // Fetch campaign data to get characters
      const campaign = await campaignsClient.getCampaign(campaignId);
      campaignCharacters.value = campaign.characters || [];
      
      // Fetch monsters for the game system - for now get all monsters
      // TODO: Filter by game system when we have that information
      const monsterResults = await actorsClient.searchActors({ 
        type: 'monster' 
      });
      monsters.value = monsterResults;
    } else {
      console.warn('No campaign ID available, loading basic monsters only');
      // Fallback: just load monsters
      const monsterResults = await actorsClient.searchActors({ 
        type: 'monster' 
      });
      monsters.value = monsterResults;
    }
  } catch (err) {
    console.error('Failed to load actors:', err);
    error.value = err instanceof Error ? err.message : 'Failed to load actors';
  } finally {
    loadingActors.value = false;
  }
});

// Watch for actor changes to update form
watch(selectedActor, (newActor) => {
  if (newActor) {
    // Set reasonable defaults based on actor type
    if (newActor.type === 'monster') {
      tokenOptions.value.randomizeHP = true;
    }
  }
});
</script>

<style scoped>
.modal-overlay {
  @apply fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50;
}

.actor-token-generator {
  @apply bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-6 min-w-96 max-w-md;
}

.header {
  @apply flex items-center justify-between mb-4;
}

.header h3 {
  @apply text-lg font-semibold text-gray-900 dark:text-white;
}

.close-button {
  @apply text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl font-bold leading-none;
}

.form-content {
  @apply space-y-4;
}

.form-group {
  @apply flex flex-col space-y-2;
}

.form-group label {
  @apply text-sm font-medium text-gray-700 dark:text-gray-300;
}

.select-input,
.text-input,
.number-input {
  @apply px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
         bg-white dark:bg-gray-700 text-gray-900 dark:text-white
         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent;
}

.range-input {
  @apply w-full;
}

.scale-value {
  @apply text-sm text-gray-600 dark:text-gray-400 ml-2;
}

.checkbox-label {
  @apply flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300;
}

.checkbox-label input[type="checkbox"] {
  @apply rounded border-gray-300 dark:border-gray-600 text-blue-600 
         focus:ring-blue-500 focus:ring-offset-0;
}

.help-text {
  @apply text-xs text-gray-500 dark:text-gray-400 mt-1;
}

.actor-preview {
  @apply bg-gray-50 dark:bg-gray-700 rounded-lg p-3 border border-gray-200 dark:border-gray-600;
}

.actor-preview h4 {
  @apply font-medium text-gray-900 dark:text-white;
}

.actor-type {
  @apply text-xs text-blue-600 dark:text-blue-400 font-medium;
}

.actor-stats {
  @apply flex space-x-3 text-sm text-gray-600 dark:text-gray-400 mt-2;
}

.form-actions {
  @apply flex space-x-3 pt-4;
}

.cancel-button {
  @apply px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 
         bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 
         rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 
         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2;
}

.create-button {
  @apply flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 
         border border-transparent rounded-md hover:bg-blue-700 
         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
         disabled:opacity-50 disabled:cursor-not-allowed;
}

.error-message {
  @apply mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 
         rounded-md text-sm text-red-700 dark:text-red-300;
}

.loading-state {
  @apply flex flex-col items-center justify-center py-8 text-center;
}

.loading-state p {
  @apply text-gray-600 dark:text-gray-400 mt-3;
}

.error-state {
  @apply flex flex-col items-center justify-center py-8 text-center;
}

.error-state p {
  @apply text-red-600 dark:text-red-400 mb-4;
}

.spinner {
  @apply w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin;
}
</style> 