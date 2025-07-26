# State Management Implementation Plan

This document outlines the implementation plan for the GM-authoritative state management and aggregate architecture changes described in:
- [GM-Authoritative State Management](../proposals/gm-authoritative-state-management.md)
- [MongoDB Migration Plan](../proposals/mongodb-migration-plan.md)

## Overview

The implementation introduces a two-layer aggregate pattern separating runtime (GameSession) from persistence (Campaign), unified document storage with discriminators, comprehensive state management for VTT operations, GM-authoritative action processing with disconnection resilience, and sophisticated permission-based broadcasting patterns.

**Estimated Timeline: 6-7 weeks**

## Phase 1: Foundation - Data Model Migration (Week 1-2)

### Task 1.1: Update Campaign Schema ✅ **COMPLETED**
- [x] Add `pluginData` field to campaign schema in `packages/shared/src/schemas/campaign.schema.mts`
- [x] Replace `gameSystemId` with `pluginId` field
- [ ] ~~Replace `gameMasterId` with `gmId` field~~ (kept as `gameMasterId` per user request)
- [x] Update campaign creation/patch schemas (automatically updated via schema inheritance)
- [x] Update ICampaign interface in shared types (automatically updated via type inference)

**Files modified:**
- `packages/shared/src/schemas/campaign.schema.mts` - Added pluginData field, changed gameSystemId to pluginId
- `packages/shared/src/types/api/campaigns.mts` - Updated search query schema
- `packages/server/src/features/campaigns/models/campaign.model.mts` - Added Mixed type for pluginData
- `packages/server/src/features/campaigns/services/campaign.service.mts` - Updated plugin validation
- `packages/server/src/websocket/handlers/actor-handler.mts` - Fixed field reference
- `packages/web/src/stores/actor.store.mts` - Updated game system ID access
- `packages/web/src/stores/item.store.mts` - Updated game system ID access  
- `packages/web/src/views/CampaignDetailView.vue` - Updated plugin access
- `packages/web/src/components/campaign/CampaignForm.vue` - Updated form submission
- `packages/web/src/components/campaign/CampaignListItem.vue` - Updated display field

**✅ All TypeScript errors resolved - schema changes working correctly**

### Task 1.2: Create Unified Document Schema ✅ **COMPLETED**
- [x] Create new `document.schema.mts` with base document schema
- [x] Add discriminator field for document types (actor, item, vtt-document)
- [x] Create type-specific schemas extending base document schema
- [x] Update existing actor and item schemas to extend document schema
- [x] Update VTT document schema to extend document schema
- [x] Fix legacy gameSystemId references in socket and other schemas
- [x] Update schema exports in index.mts

**Note**: Maps and Encounters remain in separate collections as they are infrastructure/session state, not compendium content.

**Files created:**
- `packages/shared/src/schemas/document.schema.mts` - Base document schema with discriminator and pluginDocumentType

**Files modified:**
- `packages/shared/src/schemas/actor.schema.mts` - Now extends baseDocumentSchema
- `packages/shared/src/schemas/item.schema.mts` - Now extends baseDocumentSchema  
- `packages/shared/src/schemas/vtt-document.schema.mts` - Now extends baseDocumentSchema
- `packages/shared/src/schemas/socket/actors.mts` - Updated field names
- `packages/shared/src/schemas/socket/items.mts` - Updated field names
- `packages/shared/src/schemas/import.schema.mts` - Fixed gameSystemId reference
- `packages/shared/src/schemas/compendium.schema.mts` - Fixed gameSystemId reference
- `packages/shared/src/schemas/index.mts` - Added document schema exports

**Key Changes Made:**
- All document types now extend `baseDocumentSchema` with common fields
- Added `pluginDocumentType` field for plugin-specific subtypes
- Replaced `data` field with `pluginData` from base schema
- Replaced `gameSystemId` with `pluginId` throughout
- Replaced `type` field with `pluginDocumentType`
- VTT infrastructure fields (avatarId, slug) preserved in specific schemas

**⚠️ Known Issue**: TypeScript errors exist due to field name changes. These will be resolved in subsequent tasks that update server/client code to use new field names.

