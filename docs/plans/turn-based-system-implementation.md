# Turn-Based System Implementation Plan

## Overview

This document outlines the implementation of a flexible turn-based system that abstracts common turn management while allowing game-specific initiative and turn mechanics through plugins.

## Architecture Goals

- **Universal Turn Management**: Core concepts (whose turn, has acted, round tracking) in shared codebase
- **Game-Specific Rules**: Initiative calculation, turn order behavior, action restrictions in plugins  
- **Permission System Integration**: Turn state guards action execution across all systems
- **Plugin Flexibility**: Support diverse systems from D&D's fixed initiative to FATE's narrative turns

## Research Summary

Based on analysis of major TTRPG systems:

**Universal Concepts** (All systems have these):
- Turn state tracking (active participant, round number)
- Action permission control (restrict actions based on turn)
- Round/phase progression
- Participant management

**System-Specific Concepts** (Vary significantly):
- Initiative calculation (d20+Dex vs cards vs bidding vs narrative)
- Turn order behavior (fixed vs variable per round vs dynamic)
- Action restrictions (strict turns vs reactions vs simultaneous)  
- Round structure (simple vs multiple passes vs phases)

## Implementation Plan

### Phase 1: Core Turn Manager Infrastructure

#### 1.1 Schema Definitions

**File**: `packages/shared/src/schemas/turn-manager.schema.mts`
```typescript
import { z } from 'zod';

export const turnParticipantSchema = z.object({
  id: z.string(),
  name: z.string(), 
  actorId: z.string().optional(),
  tokenId: z.string().optional(),
  hasActed: z.boolean().default(false),
  turnOrder: z.number(), // Abstract ordering value
  participantData: z.record(z.string(), z.unknown()).optional() // Plugin extensions
});

export const turnManagerSchema = z.object({
  isActive: z.boolean().default(false),
  currentTurn: z.number().default(0), // Index into participants array
  round: z.number().default(1),
  phase: z.string().optional(), // For phase-based systems
  participants: z.array(turnParticipantSchema).default([]),
  turnData: z.record(z.string(), z.unknown()).optional() // Plugin extensions
});

export type ITurnParticipant = z.infer<typeof turnParticipantSchema>;
export type ITurnManager = z.infer<typeof turnManagerSchema>;
```

#### 1.2 Game State Integration

**File**: `packages/shared/src/schemas/server-game-state.schema.mts`
```typescript
// Add to existing schema
export const serverGameStateSchema = z.object({
  // ... existing fields ...
  
  // Turn management
  turnManager: turnManagerSchema.nullable().default(null)
});
```


### Phase 2: Abstract Base Class & D&D Implementation

#### 2.1 Abstract Base Class Definition

