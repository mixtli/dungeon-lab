<template>
  <div class="max-w-3xl mx-auto p-6">
    <div class="bg-white rounded-lg shadow-md p-6">
      <h1 class="text-2xl font-bold text-gray-900 mb-6">Create Character</h1>

      <div v-if="!selectedGameSystemId" class="space-y-6">
        <h2 class="text-xl font-semibold text-gray-800">Select Game System</h2>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            v-for="system in availableGameSystems"
            :key="system.id"
            class="border rounded-lg p-4 hover:border-blue-500 cursor-pointer transition-colors"
            :class="{ 'border-blue-500 bg-blue-50': system.id === selectedGameSystemId }"
            @click="selectGameSystem(system.id)"
          >
            <h3 class="font-semibold text-lg">{{ system.name }}</h3>
            <p class="text-gray-600 text-sm mt-1">{{ system.description }}</p>
          </div>
        </div>

        <div class="mt-6 flex justify-end">
          <button
            @click="proceedToCreation"
            class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="!selectedGameSystemId"
          >
            Continue
          </button>
        </div>
      </div>

      <div v-else class="mt-4">
        <div class="flex justify-between items-center mb-6">
          <button @click="goBack" class="text-blue-600 hover:text-blue-800 flex items-center">
            <span class="mr-1">←</span> Back to Game System Selection
          </button>
        </div>

        <div v-if="errorMessage" class="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
          <p class="text-red-700">{{ errorMessage }}</p>
        </div>

        <div class="text-center text-gray-500 py-8">
          Plugin UI component integration pending for {{ selectedGameSystemId }}.
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { pluginRegistry } from '@/services/plugin-registry.mts';
// import type { GameSystemPlugin } from '@dungeon-lab/shared/types/plugin.mjs';
// import { ActorsClient } from '@dungeon-lab/client/index.mjs';
// import { CreateActorRequest } from '@dungeon-lab/shared/types/api/index.mjs';

const router = useRouter();

const selectedGameSystemId = ref<string>('');
const initialActorData = ref<Record<string, unknown>>({});
const actorData = ref<Record<string, unknown>>({});
const errorMessage = ref<string | null>(null);
// const isSubmitting = ref(false);

// const actorClient = new ActorsClient();

// Get all available game systems that support character creation
const availableGameSystems = computed(() => {
  return pluginRegistry.getPlugins().map(plugin => ({
    id: plugin.manifest.id,
    name: plugin.manifest.name,
    description: plugin.manifest.description || ''
  }));
});

function selectGameSystem(systemId: string) {
  selectedGameSystemId.value = systemId;
}

function proceedToCreation() {
  if (!selectedGameSystemId.value) return;

  // Initialize with default data for the selected system
  initialActorData.value = {
    name: '',
    gameSystemId: selectedGameSystemId.value,
    type: 'character',
  };

  // Copy to actorData
  actorData.value = { ...initialActorData.value };
}

// Removed unused updateActorData function

// async function handleSubmit(_data: Record<string, unknown>) {
//   try {
//     isSubmitting.value = true;
//     errorMessage.value = null;

//     // Merge the final data
//     const finalActorData: CreateActorRequest = {
//       ...actorData.value,
//       ..._data,
//       gameSystemId: selectedGameSystemId.value,
//       name: (actorData.value.name as string) || (_data.name as string) || '',
//       type: 'character',
//       data: _data
//     };

//     // Call API to create actor with the actorClient
//     const response = await actorClient.createActor(finalActorData);

//     // Navigate to the character sheet
//     if (response) {
//       router.push(`/character/${response.id}`);
//     } else {
//       errorMessage.value = 'Failed to create actor: No response from server';
//     }
//   } catch (error) {
//     console.error('Failed to create actor:', error);
//     errorMessage.value = error instanceof Error ? error.message : String(error);
//   } finally {
//     isSubmitting.value = false;
//   }
// }

function goBack() {
  if (selectedGameSystemId.value) {
    selectedGameSystemId.value = '';
    errorMessage.value = null;
  } else {
    router.push('/characters');
  }
}

// Removed unused handlePluginError function
</script>
