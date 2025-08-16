# Multi-System Rolling Architecture Implementation Plan

**Status:** Ready for Implementation  
**Author:** Claude Code  
**Date:** 2025-01-16  
**Version:** 1.0  
**Based on:** [Multi-System Rolling Architecture Proposal](../proposals/multi-system-rolling-architecture.md)

## Overview

This plan converts the rolling architecture proposal into a structured implementation roadmap. The system uses a three-schema approach (Roll → RollServerResult → RollFinalResult) with client-side calculation and server-side dice execution only, maintaining clean separation between core framework and game-specific plugin logic.

## Architecture Summary

### Core Concepts
- **Three-Schema Flow**: Roll (client→server) → RollServerResult (server→client) → RollFinalResult (client calculated)
- **Plugin Isolation**: All game-specific logic in plugins, core handles transport only
- **Client Calculation**: Server only executes dice, client handles all modifiers and totals
- **Advantage/Disadvantage**: Handled via dice quantity (2d20) with client-side selection logic

### Key Components
- Core schemas and WebSocket events
- Plugin interfaces for roll calculation and UI
- Generic roll dialog and chat card framework
- D&D 5e implementation as reference plugin

### Integration with Existing Architecture
- **State Changes**: Roll actions integrate with existing `StateOperation` system rather than custom types
- **GM Authority**: Uses established `gameAction:request` → `gameState:update` flow for state modifications
- **Plugin Isolation**: Plugins return generic data; GM client converts to `StateOperation[]` for consistency
- **No Game-Specific Types in Shared**: All D&D-specific types (damage, healing, etc.) handled in plugin layer

## 🎯 **Reordered Timeline: Ability Check Priority (Architecture Preserved)**

**Week 1 (Phase 1)**: Full architecture, core infrastructure
- [ ] Complete schemas and plugin interfaces (unchanged from original)
- [ ] Plugin registry and validation system
- [ ] Server roll handler with full recipient routing
- [ ] Client result processing with plugin integration
- [ ] Core roll dialog component (generic, plugin-driven)

**Week 2 (Phase 2)**: D&D plugin with ability checks only
- [ ] D&D plugin implements full interfaces but only "ability-check" roll type
- [ ] D&D custom arguments component (advantage/disadvantage)
- [ ] D&D chat card component for ability check results
- [ ] Character sheet integration for ability scores only
- [ ] **DELIVERABLE: Working ability checks from character sheet to chat**

**Weeks 3-4 (Phase 3)**: Complete D&D implementation
- [ ] Add remaining roll types to D&D plugin (attack, damage, saves)
- [ ] Character sheet integration for weapons and combat
- [ ] Advanced chat card actions and automation

**Week 5 (Phase 4)**: Testing and polish
- [ ] Comprehensive testing
- [ ] Documentation
- [ ] Performance optimization

## Phase 1: End-to-End Ability Check Flow (Week 1)

**Priority:** Critical  
**Dependencies:** None  
**Goal:** Click ability → dialog → roll → chat result (complete working flow)

### Task 1.1: Minimal Core Schemas

**Estimated Time:** 1 day

**Files to Create:**
```
packages/shared/src/schemas/roll.schema.mts (minimal version)
packages/shared/src/types/socket/roll-events.mts (basic events only)
```

**Implementation Details:**

#### `packages/shared/src/schemas/roll.schema.mts`
```typescript
import { z } from 'zod';

// Roll (Client → Server) - What client sends to initiate a roll
export const rollSchema = z.object({
  id: z.string(),
  rollType: z.string(),
  pluginId: z.string(),
  gameSessionId: z.string(),
  
  // What server actually needs to process
  dice: z.array(z.object({
    sides: z.number(),
    quantity: z.number()
  })),
  recipients: z.enum(['public', 'private', 'gm']),
  
  // User-configurable arguments (from roll dialog)
  arguments: z.object({
    customModifier: z.number().default(0),
    pluginArgs: z.record(z.unknown()).default({})
  }),
  
  // Plugin-calculated modifiers (automatic from character stats)
  modifiers: z.array(z.object({
    type: z.string(),
    value: z.number(),
    source: z.string()
  })),
  
  // Display metadata (for chat cards and UI)
  metadata: z.object({
    title: z.string(),
    description: z.string().optional(),
    characterName: z.string().optional(),
  }).passthrough()
});

// RollServerResult (Server → Client) - What server sends back with dice results
export const rollServerResultSchema = rollSchema.extend({
  results: z.array(z.object({
    sides: z.number(),
    quantity: z.number(),
    results: z.array(z.number())
  })),
  userId: z.string(),
  timestamp: z.date()
});

// RollFinalResult (Client calculated) - What client creates for display
export const rollFinalResultSchema = rollServerResultSchema.extend({
  total: z.number()
});

export type Roll = z.infer<typeof rollSchema>;
export type RollServerResult = z.infer<typeof rollServerResultSchema>;
export type RollFinalResult = z.infer<typeof rollFinalResultSchema>;
```