**File**: `packages/shared-ui/src/base/base-turn-manager.mts`
```typescript
import type { ITurnManager, ITurnParticipant } from '@dungeon-lab/shared/schemas/turn-manager.schema.mjs';

/**
 * Abstract base class for turn manager plugins
 * 
 * Prioritizes universal GM control with optional game-specific automation.
 * Default behavior works for any game system - random order with drag-and-drop reordering.
 * 
 * Core Philosophy:
 * - Manual GM control is always available (drag-and-drop reordering)
 * - Automatic calculation is optional game-specific enhancement  
 * - Simple systems need no configuration, complex systems get full features
 * 
 * Benefits:
 * - Universal foundation that works for narrative games, simple systems, etc.
 * - Lower barrier to entry for plugin developers
 * - Familiar drag-and-drop UX for GMs
 * - Full backwards compatibility for complex systems like D&D
 */
export abstract class BaseTurnManagerPlugin {
  // Abstract properties - must be implemented by concrete plugins
  abstract readonly pluginId: string;
  abstract readonly name: string;
  abstract readonly gameSystem: string;
  
  /**
   * Calculate initiative order for participants
   * Default: Random shuffle (works universally, fair for any system)
   * Override for game-specific initiative (d20+Dex, cards, bidding, etc.)
   */
  async calculateInitiative(participants: ITurnParticipant[]): Promise<ITurnParticipant[]> {
    // Random shuffle with sequential turnOrder for clear ordering
    const shuffled = [...participants].sort(() => Math.random() - 0.5);
    return shuffled.map((participant, index) => ({
      ...participant,
      turnOrder: shuffled.length - index, // Higher numbers go first
      participantData: {
        ...participant.participantData,
        initiativeMethod: 'random',
        originalIndex: index
      }
    }));
  }
  
  /**
   * Whether this system supports automatic initiative calculation
   * Default: false (most systems rely on GM manual ordering)
   * Override: true for systems with dice/cards/bidding mechanics
   */
  supportsAutomaticCalculation(): boolean {
    return false;
  }
  
  /**
   * Whether manual reordering is allowed
   * Default: true (universal GM control)
   * Override: false only for very rigid systems (rare)
   */
  allowsManualReordering(): boolean {
    return true;
  }
  
  /**
   * Label for the initiative calculation button
   * Default: "Start Turn Order" (generic)
   * Override: "Roll Initiative", "Draw Cards", etc.
   */
  getInitiativeButtonLabel(): string {
    return 'Start Turn Order';
  }
  
  /**
   * Whether to show automatic calculation button in UI
   * Default: Based on supportsAutomaticCalculation()
   * Override: For custom UI behavior
   */
  showCalculateButton(): boolean {
    return this.supportsAutomaticCalculation();
  }
  
  /**
   * Update participant order after manual reordering
   * Default: Update turnOrder based on new positions
   * Override: For custom reordering logic
   */
  async updateParticipantOrder(participants: ITurnParticipant[]): Promise<ITurnParticipant[]> {
    // Assign turnOrder based on array position (higher = earlier in turn order)
    return participants.map((participant, index) => ({
      ...participant,
      turnOrder: participants.length - index,
      participantData: {
        ...participant.participantData,
        manuallyOrdered: true
      }
    }));
  }
  
  /**
   * Whether initiative should be recalculated each round
   * Default: false (most systems use fixed initiative)
   * Override: true for systems like Savage Worlds with card-based initiative
   */
  shouldRecalculateOrderEachRound(): boolean {
    return false;
  }
  
  /**
   * Whether turn order can change mid-scene (delay, ready actions, etc.)
   * Default: false (most systems have locked turn order)
   * Override: true for flexible systems that allow order changes
   */
  canChangeOrderMidScene(): boolean {
    return false;
  }
  
  // Lifecycle hooks - default to no-ops, override as needed
  
  /**
   * Called when turn-based mode starts
   * Default: no-op
   * Override: for game-specific setup (buff tracking, condition management, etc.)
   */
  async onTurnOrderStart(_turnManager: ITurnManager): Promise<void> {
    // Default: no-op
  }
  
  /**
   * Called when turn-based mode ends
   * Default: no-op  
   * Override: for cleanup, final effects processing, etc.
   */
  async onTurnOrderEnd(_turnManager: ITurnManager): Promise<void> {
    // Default: no-op
  }
  
  /**
   * Called at the start of each round
   * Default: no-op
   * Override: for round-based effects, spell duration tracking, etc.
   */
  async onRoundStart(_turnManager: ITurnManager): Promise<void> {
    // Default: no-op
  }
  
  /**
   * Called at the end of each round
   * Default: no-op
   * Override: for end-of-round processing, condition updates, etc.
   */
  async onRoundEnd(_turnManager: ITurnManager): Promise<void> {
    // Default: no-op
  }
  
  /**
   * Called when a participant's turn starts
   * Default: no-op
   * Override: for turn-start effects, status updates, etc.
   */
  async onTurnStart(_participant: ITurnParticipant, _turnManager: ITurnManager): Promise<void> {
    // Default: no-op
  }
  
  /**
   * Called when a participant's turn ends  
   * Default: no-op
   * Override: for turn-end effects, resource regeneration, etc.
   */
  async onTurnEnd(_participant: ITurnParticipant, _turnManager: ITurnManager): Promise<void> {
    // Default: no-op
  }
  
  /**
   * Validate turn progression logic
   * Default: always valid
   * Override: for custom turn flow validation
   */
  async validateTurnProgression(_turnManager: ITurnManager): Promise<boolean> {
    return true;
  }
  
  /**
   * Get available actions for a participant
   * Default: permissive - returns all provided action types
   * Override: for game-specific action filtering
   */
  getAvailableActions(participantId: string, turnManager: ITurnManager, allActionTypes: string[] = []): string[] {
    // Default: filter using canPerformAction
    return allActionTypes.filter(action => 
      this.canPerformAction(participantId, action, turnManager)
    );
  }
  
  /**
   * Custom turn logic hook
   * Default: no-op
   * Override: for complex turn progression logic
   */
  async customTurnLogic(turnManager: ITurnManager): Promise<ITurnManager> {
    return turnManager;
  }
  
  // Abstract methods - must be implemented by concrete plugins
  
  /**
   * Check if participant can perform a specific action
   * MUST IMPLEMENT: Game-specific action permission logic
   */
  abstract canPerformAction(
    participantId: string, 
    actionType: string, 
    turnManager: ITurnManager
  ): boolean;
}
```

