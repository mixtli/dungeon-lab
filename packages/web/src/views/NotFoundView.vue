<script setup lang="ts">
import { useRouter } from 'vue-router';

const router = useRouter();

function goBack() {
  router.back();
}

function goHome() {
  router.push({ name: 'home' });
}
</script>

<template>
  <div
    class="min-h-[calc(100vh-128px)] flex items-center justify-center px-4 sm:px-6 lg:px-8 py-8 bg-gray-50"
  >
    <div class="w-full max-w-lg">
      <div class="bg-white rounded-lg shadow-lg p-8 sm:p-12 text-center">
        <h1 class="text-6xl font-bold text-gray-900 mb-4">404</h1>
        <h2 class="text-2xl font-semibold text-gray-800 mb-6">Page Not Found</h2>
        <p class="text-lg text-gray-600 mb-8">
          The page you are looking for doesn't exist or has been moved.
        </p>
        <div class="flex gap-4 justify-center">
          <button
            @click="goBack"
            class="px-4 py-2 bg-white border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Go Back
          </button>
          <button
            @click="goHome"
            class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Go Home
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.not-found {
  background-color: rgb(243 244 246); /* bg-gray-100 */
}

.not-found-container {
  width: 100%;
  max-width: 600px;
}

.not-found-content {
  background-color: rgb(255 255 255); /* bg-white */
  border-radius: 0.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  padding: 3rem 2rem;
  text-align: center;
}
</style>
