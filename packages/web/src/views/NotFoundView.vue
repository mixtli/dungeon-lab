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
  <div class="not-found-view">
    <div class="not-found-container">
      <div class="not-found-content">
        <h1 class="text-6xl font-bold mb-4">404</h1>
        <h2 class="text-2xl font-semibold mb-6">Page Not Found</h2>
        <p class="text-lg mb-8">
          The page you are looking for doesn't exist or has been moved.
        </p>
        <div class="flex gap-4 justify-center">
          <el-button @click="goBack">Go Back</el-button>
          <el-button type="primary" @click="goHome">Go Home</el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.not-found-view {
  min-height: calc(100vh - 64px - 64px); /* Subtract header and footer height */
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
  background-color: var(--el-fill-color-light);
}

.not-found-container {
  width: 100%;
  max-width: 600px;
}

.not-found-content {
  background-color: var(--el-bg-color);
  border-radius: 0.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  padding: 3rem 2rem;
  text-align: center;
}
</style> 