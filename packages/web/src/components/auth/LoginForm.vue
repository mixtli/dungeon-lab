<script setup lang="ts">
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth.mjs';
import { useNotificationStore } from '@/stores/notification.mjs';

const authStore = useAuthStore();
const notificationStore = useNotificationStore();
const router = useRouter();

const form = reactive({
  email: '',
  password: '',
});

const errors = reactive({
  email: '',
  password: '',
});

const isSubmitting = ref(false);
const rememberMe = ref(false);

function validateForm() {
  let isValid = true;
  errors.email = '';
  errors.password = '';

  // Email validation
  if (!form.email) {
    errors.email = 'Please enter your email';
    isValid = false;
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = 'Please enter a valid email address';
    isValid = false;
  }

  // Password validation
  if (!form.password) {
    errors.password = 'Please enter your password';
    isValid = false;
  } else if (form.password.length < 6) {
    errors.password = 'Password must be at least 6 characters';
    isValid = false;
  }

  return isValid;
}

async function handleSubmit(event: Event) {
  event.preventDefault();

  if (!validateForm()) return;

  isSubmitting.value = true;

  try {
    await authStore.login(form);

    if (authStore.isAuthenticated) {
      notificationStore.addNotification({
        message: 'Login successful!',
        type: 'success',
      });
      router.push({ name: 'home' });
    } else {
      notificationStore.addNotification({
        message: authStore.error || 'Login failed. Please try again.',
        type: 'error',
      });
    }
  } catch (error) {
    notificationStore.addNotification({
      message: 'An unexpected error occurred. Please try again.',
      type: 'error',
    });
    console.error('Login error:', error);
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <div class="max-w-md mx-auto p-8 bg-white dark:bg-gray-800 rounded-lg shadow-md">
    <h2 class="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">Login to Your Account</h2>

    <form @submit="handleSubmit" class="space-y-6">
      <div>
        <label for="email" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Email
        </label>
        <input
          id="email"
          v-model="form.email"
          type="email"
          autocomplete="email"
          required
          placeholder="Enter your email"
          class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          :class="{ 'border-red-500': errors.email }"
        />
        <p v-if="errors.email" class="mt-1 text-sm text-red-600 dark:text-red-400">
          {{ errors.email }}
        </p>
      </div>

      <div>
        <label
          for="password"
          class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          Password
        </label>
        <input
          id="password"
          v-model="form.password"
          type="password"
          autocomplete="current-password"
          required
          placeholder="Enter your password"
          class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          :class="{ 'border-red-500': errors.password }"
        />
        <p v-if="errors.password" class="mt-1 text-sm text-red-600 dark:text-red-400">
          {{ errors.password }}
        </p>
      </div>

      <div class="flex justify-between items-center">
        <label class="flex items-center">
          <input
            type="checkbox"
            v-model="rememberMe"
            class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <span class="ml-2 text-sm text-gray-600">Remember me</span>
        </label>
        <router-link to="/auth/forgot-password" class="text-sm text-blue-600 hover:text-blue-800">
          Forgot Password?
        </router-link>
      </div>

      <button
        type="submit"
        :disabled="isSubmitting"
        class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <svg
          v-if="isSubmitting"
          class="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            class="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            stroke-width="4"
          ></circle>
          <path
            class="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
        {{ isSubmitting ? 'Logging in...' : 'Login' }}
      </button>

      <div class="relative my-6">
        <div class="absolute inset-0 flex items-center">
          <div class="w-full border-t border-gray-300"></div>
        </div>
        <div class="relative flex justify-center text-sm">
          <span class="px-2 bg-white text-gray-500">Or continue with</span>
        </div>
      </div>

      <button
        type="button"
        @click="authStore.loginWithGoogle()"
        class="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        <svg class="w-5 h-5 mr-2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M12.24 10.285V14.4h6.806c-.275 1.765-2.056 5.174-6.806 5.174-4.095 0-7.439-3.389-7.439-7.574s3.345-7.574 7.439-7.574c2.33 0 3.891.989 4.785 1.849l3.254-3.138C18.189 1.186 15.479 0 12.24 0c-6.635 0-12 5.365-12 12s5.365 12 12 12c6.926 0 11.52-4.869 11.52-11.726 0-.788-.085-1.39-.189-1.989H12.24z"
            fill="#4285F4"
          />
        </svg>
        Sign in with Google
      </button>

      <div class="mt-4 text-center text-sm">
        <span class="text-gray-600">Don't have an account?</span>
        <router-link to="/auth/register" class="ml-1 text-blue-600 hover:text-blue-800 font-medium">
          Register
        </router-link>
      </div>
    </form>
  </div>
</template>

<style scoped>
.login-form {
  max-width: 400px;
  margin: 0 auto;
  padding: 2rem;
  border-radius: 0.5rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  background-color: rgb(255 255 255); /* bg-white */
}

.auth-form {
  background-color: rgb(255 255 255); /* bg-white */
}

/* In dark mode, use dark background instead */
@media (prefers-color-scheme: dark) {
  .login-form,
  .auth-form {
    background-color: rgb(31 41 55); /* bg-gray-800 */
  }
}
</style>
