<script setup lang="ts">
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth.store.mjs';

const authStore = useAuthStore();
const router = useRouter();

const form = reactive({
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
  displayName: '',
});

const errors = reactive({
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
});

const isSubmitting = ref(false);

function validateForm() {
  let isValid = true;

  // Reset all errors
  Object.keys(errors).forEach(key => {
    errors[key as keyof typeof errors] = '';
  });

  // Username validation
  if (!form.username) {
    errors.username = 'Please enter a username';
    isValid = false;
  } else if (form.username.length < 3) {
    errors.username = 'Username must be at least 3 characters';
    isValid = false;
  }

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

  // Confirm password validation
  if (!form.confirmPassword) {
    errors.confirmPassword = 'Please confirm your password';
    isValid = false;
  } else if (form.confirmPassword !== form.password) {
    errors.confirmPassword = 'Passwords do not match';
    isValid = false;
  }

  return isValid;
}

async function handleSubmit(event: Event) {
  event.preventDefault();

  if (!validateForm()) return;

  isSubmitting.value = true;

  try {
    // Remove confirmPassword before sending to API
    const { confirmPassword, ...registerData } = form;

    const success = await authStore.register(registerData);

    if (success) {
      showNotification('Registration successful!');
      router.push({ name: 'home' });
    } else {
      showNotification(authStore.error || 'Registration failed. Please try again.');
    }
  } catch (error) {
    showNotification('An unexpected error occurred. Please try again.');
    console.error('Registration error:', error);
  } finally {
    isSubmitting.value = false;
  }
}

// Simple notification function (we can replace this with a proper notification system later)
function showNotification(message: string) {
  alert(message);
}
</script>

<template>
  <div class="max-w-md mx-auto p-8 bg-white rounded-lg shadow-md">
    <h2 class="text-2xl font-bold mb-6 text-gray-900">Create an Account</h2>

    <form @submit="handleSubmit" class="space-y-6">
      <div>
        <label for="username" class="block text-sm font-medium text-gray-700 mb-1">
          Username
        </label>
        <input
          id="username"
          v-model="form.username"
          type="text"
          autocomplete="username"
          required
          placeholder="Choose a username"
          class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          :class="{ 'border-red-500': errors.username }"
        />
        <p v-if="errors.username" class="mt-1 text-sm text-red-600">{{ errors.username }}</p>
      </div>

      <div>
        <label for="email" class="block text-sm font-medium text-gray-700 mb-1"> Email </label>
        <input
          id="email"
          v-model="form.email"
          type="email"
          autocomplete="email"
          required
          placeholder="Enter your email"
          class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          :class="{ 'border-red-500': errors.email }"
        />
        <p v-if="errors.email" class="mt-1 text-sm text-red-600">{{ errors.email }}</p>
      </div>

      <div>
        <label for="displayName" class="block text-sm font-medium text-gray-700 mb-1">
          Display Name (optional)
        </label>
        <input
          id="displayName"
          v-model="form.displayName"
          type="text"
          autocomplete="name"
          placeholder="Enter your display name"
          class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div>
        <label for="password" class="block text-sm font-medium text-gray-700 mb-1">
          Password
        </label>
        <input
          id="password"
          v-model="form.password"
          type="password"
          autocomplete="new-password"
          required
          placeholder="Create a password"
          class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          :class="{ 'border-red-500': errors.password }"
        />
        <p v-if="errors.password" class="mt-1 text-sm text-red-600">{{ errors.password }}</p>
      </div>

      <div>
        <label for="confirmPassword" class="block text-sm font-medium text-gray-700 mb-1">
          Confirm Password
        </label>
        <input
          id="confirmPassword"
          v-model="form.confirmPassword"
          type="password"
          autocomplete="new-password"
          required
          placeholder="Confirm your password"
          class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          :class="{ 'border-red-500': errors.confirmPassword }"
        />
        <p v-if="errors.confirmPassword" class="mt-1 text-sm text-red-600">
          {{ errors.confirmPassword }}
        </p>
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
        {{ isSubmitting ? 'Creating account...' : 'Register' }}
      </button>

      <div class="mt-4 text-center text-sm">
        <span class="text-gray-600">Already have an account?</span>
        <router-link to="/auth/login" class="ml-1 text-blue-600 hover:text-blue-800 font-medium">
          Login
        </router-link>
      </div>
    </form>
  </div>
</template>

<style scoped>
.register-form {
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
</style>
