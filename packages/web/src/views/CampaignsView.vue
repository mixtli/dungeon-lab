<script setup lang="ts">
import { useRouter } from 'vue-router';
import CampaignList from '../components/campaign/CampaignList.vue';

const router = useRouter();

function createCampaign() {
  router.push({ name: 'campaign-create' });
}
</script>

<template>
  <div class="max-w-7xl mx-auto px-5 py-6">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-semibold">My Campaigns</h1>
      <button 
        @click="createCampaign"
        class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        Create Campaign
      </button>
    </div>

    <CampaignList />
  </div>
</template>

<style scoped>
.campaigns-view {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}
</style> 