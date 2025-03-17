<template>
  <div v-if="show" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
    <div class="bg-white rounded-lg shadow-xl w-full max-w-lg">
      <div class="p-6">
        <h2 class="text-xl font-semibold mb-4">Select Encounter</h2>
        
        <div v-if="loading" class="flex justify-center py-8">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
        
        <div v-else-if="error" class="text-red-600 mb-4">
          {{ error }}
        </div>
        
        <div v-else-if="!encounters.length" class="text-center py-8">
          <p class="mb-4">No available encounters found for this campaign.</p>
          <button 
            class="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-opacity-50"
            @click="createNewEncounter"
          >
            Create New Encounter
          </button>
        </div>
        
        <div v-else class="grid gap-4 max-h-96 overflow-y-auto">
          <div v-for="encounter in encounters" :key="encounter.id" 
            class="p-4 border rounded-lg cursor-pointer hover:bg-gray-50"
            @click="selectEncounter(encounter)"
          >
            <div class="flex items-center justify-between">
              <div>
                <h3 class="font-semibold">{{ encounter.name }}</h3>
                <p class="text-sm text-gray-600">{{ encounter.description }}</p>
              </div>
              <div class="text-sm text-gray-500">
                {{ encounter.status }}
              </div>
            </div>
          </div>
        </div>
        
        <div class="mt-6 flex justify-end gap-4">
          <button 
            class="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50"
            @click="$emit('close')"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import api from '../../network/axios.mjs';

const props = defineProps<{
  show: boolean;
  campaignId: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'select', encounterId: string): void;
}>();

const router = useRouter();
const loading = ref(false);
const error = ref<string | null>(null);
const encounters = ref<any[]>([]);

async function fetchEncounters() {
  loading.value = true;
  error.value = null;
  
  try {
    const response = await api.get(`/api/campaigns/${props.campaignId}/encounters?status=!completed`);
    encounters.value = response.data;
  } catch (err: any) {
    error.value = err.response?.data?.message || err.message || 'Failed to fetch encounters';
  } finally {
    loading.value = false;
  }
}

function selectEncounter(encounter: any) {
  emit('select', encounter.id);
}

function createNewEncounter() {
  router.push(`/campaigns/${props.campaignId}/encounters/create`);
}

onMounted(fetchEncounters);
</script> 