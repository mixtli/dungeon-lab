<template>
  <div class="actors-tab">
    <div class="actors-header">
      <h4>Actors</h4>
      <div class="actors-controls">
        <button class="control-button" title="Add Actor">
          <i class="mdi mdi-plus"></i>
        </button>
        <button class="control-button" title="Import Actors">
          <i class="mdi mdi-upload"></i>
        </button>
        <button class="control-button" title="Actor Settings">
          <i class="mdi mdi-cog"></i>
        </button>
      </div>
    </div>

    <div class="search-filter">
      <div class="search-box">
        <i class="mdi mdi-magnify search-icon"></i>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search actors..."
          class="search-input"
        />
      </div>
      
      <div class="filter-tabs">
        <button
          v-for="filter in filterOptions"
          :key="filter.id"
          class="filter-tab"
          :class="{ 'filter-active': activeFilter === filter.id }"
          @click="activeFilter = filter.id"
        >
          {{ filter.label }}
        </button>
      </div>
    </div>

    <div class="actors-list">
      <div
        v-for="actor in filteredActors"
        :key="actor.id"
        class="actor-card"
        :class="`actor-${actor.type}`"
        @click="selectActor(actor)"
      >
        <div class="actor-avatar">
          <img v-if="actor.avatar?.url" :src="actor.avatar.url" :alt="actor.name" />
          <img v-else-if="actor.token?.url" :src="actor.token.url" :alt="actor.name" />
          <i v-else class="mdi mdi-account-circle"></i>
        </div>
        
        <div class="actor-info">
          <div class="actor-name">{{ actor.name }}</div>
          <div class="actor-details">
            <span class="actor-type">{{ actor.type }}</span>
          </div>
        </div>

        <div class="actor-actions">
          <button class="action-button" title="Add to Encounter" @click.stop="addToEncounter(actor)">
            <i class="mdi mdi-plus-circle"></i>
          </button>
          <button class="action-button" title="Edit Actor" @click.stop="editActor(actor)">
            <i class="mdi mdi-pencil"></i>
          </button>
        </div>
      </div>
    </div>

    <div class="quick-actions">
      <button class="quick-action-button">
        <i class="mdi mdi-account-plus"></i>
        Create Character
      </button>
      <button class="quick-action-button">
        <i class="mdi mdi-sword-cross"></i>
        Create Monster
      </button>
      <button class="quick-action-button">
        <i class="mdi mdi-account-group"></i>
        Create NPC
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useActorStore } from '../../../stores/actor.store.mjs';
import type { IActor } from '@dungeon-lab/shared/types/index.mjs';

const actorStore = useActorStore();
const searchQuery = ref('');
const activeFilter = ref('all');

const filterOptions = [
  { id: 'all', label: 'All' },
  { id: 'character', label: 'Characters' },
  { id: 'monster', label: 'Monsters' },
  { id: 'npc', label: 'NPCs' }
];

// Use real data from store instead of hardcoded
const actors = computed(() => actorStore.actors);

const filteredActors = computed(() => {
  let filtered = actors.value;

  // Filter by type
  if (activeFilter.value !== 'all') {
    filtered = filtered.filter((actor: { type: string; }) => actor.type === activeFilter.value);
  }

  // Filter by search query
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter((actor: { name: string; type: string; }) => 
      actor.name.toLowerCase().includes(query) ||
      actor.type.toLowerCase().includes(query)
    );
  }

  return filtered;
});

// Load actors when component mounts
onMounted(async () => {
  try {
    await actorStore.ensureActorsLoaded();
  } catch (error) {
    console.error('Failed to load actors:', error);
  }
});

// Implement real functionality
async function selectActor(actor: IActor): Promise<void> {
  try {
    await actorStore.setCurrentActor(actor.id);
    console.log('Selected actor:', actor.name);
  } catch (error) {
    console.error('Failed to select actor:', error);
  }
}

async function addToEncounter(actor: IActor): Promise<void> {
  console.log('Adding to encounter:', actor);
  // TODO: Use encounter store to add actor
  // const encounterStore = useEncounterStore();
  // await encounterStore.addParticipant(encounterStore.currentEncounter?.id, actor.id);
}

async function editActor(actor: IActor): Promise<void> {
  console.log('Editing actor:', actor);
  // TODO: Navigate to actor edit view or open modal
  // router.push(`/actors/${actor.id}/edit`);
}

</script>

<style scoped>
.actors-tab {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: transparent;
}

.actors-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.actors-header h4 {
  color: white;
  margin: 0;
  font-weight: 600;
}

.actors-controls {
  display: flex;
  gap: 4px;
}

.control-button {
  width: 28px;
  height: 28px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.control-button:hover {
  background: rgba(255, 255, 255, 0.15);
  color: white;
}

.search-filter {
  padding: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.search-box {
  position: relative;
  margin-bottom: 12px;
}

.search-icon {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: rgba(255, 255, 255, 0.5);
  font-size: 16px;
}

.search-input {
  width: 100%;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  padding: 8px 12px 8px 36px;
  color: white;
  font-size: 14px;
  transition: all 0.2s ease;
}

.search-input:focus {
  outline: none;
  border-color: rgba(59, 130, 246, 0.5);
  background: rgba(255, 255, 255, 0.15);
}

.search-input::placeholder {
  color: rgba(255, 255, 255, 0.5);
}

.filter-tabs {
  display: flex;
  gap: 4px;
}

.filter-tab {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  padding: 6px 12px;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 12px;
  font-weight: 600;
}

.filter-tab:hover {
  background: rgba(255, 255, 255, 0.15);
  color: white;
}

.filter-tab.filter-active {
  background: rgba(59, 130, 246, 0.6);
  color: white;
  border-color: rgba(59, 130, 246, 0.8);
}

.actors-list {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.actor-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.actor-card:hover {
  background: rgba(255, 255, 255, 0.1);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.actor-card.actor-character {
  border-left: 3px solid #3b82f6;
}

.actor-card.actor-monster {
  border-left: 3px solid #ef4444;
}

.actor-card.actor-npc {
  border-left: 3px solid #22c55e;
}

.actor-avatar {
  width: 40px;
  height: 40px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.8);
  overflow: hidden;
}

.actor-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.actor-avatar i {
  font-size: 20px;
}

.actor-info {
  flex: 1;
  min-width: 0;
}

.actor-name {
  color: white;
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 4px;
}

.actor-details {
  display: flex;
  gap: 8px;
}

.actor-type {
  color: rgba(255, 255, 255, 0.6);
  font-size: 12px;
  text-transform: capitalize;
}

.actor-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.actor-card:hover .actor-actions {
  opacity: 1;
}

.action-button {
  width: 28px;
  height: 28px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-button:hover {
  background: rgba(255, 255, 255, 0.15);
  color: white;
}

.quick-actions {
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding: 16px;
  background: rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.quick-action-button {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  padding: 10px 12px;
  color: rgba(255, 255, 255, 0.8);
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 14px;
}

.quick-action-button:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
  transform: translateY(-1px);
}

/* Scrollbar styling */
.actors-list::-webkit-scrollbar {
  width: 6px;
}

.actors-list::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
}

.actors-list::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.3);
  border-radius: 3px;
}

.actors-list::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.5);
}
</style>