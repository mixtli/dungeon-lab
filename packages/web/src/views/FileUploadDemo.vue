<script setup lang="ts">
import { ref } from 'vue';
import FileUploader from '../components/FileUploader.vue';

const uploadedFiles = ref<Array<{ url: string; key: string }>>([]);

function handleUploadSuccess(files: Array<{ url: string; key: string }>) {
  uploadedFiles.value = [...uploadedFiles.value, ...files];
}

function handleUploadError(error: Error) {
  console.error('Upload error:', error);
}
</script>

<template>
  <div class="container mx-auto px-4 py-8">
    <h1 class="text-2xl font-bold mb-6">File Upload Demo</h1>

    <div class="bg-white shadow-md rounded-lg p-6 mb-8">
      <h2 class="text-xl font-semibold mb-4">Upload Files</h2>

      <FileUploader
        folder="demo"
        accept="image/*,.pdf"
        :multiple="true"
        :max-size="5"
        @upload-success="handleUploadSuccess"
        @upload-error="handleUploadError"
      />
    </div>

    <div v-if="uploadedFiles.length > 0" class="bg-white shadow-md rounded-lg p-6">
      <h2 class="text-xl font-semibold mb-4">Uploaded Files</h2>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="(file, index) in uploadedFiles"
          :key="index"
          class="border rounded-lg overflow-hidden"
        >
          <div
            v-if="
              file.url.endsWith('.jpg') ||
              file.url.endsWith('.jpeg') ||
              file.url.endsWith('.png') ||
              file.url.endsWith('.gif') ||
              file.url.endsWith('.webp')
            "
          >
            <img :src="file.url" alt="Uploaded file" class="w-full h-48 object-cover" />
          </div>
          <div
            v-else-if="file.url.endsWith('.pdf')"
            class="bg-gray-100 h-48 flex items-center justify-center"
          >
            <div class="text-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-12 w-12 mx-auto text-red-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                />
              </svg>
              <span class="block mt-2">PDF Document</span>
            </div>
          </div>
          <div v-else class="bg-gray-100 h-48 flex items-center justify-center">
            <div class="text-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-12 w-12 mx-auto text-gray-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <span class="block mt-2">File</span>
            </div>
          </div>

          <div class="p-3 border-t">
            <div class="truncate text-sm font-medium">{{ file.key.split('/').pop() }}</div>
            <div class="flex justify-between items-center mt-2">
              <a
                :href="file.url"
                target="_blank"
                rel="noopener noreferrer"
                class="text-blue-600 hover:text-blue-800 text-sm"
              >
                View File
              </a>
              <span class="text-xs text-gray-500">{{ new Date().toLocaleDateString() }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
