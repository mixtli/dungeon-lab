# State Management Developer Guide

## Quick Start

This guide shows how to implement features that interact with Dungeon Lab's GM-authoritative state system. All examples use the unified game state architecture.

## Game State Object Model

**Key Concept**: Game state stores **complete document objects** as working copies, not just references.

### Lifecycle Overview
1. **Document Creation**: Documents are created in MongoDB via API calls, compendium instantiation, or other services
2. **State Addition**: Complete document objects are copied into reactive game state
3. **Session Work**: All modifications happen to the in-memory copies during gameplay
4. **Deferred Sync**: Modified objects are synced back to MongoDB at session boundaries (end, etc.)

### Object Storage Structure
```typescript
interface ServerGameState {
  characters: ICharacter[];    // Complete character objects with MongoDB IDs
  actors: IActor[];           // Complete NPC/actor objects  
  items: IItem[];            // Complete item objects
  currentEncounter: IEncounter | null; // Complete encounter with embedded tokens
}
```

**Important**: Game state is a **session-scoped cache** where:
- Objects have real MongoDB `_id` fields
- Changes affect in-memory copies only during session
- Database persistence is deferred until key sync points
- Only documents from the same campaign can be added

## Basic State Operations

### Reading Game State

```typescript
// In any Vue component or service
import { useGameStateStore } from '@/stores/game-state.store.mjs';

const gameStateStore = useGameStateStore();

// Access current data (reactive)
const characters = gameStateStore.characters;      // ICharacter[]
const actors = gameStateStore.actors;             // IActor[] (NPCs)
const items = gameStateStore.items;               // IItem[]
const encounter = gameStateStore.currentEncounter; // IEncounter | null

// Get specific character
const character = characters.value.find(c => c.id === characterId);

// Get character's items (relationship-based)
const characterItems = gameStateStore.getCharacterItems(characterId);
```

### Updating State (GM Only)

```typescript
// GM client making state changes
import { useGameStateStore } from '@/stores/game-state.store.mjs';

const gameStateStore = useGameStateStore();

// Single field update
await gameStateStore.updateGameState([{
  path: "characters.0.pluginData.hitPoints",
  operation: "set", 
  value: 25
}]);

// Multiple operations in single atomic update
await gameStateStore.updateGameState([
  {
    path: "characters.0.pluginData.hitPoints", 
    operation: "set", 
    value: characterMaxHP
  },
  {
    path: "characters.0.experience", 
    operation: "inc", 
    value: 150  
  },
  {
    path: "characters.0.conditions", 
    operation: "pull", 
    value: "unconscious"
  }
]);
```

## Player Action Request System

### Implementing Player-Initiated Features

For features that require GM approval (like token movement, adding documents, etc.):

```typescript
// Player client requesting action
import { useActionRequestStore } from '@/stores/action-request.store.mjs';

const actionStore = useActionRequestStore();

// Example 1: Request token movement
try {
  const result = await actionStore.requestAction({
    action: 'move-token',
    parameters: {
      tokenId: 'token_123',
      newPosition: { x: 150, y: 200 }
    },
    description: 'Move goblin to new position'
  });
  
  if (result.approved) {
    console.log('Movement approved by GM');
  } else {
    console.log('Movement denied:', result.error);
  }
} catch (error) {
  console.error('Request failed:', error);
}

// Example 2: Request adding existing document to session
// (Document must already exist in database and campaign)
try {
  const result = await actionStore.requestAction({
    action: 'add-document',
    parameters: {
      compendiumId: 'compendium_123',
      entryId: 'entry_456', 
      documentData: existingCharacterObject // Complete ICharacter from API/compendium
    },
    description: 'Add character to session'
  });
  
  if (result.approved) {
    console.log('Document added to session by GM');
    // Document is now available in gameStateStore.characters
  }
} catch (error) {
  console.error('Add document request failed:', error);
}
```

### Handling Requests on GM Client

The GM client automatically processes requests through `GMActionHandlerService`:

