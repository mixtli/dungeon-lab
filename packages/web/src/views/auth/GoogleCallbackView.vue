<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../../stores/auth.mjs';
import { ElMessage } from 'element-plus';
// Replace Element Plus loading icon with a simple SVG spinner

const router = useRouter();
const authStore = useAuthStore();
const isLoading = ref(true);
const errorMessage = ref('');

// Debug information for development
const debugInfo = ref({
  authAttempted: false,
  authResult: false,
  authError: '',
  userReceived: false
});

// Create a ref for the development mode state
const isDev = ref(process.env.NODE_ENV === 'development');

onMounted(async () => {
  debugInfo.value.authAttempted = true;
  
  try {
    // Instead of handling a token, we just fetch the user info
    // The session cookie should already be set by the server
    const success = await authStore.fetchUser();
    debugInfo.value.authResult = success;
    debugInfo.value.userReceived = !!authStore.user;
    
    if (success) {
      ElMessage.success('Login successful!');
      router.push({ name: 'home' });
    } else {
      errorMessage.value = authStore.error || 'Authentication failed';
      debugInfo.value.authError = errorMessage.value;
      ElMessage.error(errorMessage.value);
      router.push({ name: 'login' });
    }
  } catch (error: any) {
    errorMessage.value = error.message || 'Authentication failed';
    debugInfo.value.authError = errorMessage.value;
    ElMessage.error(errorMessage.value);
    router.push({ name: 'login' });
  } finally {
    isLoading.value = false;
  }
});
</script>

<template>
  <div class="google-callback-view">
    <div class="flex justify-center items-center min-h-[400px]">
      <div class="text-center">
        <el-icon v-if="isLoading" class="animate-spin text-primary-600 mb-4" :size="48"><Loading /></el-icon>
        <h2 class="text-xl font-semibold mb-2">{{ isLoading ? 'Completing Authentication' : (errorMessage ? 'Authentication Failed' : 'Authentication Complete') }}</h2>
        <p v-if="isLoading" class="text-gray-600 dark:text-gray-400">Please wait while we complete your login...</p>
        <p v-else-if="errorMessage" class="text-red-600 dark:text-red-400">{{ errorMessage }}</p>
        <p v-else class="text-green-600 dark:text-green-400">Redirecting you now...</p>
        
        <!-- Debug info - only in development -->
        <div v-if="isDev" class="mt-6 p-4 bg-gray-100 dark:bg-gray-700 rounded text-left">
          <h3 class="font-semibold mb-2">Debug Information:</h3>
          <div><strong>Auth Attempted:</strong> {{ debugInfo.authAttempted }}</div>
          <div><strong>Auth Result:</strong> {{ debugInfo.authResult }}</div>
          <div><strong>Auth Error:</strong> {{ debugInfo.authError }}</div>
          <div><strong>User Received:</strong> {{ debugInfo.userReceived }}</div>
          <div v-if="authStore.user"><strong>User:</strong> {{ authStore.user.displayName || authStore.user.username }}</div>
        </div>
      </div>
    </div>
  </div>
</template> 