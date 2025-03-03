<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import type { UploadFile } from 'element-plus';
import axios from '@/plugins/axios';
import { ArrowLeft, Upload } from '@element-plus/icons-vue';

const router = useRouter();
const loading = ref(false);
const formData = ref({
  name: '',
  description: '',
  gridColumns: 20,
});
const imageFile = ref<File | null>(null);

const uploadProps = {
  accept: 'image/*',
  autoUpload: false,
  limit: 1,
  onChange: (file: UploadFile) => {
    imageFile.value = file.raw!;
  },
  onExceed: () => {
    ElMessage.warning('Only one image can be uploaded');
  },
} as const;

async function handleSubmit() {
  if (!imageFile.value) {
    ElMessage.warning('Please upload a map image');
    return;
  }

  try {
    loading.value = true;
    const form = new FormData();
    form.append('name', formData.value.name);
    form.append('description', formData.value.description || '');
    form.append('gridColumns', formData.value.gridColumns.toString());
    form.append('image', imageFile.value);

    await axios.post('/maps', form, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    ElMessage.success('Map created successfully');
    router.push({ name: 'maps' });
  } catch (error) {
    ElMessage.error('Failed to create map');
    console.error('Error creating map:', error);
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="p-6">
    <div class="flex items-center mb-6">
      <el-button @click="router.back()" class="mr-4">
        <el-icon><ArrowLeft /></el-icon>
        Back
      </el-button>
      <h1 class="text-2xl font-bold">Create New Map</h1>
    </div>

    <el-card v-loading="loading" class="max-w-2xl mx-auto">
      <el-form @submit.prevent="handleSubmit">
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

        <el-form-item label="Map Image" required>
          <el-upload
            v-bind="uploadProps"
            class="upload-container"
            drag
          >
            <el-icon class="el-icon--upload"><Upload /></el-icon>
            <div class="el-upload__text">
              Drop file here or <em>click to upload</em>
            </div>
            <template #tip>
              <div class="el-upload__tip text-gray-500">
                Upload a JPG/PNG image of your map
              </div>
            </template>
          </el-upload>
        </el-form-item>

        <div class="flex justify-end mt-6">
          <el-button
            type="primary"
            native-type="submit"
            :disabled="!formData.name || !imageFile"
          >
            Create Map
          </el-button>
        </div>
      </el-form>
    </el-card>
  </div>
</template>

<style scoped>
.upload-container {
  width: 100%;
}

:deep(.el-upload-dragger) {
  width: 100%;
}
</style> 