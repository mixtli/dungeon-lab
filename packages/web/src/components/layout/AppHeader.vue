<script setup lang="ts">
import { ref } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { useTheme } from '../../composables/useTheme.mjs';
import { useAuthStore } from '../../stores/auth.store.mjs';
import { useGameSessionStore } from '../../stores/game-session.store.mjs';
import { SunIcon, MoonIcon, Bars3Icon, XMarkIcon } from '@heroicons/vue/24/solid';
import CharacterSelector from '../common/CharacterSelector.vue';
import SessionInfoDropdown from '../common/SessionInfoDropdown.vue';

const router = useRouter();
const authStore = useAuthStore();
const { isDarkMode, toggleTheme } = useTheme();
const isMenuOpen = ref(false);
const gameSessionStore = useGameSessionStore();
function toggleMenu() {
  isMenuOpen.value = !isMenuOpen.value;
}

function closeMenu() {
  isMenuOpen.value = false;
}

function handleLoginClick() {
  closeMenu();
  console.log('Login clicked');
  router.push('/auth/login');
}

function logout() {
  closeMenu();
  authStore.logout();
  router.push('/auth/login');
}

function goToChat() {
  closeMenu();
  if (gameSessionStore.currentSession) {
    router.push({
      name: 'chat'
    });
  } else {
    router.push({ name: 'game-sessions' });
  }
}

function handleThemeToggle() {
  closeMenu();
  toggleTheme();
}
</script>