```typescript
// packages/web/src/services/gm-action-handler.service.mts

export class GMActionHandlerService {
  private async handleTokenMovement(request: GameActionRequest) {
    const params = request.parameters as MoveTokenParameters;
    
    // 1. Validate the request
    const token = this.gameStateStore.currentEncounter?.tokens?.find(
      t => t.id === params.tokenId
    );
    if (!token) {
      return this.socketStore.emit('gameAction:response', {
        success: false,
        requestId: request.id,
        error: { code: 'TOKEN_NOT_FOUND', message: 'Token not found' }
      });
    }
    
    // 2. Apply game rules (collision detection, etc.)
    const collision = checkWallCollision(
      token.position, 
      params.newPosition, 
      mapData
    );
    if (collision) {
      return this.socketStore.emit('gameAction:response', {
        success: false, 
        requestId: request.id,
        error: { code: 'COLLISION_DETECTED', message: 'Movement blocked' }
      });
    }
    
    // 3. Execute via state update
    const result = await this.gameStateStore.updateGameState([{
      path: `currentEncounter.tokens.${tokenIndex}.position`,
      operation: 'set',
      value: params.newPosition
    }]);
    
    // 4. Send response
    this.socketStore.emit('gameAction:response', {
      success: true,
      approved: true, 
      requestId: request.id
    });
  }
}
```

## Common Patterns

### Adding Existing Documents to Session State

**Important**: Game state stores complete document objects as working copies, not references. Documents must be created in the database first, then added to the reactive game state.

```typescript
// Step 1: Create character via API (returns complete ICharacter object)
const response = await fetch('/api/characters', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Aragorn',
    campaignId: currentCampaignId, // Must match session campaign
    pluginId: 'dnd-5e-2024',
    // ... other character data
  })
});
const newCharacter = await response.json(); // Complete ICharacter with MongoDB _id

// Step 2: Add existing character object to session state
await gameStateStore.updateGameState([{
  path: "characters",
  operation: "push", 
  value: newCharacter // Full character object, not just ID
}]);

// Example: Add existing item to session (same pattern)
const itemResponse = await fetch('/api/items', {
  method: 'POST',
  body: JSON.stringify({
    name: 'Sting',
    ownerId: newCharacter.id,
    campaignId: currentCampaignId,
    // ... item data
  })
});
const newItem = await itemResponse.json(); // Complete IItem

await gameStateStore.updateGameState([{
  path: "items",
  operation: "push",
  value: newItem // Full item object
}]);
```

**Key Points**:
- Documents must exist in MongoDB before adding to state
- Documents must belong to the same campaign as the session
- Game state stores **complete objects**, not just IDs
- State modifications happen to in-memory copies
- Database sync occurs at session boundaries

### Managing Encounter State

```typescript
// Encounters are typically created via API or workflow, then set as current
// Example: Starting a pre-created encounter
await gameStateStore.updateGameState([{
  path: "currentEncounter",
  operation: "set", 
  value: existingEncounter // Complete IEncounter object from API
}]);

// Add token to existing encounter (tokens are part of encounter object)
const newToken = {
  id: '507f1f77bcf86cd799439011', // Real MongoDB ObjectId from token creation
  name: 'Goblin Warrior',
  position: { x: 100, y: 100 },
  size: 'medium' as TokenSizeType,
  // ... other token data
};

await gameStateStore.updateGameState([{
  path: "currentEncounter.tokens",
  operation: "push",
  value: newToken
}]);

// Remove token from encounter
await gameStateStore.updateGameState([{
  path: "currentEncounter.tokens", 
  operation: "pull",
  value: tokenToRemove // Matches by equality
}]);

// Clear current encounter
await gameStateStore.updateGameState([{
  path: "currentEncounter",
  operation: "set",
  value: null
}]);
```

### Plugin Integration

```typescript
// Plugin accessing game state
import { useGameStateStore } from '@dungeon-lab/shared/stores/game-state.store.mjs';

export class DnD5ePlugin {
  private gameStateStore = useGameStateStore();
  
  // Calculate character AC from equipment  
  getArmorClass(characterId: string): number {
    const character = this.gameStateStore.characters.find(c => c.id === characterId);
    if (!character) return 10;
    
    const items = this.gameStateStore.getCharacterItems(characterId);
    const armor = items.find(item => 
      item.pluginData?.dnd5e?.itemType === 'armor' && 
      item.pluginData?.dnd5e?.equipped === true
    );
    
    return armor?.pluginData?.dnd5e?.armorClass || (10 + character.pluginData?.dexterityModifier || 0);
  }
  
  // Update character HP through state system
  async setHitPoints(characterId: string, newHP: number): Promise<void> {
    const characterIndex = this.gameStateStore.characters.findIndex(c => c.id === characterId);
    if (characterIndex === -1) throw new Error('Character not found');
    
    await this.gameStateStore.updateGameState([{
      path: `characters.${characterIndex}.pluginData.hitPoints`,
      operation: "set",
      value: newHP
    }]);
  }
}
```

## Error Handling

### Version Conflicts

