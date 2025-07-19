# Event-Driven Architecture Migration Plan

## Overview

This document outlines the migration plan from REST API-based communication to a real-time, event-driven architecture using Socket.io with callbacks. The goal is to make the application more responsive and collaborative while maintaining REST API compatibility for external integrations.

## Current State Analysis

### Existing Stores
- **Actor Store**: Only tracks `currentActor`, uses REST API calls
- **Item Store**: Already tracks full `items` array + `currentItem`, uses REST API calls  
- **Encounter Store**: Tracks `currentEncounter`, already has socket events for tokens
- **Campaign Store**: Tracks `currentCampaign`, REST-based (no changes needed)
- **Socket Infrastructure**: Well established with existing events like `token:*`, `roll`, `chat`

### Current HUD Components
- **ActorsTab**: Uses hardcoded sample data, not connected to stores
- **ItemsTab**: Needs to be connected to item store
- **Other tabs**: Currently using sample data or limited integration

### Problems to Solve
1. ActorsTab uses hardcoded data instead of real actors from store
2. No real-time updates when actors/items change
3. Actor store only tracks single `currentActor`, not full list for HUD
4. Poor collaborative experience - users don't see each other's changes
5. Excessive REST API calls for data that could be cached and updated via events

## Architecture Changes

### Current Flow (REST-based)
```
Component → Store → REST Client → HTTP Request → Server → Database
                                      ↓
Component ← Store ← REST Response ← HTTP Response ← Server ← Database
```

### Target Flow (Event-driven with Callbacks)
```
Component → Store → Socket Emit (with callback) → Server → Database
                                      ↓
Component ← Store ← Socket Callback ← Server ← Database

// Plus real-time updates:
Other Users → Socket Broadcast → Store → Component (auto-update)
```

## ✅ Phase 1: Enhance Stores with Socket Communication [COMPLETED]

### ✅ 1.1 Update Actor Store [COMPLETED]

**Add full actors list tracking:**
```typescript
// Current
const currentActor = ref<IActor | null>(null);

// Enhanced
const actors = ref<IActor[]>([]);
const currentActor = ref<IActor | null>(null);
```

**Add socket-based fetch methods using callbacks:**
```typescript
async function fetchActors(): Promise<IActor[]> {
  return new Promise((resolve, reject) => {
    socketStore.emit('actor:list', (response) => {
      if (response.success) {
        actors.value = response.data;
        resolve(response.data);
      } else {
        reject(new Error(response.error));
      }
    });
  });
}

async function createActor(actorData: CreateActorRequest): Promise<IActor> {
  return new Promise((resolve, reject) => {
    socketStore.emit('actor:create', actorData, (response) => {
      if (response.success) {
        // Local state updated via broadcast event
        resolve(response.data);
      } else {
        reject(new Error(response.error));
      }
    });
  });
}
```

**Add reactive socket listeners for broadcasts:**
```typescript
function setupSocketHandlers() {
  socketStore.on('actor:created', (actor: IActor) => {
    actors.value.push(actor);
  });

  socketStore.on('actor:updated', (updatedActor: IActor) => {
    const index = actors.value.findIndex(a => a.id === updatedActor.id);
    if (index !== -1) {
      actors.value[index] = updatedActor;
    }
    if (currentActor.value?.id === updatedActor.id) {
      currentActor.value = updatedActor;
    }
  });

  socketStore.on('actor:deleted', (actorId: string) => {
    actors.value = actors.value.filter(a => a.id !== actorId);
    if (currentActor.value?.id === actorId) {
      currentActor.value = null;
    }
  });
}
```

**Add lazy loading:**
```typescript
async function ensureActorsLoaded(): Promise<IActor[]> {
  if (actors.value.length === 0) {
    await fetchActors();
  }
  return actors.value;
}
```

### ✅ 1.2 Update Item Store [COMPLETED]

✅ Applied the same pattern to the item store:
- ✅ Convert existing REST calls to socket calls with callbacks
- ✅ Add reactive socket listeners for real-time updates
- ✅ Maintain same public interface

## ✅ Phase 2: Define Socket Events [COMPLETED]

### 2.1 Request Events with Callbacks (Client→Server)

**Actor Events:**
```typescript
// Get list of user's actors
socket.emit('actor:list', (response: { success: boolean; data?: IActor[]; error?: string }) => {});

// Get single actor
socket.emit('actor:get', actorId, (response: { success: boolean; data?: IActor; error?: string }) => {});

// Create new actor
socket.emit('actor:create', actorData, (response: { success: boolean; data?: IActor; error?: string }) => {});

// Update existing actor
socket.emit('actor:update', { id: actorId, ...updateData }, (response: { success: boolean; data?: IActor; error?: string }) => {});

// Delete actor
socket.emit('actor:delete', actorId, (response: { success: boolean; error?: string }) => {});
```

**Item Events:**
```typescript
// Same pattern for items
socket.emit('item:list', (response) => {});
socket.emit('item:create', itemData, (response) => {});
socket.emit('item:update', updateData, (response) => {});
socket.emit('item:delete', itemId, (response) => {});
```

