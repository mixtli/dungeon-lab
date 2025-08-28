<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useGameStateStore } from '../stores/game-state.store.mjs';
import { transformAssetUrl } from '../utils/asset-utils.mjs';
import defaultTokenUrl from '@/assets/images/default_token.svg';

const router = useRouter();
const gameStateStore = useGameStateStore();

// Combine characters and actors into a single list
const allActors = computed(() => {
  const characters = gameStateStore.characters.map(char => ({
    ...char,
    type: 'character' as const
  }));
  
  const actors = gameStateStore.actors.map(actor => ({
    ...actor, 
    type: 'actor' as const
  }));
  
  return [...characters, ...actors].sort((a, b) => 
    a.name.localeCompare(b.name)
  );
});

// Get actor avatar URL
function getActorAvatarUrl(actor: any): string {
  try {
    if (actor.avatar && typeof actor.avatar === 'object' && actor.avatar.url) {
      return transformAssetUrl(actor.avatar.url);
    }
    
    const assetId = actor.avatarId || actor.imageId;
    if (assetId && typeof assetId === 'string') {
      // For now, use default token - in production you'd fetch the asset
      return defaultTokenUrl;
    }
  } catch (err) {
    console.warn('Failed to get actor avatar:', err);
  }
  
  return defaultTokenUrl;
}

// Navigate to actor sheet
function openActorSheet(actor: any) {
  router.push({
    name: 'mobile-actor-sheet',
    params: { id: actor.id }
  });
}
</script>

<template>
  <div class="mobile-actors-view mobile-with-bottom-nav">
    <!-- Header -->
    <div class="actors-header">
      <h1 class="actors-title">Actors</h1>
      <p class="actors-subtitle">Characters and NPCs in this session</p>
    </div>

    <!-- Actors List -->
    <div class="actors-list">
      <div 
        v-if="allActors.length === 0"
        class="empty-state"
      >
        <div class="empty-icon">👥</div>
        <p class="empty-title">No actors available</p>
        <p class="empty-subtitle">Join an active game session to see characters and NPCs</p>
      </div>
      
      <div
        v-for="actor in allActors"
        :key="actor.id"
        class="actor-item"
        @click="openActorSheet(actor)"
      >
        <!-- Actor Avatar -->
        <div class="actor-avatar">
          <img
            :src="getActorAvatarUrl(actor)"
            :alt="actor.name"
            class="avatar-image"
          />
        </div>
        
        <!-- Actor Info -->
        <div class="actor-info">
          <div class="actor-name">{{ actor.name }}</div>
          <div class="actor-type">{{ actor.type === 'character' ? 'Character' : 'NPC' }}</div>
        </div>
        
        <!-- Chevron -->
        <div class="actor-chevron">
          <svg class="chevron-icon" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
          </svg>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.mobile-actors-view {
  min-height: 100vh;
  background: #f5f5f4; /* stone-100 */
  display: flex;
  flex-direction: column;
}

.dark .mobile-actors-view {
  background: #1c1917; /* stone-900 */
}

.actors-header {
  padding: 16px 20px;
  background: white;
  border-bottom: 1px solid #e7e5e4; /* stone-200 */
}

.dark .actors-header {
  background: #292524; /* stone-800 */
  border-bottom-color: #44403c; /* stone-700 */
}

.actors-title {
  font-size: 24px;
  font-weight: 700;
  color: #1c1917; /* stone-900 */
  margin: 0 0 4px 0;
}

.dark .actors-title {
  color: #fafaf9; /* stone-50 */
}

.actors-subtitle {
  font-size: 14px;
  color: #78716c; /* stone-500 */
  margin: 0;
}

.dark .actors-subtitle {
  color: #a8a29e; /* stone-400 */
}

.actors-list {
  flex: 1;
  background: white;
}

.dark .actors-list {
  background: #1c1917; /* stone-900 */
}

.empty-state {
  padding: 60px 20px;
  text-align: center;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-title {
  font-size: 18px;
  font-weight: 600;
  color: #1c1917; /* stone-900 */
  margin: 0 0 8px 0;
}

.dark .empty-title {
  color: #fafaf9; /* stone-50 */
}

.empty-subtitle {
  font-size: 14px;
  color: #78716c; /* stone-500 */
  margin: 0;
}

.dark .empty-subtitle {
  color: #a8a29e; /* stone-400 */
}

.actor-item {
  display: flex;
  align-items: center;
  padding: 12px 20px;
  border-bottom: 1px solid #f5f5f4; /* stone-100 */
  background: white;
  cursor: pointer;
  transition: background-color 0.2s ease;
  min-height: 44px; /* Touch target size */
}

.dark .actor-item {
  background: #1c1917; /* stone-900 */
  border-bottom-color: #292524; /* stone-800 */
}

.actor-item:active {
  background: #f5f5f4; /* stone-100 */
}

.dark .actor-item:active {
  background: #292524; /* stone-800 */
}

.actor-item:last-child {
  border-bottom: none;
}

.actor-avatar {
  flex-shrink: 0;
  margin-right: 12px;
}

.avatar-image {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
  background: #e7e5e4; /* stone-200 */
}

.dark .avatar-image {
  background: #44403c; /* stone-700 */
}

.actor-info {
  flex: 1;
  min-width: 0; /* Allow text to truncate */
}

.actor-name {
  font-size: 16px;
  font-weight: 500;
  color: #1c1917; /* stone-900 */
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.3;
}

.dark .actor-name {
  color: #fafaf9; /* stone-50 */
}

.actor-type {
  font-size: 12px;
  color: #78716c; /* stone-500 */
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.3;
  margin-top: 1px;
}

.dark .actor-type {
  color: #a8a29e; /* stone-400 */
}

.actor-chevron {
  flex-shrink: 0;
  margin-left: 8px;
}

.chevron-icon {
  width: 16px;
  height: 16px;
  color: #a8a29e; /* stone-400 */
}

.dark .chevron-icon {
  color: #78716c; /* stone-500 */
}
</style>