<script setup lang="ts">
import { ref, computed } from 'vue';
import { RouterLink, useRouter, useRoute } from 'vue-router';
import { useTheme } from '../../composables/useTheme.mjs';
import { useBackNavigation } from '../../composables/useBackNavigation.mts';
import { useAuthStore } from '../../stores/auth.store.mjs';
import { useGameSessionStore } from '../../stores/game-session.store.mjs';
import { ArrowLeftIcon, Bars3Icon, XMarkIcon, SunIcon, MoonIcon, PlusIcon, PencilSquareIcon } from '@heroicons/vue/24/solid';
import CharacterSelector from '../common/CharacterSelector.vue';
import SessionInfoDropdown from '../common/SessionInfoDropdown.vue';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const gameSessionStore = useGameSessionStore();
const { isDarkMode, toggleTheme } = useTheme();
const { canGoBack, goBack, backButtonTitle } = useBackNavigation();
const isMenuOpen = ref(false);


function toggleMenu() {
  isMenuOpen.value = !isMenuOpen.value;
}

function closeMenu() {
  isMenuOpen.value = false;
}

function handleLoginClick() {
  closeMenu();
  router.push('/auth/login');
}

function logout() {
  closeMenu();
  authStore.logout();
  router.push('/auth/login');
}

function handleThemeToggle() {
  closeMenu();
  toggleTheme();
}

// Add button logic - show on list pages
const addButtonConfig = computed(() => {
  if (!authStore.isAuthenticated) return null;
  
  const currentRoute = route.name as string;
  
  const addConfigs: Record<string, { label: string; route: string; icon: string }> = {
    'campaigns': { label: 'New Campaign', route: '/campaigns/create', icon: 'campaign' },
    'character-list': { label: 'New Character', route: '/character/create', icon: 'character' },
    'maps': { label: 'New Map', route: '/maps/create', icon: 'map' },
    'asset-list': { label: 'Upload Asset', route: '/assets/upload', icon: 'asset' },
  };
  
  return addConfigs[currentRoute] || null;
});

function handleAddClick() {
  const config = addButtonConfig.value;
  if (config) {
    router.push(config.route);
  }
}

// Edit button logic - show on detail pages
const editButtonConfig = computed(() => {
  if (!authStore.isAuthenticated) return null;
  
  const currentRoute = route.name as string;
  const routeParams = route.params;
  
  const editConfigs: Record<string, { label: string; route: string }> = {
    'character-sheet': { 
      label: 'Edit Character', 
      route: `/actor/${routeParams.id}/edit` 
    },
    'campaign-detail': { 
      label: 'Edit Campaign', 
      route: `/campaigns/${routeParams.id}/edit` 
    },
    'map-detail': { 
      label: 'Edit Map', 
      route: `/maps/${routeParams.id}/edit` 
    },
  };
  
  return editConfigs[currentRoute] || null;
});

function handleEditClick() {
  const config = editButtonConfig.value;
  if (config) {
    router.push(config.route);
  }
}

// Mobile-friendly menu items (player-focused, no GM/admin tools)
const mobileMenuItems = computed(() => {
  const items = [
    { name: 'Home', route: '/', show: true },
  ];
  
  if (authStore.isAuthenticated) {
    items.push(
      { name: 'Campaigns', route: '/campaigns', show: true },
      { name: 'Characters', route: '/characters', show: true },
      { name: 'Chat', route: '/chat', show: true },
      { name: 'Invites', route: '/invites', show: true },
      { name: 'Settings', route: '/settings', show: true }
    );
  }
  
  return items.filter(item => item.show);
});
</script>

