# State Management Implementation Plan

This document outlines the implementation plan for the GM-authoritative state management and aggregate architecture changes described in:
- [GM-Authoritative State Management](../proposals/gm-authoritative-state-management.md)
- [MongoDB Migration Plan](../proposals/mongodb-migration-plan.md)

## Overview

The implementation introduces a two-layer aggregate pattern separating runtime (GameSession) from persistence (Campaign), unified document storage with discriminators, and comprehensive state management for VTT operations.

**Estimated Timeline: 5-6 weeks**

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

### Task 1.2: Create Unified Document Schema
- [ ] Create new `document.schema.mts` with base document schema
- [ ] Add discriminator field for document types (actor, item, map, encounter)
- [ ] Create type-specific schemas extending base document schema
- [ ] Update existing actor and item schemas to extend document schema
- [ ] Create map and encounter document schemas

**Files to create:**
- `packages/shared/src/schemas/document.schema.mts`
- `packages/shared/src/schemas/map-document.schema.mts`
- `packages/shared/src/schemas/encounter-document.schema.mts`

**Files to modify:**
- `packages/shared/src/schemas/actor.schema.mts`
- `packages/shared/src/schemas/item.schema.mts`

### Task 1.3: Create Document Model
- [ ] Create unified DocumentModel with discriminators in `packages/server/src/features/documents/`
- [ ] Set up discriminator models for Actor, Item, Map, Encounter documents
- [ ] Add proper indexing for document types and campaign associations
- [ ] Create document service layer

**Files to create:**
- `packages/server/src/features/documents/models/document.model.mts`
- `packages/server/src/features/documents/models/actor-document.model.mts`
- `packages/server/src/features/documents/models/item-document.model.mts`
- `packages/server/src/features/documents/models/map-document.model.mts`
- `packages/server/src/features/documents/models/encounter-document.model.mts`
- `packages/server/src/features/documents/services/document.service.mts`

### Task 1.4: Update Campaign Model
- [ ] Update CampaignModel to use new schema with pluginData
- [ ] Update field transformations for new schema
- [ ] Update virtual relationships if needed

**Files to modify:**
- `packages/server/src/features/campaigns/models/campaign.model.mts`

### Task 1.5: Create Migration Scripts
- [ ] Create migration script to add pluginData to existing campaigns
- [ ] Create migration script to move actors/items to unified document collection
- [ ] Add campaign ownership validation script
- [ ] Test migration scripts on sample data

**Files to create:**
- `packages/server/src/migrations/add-campaign-plugin-data.mts`
- `packages/server/src/migrations/unify-documents.mts`
- `packages/server/src/migrations/validate-campaign-ownership.mts`

## Phase 2: Aggregate Architecture (Week 2-3)

### Task 2.1: Create GameSession Aggregate
- [ ] Create GameSession aggregate class in `packages/server/src/aggregates/`
- [ ] Implement constructor with campaign loading
- [ ] Add participant and actor management methods
- [ ] Add basic state validation methods
- [ ] Add aggregate boundary enforcement

**Files to create:**
- `packages/server/src/aggregates/game-session.aggregate.mts`
- `packages/server/src/aggregates/base.aggregate.mts`

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

### Task 2.4: Add Authority Validation Middleware
- [ ] Create GM authority validation middleware
- [ ] Add document ownership validation
- [ ] Implement campaign member validation
- [ ] Add plugin-specific permission validation

**Files to create:**
- `packages/server/src/middleware/authority-validation.mts`

## Phase 3: Enhanced State Management (Week 3-4)

### Task 3.1: Implement Broadcasting Patterns
- [ ] Create state broadcasting service
- [ ] Implement immediate state broadcasting
- [ ] Add batched state updates 
- [ ] Create player-specific state filtering
- [ ] Add full state synchronization
- [ ] Implement permission-based broadcasting

**Files to create:**
- `packages/server/src/services/state-broadcast.service.mts`