### 2.2 Broadcast Events (Server→Client)

**Real-time updates for collaboration:**
```typescript
// Broadcast to all relevant users when data changes
socket.broadcast.emit('actor:created', actor);
socket.broadcast.emit('actor:updated', actor);
socket.broadcast.emit('actor:deleted', actorId);

socket.broadcast.emit('item:created', item);
socket.broadcast.emit('item:updated', item);
socket.broadcast.emit('item:deleted', itemId);
```

### ✅ 2.3 Socket Event Schema Updates [COMPLETED]

✅ Added to `packages/shared/src/schemas/socket/`:

**actors.mts:**
```typescript
import { z } from 'zod';

// Request/Response schemas
export const actorListArgsSchema = z.tuple([]);
export const actorGetArgsSchema = z.tuple([z.string()]);

// Callback response schema
export const actorCallbackSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.string().optional()
});

// Broadcast event schemas
export const actorCreatedSchema = z.object({
  // Actor object schema
});
```

## ✅ Phase 3: Implement Server-Side Socket Handlers [COMPLETED]

### ✅ 3.1 Create Actor Socket Handler [COMPLETED]

✅ **File: `packages/server/src/websocket/handlers/actor-handler.mts`**
```typescript
import { Socket } from 'socket.io';
import { ActorService } from '../../features/actors/services/actor.service.mjs';
import type { ClientToServerEvents, ServerToClientEvents } from '@dungeon-lab/shared/types/socket/index.mjs';

export function registerActorSocketHandlers(socket: Socket<ClientToServerEvents, ServerToClientEvents>) {
  const actorService = new ActorService();

  socket.on('actor:list', async (callback) => {
    try {
      const actors = await actorService.getUserActors(socket.userId);
      callback({ success: true, data: actors });
    } catch (error) {
      callback({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  socket.on('actor:create', async (actorData, callback) => {
    try {
      const actor = await actorService.createActor({
        ...actorData,
        createdBy: socket.userId
      });
      
      // Broadcast to other users who can see this actor
      socket.broadcast.to(`user:${socket.userId}`).emit('actor:created', actor);
      
      callback({ success: true, data: actor });
    } catch (error) {
      callback({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  socket.on('actor:update', async (updateData, callback) => {
    try {
      const actor = await actorService.updateActor(updateData.id, updateData, socket.userId);
      
      // Broadcast update
      socket.broadcast.to(`user:${socket.userId}`).emit('actor:updated', actor);
      
      callback({ success: true, data: actor });
    } catch (error) {
      callback({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  socket.on('actor:delete', async (actorId, callback) => {
    try {
      await actorService.deleteActor(actorId, socket.userId);
      
      // Broadcast deletion
      socket.broadcast.to(`user:${socket.userId}`).emit('actor:deleted', actorId);
      
      callback({ success: true });
    } catch (error) {
      callback({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });
}
```

### ✅ 3.2 Register Handlers [COMPLETED]

✅ **Updated `packages/server/src/websocket/handlers/index.mts`:**
```typescript
import { registerActorSocketHandlers } from './actor-handler.mjs';
import { registerItemSocketHandlers } from './item-handler.mjs';

export function setupSocketHandlers(socket: Socket) {
  registerActorSocketHandlers(socket);
  registerItemSocketHandlers(socket);
  // ... existing handlers
}
```

## ✅ Phase 4: Connect HUD Components to Stores [COMPLETED]

### ✅ 4.1 Update ActorsTab [COMPLETED]

✅ **Replaced hardcoded data with store integration:**
```typescript
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useActorStore } from '../../../stores/actor.store.mjs';
import type { IActor } from '@dungeon-lab/shared/types/index.mjs';

const actorStore = useActorStore();
const searchQuery = ref('');
const activeFilter = ref('all');

// Use real data from store instead of hardcoded
const actors = computed(() => actorStore.actors);

const filteredActors = computed(() => {
  let filtered = actors.value;

  // Filter by type
  if (activeFilter.value !== 'all') {
    filtered = filtered.filter(actor => actor.type === activeFilter.value);
  }

  // Filter by search query
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(actor => 
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
  actorStore.setCurrentActor(actor.id);
}

async function addToEncounter(actor: IActor): Promise<void> {
  // Use encounter store to add actor
  const encounterStore = useEncounterStore();
  await encounterStore.addParticipant(encounterStore.currentEncounter?.id, actor.id);
}

async function editActor(actor: IActor): Promise<void> {
  // Navigate to actor edit view or open modal
  router.push(`/actors/${actor.id}/edit`);
}

</script>
```

### ✅ 4.2 Create ItemsTab [COMPLETED]