#### 2.2 Plugin Access Pattern (No Separate Registry)

Turn managers are accessed directly from the existing plugin registry as a capability of the game system plugin:

```typescript
// Direct access pattern - no separate registry needed
import { pluginRegistry } from './plugin-registry.mts';

// Get turn manager from game system plugin
const plugin = pluginRegistry.getPlugin(pluginId);
const turnManager = plugin?.turnManager;

// Or for current campaign
const campaignPluginId = gameState.campaign?.pluginId;
const plugin = pluginRegistry.getPlugin(campaignPluginId);  
const turnManager = plugin?.turnManager;
```

**Benefits of Direct Access:**
- Simpler architecture (no separate registry)
- More consistent with existing plugin system
- Turn manager is logically part of game system plugin
- Fewer initialization steps required
- Better encapsulation of plugin capabilities

#### 2.3 D&D 5e Plugin Implementation

**File**: `packages/plugins/dnd-5e-2024/src/turn-manager.mts`
```typescript
import { BaseTurnManagerPlugin } from '@dungeon-lab/shared-ui/base/base-turn-manager.mjs';
import type { ITurnManager, ITurnParticipant } from '@dungeon-lab/shared/schemas/turn-manager.schema.mjs';

export class DnD5eTurnManager extends BaseTurnManagerPlugin {
  readonly pluginId = 'dnd-5e-2024';
  readonly name = 'D&D 5e Turn Manager';
  readonly gameSystem = 'dnd-5e-2024';
  
  // D&D-specific overrides for automatic calculation support
  supportsAutomaticCalculation(): boolean {
    return true; // D&D has dice-based initiative
  }
  
  getInitiativeButtonLabel(): string {
    return 'Roll Initiative'; // D&D-specific button text
  }
  
  // Note: Inherits allowsManualReordering() = true, so GM can still drag-and-drop after rolling
  
  async calculateInitiative(participants: ITurnParticipant[]): Promise<ITurnParticipant[]> {
    const results: ITurnParticipant[] = [];
    
    for (const participant of participants) {
      // Get actor data for Dex modifier
      const actor = await this.getActorData(participant.actorId);
      const dexModifier = this.getDexterityModifier(actor);
      
      // Roll d20 + Dex modifier
      const roll = Math.floor(Math.random() * 20) + 1;
      const initiative = roll + dexModifier;
      
      results.push({
        ...participant,
        turnOrder: initiative,
        participantData: {
          initiativeRoll: roll,
          dexterityModifier: dexModifier,
          totalInitiative: initiative
        }
      });
    }
    
    // Sort by initiative (highest first), then by Dex modifier for ties
    return results.sort((a, b) => {
      if (b.turnOrder !== a.turnOrder) {
        return b.turnOrder - a.turnOrder;
      }
      // Tie-breaker: higher Dex modifier wins
      return (b.participantData?.dexterityModifier || 0) - (a.participantData?.dexterityModifier || 0);
    });
  }
  
  shouldRecalculateOrderEachRound(): boolean {
    return false; // D&D uses fixed initiative order
  }
  
  canChangeOrderMidScene(): boolean {
    return false; // D&D order is fixed (except for delay/ready actions)
  }
  
  canPerformAction(participantId: string, actionType: string, turnManager: ITurnManager): boolean {
    const currentParticipant = turnManager.participants[turnManager.currentTurn];
    const isCurrentTurn = currentParticipant?.id === participantId;
    
    // D&D specific action rules
    switch (actionType) {
      case 'move':
      case 'attack':
      case 'cast-spell':
      case 'dash':
      case 'dodge':
        return isCurrentTurn && !currentParticipant.hasActed;
        
      case 'reaction':
      case 'opportunity-attack':
        return true; // Reactions can happen on any turn
        
      case 'bonus-action':
        return isCurrentTurn; // Can use bonus action even if main action used
        
      default:
        return isCurrentTurn;
    }
  }
  
  getAvailableActions(participantId: string, turnManager: ITurnManager): string[] {
    const actions = ['move', 'attack', 'cast-spell', 'dash', 'dodge', 'help', 'hide', 'search'];
    return actions.filter(action => this.canPerformAction(participantId, action, turnManager));
  }
  
  // Lifecycle hooks for D&D specific logic
  async onTurnOrderStart(turnManager: ITurnManager): Promise<void> {
    console.log('D&D turn-based scene begins');
  }
  
  async onTurnOrderEnd(turnManager: ITurnManager): Promise<void> {
    console.log('D&D turn-based scene ends');
  }
  
  async onTurnStart(participant: ITurnParticipant, turnManager: ITurnManager): Promise<void> {
    // D&D turn start effects (e.g., ongoing damage, condition checks)
    console.log(`${participant.name}'s turn begins (Initiative: ${participant.participantData?.totalInitiative})`);
  }
  
  async onTurnEnd(participant: ITurnParticipant, turnManager: ITurnManager): Promise<void> {
    // D&D turn end effects
    console.log(`${participant.name}'s turn ends`);
  }
  
  async onRoundStart(turnManager: ITurnManager): Promise<void> {
    console.log(`Round ${turnManager.round} begins`);
  }
  
  async onRoundEnd(turnManager: ITurnManager): Promise<void> {
    // Process end-of-round effects (spell durations, conditions, etc.)
    console.log(`Round ${turnManager.round} ends`);
  }
  
  private async getActorData(actorId?: string) {
    // Implementation to get actor data from game state
    return {}; // Placeholder
  }
  
  private getDexterityModifier(actor: any): number {
    // Calculate D&D 5e Dex modifier from ability score
    const dexScore = actor.abilities?.dexterity?.score || 10;
    return Math.floor((dexScore - 10) / 2);
  }
}
```

#### 2.4 Plugin Registration in Main Plugin

**File**: `packages/plugins/dnd-5e-2024/src/index.mts`
```typescript
// Add to existing plugin exports
export { DnD5eTurnManager } from './turn-manager.mjs';

