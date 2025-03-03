<script setup lang="ts">
import { ref } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { useTheme } from '@/composables/useTheme';
import { ElDropdown, ElDropdownMenu, ElDropdownItem } from 'element-plus';
import { useAuthStore } from '@/stores/auth';
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
  <header class="bg-white dark:bg-gray-800 shadow-sm">
    <div class="container mx-auto px-4">
      <div class="flex justify-between items-center h-16">
        <!-- Logo -->
        <RouterLink to="/" class="flex items-center">
          <img src="@/assets/images/logo.svg" alt="Dungeon Lab Logo" class="h-8 w-auto" />
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
          <ElDropdown v-if="authStore.isAuthenticated && authStore.user?.isAdmin" trigger="click">
            <div class="flex items-center cursor-pointer px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-700">
              <span>Admin Tools</span>
            </div>
            <template #dropdown>
              <ElDropdownMenu>
                <ElDropdownItem @click="router.push('/admin/plugins')">Plugin Manager</ElDropdownItem>
              </ElDropdownMenu>
            </template>
          </ElDropdown>
          
          <!-- Theme Toggle -->
          <button @click="toggleTheme" class="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700">
            <MoonIcon v-if="isDarkMode" class="text-yellow-400 w-5 h-5" />
            <SunIcon v-else class="text-yellow-500 w-5 h-5" />
          </button>
          
          <!-- User Menu -->
          <ElDropdown v-if="authStore.isAuthenticated" trigger="click">
            <div class="flex items-center cursor-pointer">
              <img :src="authStore.user?.avatar || 'https://ui-avatars.com/api/?name=' + authStore.user?.username" alt="User Avatar" class="h-8 w-8 rounded-full" />
              <span class="ml-2">{{ authStore.user?.username }}</span>
            </div>
            <template #dropdown>
              <ElDropdownMenu>
                <ElDropdownItem @click="router.push('/profile')">Profile</ElDropdownItem>
                <ElDropdownItem @click="router.push('/settings')">Settings</ElDropdownItem>
                <ElDropdownItem divided @click="logout">Logout</ElDropdownItem>
              </ElDropdownMenu>
            </template>
          </ElDropdown>
          
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
        
        <!-- User Menu -->
        <template v-if="authStore.isAuthenticated">
          <RouterLink to="/profile" class="block px-3 py-2 rounded-md text-base font-medium hover:bg-gray-100 dark:hover:bg-gray-700">
            Profile
          </RouterLink>
          <RouterLink to="/settings" class="block px-3 py-2 rounded-md text-base font-medium hover:bg-gray-100 dark:hover:bg-gray-700">
            Settings
          </RouterLink>
          <button @click="logout" class="flex w-full items-center px-3 py-2 rounded-md text-base font-medium hover:bg-gray-100 dark:hover:bg-gray-700 text-red-600">
            Logout
          </button>
        </template>
        
        <!-- Login/Register -->
        <template v-else>
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