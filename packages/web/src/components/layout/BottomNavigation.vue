<script setup lang="ts">
import { computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../../stores/auth.store.mts';
import { useGameSessionStore } from '../../stores/game-session.store.mts';
import { 
  ChatBubbleLeftRightIcon, 
  ShieldCheckIcon, 
  UserIcon, 
  Cog6ToothIcon 
} from '@heroicons/vue/24/outline';
import {
  ChatBubbleLeftRightIcon as ChatBubbleLeftRightIconSolid,
  ShieldCheckIcon as ShieldCheckIconSolid,
  UserIcon as UserIconSolid,
  Cog6ToothIcon as Cog6ToothIconSolid
} from '@heroicons/vue/24/solid';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const gameSessionStore = useGameSessionStore();

// Navigation tabs configuration
const tabs = computed(() => [
  {
    id: 'chat',
    label: 'Chat',
    icon: ChatBubbleLeftRightIcon,
    iconSolid: ChatBubbleLeftRightIconSolid,
    isActive: computed(() => {
      return route.name === 'chat' || route.path.includes('/chat');
    }),
    navigate: () => {
      if (gameSessionStore.currentSession) {
        router.push({ name: 'chat' });
      } else {
        router.push({ name: 'game-sessions' });
      }
    }
  },
  {
    id: 'encounter',
    label: 'Encounter',
    icon: ShieldCheckIcon,
    iconSolid: ShieldCheckIconSolid,
    isActive: computed(() => {
      return route.name === 'encounter-run' || 
             route.name === 'encounter-detail' ||
             route.name === 'game-session' ||
             route.name === 'game-table';
    }),
    navigate: () => {
      if (gameSessionStore.currentSession) {
        // If there's a current session, go to the game session view
        router.push({ 
          name: 'game-session', 
          params: { 
            campaignId: gameSessionStore.currentSession.campaignId,
            id: gameSessionStore.currentSession._id 
          } 
        });
      } else {
        router.push({ name: 'game-sessions' });
      }
    }
  },
  {
    id: 'character',
    label: 'Character',
    icon: UserIcon,
    iconSolid: UserIconSolid,
    isActive: computed(() => {
      return route.name === 'character-sheet' ||
             route.name === 'character-list' ||
             route.name === 'character-create' ||
             route.path.includes('/character');
    }),
    navigate: () => {
      // Try to get current character from game session or auth store
      const currentCharacter = gameSessionStore.currentCharacter || authStore.user?.currentCharacter;
      
      if (currentCharacter) {
        router.push({ 
          name: 'character-sheet', 
          params: { id: currentCharacter._id || currentCharacter.id } 
        });
      } else {
        router.push({ name: 'character-list' });
      }
    }
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Cog6ToothIcon,
    iconSolid: Cog6ToothIconSolid,
    isActive: computed(() => {
      return route.name === 'settings' || route.path.includes('/settings');
    }),
    navigate: () => {
      router.push({ name: 'settings' });
    }
  }
]);

function handleTabClick(tab: any) {
  tab.navigate();
}
</script>

<template>
  <nav class="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
    <div class="flex items-center justify-around h-16 max-w-lg mx-auto">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        @click="handleTabClick(tab)"
        :class="[
          'flex flex-col items-center justify-center p-2 min-w-0 flex-1 space-y-1',
          'text-xs font-medium transition-colors duration-200',
          tab.isActive.value
            ? 'text-primary-600 dark:text-primary-400'
            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
        ]"
      >
        <!-- Icon -->
        <component
          :is="tab.isActive.value ? tab.iconSolid : tab.icon"
          class="w-6 h-6 flex-shrink-0"
        />
        
        <!-- Label -->
        <span class="truncate w-full text-center">
          {{ tab.label }}
        </span>
      </button>
    </div>
    
    <!-- iOS safe area padding -->
    <div class="h-0" style="padding-bottom: env(safe-area-inset-bottom);"></div>
  </nav>
</template>

<style scoped>
/* Ensure proper touch targets */
button {
  min-height: 44px;
  min-width: 44px;
}

/* Handle text overflow gracefully */
span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>