// Update plugin registration to include turn manager
import { BaseGameSystemPlugin } from '@dungeon-lab/shared-ui/base/base-plugin.mjs';
import { DnD5eTurnManager } from './turn-manager.mjs';

export class DnD5e2024Plugin extends BaseGameSystemPlugin {
  // ... existing implementation ...
  
  // Add turn manager instance (not constructor)
  private _turnManager: DnD5eTurnManager | null = null;
  
  get turnManager(): DnD5eTurnManager {
    if (!this._turnManager) {
      this._turnManager = new DnD5eTurnManager();
    }
    return this._turnManager;
  }
}
```

**Note**: Plugin provides turn manager instance directly, eliminating need for separate instantiation logic.

### Phase 3: Core Service Implementation

#### 3.1 Turn Manager Service Integration

**File**: `packages/web/src/services/turn-manager.service.mts`
```typescript
import type { ITurnManager, ITurnParticipant } from '@dungeon-lab/shared/schemas/turn-manager.schema.mjs';
import type { BaseTurnManagerPlugin } from '@dungeon-lab/shared-ui/base/base-turn-manager.mjs';
import { pluginRegistry } from './plugin-registry.mts';
import { useGameStateStore } from '../stores/game-state.store.mts';
import type { StateOperation } from '@dungeon-lab/shared/types/index.mjs';

export class TurnManagerService {
  private plugin: BaseTurnManagerPlugin | null = null;
  private gameStateStore = useGameStateStore();
  
  async initialize(pluginId: string): Promise<void> {
    const gameSystemPlugin = pluginRegistry.getPlugin(pluginId);
    this.plugin = gameSystemPlugin?.turnManager || null;
    
    if (!this.plugin) {
      console.warn(`No turn manager found for plugin: ${pluginId}`);
    }
  }
  
