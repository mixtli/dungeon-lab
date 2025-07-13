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
  <div :class="isMobile ? '' : 'max-w-7xl mx-auto px-5 py-6'">
    <!-- Mobile header -->
    <div v-if="isMobile" class="text-center py-4 border-b border-gray-200 bg-white">
      <h1 class="text-xl font-semibold">My Campaigns</h1>
    </div>
    
    <!-- Desktop header -->
    <div v-else class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-semibold">My Campaigns</h1>
      <button
        v-if="hasCampaigns"
        @click="createCampaign"
        class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        Create Campaign
      </button>
    </div>

    <!-- Campaign List -->
    <div :class="isMobile ? '' : ''">
      <CampaignList @update:campaigns="updateHasCampaigns($event)" />
    </div>

    <div v-if="!hasCampaigns" class="mt-4 text-center">
      <button
        @click="createCampaign"
        class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        Create Your First Campaign
      </button>
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
