<script setup lang="ts">
import { useRoute } from 'vue-router';
import CampaignForm from '../components/campaign/CampaignForm.vue';

const route = useRoute();
const campaignId = route.params.id as string;
</script>

<template>
  <div class="campaign-edit-view">
    <CampaignForm :campaignId="campaignId" :isEdit="true" />
  </div>
</template>

<style scoped>
.campaign-edit-view {
  padding: 20px;
}
</style>