#### `packages/shared/src/types/socket/roll-events.mts`
```typescript
import type { Roll, RollServerResult } from '../schemas/roll.schema.mjs';

export interface RollSocketEvents {
  // Core roll execution
  'roll': (roll: Roll, callback: RollCallback) => void;
  'roll:result': (result: RollServerResult) => void;
}

export interface RollCallback {
  (response: { success: boolean; error?: string }): void;
}
```


**Acceptance Criteria:**
- [x] All schemas validate correctly with Zod
- [x] Types export properly across packages
- [x] No TypeScript compilation errors
- [x] Schema tests pass

---

### Task 1.2: Plugin Context Roll API

**Status:** ✅ COMPLETE

**Estimated Time:** 1 day  
**Dependencies:** Task 1.1

**Files to Modify:**
```
packages/shared-ui/src/types/plugin-context.mts
packages/web/src/services/plugin-implementations/plugin-context-impl.mjs
```

**Implementation Details:**

Add minimal roll submission API to existing PluginContext:

```typescript
// Add to existing PluginContext interface
export interface PluginContext {
  // ... existing methods ...
  
  /**
   * Submit a roll to the server
   * Plugins use this instead of direct socket access
   */
  submitRoll(roll: Roll): void;
}
```

Simple implementation using existing socket infrastructure:

```typescript
// In plugin-context-impl.mjs - add to existing createPluginContext function
submitRoll(roll: Roll): void {
  const socket = socketStore.socket;
  if (!socket) {
    console.error('No socket connection available for roll submission');
    return;
  }
  
  socket.emit('roll', roll);
}
```

**Acceptance Criteria:**
- [ ] PluginContext has submitRoll method
- [ ] Implementation uses existing socket infrastructure
- [ ] Proper error handling for missing connection

---

### Task 1.3: Server-Side Dice Rolling

**Status:** ✅ COMPLETE

**Estimated Time:** 2 days  
**Dependencies:** Task 1.1, Task 1.2

**Files to Create:**
```
packages/server/src/websocket/handlers/roll.handler.mts
```

**Implementation Details:**

Simple server handler that only rolls dice and routes messages:

```typescript
import { Socket } from 'socket.io';
import { socketHandlerRegistry } from '../handler-registry.mjs';
import type { Roll, RollServerResult } from '@dungeon-lab/shared/types/index.mjs';

function rollHandler(socket: Socket): void {
  socket.on('roll', async (roll: Roll) => {
    try {
      // Basic auth check
      if (!socket.userId) {
        throw new Error('User not authenticated');
      }

      // Execute dice rolls only
      const diceResults = [];
      for (const diceGroup of roll.dice) {
        const results = [];
        for (let i = 0; i < diceGroup.quantity; i++) {
          results.push(Math.floor(Math.random() * diceGroup.sides) + 1);
        }
        diceResults.push({
          sides: diceGroup.sides,
          quantity: diceGroup.quantity,
          results
        });
      }
      
      // Create server result with dice outcomes
      const serverResult: RollServerResult = {
        ...roll, // Include all original roll data
        results: diceResults,
        userId: socket.userId,
        timestamp: new Date()
      };
      
      // Route to game session participants
      socket.to(roll.gameSessionId).emit('roll:result', serverResult);
      socket.emit('roll:result', serverResult);
      
    } catch (error) {
      console.error('Roll execution failed:', error);
    }
  });
}

socketHandlerRegistry.register(rollHandler);
```

**Acceptance Criteria:**
- [ ] Server executes dice rolls only
- [ ] Results routed to game session room
- [ ] Basic authentication validation
- [ ] Integration with existing socket handler system

---

### Task 1.4: Basic Result Listener

**Status:** ✅ COMPLETE

**Estimated Time:** 1 day  
**Dependencies:** Task 1.3

**Files Created:**
```
packages/web/src/stores/roll.store.mts
```

**Implementation Details:**

Instead of a simple listener function, implemented a full Pinia store following codebase patterns:

- **Roll Store Pattern**: Created `/packages/web/src/stores/roll.store.mts` following the chat store pattern
- **Socket Watcher**: Automatically sets up listeners when socket becomes available
- **State Management**: Maintains roll results history with filtering capabilities
- **Composable Export**: Provides `useRollResults()` composable for components
- **Memory Management**: Keeps only last 50 rolls to prevent memory issues
- **Console Logging**: Logs roll results for Phase 1 testing requirement

**Key Features:**
- Reactive roll results accessible via composable
- Automatic socket lifecycle management
- Methods for filtering by session/user
- Consistent with existing store patterns

