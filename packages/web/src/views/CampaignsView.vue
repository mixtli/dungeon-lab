<script setup lang="ts">
import { useRouter } from 'vue-router';
import CampaignList from '../components/campaign/CampaignList.vue';
import { ElButton } from 'element-plus';

const router = useRouter();

function createCampaign() {
  router.push({ name: 'campaign-create' });
}
</script>

<template>
  <div class="campaigns-view">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-semibold">My Campaigns</h1>
      <el-button type="primary" @click="createCampaign">
        Create Campaign
      </el-button>
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