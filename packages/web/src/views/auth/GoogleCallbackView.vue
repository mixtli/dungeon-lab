<script setup lang="ts">
import { onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { ElMessage } from 'element-plus';
import { Loading } from '@element-plus/icons-vue';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

onMounted(() => {
  const token = route.query.token as string;
  
  if (token) {
    const success = authStore.handleGoogleCallback(token);
    
    if (success) {
      ElMessage.success('Login successful!');
      router.push({ name: 'home' });
    } else {
      ElMessage.error(authStore.error || 'Authentication failed');
      router.push({ name: 'login' });
    }
  } else {
    ElMessage.error('Authentication failed');
    router.push({ name: 'login' });
  }
});
</script>

<template>
  <div class="google-callback-view">
    <div class="flex justify-center items-center min-h-[400px]">
      <div class="text-center">
        <el-icon class="animate-spin text-primary-600 mb-4" :size="48"><Loading /></el-icon>
        <h2 class="text-xl font-semibold mb-2">Completing Authentication</h2>
        <p class="text-gray-600 dark:text-gray-400">Please wait while we complete your login...</p>
      </div>
    </div>
  </div>
</template> 