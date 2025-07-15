<script setup lang="ts">
import { useRouter } from 'vue-router';
import { ref } from 'vue';
import CampaignList from '../components/campaign/CampaignList.vue';
import { useDeviceAdaptation } from '@/composables/useDeviceAdaptation.mts';

const router = useRouter();
const hasCampaigns = ref(true); // Default to true to avoid showing "Create First Campaign" button before data loads
const { isMobile } = useDeviceAdaptation();

function createCampaign() {
  router.push({ name: 'campaign-create' });
}

function updateHasCampaigns(count: number) {
  hasCampaigns.value = count > 0;
}
</script>

<template>
  <div class="bg-parchment dark:bg-obsidian min-h-screen">
    <!-- Mobile header -->
    <div v-if="isMobile" class="text-center py-4 border-b border-stone dark:border-stone-600 bg-stone dark:bg-stone-800">
      <h1 class="text-xl font-semibold text-onyx dark:text-parchment">My Campaigns</h1>
    </div>
    
    <!-- Desktop header -->
    <div v-else class="flex justify-between items-center px-6 py-6">
      <h1 class="text-3xl font-bold text-dragon">My Campaigns</h1>
      <button
        v-if="hasCampaigns"
        @click="createCampaign"
        class="btn btn-success shadow-lg"
      >
        <span class="flex items-center">
          <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
          </svg>
          Create Campaign
        </span>
      </button>
    </div>

    <!-- Campaign List -->
    <div class="px-6">
      <CampaignList @update:campaigns="updateHasCampaigns($event)" />
    </div>

    <div v-if="!hasCampaigns" class="px-6 py-8 text-center">
      <div class="bg-stone dark:bg-stone-700 rounded-lg p-8 shadow-lg border border-gold">
        <div class="text-ash dark:text-stone-300 mb-6 text-lg">
          🏰 Ready to begin your adventure?
        </div>
        <button
          @click="createCampaign"
          class="btn btn-success text-lg px-8 py-3 shadow-lg"
        >
          <span class="flex items-center">
            <svg class="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
            </svg>
            Create Your First Campaign
          </span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.campaigns-view {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}
</style>
