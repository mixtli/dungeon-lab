<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import type { Map } from '@dungeon-lab/shared';
import axios from '@/plugins/axios';
import MapImage from '@/components/MapImage.vue';

const router = useRouter();
const maps = ref<Map[]>([]);
const loading = ref(false);

async function fetchMaps() {
  try {
    loading.value = true;
    const response = await axios.get('/maps');
    maps.value = response.data;
  } catch (error) {
    ElMessage.error('Failed to fetch maps');
    console.error('Error fetching maps:', error);
  } finally {
    loading.value = false;
  }
}

async function deleteMap(mapId: string) {
  try {
    await ElMessageBox.confirm(
      'Are you sure you want to delete this map?',
      'Warning',
      {
        confirmButtonText: 'Delete',
        cancelButtonText: 'Cancel',
        type: 'warning',
      }
    );

    await axios.delete(`/maps/${mapId}`);
    ElMessage.success('Map deleted successfully');
    await fetchMaps();
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('Failed to delete map');
      console.error('Error deleting map:', error);
    }
  }
}

onMounted(() => {
  fetchMaps();
});
</script>

<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold">My Maps</h1>
      <el-button type="primary" @click="router.push({ name: 'map-create' })">
        Create New Map
      </el-button>
    </div>

    <el-card v-loading="loading" class="w-full">
      <div v-if="maps.length === 0 && !loading" class="text-center py-8">
        <p class="text-gray-500">No maps found. Create your first map!</p>
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <el-card
          v-for="map in maps"
          :key="map._id"
          class="map-card"
          shadow="hover"
        >
          <div class="aspect-w-16 aspect-h-9 mb-4">
            <MapImage
              :map-id="map._id.toString()"
              :image-url="map.thumbnailUrl"
              :alt="map.name"
              class="object-cover rounded"
            />
          </div>
          <h3 class="text-lg font-semibold mb-2">{{ map.name }}</h3>
          <p class="text-gray-600 text-sm mb-4">{{ map.description }}</p>
          <div class="flex justify-end space-x-2">
            <el-button
              type="primary"
              plain
              @click="router.push({ name: 'map-detail', params: { id: map._id.toString() } })"
            >
              View
            </el-button>
            <el-button
              type="danger"
              plain
              @click="deleteMap(map._id.toString())"
            >
              Delete
            </el-button>
          </div>
        </el-card>
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.map-card {
  transition: transform 0.2s;
}

.map-card:hover {
  transform: translateY(-4px);
}
</style> 