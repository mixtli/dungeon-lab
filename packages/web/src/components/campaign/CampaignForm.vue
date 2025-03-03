<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useCampaignStore } from '../../stores/campaign';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { pluginRegistry } from '../../services/plugin-registry.service';
import { CreateCampaignDto, UpdateCampaignDto } from '@dungeon-lab/shared';

const props = defineProps<{
  campaignId?: string;
  isEdit?: boolean;
}>();

// Stores and router
const campaignStore = useCampaignStore();
const router = useRouter();

// State
const loading = ref(false);

// Computed
const isEditMode = computed(() => props.isEdit || false);
const formTitle = computed(() => isEditMode.value ? 'Edit Campaign' : 'Create New Campaign');
const submitButtonText = computed(() => isEditMode.value ? 'Save Changes' : 'Create Campaign');

const formData = ref<UpdateCampaignDto>({
  name: '',
  description: '',
  status: 'planning' as const
});

const gameSystemId = ref('');

const isCreateForm = computed(() => !isEditMode.value);

// Get game systems
const gameSystems = computed(() => {
  return pluginRegistry.getAllPlugins()
    .filter(plugin => plugin.type === 'gameSystem' && plugin.enabled)
    .map(plugin => ({
      id: plugin.id,
      name: plugin.name,
      description: plugin.description || '',
    }));
});

// Load campaign data if in edit mode
onMounted(async () => {
  if (isEditMode.value && props.campaignId) {
    loading.value = true;
    try {
      const campaign = await campaignStore.fetchCampaign(props.campaignId);
      if (campaign) {
        formData.value = {
          name: campaign.name,
          description: campaign.description || '',
          status: campaign.status,
          settings: campaign.settings
        };
        gameSystemId.value = campaign.gameSystemId;
      } else {
        ElMessage.error('Campaign not found');
        router.push({ name: 'campaigns' });
      }
    } catch (error) {
      ElMessage.error('Failed to load campaign data');
      console.error('Error loading campaign:', error);
    } finally {
      loading.value = false;
    }
  }
});

// Submit form
async function submitForm() {
  loading.value = true;

  try {
    if (isEditMode.value && props.campaignId) {
      // Update existing campaign
      await campaignStore.updateCampaign(props.campaignId, formData.value);
      ElMessage.success('Campaign updated successfully');
      router.push({ name: 'campaign-detail', params: { id: props.campaignId } });
    } else {
      // Create new campaign
      const createData: CreateCampaignDto = {
        name: formData.value.name || '',
        description: formData.value.description,
        status: formData.value.status,
        settings: formData.value.settings,
        gameSystemId: gameSystemId.value
      };
      
      if (!createData.gameSystemId) {
        ElMessage.error('Please select a game system');
        loading.value = false;
        return;
      }
      
      const newCampaign = await campaignStore.createCampaign(createData);
      ElMessage.success('Campaign created successfully');
      router.push({ name: 'campaign-detail', params: { id: newCampaign.id } });
    }
  } catch (error) {
    ElMessage.error(campaignStore.error || 'An error occurred');
    console.error('Form submission error:', error);
  } finally {
    loading.value = false;
  }
}

// Cancel form
function cancelForm() {
  if (isEditMode.value && props.campaignId) {
    router.push({ name: 'campaign-detail', params: { id: props.campaignId } });
  } else {
    router.push({ name: 'campaigns' });
  }
}
</script>

<template>
  <div class="campaign-form">
    <h1 class="text-2xl font-semibold mb-6">{{ formTitle }}</h1>

    <el-form 
      :model="formData" 
      label-position="top"
      v-loading="loading"
    >
      <el-form-item label="Name" required>
        <el-input v-model="formData.name" placeholder="Enter campaign name" />
      </el-form-item>

      <el-form-item label="Description">
        <el-input 
          v-model="formData.description" 
          type="textarea"
          :rows="3"
          placeholder="Enter campaign description"
        />
      </el-form-item>

      <el-form-item label="Game System" required v-if="isCreateForm">
        <el-select 
          v-model="gameSystemId" 
          placeholder="Select game system"
          style="width: 100%"
        >
          <el-option
            v-for="system in gameSystems"
            :key="system.id"
            :label="system.name"
            :value="system.id"
          >
            <div class="flex flex-col">
              <span>{{ system.name }}</span>
              <small class="text-gray-500" v-if="system.description">{{ system.description }}</small>
            </div>
          </el-option>
        </el-select>
        <div class="text-sm text-gray-500 mt-1" v-if="!gameSystems.length">
          No game system plugins are available. Please install a game system plugin.
        </div>
      </el-form-item>

      <el-form-item label="Status">
        <el-select 
          v-model="formData.status" 
          placeholder="Select status"
          style="width: 100%"
        >
          <el-option label="Planning" value="planning" />
          <el-option label="Active" value="active" />
          <el-option label="Completed" value="completed" />
          <el-option label="Archived" value="archived" />
        </el-select>
      </el-form-item>

      <el-form-item>
        <div class="flex justify-end space-x-3">
          <el-button @click="cancelForm">Cancel</el-button>
          <el-button 
            type="primary" 
            @click="submitForm"
            :disabled="!formData.name || (!gameSystemId && isCreateForm) || loading"
          >
            {{ submitButtonText }}
          </el-button>
        </div>
      </el-form-item>
    </el-form>
  </div>
</template>

<style scoped>
.campaign-form {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}
</style> 