  async startTurnOrder(participants: ITurnParticipant[]): Promise<void> {
    if (!this.plugin) {
      throw new Error('Turn manager plugin not initialized');
    }
    
    // Let plugin calculate initiative and order participants  
    const orderedParticipants = await this.plugin.calculateInitiative(participants);
    
    const turnManager: ITurnManager = {
      isActive: true,
      currentTurn: 0,
      round: 1,
      participants: orderedParticipants,
      turnData: {}
    };
    
    // Update game state
    const operations: StateOperation[] = [{
      path: 'turnManager',
      operation: 'set',
      value: turnManager
    }];
    
    await this.gameStateStore.updateGameState(operations);
    
    // Notify plugin
    await this.plugin.onTurnOrderStart(turnManager);
    await this.plugin.onTurnStart(orderedParticipants[0], turnManager);
  }
  
  async nextTurn(): Promise<boolean> {
    const turnManager = this.gameStateStore.gameState?.turnManager;
    if (!turnManager || !this.plugin) return false;
    
    // Mark current participant as acted
    const currentParticipant = turnManager.participants[turnManager.currentTurn];
    await this.plugin.onTurnEnd(currentParticipant, turnManager);
    
    let nextTurn = turnManager.currentTurn + 1;
    let nextRound = turnManager.round;
    
    // Check if round is ending
    if (nextTurn >= turnManager.participants.length) {
      await this.plugin.onRoundEnd(turnManager);
      
      nextTurn = 0;
      nextRound += 1;
      
      // Recalculate initiative if plugin requires it
      let participants = turnManager.participants;
      if (this.plugin.shouldRecalculateOrderEachRound()) {
        participants = await this.plugin.calculateInitiative(participants);
      }
      
      // Reset hasActed flags for new round
      participants = participants.map(p => ({ ...p, hasActed: false }));
      
      const operations: StateOperation[] = [
        { path: 'turnManager.round', operation: 'set', value: nextRound },
        { path: 'turnManager.currentTurn', operation: 'set', value: nextTurn },
        { path: 'turnManager.participants', operation: 'set', value: participants }
      ];
      
      await this.gameStateStore.updateGameState(operations);
      
      const updatedTurnManager = { ...turnManager, round: nextRound, currentTurn: nextTurn, participants };
      await this.plugin.onRoundStart(updatedTurnManager);
      await this.plugin.onTurnStart(participants[0], updatedTurnManager);
    } else {
      // Normal turn progression
      const operations: StateOperation[] = [
        { path: `turnManager.participants.${turnManager.currentTurn}.hasActed`, operation: 'set', value: true },
        { path: 'turnManager.currentTurn', operation: 'set', value: nextTurn }
      ];
      
      await this.gameStateStore.updateGameState(operations);
      
      const nextParticipant = turnManager.participants[nextTurn];
      const updatedTurnManager = { ...turnManager, currentTurn: nextTurn };
      await this.plugin.onTurnStart(nextParticipant, updatedTurnManager);
    }
    
    return true;
  }
  
  canPerformAction(participantId: string, actionType: string): boolean {
    const turnManager = this.gameStateStore.gameState?.turnManager;
    if (!turnManager || !this.plugin) return false;
    
    return this.plugin.canPerformAction(participantId, actionType, turnManager);
  }
  
  async recalculateInitiative(): Promise<void> {
    const turnManager = this.gameStateStore.gameState?.turnManager;
    if (!turnManager || !this.plugin) return;
    
    // Recalculate initiative for current participants
    const recalculatedParticipants = await this.plugin.calculateInitiative(turnManager.participants);
    
    const operations: StateOperation[] = [{
      path: 'turnManager.participants',
      operation: 'set', 
      value: recalculatedParticipants
    }];
    
    await this.gameStateStore.updateGameState(operations);
  }
  
  async updateParticipantOrder(participants: ITurnParticipant[]): Promise<void> {
    if (!this.plugin) return;
    
    // Let plugin handle the reordering logic
    const reorderedParticipants = await this.plugin.updateParticipantOrder(participants);
    
    const operations: StateOperation[] = [{
      path: 'turnManager.participants',
      operation: 'set',
      value: reorderedParticipants  
    }];
    
    await this.gameStateStore.updateGameState(operations);
  }
  
  getPlugin(): BaseTurnManagerPlugin | null {
    return this.plugin;
  }
  
  async endTurnOrder(): Promise<void> {
    const turnManager = this.gameStateStore.gameState?.turnManager;
    if (!turnManager || !this.plugin) return;
    
    await this.plugin.onTurnOrderEnd(turnManager);
    
    const operations: StateOperation[] = [{
      path: 'turnManager',
      operation: 'set',
      value: null
    }];
    
    await this.gameStateStore.updateGameState(operations);
  }
}

