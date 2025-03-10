<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../../stores/auth.mjs';
import { ArrowPathIcon } from '@heroicons/vue/24/outline';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const isLoading = ref(true);
const errorMessage = ref('');

onMounted(async () => {
  try {
    // Check success flag from URL
    const success = route.query.success === 'true';
    
    if (!success) {
      router.push('/auth/login');
      return;
    }
    
    // Fetch user data
    const fetchSuccess = await authStore.fetchUser();
    
    if (fetchSuccess) {
      router.push('/');
    } else {
      router.push('/auth/login');
    }
  } catch (error) {
    router.push('/auth/login');
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
          {{ isLoading ? 'Completing Authentication' : 'Authentication Complete' }}
        </h2>
        
        <!-- Status message -->
        <p v-if="isLoading" class="text-gray-600">
          Please wait while we complete your login...
        </p>
        <p v-else class="text-green-600">
          Redirecting you now...
        </p>
      </div>
    </div>
  </div>
</template> 