### Task 1.3: Create Document Model ✅ **COMPLETED**
- [x] Create unified DocumentModel with discriminators in `packages/server/src/features/documents/`
- [x] Set up discriminator models for Actor, Item, VTTDocument documents
- [x] Add proper indexing for document types and campaign associations
- [x] Create document service layer

**Files created:**
- `packages/server/src/features/documents/models/document.model.mts` - Base model with discriminator support
- `packages/server/src/features/documents/models/actor-document.model.mts` - Actor discriminator with inventory
- `packages/server/src/features/documents/models/item-document.model.mts` - Item discriminator
- `packages/server/src/features/documents/models/vtt-document-unified.model.mts` - VTTDocument discriminator
- `packages/server/src/features/documents/services/document.service.mts` - Unified service layer

**Key Implementation Details:**
- Used discriminator key 'documentType' instead of default '__t'
- Added universal inventory system to Actor discriminator
- Campaign boundary validation in pre-save middleware
- Comprehensive indexing strategy for performance
- Type-safe discriminator model factories to avoid circular imports

### Task 1.4: Update Campaign Model ✅ **COMPLETED**
- [x] Update CampaignModel to use new schema with pluginData
- [x] Update field transformations for new schema
- [x] Update virtual relationships if needed

**Files modified:**
- `packages/server/src/features/campaigns/models/campaign.model.mts` - Updated characters virtual to reference unified Document collection with actor filter

### Task 1.5: Implement Hybrid Service Architecture ✅ **COMPLETED**
- [x] Phase 1: Refactor ActorService to use DocumentService internally for basic CRUD
- [x] Phase 2: Refactor ItemService to use DocumentService internally for basic CRUD
- [x] Phase 2.5: Refactor VTT document specialized methods to use unified DocumentService  
- [x] Phase 3: Update WebSocket handlers to use hybrid service architecture
- [x] Phase 4: Update REST controllers for hybrid service architecture
- [x] Preserve type-specific functionality in specialized services
- [x] Remove old duplicate models and clean up architecture
- [x] Update imports throughout codebase to use unified models

**Hybrid Architecture Pattern Implemented:**
- ✅ Generic operations via DocumentService (unified document storage)
- ✅ Specialized operations via type-specific services (`ActorService`, `ItemService`, `DocumentService.vttDocument.*`)
- ✅ Type services wrap DocumentService for basic CRUD, add specialized methods
- ✅ WebSocket handlers use service layer, not models directly
- ✅ REST controllers route through appropriate service layer

**Files Modified:**
- `packages/server/src/features/actors/services/actor.service.mts` - Now wraps DocumentService internally
- `packages/server/src/features/items/services/item.service.mts` - Now wraps DocumentService internally
- `packages/server/src/features/documents/services/document.service.mts` - VTT document methods updated
- `packages/server/src/features/encounters/websocket/encounter-permissions.mts` - Uses DocumentService
- `packages/server/src/features/campaigns/services/campaign.service.mts` - Uses DocumentService for actor queries
- `packages/server/src/features/actors/jobs/actor-image.job.mts` - Uses DocumentService with proper typing
- `packages/server/src/features/encounters/services/encounters.service.mts` - Uses DocumentService for actor operations
- `packages/server/src/services/transaction.service.mts` - Updated for unified document deletion

**Architecture Verification:**
- ✅ All controllers verified to use service layer properly (no direct model access)
- ✅ All WebSocket handlers updated to use service layer
- ✅ All background jobs updated to use DocumentService
- ✅ Type checking passes without errors
- ✅ Hybrid pattern maintains backward compatibility while using unified storage

### Task 1.6: Create Migration Scripts ❌ **SKIPPED**
- [x] ~~Create migration script to add pluginData to existing campaigns~~ 
- [x] ~~Create migration script to move actors/items/vtt-documents to unified document collection~~
- [x] ~~Add campaign ownership validation script~~
- [x] ~~Test migration scripts on sample data~~

**⚠️ DECISION: Database Reset Approach**
Instead of creating complex migration scripts, the decision was made to reset the database and start fresh. This approach is simpler and avoids potential migration complexity since this is still in development phase.