// Export singleton instance
export const turnManagerService = new TurnManagerService();
```

### Phase 4: UI Components

#### 4.1 Turn Order Tab Integration

**File**: `packages/web/src/components/hud/tabs/TurnOrderTab.vue`
```vue
<script setup lang="ts">
import { computed, ref } from 'vue';
import { useGameStateStore } from '../../../stores/game-state.store.mts';
import { turnManagerService } from '../../../services/turn-manager.service.mts';
import { notificationStore } from '../../../stores/notification.store.mts';

const gameStateStore = useGameStateStore();

const turnManager = computed(() => gameStateStore.gameState?.turnManager);
const isInTurnOrder = computed(() => turnManager.value?.isActive ?? false);
const currentParticipant = computed(() => {
  const tm = turnManager.value;
  return tm?.participants[tm.currentTurn] || null;
});

// Get plugin capabilities for UI behavior
const plugin = computed(() => turnManagerService.getPlugin());
const supportsAutoCalculation = computed(() => plugin.value?.supportsAutomaticCalculation() ?? false);
const allowsManualReordering = computed(() => plugin.value?.allowsManualReordering() ?? true);
const calculateButtonLabel = computed(() => plugin.value?.getInitiativeButtonLabel() ?? 'Start Turn Order');
const showCalculateButton = computed(() => plugin.value?.showCalculateButton() ?? false);

// Drag-and-drop state
const draggedIndex = ref<number | null>(null);

async function startTurnBasedMode() {
  try {
    // Get tokens from current encounter
    const tokens = gameStateStore.currentEncounter?.tokens || [];
    
    const participants = tokens.map(token => ({
      id: crypto.randomUUID(),
      name: token.name,
      actorId: token.actorId,
      tokenId: token.id,
      hasActed: false,
      turnOrder: 0, // Will be calculated by plugin
    }));
    
    await turnManagerService.startTurnOrder(participants);
    notificationStore.success('Turn-based mode started!');
    
  } catch (error) {
    console.error('Failed to start turn-based mode:', error);
    notificationStore.error('Failed to start turn-based mode');
  }
}

async function calculateInitiative() {
  try {
    await turnManagerService.recalculateInitiative();
    notificationStore.success('Initiative calculated!');
  } catch (error) {
    console.error('Failed to calculate initiative:', error);
    notificationStore.error('Failed to calculate initiative');
  }
}

// Drag-and-drop handlers for manual reordering
function onDragStart(event: DragEvent, index: number) {
  draggedIndex.value = index;
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
  }
}

function onDragOver(event: DragEvent) {
  event.preventDefault();
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move';
  }
}

async function onDrop(event: DragEvent, dropIndex: number) {
  event.preventDefault();
  if (draggedIndex.value === null || !turnManager.value) return;
  
  const participants = [...turnManager.value.participants];
  const draggedItem = participants.splice(draggedIndex.value, 1)[0];
  participants.splice(dropIndex, 0, draggedItem);
  
  await turnManagerService.updateParticipantOrder(participants);
  draggedIndex.value = null;
}

async function nextTurn() {
  try {
    const continued = await turnManagerService.nextTurn();
    if (!continued) {
      notificationStore.info('Turn-based mode ended');
    }
  } catch (error) {
    console.error('Failed to advance turn:', error);
    notificationStore.error('Failed to advance turn');
  }
}

async function endTurnBasedMode() {
  try {
    await turnManagerService.endTurnOrder();
    notificationStore.success('Turn-based mode ended');
  } catch (error) {
    console.error('Failed to end turn-based mode:', error);
  }
}

function canPerformAction(actionType: string): boolean {
  const participantId = currentParticipant.value?.id;
  if (!participantId) return false;
  
  return turnManagerService.canPerformAction(participantId, actionType);
}
</script>

