<!-- Create a new component for handling map images with presigned URLs -->
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import axios from '@/plugins/axios';

const props = defineProps<{
  mapId: string;
  imageUrl: string;
  alt: string;
  className?: string;
}>();

const imageError = ref(false);
const loading = ref(true);
const currentUrl = ref(props.imageUrl);

async function refreshPresignedUrl() {
  try {
    const response = await axios.get(`/maps/${props.mapId}/image-url`);
    currentUrl.value = response.data.imageUrl;
    imageError.value = false;
  } catch (error) {
    console.error('Error refreshing image URL:', error);
    ElMessage.error('Failed to refresh image URL');
  }
}

async function handleImageError() {
  if (!imageError.value) {
    imageError.value = true;
    await refreshPresignedUrl();
  }
}

function handleImageLoad() {
  loading.value = false;
  imageError.value = false;
}

onMounted(() => {
  // Start with the provided URL
  currentUrl.value = props.imageUrl;
});
</script>

<template>
  <div class="map-image-container" :class="className">
    <el-image
      :src="currentUrl"
      :alt="alt"
      fit="cover"
      :loading="loading"
      @error="handleImageError"
      @load="handleImageLoad"
    >
      <template #placeholder>
        <div class="image-placeholder">
          <el-icon class="is-loading"><Loading /></el-icon>
          <span>Loading image...</span>
        </div>
      </template>
      <template #error>
        <div class="image-error">
          <el-icon><Warning /></el-icon>
          <span>Failed to load image</span>
        </div>
      </template>
    </el-image>
  </div>
</template>

<style scoped>
.map-image-container {
  position: relative;
  width: 100%;
  height: 100%;
}

.image-placeholder,
.image-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  background-color: var(--el-fill-color-light);
  color: var(--el-text-color-secondary);
  font-size: 14px;
}

.image-placeholder .el-icon,
.image-error .el-icon {
  font-size: 24px;
  margin-bottom: 8px;
}

.image-error {
  color: var(--el-color-danger);
}
</style> 