**Approach:**
- Database will be reset/cleared
- New schema will be used from clean slate
- No migration scripts needed
- Faster development iteration

**Files to create:** *(None - task skipped)*
- ~~`packages/server/src/migrations/add-campaign-plugin-data.mts`~~
- ~~`packages/server/src/migrations/unify-documents.mts`~~
- ~~`packages/server/src/migrations/validate-campaign-ownership.mts`~~

### Task 1.7: Socket Event Schema Preparation ✅ **COMPLETED**
- [x] Create server-agnostic action envelope schema (no game-specific logic)
- [x] Add GM heartbeat and disconnection event schemas with network quality monitoring
- [x] Add action processing result schemas for GM approval workflows
- [x] Coordinate schema alignment with database changes from previous tasks
- [x] Update socket event exports to include new infrastructure schemas
- [x] Update GM-Authoritative document to clarify architectural consistency

**Files created:**
- `packages/shared/src/schemas/socket/actions.mts` - Server-agnostic action envelope with opaque payload
- `packages/shared/src/schemas/socket/gm-authority.mts` - GM authority infrastructure schemas
- `packages/shared/src/schemas/socket/heartbeat.mts` - Comprehensive heartbeat monitoring

**Files modified:**
- `packages/shared/src/schemas/socket/index.mts` - Added action, GM authority, and heartbeat event exports
- `packages/shared/src/types/socket/index.mts` - Added TypeScript type exports for new events
- `docs/proposals/gm-authoritative-state-management.md` - Corrected architectural inconsistency

**Key Architectural Achievement:**
- **True Server Agnosticism**: Server validates only message envelope, treats game actions as opaque
- **Plugin-Based Game Logic**: Game-specific schemas (attack, spell, etc.) defined in plugin code only
- **Infrastructure Separation**: Clear boundary between server message routing and plugin game validation

**Implemented Schema Pattern:**
```typescript
// Server-agnostic envelope (shared schemas)
export const gameActionRequestSchema = z.object({
  actionId: z.string(),
  playerId: z.string(),
  sessionId: z.string(),
  timestamp: z.number(),
  pluginId: z.string(),
  actionType: z.string(),     // Plugin defines valid types
  payload: z.unknown()        // Completely opaque to server
});

// Game-specific schemas (plugin code only, NOT in shared schemas)
// packages/plugins/dnd5e/shared/src/schemas/actions.mts
const attackActionSchema = z.object({
  type: z.literal('attack'),
  attackerId: z.string(),
  // ... game-specific fields
});
```

**✅ Ready for Phase 2**: Socket infrastructure now supports GM-authoritative architecture with proper server agnosticism and plugin isolation.

## Phase 2: Aggregate Architecture (Week 2-3)

### Task 2.1: Create Enhanced GameSession Aggregate
- [ ] Create GameSession aggregate class in `packages/server/src/aggregates/`
- [ ] Implement constructor with campaign loading
- [ ] Add participant and actor management methods
- [ ] Add basic state validation methods
- [ ] Add aggregate boundary enforcement
- [ ] **NEW: Implement GM disconnection handling with heartbeat monitoring**
- [ ] **NEW: Add action queuing during GM disconnections**
- [ ] **NEW: Add reconnection state recovery mechanisms**
- [ ] **NEW: Add action processing classification (AUTOMATIC/REVIEWABLE/MANUAL_ONLY)**

**Files to create:**
- `packages/server/src/aggregates/game-session.aggregate.mts`
- `packages/server/src/aggregates/base.aggregate.mts`
- `packages/server/src/aggregates/gm-disconnection-handler.mts`
- `packages/server/src/aggregates/action-processor.mts`