**Acceptance Criteria:**
- [x] Listener receives roll results from server
- [x] Basic console output for testing  
- [x] Integration with existing socket setup
- [x] Store follows established codebase patterns
- [x] Provides reactive access to roll results

---

## Phase 2: Plugin-Owned Rolling Implementation (Week 2)

**Priority:** Critical  
**Dependencies:** Phase 1 complete  
**Goal:** D&D plugin handles own roll flow, displays results in chat

### Task 2.1: D&D Character Sheet Roll Dialog

**Status:** ✅ COMPLETE

**Estimated Time:** 2 days  
**Dependencies:** Phase 1 complete

**Files to Create/Modify:**
```
packages/plugins/dnd-5e-2024/src/components/internal/common/AdvantageRollDialog.vue  [NEW]
packages/plugins/dnd-5e-2024/src/components/exports/character-sheet.vue             [MODIFY]
```

**Implementation Details:**

Interactive roll dialog system with advantage/disadvantage options and recipient selection:

**AdvantageRollDialog Component Features:**
- Modal dialog with backdrop
- Roll title display (e.g., "Strength Check")
- Custom modifier input (default: 0)
- Advantage mode selection: Normal/Advantage/Disadvantage (default: Normal)
- Recipient selection: Public/Private/GM (default: Public)
- Roll and Cancel buttons

**Character Sheet Integration:**
```typescript
// In D&D CharacterSheet.vue - Updated approach
function openAbilityRollDialog(ability: string) {
  currentRollAbility.value = ability;
  showRollDialog.value = true;
}

function submitRoll(rollData: RollDialogData) {
  const abilityScore = finalAbilities.value[rollData.ability];
  const baseModifier = Math.floor((abilityScore - 10) / 2);
  
  const roll: Roll = {
    id: generateId(),
    rollType: 'ability-check',
    pluginId: 'dnd-5e-2024',
    gameSessionId: currentSession.id,
    dice: [{ sides: 20, quantity: rollData.advantageMode === 'normal' ? 1 : 2 }],
    recipients: rollData.recipients,
    arguments: { customModifier: 0, pluginArgs: { ability } },
    modifiers: [
      { type: 'ability', value: modifier, source: `${ability} modifier` }
    ],
    metadata: {
      title: `${ability.charAt(0).toUpperCase() + ability.slice(1)} Check`,
      characterName: character.name
    }
  };
  
  pluginContext.submitRoll(roll);
}
```

**Acceptance Criteria:**
- [x] AdvantageRollDialog component created with all required form fields
- [x] Clicking ability scores opens roll dialog instead of direct rolling
- [x] Dialog allows selection of advantage/normal/disadvantage modes
- [x] Dialog includes custom modifier input field
- [x] Dialog includes recipient selection (Public/Private/GM)
- [x] Roll button submits via PluginContext.submitRoll()
- [x] Dialog closes after successful roll submission
- [x] Rolls appear in chat/results based on recipient setting
- [x] Character sheet updated to use new dialog system

**Implementation Notes:**
- Created `/packages/plugins/dnd-5e-2024/src/components/internal/common/AdvantageRollDialog.vue`
- Updated `/packages/plugins/dnd-5e-2024/src/components/exports/character-sheet.vue`
- Replaced direct roll emission with dialog-based approach
- Integrated PluginContext.submitRoll() for roll submission
- Added roll preview and form validation
- Implemented proper modal styling with animations

---

### Task 2.2: Chat Card Component

**Estimated Time:** 1 day  
**Dependencies:** Task 2.1 complete

**Files to Create:**
```
packages/plugins/dnd-5e-2024/web/src/components/DndAbilityCheckChatCard.vue
```

**Files to Modify:**
```
packages/plugins/dnd-5e-2024/web/src/plugin.mts
```

**Implementation Details:**

Simple chat card component and plugin registration:

```typescript
// Update D&D plugin getComponent method
async getComponent(type: string) {
  if (type === 'chat-card-ability-check') {
    return (await import('./components/DndAbilityCheckChatCard.vue')).default;
  }
  // ... existing components
}
```

**Acceptance Criteria:**
- [ ] Plugin provides chat card component
- [ ] Chat card displays roll results

---

## Summary

This simplified implementation plan focuses on:

**Phase 1 (Core Infrastructure):**
- Basic roll schemas (Roll → RollServerResult)  
- PluginContext.submitRoll() API
- Server-side dice rolling only
- Basic result listener for testing

**Phase 2 (Plugin Implementation):**
- D&D plugin handles own roll logic
- Chat card components provided by plugins
- No complex orchestration or generic systems

The approach is plugin-owned with minimal central infrastructure, using existing plugin registry and PluginContext systems.
