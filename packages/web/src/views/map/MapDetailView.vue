<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import type { Map, UpdateMapDto } from '@dungeon-lab/shared';
import axios from '@/plugins/axios';
import { ArrowLeft } from '@element-plus/icons-vue';
import MapImage from '@/components/MapImage.vue';

const route = useRoute();
const router = useRouter();
const loading = ref(false);
const editing = ref(false);
const map = ref<Map | null>(null);
const formData = ref<UpdateMapDto>({
  name: '',
  description: '',
  gridColumns: 20,
});

async function fetchMap() {
  try {
    loading.value = true;
    const response = await axios.get(`/maps/${route.params.id}`);
    map.value = response.data;
    if (map.value) {
      formData.value = {
        name: map.value.name,
        description: map.value.description || '',
        gridColumns: map.value.gridColumns,
      };
    }
  } catch (error) {
    ElMessage.error('Failed to fetch map');
    console.error('Error fetching map:', error);
  } finally {
    loading.value = false;
  }
}

async function handleUpdate() {
  try {
    loading.value = true;
    await axios.patch(`/maps/${route.params.id}`, formData.value);
    ElMessage.success('Map updated successfully');
    editing.value = false;
    await fetchMap();
  } catch (error) {
    ElMessage.error('Failed to update map');
    console.error('Error updating map:', error);
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  fetchMap();
});
</script>

<template>
  <div class="p-6">
    <div class="flex items-center mb-6">
      <el-button @click="router.back()" class="mr-4">
        <el-icon><ArrowLeft /></el-icon>
        Back
      </el-button>
      <h1 class="text-2xl font-bold">Map Details</h1>
    </div>

    <el-card v-loading="loading" class="max-w-4xl mx-auto">
      <template v-if="map">
        <div class="mb-6">
          <MapImage
            :map-id="map._id.toString()"
            :image-url="map.imageUrl"
            :alt="map.name"
            class="w-full rounded shadow-lg"
          />
        </div>

        <div v-if="!editing" class="space-y-4">
          <div>
            <h2 class="text-xl font-semibold">{{ map.name }}</h2>
            <p class="text-gray-600 mt-2">{{ map.description || 'No description' }}</p>
          </div>

          <div class="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span class="font-medium">Grid Size:</span>
              {{ map.gridColumns }} x {{ map.gridRows }}
            </div>
            <div>
              <span class="font-medium">Aspect Ratio:</span>
              {{ map.aspectRatio.toFixed(2) }}
            </div>
          </div>

          <div class="flex justify-end">
            <el-button type="primary" @click="editing = true">
              Edit Map
            </el-button>
          </div>
        </div>

        <el-form v-else @submit.prevent="handleUpdate">
          <el-form-item label="Name" required>
            <el-input v-model="formData.name" placeholder="Enter map name" />
          </el-form-item>

          <el-form-item label="Description">
            <el-input
              v-model="formData.description"
              type="textarea"
              placeholder="Enter map description"
            />
          </el-form-item>

          <el-form-item label="Grid Columns" required>
            <el-input-number
              v-model="formData.gridColumns"
              :min="1"
              :max="100"
              class="w-full"
            />
            <div class="text-gray-500 text-sm mt-1">
              Number of columns in the grid. Rows will be calculated based on the image aspect ratio.
            </div>
          </el-form-item>

          <div class="flex justify-end space-x-2">
            <el-button @click="editing = false">
              Cancel
            </el-button>
            <el-button type="primary" native-type="submit">
              Save Changes
            </el-button>
          </div>
        </el-form>
      </template>
    </el-card>
  </div>
</template> 