**Key GM Disconnection Features:**
```typescript
class GameSession {
  private isGMConnected = true;
  private actionQueue: ActionMessage[] = [];
  private heartbeatInterval?: NodeJS.Timer;
  private disconnectionStartTime?: number;
  
  private startGMHeartbeatMonitoring(): void {
    this.heartbeatInterval = setInterval(() => {
      io.to(this.gmSocketId).emit('heartbeat:ping', { 
        timestamp: Date.now() 
      });
    }, 5000); // 5 second intervals
  }
  
  async processPlayerAction(playerId: string, action: PlayerAction): Promise<void> {
    if (!this.isGMConnected) {
      // Queue action during GM disconnection
      const actionMessage: ActionMessage = {
        id: generateId(),
        playerId,
        sessionId: this.sessionId,
        action,
        timestamp: Date.now(),
        status: 'queued'
      };
      
      this.actionQueue.push(actionMessage);
      
      io.to(`user:${playerId}`).emit('action:queued', {
        message: 'Action queued - GM disconnected',
        actionId: actionMessage.id
      });
      
      return;
    }
    
    // Process normally when GM is connected
    const processingLevel = this.getActionProcessingLevel(action);
    await this.handleActionByLevel(action, processingLevel);
  }
}
```

### Task 2.2: Implement State Reconstitution
- [ ] Add `getCompleteSessionState()` method to GameSession aggregate
- [ ] Implement campaign data loading with pluginData
- [ ] Add player character data retrieval with inventory
- [ ] Add map state loading for active maps
- [ ] Add encounter state loading for active encounters
- [ ] Add runtime session state compilation

**Files to modify:**
- `packages/server/src/aggregates/game-session.aggregate.mts`

### Task 2.3: Create Campaign Aggregate  
- [ ] Create Campaign aggregate class
- [ ] Implement document ownership validation
- [ ] Add pluginData management methods
- [ ] Add campaign-level invariant validation
- [ ] Implement document lifecycle management

**Files to create:**
- `packages/server/src/aggregates/campaign.aggregate.mts`

### Task 2.4: Add Enhanced Authority Validation Middleware
- [ ] Create GM authority validation middleware
- [ ] Add document ownership validation
- [ ] Implement campaign member validation
- [ ] Add plugin-specific permission validation
- [ ] **NEW: Add comprehensive aggregate validation middleware**
- [ ] **NEW: Add campaign boundary enforcement for all document operations**
- [ ] **NEW: Add GM authority checks for state-changing operations**

**Files to create:**
- `packages/server/src/middleware/authority-validation.mts`
- `packages/server/src/middleware/aggregate-validation.mts`
- `packages/server/src/middleware/campaign-boundary.mts`

**Enhanced Validation Examples:**
```typescript
// Comprehensive aggregate validation middleware
baseMongooseSchema.pre('save', async function(next) {
  if (this.campaignId) {
    const campaignAggregate = new CampaignAggregate(this.campaignId);
    await campaignAggregate.validateCampaignBoundaries(this);
    
    const modifyingUserId = this.updatedBy || this.createdBy;
    if (modifyingUserId) {
      await campaignAggregate.enforceAuthorityRules(modifyingUserId, 'modify');
    }
  }
  
  await this.validateVTTInfrastructure();
  await this.validateDocumentTypeSpecific();
  
  next();
});

// GM authority enforcement
class GMAuthorityValidator {
  static async validateGameSessionOperation(
    sessionId: string, 
    userId: string, 
    operation: string
  ): Promise<void> {
    const session = await GameSessionService.findById(sessionId);
    if (session.gmId !== userId) {
      throw new UnauthorizedError('Only GM can perform this operation');
    }
  }
}
```

## Phase 3: Sophisticated State Management & Broadcasting (Week 3-4)

### Task 3.1: Implement Advanced Broadcasting Patterns
- [ ] Create sophisticated state broadcasting service with permission filtering
- [ ] **NEW: Implement player-specific broadcasting with visibility rules**
- [ ] **NEW: Add actor-specific broadcasting with inventory and ownership filtering**
- [ ] **NEW: Add item-specific broadcasting with ownership controls**
- [ ] **NEW: Add plugin document broadcasting for public knowledge**
- [ ] **NEW: Add universal inventory change broadcasting**
- [ ] Add batched state updates with transaction guarantees
- [ ] Add full state synchronization with version tracking
- [ ] **NEW: Add permission-based utilities for determining document visibility**

