<template>
  <div class="token-generator p-4 bg-white rounded-lg shadow-md w-full max-w-md">
    <h2 class="text-lg font-semibold mb-4">Place Actor Token</h2>
    
    <!-- Loading state -->
    <div v-if="loadingActors" class="py-6 text-center">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
      <p class="mt-2 text-gray-600">Loading actors...</p>
    </div>
    
    <!-- Error state -->
    <div v-else-if="errorMessage" class="py-4 text-center text-red-500">
      {{ errorMessage }}
    </div>
    
    <!-- Form content -->
    <div v-else class="space-y-4">
      <!-- Actor selection -->
      <div>
        <label for="actor-select" class="block text-sm font-medium mb-1">Choose an actor:</label>
        <select 
          id="actor-select"
          v-model="selectedActorId"
          class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        >
          <option disabled value="">Select an actor</option>
          <optgroup label="Characters">
            <option 
              v-for="actor in actorList.filter(a => a.type === 'character')" 
              :key="actor.id" 
              :value="actor.id"
            >
              {{ actor.name }}
            </option>
          </optgroup>
          <optgroup label="Monsters">
            <option 
              v-for="actor in actorList.filter(a => a.type === 'monster' || a.type === 'npc')" 
              :key="actor.id" 
              :value="actor.id"
            >
              {{ actor.name }}
            </option>
          </optgroup>
        </select>
      </div>
      
      <!-- Token count -->
      <div>
        <label for="token-count" class="block text-sm font-medium mb-1">Number of tokens:</label>
        <input 
          id="token-count"
          v-model.number="tokenOptions.count"
          type="number" 
          min="1" 
          max="20"
          class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
      
      <!-- Token name -->
      <div>
        <label for="token-name" class="block text-sm font-medium mb-1">Custom name (optional):</label>
        <input 
          id="token-name"
          v-model="tokenOptions.name"
          type="text" 
          class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          placeholder="Leave blank to use actor name"
        />
      </div>
      
      <!-- Token spacing -->
      <div>
        <label for="token-spacing" class="block text-sm font-medium mb-1">Spacing (for multiple tokens):</label>
        <input 
          id="token-spacing"
          v-model.number="tokenOptions.spacing"
          type="number" 
          min="1" 
          max="5"
          class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
      
      <!-- Position info -->
      <div>
        <label class="block text-sm font-medium mb-1">Position:</label>
        <div class="text-sm text-gray-600">
          X: {{ props.initialPosition?.x || 0 }}, Y: {{ props.initialPosition?.y || 0 }}, Elevation: {{ props.initialPosition?.elevation || 0 }}
        </div>
      </div>
      
      <!-- Action buttons -->
      <div class="flex justify-between pt-2">
        <button 
          @click="createTokens"
          class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          :disabled="!selectedActorId"
        >
          Create Token{{ tokenCount > 1 ? 's' : '' }}
        </button>
        <button 
          @click="cancel"
          class="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import type { IActor } from '@dungeon-lab/shared/types/index.mjs';
import type { IToken } from '@dungeon-lab/shared/types/tokens.mjs';
import { ActorsClient, EncountersClient } from '@dungeon-lab/client/index.mjs';

const props = defineProps<{
  encounterId: string;
  actors?: IActor[]; // Make this optional since we'll fetch actors
  initialPosition?: { x: number, y: number, elevation: number };
}>();

const emit = defineEmits<{
  'tokens-created': [tokens: IToken[]];
  'cancel': [];
}>();

// Initialize clients
const actorsClient = new ActorsClient();
const encountersClient = new EncountersClient();

// State
const selectedActorId = ref('');
const tokenOptions = ref({
  count: 1,
  name: '',
  spacing: 1 // Grid spacing between multiple tokens
});
const loadingActors = ref(false);
const actorList = ref<IActor[]>([]);
const errorMessage = ref<string | null>(null);