<template>
  <header class="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-gray-800 shadow-sm">
    <div class="flex items-center justify-between h-12 px-4">
      <!-- Left: Back Button (conditional) -->
      <div class="flex items-center w-12">
        <button
          v-if="canGoBack"
          @click="goBack"
          :title="`Back to ${backButtonTitle}`"
          class="p-3 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 -ml-2 min-h-[44px] min-w-[44px] flex items-center justify-center relative z-10"
        >
          <ArrowLeftIcon class="w-6 h-6" />
        </button>
      </div>

      <!-- Center: Logo and App Title -->
      <div class="flex-1 flex items-center justify-center">
        <div class="flex items-center">
          <img
            src="@/assets/images/logo.svg"
            alt="Dungeon Lab Logo"
            class="h-6 w-6 object-contain mr-2"
          />
          <span class="text-lg font-bold text-primary-600 dark:text-primary-400">
            DungeonLab
          </span>
        </div>
      </div>

      <!-- Right: Add Button + Edit Button + Menu Button -->
      <div class="flex items-center justify-end space-x-1">
        <!-- Add Button (conditional on list pages) -->
        <button
          v-if="addButtonConfig"
          @click="handleAddClick"
          :title="addButtonConfig.label"
          class="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <PlusIcon class="w-5 h-5" />
        </button>
        
        <!-- Edit Button (conditional on detail pages) -->
        <button
          v-if="editButtonConfig"
          @click="handleEditClick"
          :title="editButtonConfig.label"
          class="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <PencilSquareIcon class="w-5 h-5" />
        </button>
        
        <!-- Menu Button -->
        <button
          @click="toggleMenu"
          class="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <XMarkIcon v-if="isMenuOpen" class="w-5 h-5" />
          <Bars3Icon v-else class="w-5 h-5" />
        </button>
      </div>
    </div>

    <!-- Mobile Dropdown Menu -->
    <div 
      v-if="isMenuOpen" 
      class="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 py-2 space-y-1"
    >
      <!-- Navigation Items -->
      <RouterLink
        v-for="item in mobileMenuItems"
        :key="item.name"
        :to="item.route"
        class="block px-4 py-3 text-base font-medium hover:bg-gray-100 dark:hover:bg-gray-700"
        @click="closeMenu"
      >
        {{ item.name }}
      </RouterLink>

      <!-- Session Info (if in game session) -->
      <div v-if="gameSessionStore.currentSession" class="px-4 py-2 border-t border-gray-200 dark:border-gray-600">
        <div class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Current Session</div>
        <SessionInfoDropdown />
      </div>

      <!-- Character Selector (if in game session) -->
      <div v-if="authStore.isAuthenticated && gameSessionStore.currentSession" class="px-4 py-2">
        <div class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Your Character</div>
        <CharacterSelector />
      </div>

      <!-- Theme Toggle -->
      <button
        @click="handleThemeToggle"
        class="flex w-full items-center px-4 py-3 text-base font-medium hover:bg-gray-100 dark:hover:bg-gray-700"
      >
        <MoonIcon v-if="isDarkMode" class="text-yellow-400 w-5 h-5 mr-3" />
        <SunIcon v-else class="text-yellow-500 w-5 h-5 mr-3" />
        {{ isDarkMode ? 'Light Mode' : 'Dark Mode' }}
      </button>

      <!-- User Section -->
      <div v-if="authStore.isAuthenticated" class="border-t border-gray-200 dark:border-gray-600 pt-2">
        <div class="flex items-center px-4 py-2">
          <img
            :src="
              authStore.user?.avatar ||
              'https://ui-avatars.com/api/?name=' + authStore.user?.username
            "
            alt="User Avatar"
            class="h-8 w-8 rounded-full object-cover mr-3"
          />
          <span class="text-sm font-medium">{{ authStore.user?.username }}</span>
        </div>
        <button
          @click="logout"
          class="block w-full text-left px-4 py-3 text-base font-medium text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          Logout
        </button>
      </div>

      <!-- Login/Register (when not authenticated) -->
      <template v-else>
        <div class="border-t border-gray-200 dark:border-gray-600 pt-2">
          <button
            @click="handleLoginClick"
            class="block w-full text-left px-4 py-3 text-base font-medium hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            Login
          </button>
          <RouterLink
            to="/auth/register"
            class="block px-4 py-3 text-base font-medium bg-primary-600 text-white hover:bg-primary-700 mx-4 my-2 rounded-md text-center"
            @click="closeMenu"
          >
            Register
          </RouterLink>
        </div>
      </template>
    </div>
  </header>
</template>

<style scoped>
/* Add click-outside behavior to close menu */
</style>