**Files to create:**
- `packages/server/src/services/state-broadcast.service.mts`
- `packages/server/src/services/permission-broadcast.service.mts`
- `packages/server/src/services/visibility-filter.service.mts`

**Advanced Broadcasting Examples:**
```typescript
// Player-specific broadcasting with permission filtering
private async broadcastActorUpdate(actor: any, changes: any, updatedBy: string): Promise<void> {
  const visibleToPlayers = await this.getPlayersWhoCanSeeActor(actor._id);
  
  this.broadcastPlayerSpecific('actor:updated', (playerId) => {
    if (!visibleToPlayers.includes(playerId)) {
      return null;
    }
    
    const isOwner = actor.createdBy === playerId;
    const isGM = this.getPlayerRole(playerId) === 'gm';
    
    return {
      actorId: actor._id,
      changes: this.filterActorChangesForPlayer(changes, isOwner, isGM),
      inventory: isOwner || isGM ? actor.inventory : undefined,
      userData: isOwner || isGM ? actor.userData : undefined
    };
  });
}

// Universal inventory broadcasting
private async broadcastInventoryChange(
  actorId: string, 
  inventoryChange: InventoryChange, 
  playerId: string
): Promise<void> {
  const characterOwner = await this.getCharacterOwner(actorId);
  
  this.broadcastWithPermissions('inventory:changed', {
    actorId,
    change: inventoryChange,
    changedBy: playerId,
    timestamp: Date.now()
  }, (recipientId) => 
    recipientId === characterOwner || this.getPlayerRole(recipientId) === 'gm'
  );
}
```

### Task 3.2: Update Socket Handlers for GM Authority
- [ ] Update `handleJoinSession` to use `getCompleteSessionState()`
- [ ] Implement comprehensive state response with player permissions
- [ ] Add state version tracking and synchronization
- [ ] Update session leave handling with cleanup
- [ ] Add error handling for state operations
- [ ] **NEW: Add GM authority validation to all state-changing handlers**
- [ ] **NEW: Add GM disconnection detection and handling**
- [ ] **NEW: Add action queuing for disconnected GM scenarios**

**Files to modify:**
- `packages/server/src/websocket/socket-server.mts`
- `packages/server/src/websocket/handlers/session-handler.mts`
- `packages/server/src/websocket/handlers/gm-authority-handler.mts`

### Task 3.3: Add Map State Management
- [ ] Create map state tracking in GameSession
- [ ] Add token position management
- [ ] Implement map visibility state
- [ ] Add map-specific broadcasting
- [ ] Create map state persistence

**Files to modify:**
- `packages/server/src/aggregates/game-session.aggregate.mts`

### Task 3.4: Add Encounter State Management  
- [ ] Create encounter state tracking
- [ ] Add initiative order management
- [ ] Implement combat round tracking
- [ ] Add encounter-specific state broadcasting
- [ ] Create encounter state persistence

**Files to modify:**
- `packages/server/src/aggregates/game-session.aggregate.mts`

### Task 3.5: Implement Runtime State Separation
- [ ] Separate transient vs persistent state in aggregates
- [ ] Add runtime state cleanup on session end
- [ ] Implement selective state persistence
- [ ] Add state version management

**Files to modify:**
- `packages/server/src/aggregates/game-session.aggregate.mts`
- `packages/server/src/aggregates/campaign.aggregate.mts`

## Phase 4: API & Service Updates with Socket Schema Integration (Week 4-5)

### Task 4.1: Update GameSession Service with GM Authority
- [ ] Refactor GameSessionService to use enhanced aggregates
- [ ] Update session creation to use Campaign aggregate with pluginData
- [ ] Modify participant management to use aggregate methods
- [ ] Update actor management to use document validation
- [ ] Add comprehensive error handling with GM authority checks
- [ ] **NEW: Add GM disconnection resilience to service layer**
- [ ] **NEW: Add action processing integration with classification system**

**Files to modify:**
- `packages/server/src/features/campaigns/services/game-session.service.mts`
- `packages/server/src/features/campaigns/services/gm-authority.service.mts`

### Task 4.2: Update Campaign Service
- [ ] Refactor CampaignService to use Campaign aggregate
- [ ] Update document ownership validation
- [ ] Add pluginData management endpoints
- [ ] Implement campaign invariant validation
- [ ] Update campaign member validation