<template>
  <div class="turn-order-tab">
    <div v-if="!isInTurnOrder" class="turn-order-setup">
      <h3>Turn Order Setup</h3>
      <p>Set up turn order for this scene</p>
      
      <!-- Primary action: Always available, universal -->
      <button @click="startTurnBasedMode" class="btn-primary">
        {{ calculateButtonLabel }}
      </button>
      
      <!-- Secondary action: Only for systems with automatic calculation -->
      <button 
        v-if="showCalculateButton && !isInTurnOrder"
        @click="calculateInitiative" 
        class="btn-secondary ml-2"
      >
        🎲 {{ calculateButtonLabel }}
      </button>
    </div>
    
    <div v-else class="turn-order-active">
      <div class="turn-order-header">
        <h3>Turn Order - Round {{ turnManager.round }}</h3>
        <div class="header-controls">
          <!-- Recalculate button for systems that support it -->
          <button 
            v-if="showCalculateButton"
            @click="calculateInitiative" 
            class="btn-secondary"
          >
            🎲 {{ calculateButtonLabel }}
          </button>
          <button @click="endTurnBasedMode" class="btn-danger">End Turn Order</button>
        </div>
      </div>
      
      <!-- Main feature: Drag-and-drop initiative tracker (always available) -->
      <div class="initiative-tracker">
        <div class="tracker-header">
          <h4>Initiative Order</h4>
          <span v-if="allowsManualReordering" class="drag-hint">
            🔄 Drag to reorder
          </span>
        </div>
        
        <div 
          v-for="(participant, index) in turnManager.participants"
          :key="participant.id"
          :draggable="allowsManualReordering && gameStateStore.canUpdate"
          @dragstart="onDragStart($event, index)"
          @dragover="onDragOver"
          @drop="onDrop($event, index)"
          :class="{
            'participant-item': true,
            'current-turn': index === turnManager.currentTurn,
            'has-acted': participant.hasActed,
            'draggable': allowsManualReordering && gameStateStore.canUpdate,
            'drag-target': draggedIndex !== null && draggedIndex !== index
          }"
        >
          <!-- Drag handle (visible when reordering is allowed) -->
          <div v-if="allowsManualReordering" class="drag-handle">
            ⋮⋮
          </div>
          
          <div class="participant-info">
            <span class="participant-name">{{ participant.name }}</span>
            <span 
              v-if="participant.turnOrder > 0" 
              class="initiative-score"
              :title="participant.participantData?.initiativeMethod || 'Unknown method'"
            >
              {{ participant.turnOrder }}
            </span>
          </div>
          
          <div class="participant-status">
            <span v-if="index === turnManager.currentTurn" class="current-indicator">
              👑 Current Turn
            </span>
            <span v-if="participant.hasActed" class="acted-indicator">
              ✓ Acted
            </span>
          </div>
        </div>
      </div>
      
      <div class="turn-controls" v-if="gameStateStore.canUpdate">
        <button @click="nextTurn" class="btn-primary">Next Turn</button>
      </div>
      
      <div class="action-availability" v-if="currentParticipant">
        <h4>Available Actions</h4>
        <div class="action-buttons">
          <button 
            :disabled="!canPerformAction('attack')"
            class="action-btn"
          >
            ⚔️ Attack
          </button>
          <button 
            :disabled="!canPerformAction('cast-spell')"
            class="action-btn"
          >
            ✨ Cast Spell
          </button>
          <button 
            :disabled="!canPerformAction('move')"
            class="action-btn"
          >
            🏃 Move
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.participant-item {
  @apply flex items-center p-2 border-b relative;
}

.participant-item.current-turn {
  @apply bg-blue-100 border-blue-300;
}

.participant-item.has-acted {
  @apply opacity-60;
}

/* Drag-and-drop styling */
.participant-item.draggable {
  @apply cursor-move;
}

.participant-item.draggable:hover {
  @apply bg-gray-50;
}

.participant-item.drag-target {
  @apply border-t-2 border-blue-500;
}

.drag-handle {
  @apply text-gray-400 mr-2 cursor-move select-none;
}

.drag-hint {
  @apply text-sm text-gray-500 italic;
}

.tracker-header {
  @apply flex justify-between items-center mb-2 pb-2 border-b;
}

.header-controls {
  @apply flex gap-2;
}

.participant-info {
  @apply flex-1 flex justify-between items-center;
}

.initiative-score {
  @apply bg-gray-100 px-2 py-1 rounded text-sm font-mono;
}