### Task 3.2: Update Socket Handlers
- [ ] Update `handleJoinSession` to use `getCompleteSessionState()`
- [ ] Implement comprehensive state response
- [ ] Add state version tracking
- [ ] Update session leave handling
- [ ] Add error handling for state operations

**Files to modify:**
- `packages/server/src/websocket/socket-server.mts`

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

## Phase 4: API & Service Updates (Week 4-5)

### Task 4.1: Update GameSession Service
- [ ] Refactor GameSessionService to use aggregates
- [ ] Update session creation to use Campaign aggregate
- [ ] Modify participant management to use aggregate methods
- [ ] Update actor management to use document validation
- [ ] Add comprehensive error handling

**Files to modify:**
- `packages/server/src/features/campaigns/services/game-session.service.mts`

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
- `packages/server/src/features/documents/services/map-document.service.mts`
- `packages/server/src/features/documents/services/encounter-document.service.mts`

**Files to modify:**
- `packages/server/src/features/actors/services/actor.service.mts`
- `packages/server/src/features/items/services/item.service.mts`

### Task 4.4: Update Socket Event Handlers
- [ ] Update all socket handlers to use aggregates
- [ ] Add authority validation to state-changing operations
- [ ] Implement new broadcasting patterns
- [ ] Update error responses to use aggregate validation
- [ ] Add state version checking

**Files to modify:**
- All socket handler files in `packages/server/src/websocket/handlers/`

### Task 4.5: Remove Legacy Models (if needed)
- [ ] ~~Remove ActorModel and ItemModel~~ (Keep for now - maintain separate collections)
- [ ] Update imports throughout codebase to use document services
- [ ] Remove unused model files
- [ ] Update type exports

**Note**: Based on code examination, we may keep separate Actor/Item models and migrate incrementally.

## Phase 5: Testing & Integration (Week 5-6)

### Task 5.1: Unit Tests for Aggregates
- [ ] Create unit tests for GameSession aggregate
- [ ] Test Campaign aggregate functionality
- [ ] Test state reconstitution methods
- [ ] Test authority validation
- [ ] Test invariant enforcement

**Files to create:**
- `packages/server/src/aggregates/__tests__/game-session.aggregate.test.mts`
- `packages/server/src/aggregates/__tests__/campaign.aggregate.test.mts`

### Task 5.2: Integration Tests for State Management
- [ ] Test complete session join flow
- [ ] Test state broadcasting patterns
- [ ] Test authority validation in socket operations
- [ ] Test document ownership validation
- [ ] Test pluginData persistence

**Files to create:**
- `packages/server/src/__tests__/integration/state-management.test.mts`

### Task 5.3: Update Existing Tests
- [ ] Update campaign service tests for new schema
- [ ] Update socket handler tests for aggregate usage
- [ ] Update game session tests for new architecture
- [ ] Fix any broken tests due to schema changes

**Files to modify:**
- `packages/server/src/features/campaigns/__tests__/`
- `packages/server/src/websocket/__tests__/`

### Task 5.4: End-to-End Testing
- [ ] Test complete session lifecycle with new state management
- [ ] Test plugin data persistence across sessions
- [ ] Test multi-player state synchronization
- [ ] Test GM authority enforcement
- [ ] Test error handling and recovery

### Task 5.5: Performance Testing
- [ ] Test state reconstitution performance with large campaigns
- [ ] Test broadcasting performance with multiple players
- [ ] Test database query performance with unified documents
- [ ] Optimize slow operations identified

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

- [ ] All session state is reconstituted comprehensively on join
- [ ] GM authority is enforced at aggregate boundaries
- [ ] Campaign pluginData persists across sessions
- [ ] Document ownership is validated consistently
- [ ] State broadcasting works for all state types
- [ ] Performance is acceptable for expected user loads
- [ ] All existing functionality continues to work
- [ ] Plugin isolation is maintained with new architecture

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