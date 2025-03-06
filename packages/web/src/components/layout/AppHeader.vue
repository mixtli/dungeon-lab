<script setup lang="ts">
import { ref } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { useTheme } from '../../composables/useTheme.mjs';
import { useAuthStore } from '../../stores/auth.mjs';
import { SunIcon, MoonIcon, Bars3Icon, XMarkIcon } from '@heroicons/vue/24/solid';

const router = useRouter();
const authStore = useAuthStore();
const { isDarkMode, toggleTheme } = useTheme();
const isMenuOpen = ref(false);

function toggleMenu() {
  isMenuOpen.value = !isMenuOpen.value;
}

function logout() {
  authStore.logout();
  router.push({ name: 'login' });
}
</script>

<template>
  <header class="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-gray-800 shadow-sm">
    <div class="container mx-auto px-4">
      <div class="flex justify-between items-center h-16">
        <!-- Logo -->
        <RouterLink to="/" class="flex items-center">
          <img src="@/assets/images/logo.svg" alt="Dungeon Lab Logo" class="h-8 w-8 object-contain" />
          <span class="ml-2 text-xl font-bold text-primary-600 dark:text-primary-400">Dungeon Lab</span>
        </RouterLink>

        <!-- Desktop Navigation -->
        <nav class="hidden md:flex items-center space-x-4">
          <RouterLink to="/" class="px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-700">
            Home
          </RouterLink>
          <RouterLink v-if="authStore.isAuthenticated" to="/campaigns" class="px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-700">
            Campaigns
          </RouterLink>
          <RouterLink v-if="authStore.isAuthenticated" to="/maps" class="px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-700">
            Maps
          </RouterLink>
          <RouterLink v-if="authStore.isAuthenticated" to="/games" class="px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-700">
            Games
          </RouterLink>
          <RouterLink v-if="authStore.isAuthenticated" to="/characters" class="px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-700">
            Characters
          </RouterLink>
          <RouterLink v-if="authStore.isAuthenticated" to="/file-upload-demo" class="px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-700">
            File Upload
          </RouterLink>
          
          <!-- Admin Tools Dropdown (for admin users only) -->
          <div v-if="authStore.isAuthenticated && authStore.user?.isAdmin" class="relative group">
            <button class="flex items-center cursor-pointer px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-700">
              <span>Admin Tools</span>
            </button>
            <div class="absolute right-0 w-48 mt-2 py-1 bg-white dark:bg-gray-700 rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
              <RouterLink to="/admin/plugins" class="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600">
                Plugin Manager
              </RouterLink>
            </div>
          </div>
          
          <!-- Theme Toggle -->
          <button @click="toggleTheme" class="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700">
            <MoonIcon v-if="isDarkMode" class="text-yellow-400 w-5 h-5" />
            <SunIcon v-else class="text-yellow-500 w-5 h-5" />
          </button>
          
          <!-- User Menu -->
          <div v-if="authStore.isAuthenticated" class="relative group">
            <button class="flex items-center space-x-2 focus:outline-none">
              <img :src="authStore.user?.avatar || 'https://ui-avatars.com/api/?name=' + authStore.user?.username" 
                   alt="User Avatar" 
                   class="h-8 w-8 rounded-full object-cover" />
              <span class="text-sm font-medium">{{ authStore.user?.username }}</span>
            </button>
            <div class="absolute right-0 w-48 mt-2 py-1 bg-white dark:bg-gray-700 rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
              <RouterLink to="/profile" class="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600">
                Profile
              </RouterLink>
              <RouterLink to="/settings" class="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600">
                Settings
              </RouterLink>
              <button @click="logout" class="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-gray-600">
                Logout
              </button>
            </div>
          </div>
          
          <!-- Login/Register -->
          <template v-else>
            <RouterLink to="/login" class="px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-700">
              Login
            </RouterLink>
            <RouterLink to="/register" class="px-3 py-2 rounded-md text-sm font-medium bg-primary-600 text-white hover:bg-primary-700">
              Register
            </RouterLink>
          </template>
        </nav>
        
        <!-- Mobile menu button -->
        <button @click="toggleMenu" class="md:hidden p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700">
          <XMarkIcon v-if="isMenuOpen" class="w-5 h-5" />
          <Bars3Icon v-else class="w-5 h-5" />
        </button>
      </div>
      
      <!-- Mobile Navigation -->
      <div v-if="isMenuOpen" class="md:hidden py-3 space-y-1">
        <RouterLink to="/" class="block px-3 py-2 rounded-md text-base font-medium hover:bg-gray-100 dark:hover:bg-gray-700">
          Home
        </RouterLink>
        <RouterLink v-if="authStore.isAuthenticated" to="/campaigns" class="block px-3 py-2 rounded-md text-base font-medium hover:bg-gray-100 dark:hover:bg-gray-700">
          Campaigns
        </RouterLink>
        <RouterLink v-if="authStore.isAuthenticated" to="/maps" class="block px-3 py-2 rounded-md text-base font-medium hover:bg-gray-100 dark:hover:bg-gray-700">
          Maps
        </RouterLink>
        <RouterLink v-if="authStore.isAuthenticated" to="/games" class="block px-3 py-2 rounded-md text-base font-medium hover:bg-gray-100 dark:hover:bg-gray-700">
          Games
        </RouterLink>
        <RouterLink v-if="authStore.isAuthenticated" to="/characters" class="block px-3 py-2 rounded-md text-base font-medium hover:bg-gray-100 dark:hover:bg-gray-700">
          Characters
        </RouterLink>
        <RouterLink v-if="authStore.isAuthenticated" to="/file-upload-demo" class="block px-3 py-2 rounded-md text-base font-medium hover:bg-gray-100 dark:hover:bg-gray-700">
          File Upload
        </RouterLink>
        
        <!-- Admin Tools Section (for admin users only) -->
        <template v-if="authStore.isAuthenticated && authStore.user?.isAdmin">
          <div class="px-3 py-2 font-medium text-gray-500 dark:text-gray-400">Admin Tools</div>
          <RouterLink to="/admin/plugins" class="block pl-6 px-3 py-2 rounded-md text-base font-medium hover:bg-gray-100 dark:hover:bg-gray-700">
            Plugin Manager
          </RouterLink>
        </template>
        
        <!-- Theme Toggle -->
        <button @click="toggleTheme" class="flex w-full items-center px-3 py-2 rounded-md text-base font-medium hover:bg-gray-100 dark:hover:bg-gray-700">
          <MoonIcon v-if="isDarkMode" class="text-yellow-400 w-5 h-5 mr-2" />
          <SunIcon v-else class="text-yellow-500 w-5 h-5 mr-2" />
          {{ isDarkMode ? 'Light Mode' : 'Dark Mode' }}
        </button>
        
        <!-- Login/Register -->
        <template v-if="!authStore.isAuthenticated">
          <RouterLink to="/login" class="block px-3 py-2 rounded-md text-base font-medium hover:bg-gray-100 dark:hover:bg-gray-700">
            Login
          </RouterLink>
          <RouterLink to="/register" class="block px-3 py-2 rounded-md text-base font-medium bg-primary-600 text-white hover:bg-primary-700">
            Register
          </RouterLink>
        </template>
      </div>
    </div>
  </header>
</template> 