**Create ItemsTab component following the same pattern as ActorsTab:**
```typescript
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useItemStore } from '../../../stores/item.store.mjs';
import type { IItem } from '@dungeon-lab/shared/types/index.mjs';

const itemStore = useItemStore();
const searchQuery = ref('');
const activeFilter = ref('all');

// Use real data from store instead of hardcoded
const items = computed(() => itemStore.items);

const filteredItems = computed(() => {
  let filtered = items.value;

  // Filter by search query
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(item => 
      item.name.toLowerCase().includes(query) ||
      item.type.toLowerCase().includes(query)
    );
  }

  return filtered;
});

// Load items when component mounts
onMounted(async () => {
  try {
    await itemStore.ensureItemsLoaded();
  } catch (error) {
    console.error('Failed to load items:', error);
  }
});

// Implement real functionality
async function selectItem(item: IItem): Promise<void> {
  itemStore.setCurrentItem(item.id);
}

async function editItem(item: IItem): Promise<void> {
  console.log('Editing item:', item);
}

async function duplicateItem(item: IItem): Promise<void> {
  try {
    const duplicatedData = {
      ...item,
      name: `${item.name} (Copy)`,
      id: undefined // Let server generate new ID
    };
    await itemStore.createItemSocket(duplicatedData);
  } catch (error) {
    console.error('Failed to duplicate item:', error);
  }
}
</script>
```

## Phase 5: Smart Caching & Reactivity

### 5.1 Store Cache Management

**Intelligent loading strategy:**
```typescript
// In actor store
const lastFetched = ref<Date | null>(null);
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

async function ensureActorsLoaded(forceRefresh = false): Promise<IActor[]> {
  const now = new Date();
  const shouldRefresh = forceRefresh || 
    actors.value.length === 0 || 
    !lastFetched.value || 
    (now.getTime() - lastFetched.value.getTime()) > CACHE_DURATION;

  if (shouldRefresh) {
    await fetchActors();
    lastFetched.value = now;
  }
  
  return actors.value;
}
```

### 5.2 Component Integration Pattern

**Standard pattern for all components:**
```typescript
// In any component that needs actors
const actorStore = useActorStore();

onMounted(async () => {
  await actorStore.ensureActorsLoaded(); // Smart loading
});

// Data is reactive - updates automatically via socket events
const actors = computed(() => actorStore.actors);
```

## Phase 6: Maintain REST API Compatibility

### 6.1 Dual Communication Channels

- **Socket.io**: Primary communication for web app
- **REST API**: Maintained for external integrations, admin tools, API clients

### 6.2 Shared Business Logic

**Socket handlers call same services as REST controllers:**
```typescript
// In actor socket handler
const actor = await actorService.createActor(actorData, socket.userId);

// In REST controller
const actor = await actorService.createActor(req.body, req.session.user.id);
```

## Benefits

### User Experience
1. **Real-time Updates**: HUD automatically updates when data changes anywhere
2. **Instant Feedback**: No loading spinners for most operations
3. **Collaborative**: Multiple users see changes immediately
4. **Responsive**: UI updates immediately with optimistic updates

### Developer Experience
1. **Simpler State Management**: Single source of truth in stores
2. **Event-driven**: Natural reactive programming model
3. **Plugin Ready**: Plugin socket events integrate seamlessly
4. **Maintainable**: Clear separation between request/response and broadcasts

### Technical Benefits
1. **Reduced API Calls**: Data fetched once, updated via events
2. **Better Performance**: Less server load, faster UI updates
3. **Scalable**: Socket.io handles connection management
4. **Backward Compatible**: REST APIs remain functional

## Implementation Timeline

### ✅ Week 1: Foundation [COMPLETED]
- ✅ Define socket event schemas for actors and items
- ✅ Create server-side socket handlers for actors and items
- ✅ Test basic actor/item CRUD via sockets

### ✅ Week 2: Actor Store Migration [COMPLETED]
- ✅ Update actor store with socket integration
- ✅ Add `actors` array and socket listeners
- ✅ Test actor store with real socket communication

### ✅ Week 3: Item Store & Components [COMPLETED]
- ✅ Update item store with socket integration
- ✅ Connect ActorsTab to actor store
- ✅ Create/update ItemsTab connected to item store

### Week 4: Polish & Testing
- [ ] Add error handling and loading states
- [ ] Optimize caching strategies
- [ ] Test real-time collaboration features
- [ ] Add comprehensive testing

## Testing Strategy

### Unit Tests
- Test store methods with mocked socket events
- Test socket handlers with mocked services

### Integration Tests
- Test complete socket event flows
- Test real-time update propagation

### E2E Tests
- Test HUD functionality with real socket communication
- Test collaborative features with multiple users

## Future Enhancements

1. **Optimistic Updates**: Update UI immediately, revert on error
2. **Conflict Resolution**: Handle concurrent edits gracefully
3. **Offline Support**: Queue events when disconnected
4. **Permission-based Updates**: Only broadcast to authorized users
5. **Event Sourcing**: Log all events for audit/replay capabilities

## Migration Strategy

### Gradual Migration
1. Start with actor store (most critical for HUD functionality)
2. Migrate item store next (second most important for HUD)
3. Campaign, encounter, and game session stores remain REST-based (no need for reactive lists)
4. Keep REST APIs throughout for compatibility

### Rollback Plan
- Socket handlers are additive - can be disabled
- REST APIs remain functional throughout migration
- Feature flags can control socket vs REST usage

This event-driven architecture will transform the application from a traditional web app into a real-time, collaborative platform while maintaining all existing functionality and compatibility.