**Files to modify:**
- `packages/server/src/features/campaigns/services/campaign.service.mts`

### Task 4.3: Create Document Services
- [ ] Create DocumentService for unified document operations
- [ ] Implement type-specific document services (ActorDocumentService, etc.)
- [ ] Add document validation and authority checking
- [ ] Update existing actor/item services to use document layer
- [ ] Add document lifecycle management

**Files to create:**
- `packages/server/src/features/documents/services/actor-document.service.mts`
- `packages/server/src/features/documents/services/item-document.service.mts`
- `packages/server/src/features/documents/services/vtt-document.service.mts`

**Files to modify:**
- `packages/server/src/features/actors/services/actor.service.mts`
- `packages/server/src/features/items/services/item.service.mts`
- `packages/server/src/features/vtt-documents/services/vtt-document.service.mts`

### Task 4.4: Update Socket Event Handlers with Schema Integration
- [ ] Update all socket handlers to use enhanced aggregates
- [ ] Add authority validation to state-changing operations
- [ ] Implement sophisticated broadcasting patterns with permission filtering
- [ ] Update error responses to use aggregate validation
- [ ] Add state version checking and synchronization
- [ ] **NEW: Add discriminated union action request handlers**
- [ ] **NEW: Add GM heartbeat and disconnection event handlers**
- [ ] **NEW: Add action processing workflow handlers (approve/reject/modify)**
- [ ] **NEW: Add action queuing handlers for GM disconnection scenarios**
- [ ] **NEW: Coordinate socket schema migration with database changes**

**Files to modify:**
- All socket handler files in `packages/server/src/websocket/handlers/`
- `packages/server/src/websocket/handlers/action-request-handler.mts` (NEW)
- `packages/server/src/websocket/handlers/gm-heartbeat-handler.mts` (NEW)
- `packages/server/src/websocket/handlers/action-approval-handler.mts` (NEW)

**Schema Integration Examples:**
```typescript
// Updated socket event handlers for discriminated unions
socket.on('action:request', async (request: GameActionRequest) => {
  const session = getSession(request.sessionId);
  
  // Server validates schema but doesn't understand game semantics
  const validation = gameActionRequestSchema.safeParse(request);
  if (!validation.success) {
    return socket.emit('action:error', { message: 'Invalid action format' });
  }
  
  // Route to GM without understanding what the action is
  await session.routeActionToGM(request);
});

// GM heartbeat monitoring
socket.on('heartbeat:pong', (data: { timestamp: number; sessionId: string }) => {
  const session = getSession(data.sessionId);
  session.recordGMHeartbeat(data.timestamp);
});
```

### Task 4.5: Remove Legacy Models (if needed)
- [ ] ~~Remove ActorModel and ItemModel~~ (Keep for now - maintain separate collections)
- [ ] Update imports throughout codebase to use document services
- [ ] Remove unused model files
- [ ] Update type exports

**Note**: Based on code examination, we may keep separate Actor/Item models and migrate incrementally.

## Phase 5: Action Processing System Implementation (Week 5-6)

### Task 5.1: Implement Action Classification System
- [ ] Create plugin-configurable action classification (AUTOMATIC/REVIEWABLE/MANUAL_ONLY)
- [ ] Implement action processing level detection based on plugin configuration
- [ ] Add GM override settings for action processing levels
- [ ] Create action escalation logic for edge cases
- [ ] Add timeout handling for GM approval workflows

**Files to create:**
- `packages/server/src/services/action-classification.service.mts`
- `packages/server/src/services/action-escalation.service.mts`
- `packages/shared/src/types/action-processing.mts`

### Task 5.2: Implement GM Approval Workflow
- [ ] Create GM approval UI integration points
- [ ] Add action queue management for pending approvals
- [ ] Implement approval/rejection/modification workflows
- [ ] Add batch action processing for multiple similar actions
- [ ] Create approval timeout and auto-approval mechanisms

