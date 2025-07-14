<template>
  <div class="combat-tab">
    <div class="combat-header">
      <h4>Combat</h4>
      <div class="combat-controls">
        <button class="control-button" title="Start Combat" :disabled="combatActive">
          <i class="mdi mdi-play"></i>
        </button>
        <button class="control-button" title="Pause Combat" :disabled="!combatActive">
          <i class="mdi mdi-pause"></i>
        </button>
        <button class="control-button" title="End Combat" :disabled="!combatActive">
          <i class="mdi mdi-stop"></i>
        </button>
      </div>
    </div>

    <div class="combat-status" v-if="combatActive">
      <div class="status-info">
        <span class="round-counter">Round {{ currentRound }}</span>
        <span class="turn-indicator">{{ currentTurn }}'s Turn</span>
      </div>
      <div class="combat-timer">
        <i class="mdi mdi-timer"></i>
        <span>{{ formatTime(turnTimer) }}</span>
      </div>
    </div>

    <div class="initiative-tracker">
      <h5>Initiative Order</h5>
      
      <div class="initiative-list">
        <div
          v-for="entry in initiativeOrder"
          :key="entry.id"
          class="initiative-entry"
          :class="{ 
            'entry-active': entry.id === currentTurnId,
            'entry-completed': entry.hasActed 
          }"
        >
          <div class="entry-info">
            <div class="entry-avatar">
              <i :class="entry.icon"></i>
            </div>
            <div class="entry-details">
              <span class="entry-name">{{ entry.name }}</span>
              <span class="entry-initiative">{{ entry.initiative }}</span>
            </div>
          </div>
          
          <div class="entry-actions">
            <button class="action-button" title="Edit Initiative">
              <i class="mdi mdi-pencil"></i>
            </button>
            <button class="action-button" title="Remove">
              <i class="mdi mdi-delete"></i>
            </button>
          </div>
        </div>
      </div>

      <div class="initiative-actions">
        <button class="primary-button" @click="rollInitiative">
          <i class="mdi mdi-dice-6"></i>
          Roll Initiative
        </button>
        <button class="secondary-button" @click="nextTurn" :disabled="!combatActive">
          Next Turn
        </button>
      </div>
    </div>

    <div class="combat-actions">
      <h5>Quick Actions</h5>
      
      <div class="action-grid">
        <button class="action-tile" title="Attack">
          <i class="mdi mdi-sword"></i>
          <span>Attack</span>
        </button>
        
        <button class="action-tile" title="Cast Spell">
          <i class="mdi mdi-auto-fix"></i>
          <span>Spell</span>
        </button>
        
        <button class="action-tile" title="Move">
          <i class="mdi mdi-run"></i>
          <span>Move</span>
        </button>
        
        <button class="action-tile" title="Defend">
          <i class="mdi mdi-shield"></i>
          <span>Defend</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

// Combat state
const combatActive = ref(false);
const currentRound = ref(1);
const currentTurnId = ref('player1');
const turnTimer = ref(30);

// Sample initiative data
const initiativeOrder = ref([
  { id: 'player1', name: 'Thorin', initiative: 18, hasActed: false, icon: 'mdi mdi-account' },
  { id: 'enemy1', name: 'Goblin 1', initiative: 15, hasActed: false, icon: 'mdi mdi-sword' },
  { id: 'player2', name: 'Elara', initiative: 12, hasActed: false, icon: 'mdi mdi-account' },
  { id: 'enemy2', name: 'Goblin 2', initiative: 8, hasActed: false, icon: 'mdi mdi-sword' }
]);

const currentTurn = computed(() => {
  const entry = initiativeOrder.value.find(e => e.id === currentTurnId.value);
  return entry?.name || 'Unknown';
});

function rollInitiative(): void {
  // TODO: Implement initiative rolling
  console.log('Rolling initiative...');
}

function nextTurn(): void {
  // TODO: Implement turn progression
  console.log('Next turn...');
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
</script>

<style scoped>
.combat-tab {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: transparent;
}

.combat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.combat-header h4 {
  color: white;
  margin: 0;
  font-weight: 600;
}

.combat-controls {
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

.control-button:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.15);
  color: white;
}

.control-button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.combat-status {
  padding: 12px 16px;
  background: rgba(239, 68, 68, 0.1);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.status-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.round-counter {
  color: white;
  font-weight: 600;
  font-size: 14px;
}

.turn-indicator {
  color: rgba(255, 255, 255, 0.8);
  font-size: 12px;
}

.combat-timer {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #fbbf24;
  font-weight: 600;
}

.initiative-tracker {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
}

.initiative-tracker h5 {
  color: white;
  margin: 0 0 12px 0;
  font-weight: 600;
  font-size: 14px;
}

.initiative-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.initiative-entry {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  transition: all 0.2s ease;
}

.initiative-entry.entry-active {
  background: rgba(59, 130, 246, 0.2);
  border-color: rgba(59, 130, 246, 0.5);
  box-shadow: 0 0 12px rgba(59, 130, 246, 0.3);
}

.initiative-entry.entry-completed {
  opacity: 0.6;
  background: rgba(34, 197, 94, 0.1);
  border-color: rgba(34, 197, 94, 0.3);
}

.entry-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.entry-avatar {
  width: 32px;
  height: 32px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.8);
}

.entry-details {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.entry-name {
  color: white;
  font-weight: 600;
  font-size: 14px;
}

.entry-initiative {
  color: rgba(255, 255, 255, 0.6);
  font-size: 12px;
}

.entry-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.initiative-entry:hover .entry-actions {
  opacity: 1;
}

.action-button {
  width: 24px;
  height: 24px;
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

.initiative-actions {
  display: flex;
  gap: 8px;
}

.primary-button {
  flex: 1;
  background: rgba(59, 130, 246, 0.6);
  border: 1px solid rgba(59, 130, 246, 0.8);
  border-radius: 6px;
  color: white;
  padding: 8px 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-weight: 600;
}

.primary-button:hover {
  background: rgba(59, 130, 246, 0.8);
  transform: translateY(-1px);
}

.secondary-button {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  color: rgba(255, 255, 255, 0.8);
  padding: 8px 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 600;
}

.secondary-button:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.15);
  color: white;
}

.secondary-button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.combat-actions {
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding: 16px;
  background: rgba(0, 0, 0, 0.2);
}

.combat-actions h5 {
  color: white;
  margin: 0 0 12px 0;
  font-weight: 600;
  font-size: 14px;
}

.action-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.action-tile {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  padding: 12px 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  color: rgba(255, 255, 255, 0.8);
}

.action-tile:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
  transform: translateY(-2px);
}

.action-tile i {
  font-size: 20px;
}

.action-tile span {
  font-size: 12px;
  font-weight: 600;
}
</style>