.action-btn:disabled {
  @apply opacity-50 cursor-not-allowed;
}
</style>
```

### Phase 5: Action Permission Integration

#### 5.1 Update Player Actions Service

**File**: `packages/web/src/services/player-action.service.mts`
```typescript
import { turnManagerService } from './turn-manager.service.mts';
import { useGameStateStore } from '../stores/game-state.store.mts';
import { useGameSessionStore } from '../stores/game-session.store.mts';
import type { ActionType, ActionRequestResult } from '@dungeon-lab/shared/types/index.mjs';

export class PlayerActionService {
  // ... existing code ...
  
  private gameStateStore = useGameStateStore();
  private gameSessionStore = useGameSessionStore();
  
  async requestAction(
    action: ActionType,
    parameters: Record<string, unknown>,
    options: { priority?: string; description?: string } = {}
  ): Promise<ActionRequestResult> {
    
    // Check turn-based permissions
    const userId = this.gameSessionStore.currentUser?.id;
    const userTokens = this.getUserTokens(userId);
    
    // For actions that require it to be your turn
    if (this.requiresCurrentTurn(action)) {
      const hasValidTurn = userTokens.some(token => 
        turnManagerService.canPerformAction(token.id, action)
      );
      
      if (!hasValidTurn) {
        return {
          success: false,
          error: "It's not your turn or you cannot perform this action now"
        };
      }
    }
    
    // ... rest of existing logic ...
  }
  
  private requiresCurrentTurn(action: ActionType): boolean {
    return ['move-token', 'attack', 'cast-spell', 'use-ability'].includes(action);
  }
  
  private getUserTokens(userId: string) {
    // Get tokens owned by this user
    return this.gameStateStore.currentEncounter?.tokens.filter(token => 
      token.ownerId === userId
    ) || [];
  }
}
```

## Plugin Reference Resolution Details

### How Main App Gets Plugin Implementation

1. **Plugin Discovery**: `pluginRegistry.initialize()` loads all game system plugins (existing)
2. **Direct Access**: Each game plugin provides `turnManager` as a property
3. **Runtime Resolution**: Main app calls `pluginRegistry.getPlugin(pluginId)?.turnManager`
4. **Service Initialization**: `turnManagerService.initialize(pluginId)` gets plugin reference directly
5. **Delegation**: All turn management calls delegate to plugin for game-specific logic

### Simplified Plugin Lifecycle

```typescript
// App initialization (no changes to existing flow)
await pluginRegistry.initialize(); // Load all game system plugins

// Session start  
const campaign = gameStateStore.gameState?.campaign;
await turnManagerService.initialize(campaign?.pluginId || 'dnd-5e-2024');

// Turn order start
await turnManagerService.startTurnOrder(participants); // Uses plugin.calculateInitiative()

// During gameplay
const canAct = turnManagerService.canPerformAction(tokenId, 'attack'); // Uses plugin.canPerformAction()
```

**Key Simplifications:**
- No separate registry initialization step
- Turn manager discovered automatically when plugin loads
- Direct property access instead of separate registry lookups

## File Structure Summary

```
packages/shared/src/
└── schemas/turn-manager.schema.mts        # Core turn state schemas

packages/shared-ui/src/
└── base/base-turn-manager.mts             # Abstract base class with defaults

packages/web/src/
├── services/
│   ├── turn-manager.service.mts           # Main service implementation
│   └── player-action.service.mts          # Updated with turn permissions
└── components/hud/tabs/TurnOrderTab.vue   # Updated UI integration

packages/plugins/dnd-5e-2024/src/
├── turn-manager.mts                       # D&D 5e specific implementation
└── index.mts                              # Updated with turnManager property
```

**Note**: No separate registry needed - turn managers accessed directly from plugin registry as abstract base class instances.

## Success Criteria

- **Universal Turn State**: All systems can track whose turn it is and restrict actions accordingly
- **Game-Specific Initiative**: D&D uses d20+Dex, other systems can implement cards/bidding/narrative
- **Plugin Flexibility**: New game systems can easily implement their own turn management  
- **Permission Integration**: Action request system respects turn-based restrictions
- **Real-time Sync**: Turn state updates broadcast to all players instantly
- **UI Abstraction**: Turn Order UI works with any plugin implementation

## Next Steps

1. Implement Phase 1 (Core schemas and interfaces)
2. Create D&D plugin implementation 
3. Update TurnOrderTab.vue to use new system
4. Integrate with action permission system
5. Test with various turn-based scenarios
6. Document plugin development guide for other game systems