// Fetch all available actors for the encounter
const fetchActors = async () => {
  loadingActors.value = true;
  errorMessage.value = null;
  
  try {
    // First get the encounter to retrieve campaignId
    const encounter = await encountersClient.getEncounter(props.encounterId);
    const campaignId = encounter.campaignId;
    
    if (!campaignId) {
      throw new Error('Campaign ID not found in encounter data');
    }
    
    console.log('[Debug] Fetching actors for campaignId:', campaignId);
    
    // Fetch campaign data to get characters directly
    const campaignResponse = await fetch(`/api/campaigns/${campaignId}`);
    const campaignData = await campaignResponse.json();
    
    console.log('[Debug] Campaign data:', campaignData);
    
    // Extract characters from campaign data
    const characters = campaignData.characters || [];
    console.log('[Debug] Campaign characters:', characters);
    
    // Convert campaign characters to actor format
    const characterActors = characters.map((char: { id: string; name: string; defaultTokenImageId?: string; createdBy?: string; updatedBy?: string }) => ({
      id: char.id,
      name: char.name,
      type: 'character',
      defaultTokenImageId: char.defaultTokenImageId || undefined,
      gameSystemId: campaignData.gameSystemId || 'dnd-5e-2024',
      createdBy: char.createdBy || 'user',
      updatedBy: char.updatedBy || 'user',
      userData: {},
      data: {}
    }));
    
    // Fetch monsters (if available)
    let monsters: IActor[] = [];
    try {
      monsters = await actorsClient.getActors({ type: 'monster' });
    } catch (error) {
      console.warn('[Debug] Error fetching monsters:', error);
    }
    
    // Combine the results
    actorList.value = [...characterActors, ...monsters];
    console.log('[Debug] Combined actor list:', actorList.value);
    
    // If no actors were found, provide dummy data for testing
    if (actorList.value.length === 0) {
      console.log('[Debug] No actors found, adding dummy actors for testing');
      
      const dummyGameSystemId = 'dnd-5e-2024';
      
      // Add dummy campaign characters
      actorList.value.push(
        {
          id: 'dummy-char-1',
          name: 'Aragorn (Dummy)',
          type: 'character',
          defaultTokenImageId: undefined,
          gameSystemId: dummyGameSystemId,
          createdBy: 'user',
          updatedBy: 'user',
          userData: {},
          data: {}
        },
        {
          id: 'dummy-char-2',
          name: 'Legolas (Dummy)',
          type: 'character',
          defaultTokenImageId: undefined,
          gameSystemId: dummyGameSystemId,
          createdBy: 'user',
          updatedBy: 'user',
          userData: {},
          data: {}
        }
      );
      
      // Add dummy monsters
      actorList.value.push(
        {
          id: 'dummy-monster-1',
          name: 'Goblin (Dummy)',
          type: 'monster',
          defaultTokenImageId: undefined,
          gameSystemId: dummyGameSystemId,
          createdBy: 'user',
          updatedBy: 'user',
          userData: {},
          data: {}
        },
        {
          id: 'dummy-monster-2',
          name: 'Troll (Dummy)',
          type: 'monster',
          defaultTokenImageId: undefined,
          gameSystemId: dummyGameSystemId,
          createdBy: 'user',
          updatedBy: 'user',
          userData: {},
          data: {}
        }
      );
      
      console.log('[Debug] Added dummy actors:', actorList.value);
    }
    
    // Auto-select first actor if available
    if (actorList.value.length > 0 && !selectedActorId.value) {
      selectedActorId.value = actorList.value[0].id;
      console.log('[Debug] Auto-selected actor:', selectedActorId.value);
    }
  } catch (error) {
    console.error('Error fetching actors:', error);
    errorMessage.value = error instanceof Error ? error.message : 'Failed to fetch actors';
  } finally {
    loadingActors.value = false;
  }
};

// Use actors from props if provided, otherwise fetch from API
watch(() => props.actors, (newActors) => {
  if (newActors?.length) {
    actorList.value = newActors;
    // Auto-select first actor if available
    if (actorList.value.length > 0 && !selectedActorId.value) {
      selectedActorId.value = actorList.value[0].id;
    }
  } else if (props.encounterId) {
    // If no actors provided but encounterId is, fetch actors
    fetchActors();
  }
}, { immediate: true });

// Fetch actors when encounterId changes
watch(() => props.encounterId, () => {
  if (props.encounterId && !props.actors?.length) {
    fetchActors();
  }
});

// Computed
const selectedActor = computed(() => 
  actorList.value.find(actor => actor.id === selectedActorId.value)
);

const tokenCount = computed(() => {
  return Math.max(1, Math.min(20, tokenOptions.value.count));
});

// Methods
function cancel() {
  emit('cancel');
}

async function createTokens() {
  const actor = selectedActor.value;
  if (!actor) {
    errorMessage.value = 'Please select an actor';
    return;
  }

  try {
    const tokens: IToken[] = [];
    
    // Create multiple tokens if count > 1
    for (let i = 0; i < tokenCount.value; i++) {
      // Calculate position with spacing
      let position = { ...props.initialPosition || { x: 0, y: 0, elevation: 0 } };
      if (i > 0 && props.initialPosition) {
        position = {
          x: props.initialPosition.x + (i * tokenOptions.value.spacing),
          y: props.initialPosition.y,
          elevation: props.initialPosition.elevation
        };
      }

      // Create token
      const token: IToken = {
        id: `temp-${Date.now()}-${i}`, // Temporary ID (server will generate real one)
        encounterId: props.encounterId,
        actorId: actor.id,
        name: tokenOptions.value.name || `${actor.name}${tokenCount.value > 1 ? ` ${i + 1}` : ''}`,
        position,
        size: 'medium', // Default size
        imageUrl: actor.defaultTokenImageId ? `/api/assets/${actor.defaultTokenImageId}` : '', // Use token image from actor
        isVisible: true,
        isPlayerControlled: actor.type === 'character',
        conditions: [],
        version: 1,
        createdBy: 'user', // Will be set by server
        updatedBy: 'user'  // Will be set by server
      };
      
      tokens.push(token);
    }
    
    emit('tokens-created', tokens);
  } catch (error) {
    console.error('Error creating tokens:', error);
    errorMessage.value = error instanceof Error ? error.message : 'Failed to create tokens';
  }
}

// Lifecycle
onMounted(() => {
  if (!props.actors?.length && props.encounterId) {
    fetchActors();
  }
});
</script>

<style scoped>
.token-generator {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 300px;
  background-color: white;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  z-index: 1000;
}
</style> 