**Files to create:**
- `packages/server/src/services/gm-approval.service.mts`
- `packages/server/src/services/action-queue.service.mts`
- `packages/server/src/websocket/handlers/approval-workflow-handler.mts`

### Task 5.3: Integrate Action Processing with Aggregates
- [ ] Add action processing integration to GameSession aggregate
- [ ] Implement automatic action execution for AUTOMATIC level actions
- [ ] Add reviewable action presentation to GM clients
- [ ] Create manual action escalation handling
- [ ] Add plugin hook integration for custom processing logic

**Files to modify:**
- `packages/server/src/aggregates/game-session.aggregate.mts`
- `packages/server/src/aggregates/action-processor.mts`

**Action Processing Examples:**
```typescript
enum ActionProcessingLevel {
  AUTOMATIC = "auto",        // Execute immediately after calculation
  REVIEWABLE = "review",     // Present options to GM
  MANUAL_ONLY = "manual"     // Always requires GM decision
}

class ActionClassificationService {
  static getActionProcessingLevel(action: GameAction, pluginConfig: PluginConfig): ActionProcessingLevel {
    // Check GM overrides first
    const override = pluginConfig.gmOverrides?.get(action.type);
    if (override) return override;
    
    // Fall back to plugin defaults
    return pluginConfig.actionLevels.get(action.type) ?? ActionProcessingLevel.MANUAL_ONLY;
  }
  
  static async processAction(action: GameAction, level: ActionProcessingLevel): Promise<ActionResult> {
    switch (level) {
      case ActionProcessingLevel.AUTOMATIC:
        return await this.executeAutomatic(action);
      case ActionProcessingLevel.REVIEWABLE:
        return await this.escalateForReview(action);
      case ActionProcessingLevel.MANUAL_ONLY:
        return await this.escalateForManualDecision(action);
    }
  }
}
```

## Phase 6: Testing & Integration (Week 6-7)

### Task 6.1: Unit Tests for Enhanced Aggregates
- [ ] Create unit tests for enhanced GameSession aggregate
- [ ] Test Campaign aggregate functionality with pluginData
- [ ] Test state reconstitution methods with permission filtering
- [ ] Test authority validation and GM enforcement
- [ ] Test invariant enforcement with campaign boundaries
- [ ] **NEW: Test GM disconnection handling and action queuing**
- [ ] **NEW: Test action processing classification system**
- [ ] **NEW: Test heartbeat monitoring and timeout detection**

**Files to create:**
- `packages/server/src/aggregates/__tests__/game-session.aggregate.test.mts`
- `packages/server/src/aggregates/__tests__/campaign.aggregate.test.mts`
- `packages/server/src/aggregates/__tests__/gm-disconnection-handler.test.mts`
- `packages/server/src/aggregates/__tests__/action-processor.test.mts`

### Task 6.2: Integration Tests for Enhanced State Management
- [ ] Test complete session join flow with comprehensive state
- [ ] Test sophisticated broadcasting patterns with permission filtering
- [ ] Test authority validation in socket operations with GM checks
- [ ] Test document ownership validation with campaign boundaries
- [ ] Test pluginData persistence across sessions
- [ ] **NEW: Test GM disconnection scenarios and state recovery**
- [ ] **NEW: Test action processing workflows (automatic/reviewable/manual)**
- [ ] **NEW: Test socket schema migration coordination**
- [ ] **NEW: Test permission-based broadcasting correctness**

**Files to create:**
- `packages/server/src/__tests__/integration/state-management.test.mts`
- `packages/server/src/__tests__/integration/gm-disconnection.test.mts`
- `packages/server/src/__tests__/integration/action-processing.test.mts`
- `packages/server/src/__tests__/integration/permission-broadcasting.test.mts`

### Task 6.3: Update Existing Tests for Enhanced Architecture
- [ ] Update campaign service tests for new schema with pluginData
- [ ] Update socket handler tests for enhanced aggregate usage
- [ ] Update game session tests for GM authority and disconnection handling
- [ ] Fix any broken tests due to schema changes
- [ ] **NEW: Update socket handler tests for discriminated union schemas**
- [ ] **NEW: Update tests for permission-based broadcasting**
- [ ] **NEW: Update tests for action processing integration**

