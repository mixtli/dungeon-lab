<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../../stores/auth.mjs';
import { ArrowPathIcon } from '@heroicons/vue/24/outline';

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

// Simple notification function (we can replace this with a proper notification system later)
function showNotification(message: string) {
  alert(message);
}

onMounted(async () => {
  debugInfo.value.authAttempted = true;
  
  try {
    // Instead of handling a token, we just fetch the user info
    // The session cookie should already be set by the server
    const success = await authStore.fetchUser();
    debugInfo.value.authResult = success;
    debugInfo.value.userReceived = !!authStore.user;
    
    if (success) {
      showNotification('Login successful!');
      router.push({ name: 'home' });
    } else {
      errorMessage.value = authStore.error || 'Authentication failed';
      debugInfo.value.authError = errorMessage.value;
      showNotification(errorMessage.value);
      router.push({ name: 'login' });
    }
  } catch (error: any) {
    errorMessage.value = error.message || 'Authentication failed';
    debugInfo.value.authError = errorMessage.value;
    showNotification(errorMessage.value);
    router.push({ name: 'login' });
  } finally {
    isLoading.value = false;
  }
});
</script>

<template>
  <div class="min-h-screen flex items-center justify-center p-6">
    <div class="w-full max-w-lg">
      <div class="text-center">
        <!-- Loading spinner -->
        <ArrowPathIcon 
          v-if="isLoading" 
          class="w-12 h-12 mx-auto mb-4 text-blue-600 animate-spin" 
        />
        
        <!-- Status heading -->
        <h2 class="text-xl font-semibold mb-2">
          {{ isLoading ? 'Completing Authentication' : (errorMessage ? 'Authentication Failed' : 'Authentication Complete') }}
        </h2>
        
        <!-- Status message -->
        <p v-if="isLoading" class="text-gray-600">
          Please wait while we complete your login...
        </p>
        <p v-else-if="errorMessage" class="text-red-600">
          {{ errorMessage }}
        </p>
        <p v-else class="text-green-600">
          Redirecting you now...
        </p>
        
        <!-- Debug info - only in development -->
        <div 
          v-if="isDev" 
          class="mt-6 p-4 bg-gray-100 rounded text-left space-y-1"
        >
          <h3 class="font-semibold mb-2">Debug Information:</h3>
          <div><strong>Auth Attempted:</strong> {{ debugInfo.authAttempted }}</div>
          <div><strong>Auth Result:</strong> {{ debugInfo.authResult }}</div>
          <div><strong>Auth Error:</strong> {{ debugInfo.authError }}</div>
          <div><strong>User Received:</strong> {{ debugInfo.userReceived }}</div>
          <div v-if="authStore.user">
            <strong>User:</strong> {{ authStore.user.displayName || authStore.user.username }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template> 