<template>
  <header class="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-gray-800 shadow-sm">
    <div class="container mx-auto px-4">
      <div class="flex justify-between items-center h-16">
        <!-- Logo -->
        <RouterLink to="/" class="flex items-center">
          <img
            src="@/assets/images/logo.svg"
            alt="Dungeon Lab Logo"
            class="h-8 w-8 object-contain"
          />
          <span class="ml-2 text-xl font-bold text-primary-600 dark:text-primary-400"
            >Dungeon Lab</span
          >
        </RouterLink>

        <!-- Desktop Navigation -->
        <nav class="hidden md:flex items-center space-x-4">
          <!-- Menu Dropdown -->
          <div class="relative group">
            <button
              class="flex items-center px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <span>Menu</span>
              <svg
                class="ml-2 h-5 w-5"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fill-rule="evenodd"
                  d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                  clip-rule="evenodd"
                />
              </svg>
            </button>
            <div
              class="absolute left-0 w-48 mt-2 py-1 bg-white dark:bg-gray-700 rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200"
            >
              <RouterLink
                to="/"
                class="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
              >
                Home
              </RouterLink>
              <RouterLink
                v-if="authStore.isAuthenticated"
                to="/campaigns"
                class="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
              >
                Campaigns
              </RouterLink>
              <RouterLink
                v-if="authStore.isAuthenticated"
                to="/maps"
                class="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
              >
                Maps
              </RouterLink>
              <RouterLink
                v-if="authStore.isAuthenticated"
                to="/games"
                class="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
              >
                Games
              </RouterLink>
              <RouterLink
                v-if="authStore.isAuthenticated"
                to="/characters"
                class="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
              >
                Characters
              </RouterLink>
              <RouterLink
                v-if="authStore.isAuthenticated"
                to="/assets"
                class="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
              >
                Asset Library
              </RouterLink>
              <template v-if="authStore.isAuthenticated && authStore.user?.isAdmin">
                <div class="border-t border-gray-200 dark:border-gray-600 my-1"></div>
                <RouterLink
                  to="/admin/plugins"
                  class="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
                >
                  Plugin Manager
                </RouterLink>
              </template>
            </div>
          </div>

          <!-- Session Info Dropdown -->
          <SessionInfoDropdown v-if="gameSessionStore.currentSession" />

          <!-- Character Selector -->
          <div v-if="authStore.isAuthenticated && gameSessionStore.currentSession" class="w-40">
            <CharacterSelector />
          </div>

          <!-- Chat Button -->
          <button
            v-if="authStore.isAuthenticated"
            @click="goToChat"
            class="px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5 mr-1"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fill-rule="evenodd"
                d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z"
                clip-rule="evenodd"
              />
            </svg>
            Chat
          </button>

          <!-- Theme Toggle -->
          <button
            @click="toggleTheme"
            class="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <MoonIcon v-if="isDarkMode" class="text-yellow-400 w-5 h-5" />
            <SunIcon v-else class="text-yellow-500 w-5 h-5" />
          </button>

          <!-- User Menu -->
          <div v-if="authStore.isAuthenticated" class="relative group">
            <button class="flex items-center space-x-2 focus:outline-none">
              <img
                :src="
                  authStore.user?.avatar ||
                  'https://ui-avatars.com/api/?name=' + authStore.user?.username
                "
                alt="User Avatar"
                class="h-8 w-8 rounded-full object-cover"
              />
              <span class="text-sm font-medium">{{ authStore.user?.username }}</span>
            </button>
            <div
              class="absolute right-0 w-48 mt-2 py-1 bg-white dark:bg-gray-700 rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200"
            >
              <RouterLink
                to="/profile"
                class="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
              >
                Profile
              </RouterLink>
              <RouterLink
                to="/invites"
                class="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
              >
                Invites
              </RouterLink>
              <RouterLink
                to="/settings"
                class="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
              >
                Settings
              </RouterLink>
              <button
                @click="logout"
                class="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-gray-600"
              >
                Logout
              </button>
            </div>
          </div>

          <!-- Login/Register -->
          <template v-else>
            <button
              @click="handleLoginClick"
              class="px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Login
            </button>
            <RouterLink
              to="/auth/register"
              class="px-3 py-2 rounded-md text-sm font-medium bg-primary-600 text-white hover:bg-primary-700"
            >
              Register
            </RouterLink>
          </template>
        </nav>

        <!-- Mobile menu button -->
        <button
          @click="toggleMenu"
          class="md:hidden p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <XMarkIcon v-if="isMenuOpen" class="w-5 h-5" />
          <Bars3Icon v-else class="w-5 h-5" />
        </button>
      </div>

      <!-- Mobile Navigation -->
      <div v-if="isMenuOpen" class="md:hidden py-3 space-y-1">
        <RouterLink
          to="/"
          class="block px-3 py-2 rounded-md text-base font-medium hover:bg-gray-100 dark:hover:bg-gray-700"
          @click="closeMenu"
        >
          Home
        </RouterLink>
        <RouterLink
          v-if="authStore.isAuthenticated"
          to="/campaigns"
          class="block px-3 py-2 rounded-md text-base font-medium hover:bg-gray-100 dark:hover:bg-gray-700"
          @click="closeMenu"
        >
          Campaigns
        </RouterLink>
        <RouterLink
          v-if="authStore.isAuthenticated"
          to="/maps"
          class="block px-3 py-2 rounded-md text-base font-medium hover:bg-gray-100 dark:hover:bg-gray-700"
          @click="closeMenu"
        >
          Maps
        </RouterLink>
        <RouterLink
          v-if="authStore.isAuthenticated"
          to="/games"
          class="block px-3 py-2 rounded-md text-base font-medium hover:bg-gray-100 dark:hover:bg-gray-700"
          @click="closeMenu"
        >
          Games
        </RouterLink>
        <RouterLink
          v-if="authStore.isAuthenticated"
          to="/characters"
          class="block px-3 py-2 rounded-md text-base font-medium hover:bg-gray-100 dark:hover:bg-gray-700"
          @click="closeMenu"
        >
          Characters
        </RouterLink>
        <RouterLink
          v-if="authStore.isAuthenticated"
          to="/assets"
          class="block px-3 py-2 rounded-md text-base font-medium hover:bg-gray-100 dark:hover:bg-gray-700"
          @click="closeMenu"
        >
          Asset Library
        </RouterLink>
        <button
          v-if="authStore.isAuthenticated"
          @click="goToChat"
          class="w-full text-left px-3 py-2 rounded-md text-base font-medium hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5 mr-1"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fill-rule="evenodd"
              d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z"
              clip-rule="evenodd"
            />
          </svg>
          Chat
        </button>
        <RouterLink
          v-if="authStore.isAuthenticated"
          to="/invites"
          class="block px-3 py-2 rounded-md text-base font-medium hover:bg-gray-100 dark:hover:bg-gray-700"
          @click="closeMenu"
        >
          Invites
        </RouterLink>

        <!-- Session Info Dropdown for Mobile -->
        <div v-if="gameSessionStore.currentSession" class="px-3 py-2">
          <SessionInfoDropdown />
        </div>

        <!-- Character Selector for Mobile -->
        <div v-if="authStore.isAuthenticated && gameSessionStore.currentSession" class="px-3 py-2">
          <div class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Your Character</div>
          <CharacterSelector />
        </div>

        <!-- Admin Tools Section (for admin users only) -->
        <template v-if="authStore.isAuthenticated && authStore.user?.isAdmin">
          <div class="px-3 py-2 font-medium text-gray-500 dark:text-gray-400">Admin Tools</div>
          <RouterLink
            to="/admin/plugins"
            class="block pl-6 px-3 py-2 rounded-md text-base font-medium hover:bg-gray-100 dark:hover:bg-gray-700"
            @click="closeMenu"
          >
            Plugin Manager
          </RouterLink>
        </template>

        <!-- Theme Toggle -->
        <button
          @click="handleThemeToggle"
          class="flex w-full items-center px-3 py-2 rounded-md text-base font-medium hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <MoonIcon v-if="isDarkMode" class="text-yellow-400 w-5 h-5 mr-2" />
          <SunIcon v-else class="text-yellow-500 w-5 h-5 mr-2" />
          {{ isDarkMode ? 'Light Mode' : 'Dark Mode' }}
        </button>

        <!-- Login/Register -->
        <template v-if="!authStore.isAuthenticated">
          <button
            @click="handleLoginClick"
            class="block px-3 py-2 rounded-md text-base font-medium hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            Login
          </button>
          <RouterLink
            to="/auth/register"
            class="block px-3 py-2 rounded-md text-base font-medium bg-primary-600 text-white hover:bg-primary-700"
            @click="closeMenu"
          >
            Register
          </RouterLink>
        </template>
      </div>
    </div>
  </header>
</template>