**Files to modify:**
- `packages/server/src/features/campaigns/__tests__/`
- `packages/server/src/websocket/__tests__/`
- `packages/shared/src/schemas/__tests__/` (for new socket schemas)

### Task 6.4: End-to-End Testing with Enhanced Scenarios
- [ ] Test complete session lifecycle with enhanced state management
- [ ] Test plugin data persistence across sessions with campaign pluginData
- [ ] Test multi-player state synchronization with permission filtering
- [ ] Test GM authority enforcement across all operations
- [ ] Test error handling and recovery with GM disconnection scenarios
- [ ] **NEW: Test GM disconnection and reconnection scenarios**
- [ ] **NEW: Test action processing workflows end-to-end**
- [ ] **NEW: Test permission-based broadcasting with multiple players**
- [ ] **NEW: Test socket schema migration coordination**

### Task 6.5: Performance Testing with Enhanced Load
- [ ] Test state reconstitution performance with large campaigns and comprehensive state
- [ ] Test sophisticated broadcasting performance with multiple players and permission filtering
- [ ] Test database query performance with unified documents and enhanced indexes
- [ ] Test GM disconnection handling performance under load
- [ ] Test action processing classification performance
- [ ] Optimize slow operations identified in enhanced architecture

## Key Considerations

### Migration Strategy
- **Backward Compatibility**: Maintain existing API contracts during migration
- **Data Safety**: All migrations must be reversible and tested on copies
- **Incremental Rollout**: Deploy changes in phases with feature flags

### Risk Mitigation
- **Database Backups**: Required before each migration phase
- **Rollback Plans**: Each phase must have a documented rollback procedure  
- **Monitoring**: Add metrics for aggregate performance and state consistency

### Plugin Architecture
- **Interface Stability**: Plugin interfaces should remain stable during migration
- **Plugin Data Migration**: Existing plugin data must be preserved in pluginData fields
- **Plugin Testing**: All plugins must be tested with new aggregate architecture

## Dependencies

### External Dependencies
- MongoDB discriminator support (already available)
- Socket.io room management (already implemented)
- Zod schema validation (already in use)

### Internal Dependencies  
- Plugin system must be compatible with aggregate boundaries
- Authentication system integration with authority validation
- WebSocket handler registry for aggregate-based handlers

## Success Criteria

### Core State Management
- [ ] All session state is reconstituted comprehensively on join with player permissions
- [ ] GM authority is enforced at aggregate boundaries for all operations
- [ ] Campaign pluginData persists across sessions and supports plugin architecture
- [ ] Document ownership is validated consistently with campaign boundaries
- [ ] Sophisticated state broadcasting works for all state types with permission filtering
- [ ] Performance is acceptable for expected user loads with enhanced features

### GM-Authoritative Features
- [ ] **NEW: GM disconnection resilience works correctly (heartbeat monitoring, action queuing, reconnection)**
- [ ] **NEW: Action processing classification system functions properly (AUTOMATIC/REVIEWABLE/MANUAL_ONLY)**
- [ ] **NEW: Socket event schemas support discriminated unions for type-safe game actions**
- [ ] **NEW: Permission-based broadcasting filters data correctly for different player roles**
- [ ] **NEW: Action approval workflows integrate seamlessly with GM clients**

### Architecture & Compatibility
- [ ] All existing functionality continues to work with enhanced architecture
- [ ] Plugin isolation is maintained with new GM-authoritative patterns
- [ ] Socket schema migration coordinates properly with database changes
- [ ] Enhanced aggregate validation enforces both technical and business rules
- [ ] Universal inventory system integrates correctly with game logic separation

## Post-Implementation

### Documentation Updates
- [ ] Update API documentation for new aggregate patterns
- [ ] Document new plugin development patterns
- [ ] Update deployment guides for migration procedures

### Monitoring
- [ ] Add metrics for aggregate operation performance
- [ ] Monitor state consistency across sessions
- [ ] Track plugin data usage patterns

### Future Enhancements
- Event sourcing for complete state history
- Conflict resolution for concurrent state changes
- Advanced permission systems for document sharing