<template>
  <div class="asset-uploader" :class="{'standalone-mode': isStandaloneMode}">
    <div v-if="!file && !assetId" class="upload-area" @click="triggerFileInput" @drop.prevent="onDrop" @dragover.prevent>
      <input type="file" ref="fileInput" @change="onFileSelected" :accept="acceptedTypes" class="hidden-input" />
      <div class="upload-prompt">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mx-auto mb-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        <p class="text-gray-600">Drag and drop a file here, or click to select</p>
      </div>
    </div>
    
    <div v-else-if="file && !uploading" class="file-preview">
      <div v-if="isImage" class="image-preview">
        <img :src="previewUrl" alt="Preview" class="h-32 w-32 object-cover rounded-md" />
      </div>
      <div v-else class="file-info">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <span class="ml-2">{{ file.name }}</span>
      </div>
      
      <!-- Asset Name Input -->
      <div class="mt-3">
        <label for="asset-name" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Asset Name</label>
        <input 
          type="text" 
          id="asset-name" 
          v-model="assetName" 
          class="w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter asset name"
        />
        <p class="text-xs text-gray-500 mt-1">Leave blank to use filename</p>
      </div>
      
      <div class="file-actions mt-3 flex space-x-2">
        <button @click="uploadFile" class="upload-btn px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2" :disabled="uploading">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          Upload
        </button>
        <button @click="clearFile" class="clear-btn px-3 py-1 bg-gray-200 text-gray-800 text-sm rounded hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
          Cancel
        </button>
      </div>
    </div>
    
    <div v-else-if="uploading" class="upload-progress mt-4">
      <div class="w-full bg-gray-200 rounded-full h-2.5">
        <div class="bg-blue-600 h-2.5 rounded-full" :style="{ width: `${progress}%` }"></div>
      </div>
      <div class="text-sm text-center mt-1">{{ progress }}% Uploaded</div>
    </div>
    
    <div v-else-if="assetId" class="asset-preview">
      <div v-if="asset && isAssetImage" class="image-preview">
        <img :src="asset.url" alt="Asset" class="h-32 w-32 object-cover rounded-md" />
      </div>
      <div v-else-if="asset" class="file-info flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <span class="ml-2">{{ getFilenameFromPath(asset.path) }}</span>
      </div>
      
      <div class="asset-actions mt-3 flex space-x-2">
        <button @click="replaceAsset" class="replace-btn px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Replace
        </button>
        <button @click="removeAsset" class="remove-btn px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Remove
        </button>
      </div>
    </div>
    
    <div v-if="isStandaloneMode" class="mode-indicator mt-2 text-right">
      <span class="badge bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs">Standalone Asset</span>
    </div>
    
    <div v-if="error" class="text-red-600 text-sm mt-2">
      {{ error }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount } from 'vue';
import axios from '../../api/axios.mjs';
import { IAsset } from '@dungeon-lab/shared/src/schemas/asset.schema.mjs';

const props = defineProps({
  parentId: {
    type: String,
    default: null
  },
  parentType: {
    type: String,
    default: null
  },
  fieldName: {
    type: String,
    default: null
  },
  assetId: {
    type: String,
    default: null
  },
  acceptedTypes: {
    type: String,
    default: '*/*'
  },
  maxSize: {
    type: Number,
    default: 10 * 1024 * 1024 // 10MB
  },
  metadata: {
    type: Object,
    default: () => ({})
  }
});

const emit = defineEmits<{
  (e: 'asset-uploaded', value: { asset: IAsset; standalone: boolean }): void;
  (e: 'asset-removed', value: { assetId: string; standalone: boolean }): void;
}>();

const fileInput = ref<HTMLInputElement | null>(null);
const file = ref<File | null>(null);
const previewUrl = ref<string | null>(null);
const uploading = ref(false);
const progress = ref(0);
const error = ref<string | null>(null);
const asset = ref<IAsset | null>(null);
const assetName = ref('');

const isStandaloneMode = computed(() => {
  return !props.parentId || !props.parentType;
});

const isImage = computed(() => {
  return file.value && file.value.type.startsWith('image/');
});

const isAssetImage = computed(() => {
  return asset.value && asset.value.type && asset.value.type.startsWith('image/');
});

watch(() => props.assetId, (newValue) => {
  if (newValue) {
    fetchAsset();
  } else {
    asset.value = null;
  }
}, { immediate: true });

function triggerFileInput() {
  fileInput.value?.click();
}

