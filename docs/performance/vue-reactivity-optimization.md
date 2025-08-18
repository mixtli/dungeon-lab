# Vue Reactivity Optimization for Game State Updates

## Problem

The original game state update mechanism was causing complete re-renders of the entire encounter UI whenever ANY change occurred, even small ones like moving a single token.

## Root Cause

```typescript
// OLD APPROACH - Caused full re-renders
function applyStateOperations(operations: JsonPatchOperation[]): void {
  if (!gameState.value) return;
  
  // Complete object replacement - breaks Vue reactivity tracking
  gameState.value = GameStateOperations.applyOperations(gameState.value, operations);
}
```

**What this did:**
1. Created a completely new state object 
2. Replaced `gameState.value` with the new object
3. Vue lost all reactivity tracking for the previous object
4. Every computed property and watcher depending on gameState fired
5. Entire UI re-rendered

## Solution

```typescript
// NEW APPROACH - Granular reactivity
function applyStateOperations(operations: JsonPatchOperation[]): void {
  if (!gameState.value) return;

  // Apply operations in-place to preserve Vue reactivity tracking
  // This ensures only changed paths trigger re-renders, not the entire state
  GameStateOperations.applyOperationsInPlace(gameState.value, operations);
}
```

**What this does:**
1. Modifies the existing state object in-place using JSON Patch
2. Preserves Vue's reactivity tracking for unchanged portions
3. Only the specific changed paths trigger reactivity
4. Components only re-render if their specific data changed

## Performance Impact

### Before Optimization
- **Token Move**: Entire encounter re-renders (all tokens, UI panels, turn order, etc.)
- **Character HP Change**: All character sheets re-render
- **Turn Order Update**: All UI components re-render

### After Optimization  
- **Token Move**: Only the specific token and position-dependent computeds re-render
- **Character HP Change**: Only that character's sheet re-renders
- **Turn Order Update**: Only turn-order components re-render

## Implementation Details

The key was creating `applyOperationsInPlace()` that uses fast-json-patch's `mutateDocument: true` option:

```typescript
static applyOperationsInPlace(gameState: ServerGameStateWithVirtuals, operations: JsonPatchOperation[]): void {
  const patchOperations: Operation[] = operations.map(op => ({
    op: op.op,
    path: op.path, 
    value: op.value,
    from: op.from
  } as Operation));
  
  // Apply patches directly to the original object (mutating it)
  // This preserves Vue's reactivity tracking for unchanged portions
  applyPatch(gameState, patchOperations, false, true);
}
```

## Test Results

The change was verified with unit tests confirming:
- ✅ Object references are preserved for unchanged portions
- ✅ Only modified paths create new objects
- ✅ Arrays are modified in-place when possible
- ✅ Vue reactivity tracking is maintained

## Components Affected

This optimization improves performance for:
- **EncounterView** - No longer re-renders on unrelated changes
- **PixiMapViewer** - Only re-renders when tokens actually change
- **HUD components** - Only update when their specific data changes
- **Character sheets** - Only re-render when that character's data changes
- **Turn manager** - Only updates when turn order changes

## Migration

This change is backward compatible. All existing code continues to work, but now with much better performance characteristics.