```typescript
try {
  await gameStateStore.updateGameState(operations);
} catch (error) {
  if (error.code === 'VERSION_CONFLICT') {
    // State was updated by someone else - refresh and retry
    await gameStateStore.requestFullState();
    
    // Ask user if they want to retry
    const retry = confirm('Game state was updated. Retry your changes?');
    if (retry) {
      await gameStateStore.updateGameState(operations);
    }
  }
}
```

### Permission Errors

```typescript
// Check GM status before attempting updates
if (!gameStateStore.canUpdate) {
  throw new Error('Only the GM can modify game state');
}

// Or handle gracefully in UI
const isGM = computed(() => gameStateStore.canUpdate);

// In template:
<button :disabled="!isGM" @click="updateState">
  Update Character (GM Only)
</button>
```

### State Validation Errors

```typescript
try {
  await gameStateStore.updateGameState([{
    path: "characters.999.hitPoints", // Invalid index
    operation: "set",
    value: 25
  }]);
} catch (error) {
  if (error.code === 'VALIDATION_ERROR') {
    console.error('Invalid state operation:', error.message);
    // Show user-friendly error message
  }
}
```

## Best Practices  

### 1. Batch Related Operations
```typescript
// ✅ Good: Single atomic update
await gameStateStore.updateGameState([
  { path: "characters.0.hitPoints", operation: "set", value: 25 },
  { path: "characters.0.conditions", operation: "push", value: "unconscious" }
]);

// ❌ Bad: Multiple separate updates  
await gameStateStore.updateGameState([{ path: "characters.0.hitPoints", operation: "set", value: 25 }]);
await gameStateStore.updateGameState([{ path: "characters.0.conditions", operation: "push", value: "unconscious" }]);
```

### 2. Use Computed Properties for Reactive Data
```typescript
// ✅ Good: Reactive data access
const characterHP = computed(() => {
  const char = gameStateStore.characters.find(c => c.id === characterId.value);
  return char?.pluginData?.hitPoints || 0;
});

// ❌ Bad: Direct access (not reactive)
function getCharacterHP() {
  return gameStateStore.characters.find(c => c.id === characterId.value)?.pluginData?.hitPoints || 0;
}
```

### 3. Handle Loading and Error States
```typescript
const { loading, error } = storeToRefs(gameStateStore);

// In template:
<div v-if="loading">Loading game state...</div>
<div v-else-if="error" class="error">{{ error }}</div>
<div v-else>
  <!-- Your component content -->
</div>
```

### 4. Relationship-Based Data Access
```typescript  
// ✅ Good: Use helper functions for relationships
const characterItems = gameStateStore.getCharacterItems(characterId);

// ❌ Bad: Manual filtering every time
const characterItems = gameStateStore.items.filter(item => item.ownerId === characterId);
```

## Testing State Operations

```typescript
// Unit test example
import { createTestingPinia } from '@pinia/testing';
import { useGameStateStore } from '@/stores/game-state.store.mjs';

describe('Game State Updates', () => {
  beforeEach(() => {
    setActivePinia(createTestingPinia());
  });
  
  it('should update character hit points', async () => {
    const store = useGameStateStore();
    
    // Mock initial state
    store.gameState = {
      characters: [{ id: 'char1', pluginData: { hitPoints: 50 } }],
      actors: [],
      items: [],
      currentEncounter: null
    };
    
    // Mock the update method
    store.updateGameState = vi.fn().mockResolvedValue({ success: true });
    
    // Test the operation
    await store.updateGameState([{
      path: "characters.0.pluginData.hitPoints",
      operation: "set", 
      value: 25
    }]);
    
    expect(store.updateGameState).toHaveBeenCalledWith([{
      path: "characters.0.pluginData.hitPoints",
      operation: "set",
      value: 25
    }]);
  });
});
```

## Debugging Tips

### 1. Monitor State Changes
```typescript
// Watch for state updates in dev tools
watch(() => gameStateStore.gameStateVersion, (newVersion, oldVersion) => {
  console.log(`State updated: ${oldVersion} → ${newVersion}`);
});
```

### 2. Validate State Integrity
```typescript
// Check state hash matches server
if (gameStateStore.gameStateHash !== expectedHash) {
  console.warn('State integrity mismatch - requesting full sync');
  await gameStateStore.requestFullState();
}
```

### 3. Log Failed Operations  
```typescript
try {
  await gameStateStore.updateGameState(operations);
} catch (error) {
  console.error('State update failed:', {
    operations,
    error: error.message,
    currentVersion: gameStateStore.gameStateVersion
  });
}
```

---

*This guide covers the core patterns for working with Dungeon Lab's state management system. For more complex scenarios, refer to the existing implementations in the codebase.*