function onFileSelected(event: Event) {
  const input = event.target as HTMLInputElement;
  if (input.files && input.files.length > 0) {
    validateAndSetFile(input.files[0]);
  }
}

function onDrop(event: DragEvent) {
  if (event.dataTransfer && event.dataTransfer.files.length > 0) {
    validateAndSetFile(event.dataTransfer.files[0]);
  }
}

function validateAndSetFile(selectedFile: File) {
  // Check file size
  if (selectedFile.size > props.maxSize) {
    error.value = `File size exceeds the maximum allowed size (${props.maxSize / 1024 / 1024}MB)`;
    return;
  }
  
  // Check file type if acceptedTypes is specified
  if (props.acceptedTypes !== '*/*') {
    const acceptedTypesList = props.acceptedTypes.split(',');
    const fileType = selectedFile.type;
    
    const isAccepted = acceptedTypesList.some(type => {
      if (type.endsWith('/*')) {
        const prefix = type.slice(0, -2);
        return fileType.startsWith(prefix);
      }
      return type === fileType;
    });
    
    if (!isAccepted) {
      error.value = 'File type not accepted';
      return;
    }
  }
  
  file.value = selectedFile;
  error.value = null;
  
  // Set default asset name from filename
  assetName.value = selectedFile.name;
  
  // Create preview URL for images
  if (isImage.value) {
    if (previewUrl.value) {
      URL.revokeObjectURL(previewUrl.value);
    }
    previewUrl.value = URL.createObjectURL(selectedFile);
  }
}

function clearFile() {
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value);
  }
  file.value = null;
  previewUrl.value = null;
  error.value = null;
  assetName.value = '';
  
  if (fileInput.value) {
    fileInput.value.value = '';
  }
}

async function uploadFile() {
  if (!file.value) return;
  
  uploading.value = true;
  progress.value = 0;
  error.value = null;
  
  const formData = new FormData();
  formData.append('file', file.value);
  
  // Only include parent information if provided
  if (props.parentId) formData.append('parentId', props.parentId);
  if (props.parentType) formData.append('parentType', props.parentType);
  if (props.fieldName) formData.append('fieldName', props.fieldName);
  
  // Add custom name if provided
  if (assetName.value.trim()) {
    formData.append('name', assetName.value.trim());
  }
  
  // Add metadata if available
  if (Object.keys(props.metadata).length > 0) {
    formData.append('metadata', JSON.stringify(props.metadata));
  }
  
  try {
    const response = await axios.post('/api/assets', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total) {
          progress.value = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        }
      }
    });
    
    asset.value = response.data;
    emit('asset-uploaded', {
      asset: asset.value as IAsset,
      standalone: isStandaloneMode.value
    });
    clearFile();
  } catch (err) {
    console.error('Upload error:', err);
    error.value = err instanceof Error ? err.message : 'Upload failed';
  } finally {
    uploading.value = false;
  }
}

async function fetchAsset() {
  if (!props.assetId) return;
  
  try {
    const response = await axios.get(`/api/assets/${props.assetId}`);
    asset.value = response.data;
  } catch (err) {
    console.error('Fetch asset error:', err);
    error.value = 'Failed to load asset';
  }
}

function replaceAsset() {
  triggerFileInput();
}

async function removeAsset() {
  if (!props.assetId) return;
  
  try {
    await axios.delete(`/api/assets/${props.assetId}`);
    emit('asset-removed', {
      assetId: props.assetId,
      standalone: isStandaloneMode.value
    });
    asset.value = null;
  } catch (err) {
    console.error('Remove asset error:', err);
    error.value = 'Failed to remove asset';
  }
}

function getFilenameFromPath(path?: string): string {
  if (!path) return '';
  return path.split('/').pop() || '';
}

onBeforeUnmount(() => {
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value);
  }
});
</script>

<style scoped>
.asset-uploader {
  width: 100%;
  max-width: 400px;
}

.upload-area {
  border: 2px dashed #e2e8f0;
  border-radius: 0.5rem;
  padding: 1.5rem;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.3s;
}

.upload-area:hover {
  border-color: #94a3b8;
}

.hidden-input {
  display: none;
}

.file-preview, .asset-preview {
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
  padding: 1rem;
  margin-top: 0.5rem;
}

.file-info {
  display: flex;
  align-items: center;
}

.standalone-mode {
  border: 1px solid #e0e0e0;
  padding: 10px;
  border-radius: 4px;
}
</style> 