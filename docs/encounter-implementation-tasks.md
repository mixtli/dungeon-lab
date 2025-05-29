# Encounter System Implementation Tasks

## Overview

This document outlines the implementation tasks for creating the encounter system in DungeonLab. The system provides turn-based combat between player characters and NPCs/monsters on a shared map, with real-time synchronization across desktop, tablet, and phone platforms.

Tasks are organized by phase with clear dependencies and acceptance criteria. The implementation focuses on encounters first, with foundation for future scene system expansion.

## Phase 1: Core Infrastructure (4-6 weeks)

### Task 1: Create Shared Types and Schemas

**Priority**: High  
**Dependencies**: None  
**Estimated Effort**: 1-2 days

**Description**: Define shared TypeScript types and Zod schemas for the encounter system.

**Implementation Details**:
- Create encounter data model interfaces in shared package
- Define token, initiative, and effect interfaces
- Add position and interaction schemas
- Create WebSocket event schemas for encounters
- Add validation schemas using Zod
- Export types from shared package index

**Acceptance Criteria**:
- [ ] All encounter system types are properly defined
- [ ] Zod schemas validate correctly
- [ ] Types are exported and accessible from shared package
- [ ] WebSocket event schemas include encounter events
- [ ] No TypeScript compilation errors
- [ ] Includes audit fields (createdBy, lastModifiedBy, version)

**Files to Create/Modify**:
- `packages/shared/src/types/encounters.mts` (new)
- `packages/shared/src/schemas/encounters.schema.mts` (new)
- `packages/shared/src/types/socket/encounters.mts` (new)
- `packages/shared/src/types/index.mts` (update)
- `packages/shared/src/schemas/index.mts` (update)

---

### Task 2: Set Up Encounter Database Schema

**Priority**: High  
**Dependencies**: Task 1  
**Estimated Effort**: 1-2 days

**Description**: Create database migration and models for encounter data storage.

**Implementation Details**:
- Create database migration for encounters table
- Add indexes for performance (campaignId, status, updatedAt)
- Create database migration for tokens table
- Add foreign key constraints and relationships
- Create Mongoose models with proper typing
- Add seed data for testing (optional)

**Acceptance Criteria**:
- [ ] Database migration runs successfully
- [ ] Encounters and tokens tables created with proper schema
- [ ] Foreign key constraints work correctly
- [ ] Indexes are created for performance optimization
- [ ] Database models are properly typed
- [ ] Supports optimistic locking with version field

**Files to Create/Modify**:
- `packages/server/src/features/encounters/models.mts` (new)
- Database migration files (new)
- `packages/server/src/features/encounters/index.mts` (new)

---

### Task 3: Create Encounter Controller and REST API

**Priority**: High  
**Dependencies**: Task 2  
**Estimated Effort**: 2-3 days

**Description**: Implement REST API endpoints for encounter management.

**Implementation Details**:
- Create encounter controller with CRUD operations
- Implement permission validation using existing auth middleware
- Add input sanitization and validation
- Create endpoints for encounter status management
- Add token management endpoints
- Implement proper error handling
- Add OpenAPI documentation

**Acceptance Criteria**:
- [ ] CRUD operations for encounters work correctly
- [ ] Permission validation enforces campaign membership/GM status
- [ ] Input validation prevents invalid data
- [ ] Token management endpoints are functional
- [ ] Error handling provides useful feedback
- [ ] API documentation is complete
- [ ] Authentication and authorization are enforced

**Files to Create/Modify**:
- `packages/server/src/features/encounters/controller.mts` (new)
- `packages/server/src/features/encounters/routes.mts` (new)
- `packages/server/src/features/encounters/validation.mts` (new)

---

### Task 4: Implement Core Encounter Service

**Priority**: High  
**Dependencies**: Task 3  
**Estimated Effort**: 3-4 days

**Description**: Create encounter service with core business logic.

**Implementation Details**:
- Implement encounter creation and management
- Add token placement and validation logic
- Create permission checking for token control
- Implement optimistic locking for concurrent updates
- Add transaction handling for complex operations
- Create audit trail logging
- Add error handling and validation

**Acceptance Criteria**:
- [ ] Encounter creation and management works correctly
- [ ] Token placement validation prevents invalid positions
- [ ] Permission system correctly identifies token ownership
- [ ] Optimistic locking prevents conflict issues
- [ ] Transaction handling ensures data consistency
- [ ] Audit trail tracks all changes
- [ ] Service methods are properly tested

**Files to Create/Modify**:
- `packages/server/src/features/encounters/service.mts` (new)
- `packages/server/src/features/encounters/permissions.mts` (new)
- `packages/server/src/features/encounters/utils.mts` (new)

---

### Task 5: Set Up Basic WebSocket Event Handling

**Priority**: High  
**Dependencies**: Task 4  
**Estimated Effort**: 2-3 days

**Description**: Implement WebSocket handlers for real-time encounter synchronization.

**Implementation Details**:
- Create encounter socket handler
- Implement room management for encounters
- Add token movement event handling
- Create rate limiting for socket events
- Add permission validation for socket events
- Implement error handling and user feedback
- Add connection state management

**Acceptance Criteria**:
- [ ] Socket rooms are managed correctly for encounters
- [ ] Token movement events work in real-time
- [ ] Rate limiting prevents abuse
- [ ] Permission validation works for all socket events
- [ ] Error messages are user-friendly
- [ ] Connection failures are handled gracefully
- [ ] Multiple users can participate simultaneously

**Files to Create/Modify**:
- `packages/server/src/features/encounters/socket-handler.mts` (new)
- `packages/server/src/features/encounters/rate-limiter.mts` (new)
- Update main socket handler integration

---

### Task 6: Create Basic Vue Encounter Component

**Priority**: High  
**Dependencies**: Task 5  
**Estimated Effort**: 2-3 days

**Description**: Create basic Vue component for encounter display and interaction.

**Implementation Details**:
- Create encounter store using Pinia
- Implement device detection composable
- Create basic encounter view component
- Add socket event integration
- Implement token selection and interaction
- Add error handling and loading states
- Create component routing logic

**Acceptance Criteria**:
- [ ] Encounter store manages state correctly
- [ ] Device detection works for desktop/tablet/phone
- [ ] Basic encounter view displays properly
- [ ] Socket events update store state
- [ ] Token selection and interaction works
- [ ] Loading and error states are handled
- [ ] Component integrates with existing router

**Files to Create/Modify**:
- `packages/web/src/stores/encounterStore.mts` (new)
- `packages/web/src/composables/useDeviceAdaptation.mts` (new)
- `packages/web/src/components/encounter/EncounterView.vue` (new)
- `packages/web/src/composables/useEncounterSocket.mts` (new)

---

### Task 7: Implement Basic Token Placement and Movement

**Priority**: High  
**Dependencies**: Task 6  
**Estimated Effort**: 3-4 days

**Description**: Add token placement and movement functionality to the map.

**Implementation Details**:
- Extend existing map component for token support
- Implement token rendering with Pixi.js optimizations
- Add drag and drop functionality for token movement
- Create token context menus for basic actions
- Implement movement validation and constraints
- Add visual feedback for token interactions
- Create platform-specific interaction modes

**Acceptance Criteria**:
- [ ] Tokens render correctly on the map
- [ ] Drag and drop movement works smoothly
- [ ] Movement validation prevents invalid positions
- [ ] Context menus provide appropriate actions
- [ ] Visual feedback is clear and responsive
- [ ] Platform-specific interactions work (mouse vs touch)
- [ ] Real-time synchronization works across clients

**Files to Create/Modify**:
- `packages/web/src/composables/useEncounterMap.mts` (new)
- `packages/web/src/components/encounter/TokenRenderer.vue` (new)
- `packages/web/src/components/encounter/TokenContextMenu.vue` (new)
- Update existing map components for encounter integration

---

## Phase 2: Combat Mechanics (4-6 weeks)

### Task 8: Implement Initiative Tracking System

**Priority**: High  
**Dependencies**: Task 7  
**Estimated Effort**: 2-3 days

**Description**: Create initiative calculation and tracking system.

**Implementation Details**:
- Add initiative calculation logic to encounter service
- Create initiative entry management
- Implement turn order sorting and management
- Add plugin hooks for game system specific calculations
- Create initiative modification and reordering
- Add persistence and state management
- Implement initiative reset functionality

**Acceptance Criteria**:
- [ ] Initiative calculation works correctly
- [ ] Turn order is maintained and sortable
- [ ] Plugin integration allows custom calculations
- [ ] Initiative can be manually modified
- [ ] State persists across sessions
- [ ] Initiative can be reset when needed
- [ ] Multiple actors can have same initiative

**Files to Create/Modify**:
- `packages/server/src/features/encounters/initiative.service.mts` (new)
- `packages/shared/src/types/initiative.mts` (new)
- Update encounter service with initiative methods

---

### Task 9: Add Turn Management and Round Progression

**Priority**: High  
**Dependencies**: Task 8  
**Estimated Effort**: 2-3 days

**Description**: Implement turn-based mechanics and round progression.

**Implementation Details**:
- Create turn advancement logic
- Add round tracking and progression
- Implement turn-based permission validation
- Add turn skipping and holding functionality
- Create end-of-turn and end-of-round hooks
- Add turn timer functionality (optional)
- Implement turn state persistence

**Acceptance Criteria**:
- [ ] Turn advancement works correctly
- [ ] Round progression tracks properly
- [ ] Turn-based permissions are enforced
- [ ] Players can skip or hold turns
- [ ] Plugin hooks fire at appropriate times
- [ ] Turn timers work if enabled
- [ ] Turn state persists across reconnections

**Files to Create/Modify**:
- `packages/server/src/features/encounters/turn-manager.mts` (new)
- Update encounter service with turn management
- Update socket handlers for turn events

---

### Task 10: Create Combat Actions Framework

**Priority**: High  
**Dependencies**: Task 9  
**Estimated Effort**: 3-4 days

**Description**: Build framework for handling combat actions.

**Implementation Details**:
- Create action validation and processing system
- Implement basic action types (attack, move, etc.)
- Add action result calculation and application
- Create action history and logging
- Add plugin integration for custom actions
- Implement action targeting and range validation
- Add action animation and feedback hooks

**Acceptance Criteria**:
- [ ] Action validation prevents invalid actions
- [ ] Basic action types work correctly
- [ ] Action results are calculated properly
- [ ] Action history is maintained
- [ ] Plugin integration allows custom actions
- [ ] Targeting and range validation works
- [ ] Animation hooks are properly implemented

**Files to Create/Modify**:
- `packages/server/src/features/encounters/actions.service.mts` (new)
- `packages/shared/src/types/actions.mts` (new)
- Update encounter service with action processing

---

### Task 11: Implement Basic Effect System

**Priority**: Medium  
**Dependencies**: Task 10  
**Estimated Effort**: 2-3 days

**Description**: Create system for managing temporary effects on tokens.

**Implementation Details**:
- Create effect application and removal logic
- Add duration tracking and automatic expiry
- Implement effect stacking and interaction rules
- Add visual indicators for active effects
- Create effect persistence and state management
- Add plugin hooks for custom effect processing
- Implement effect condition checking

**Acceptance Criteria**:
- [ ] Effects can be applied and removed correctly
- [ ] Duration tracking works with round progression
- [ ] Effect stacking rules are enforced
- [ ] Visual indicators show active effects
- [ ] Effect state persists properly
- [ ] Plugin integration allows custom effects
- [ ] Effect conditions are checked appropriately

**Files to Create/Modify**:
- `packages/server/src/features/encounters/effects.service.mts` (new)
- `packages/shared/src/types/effects.mts` (new)
- Update token rendering for effect visualization

---

### Task 12: Add Combat-Specific WebSocket Events

**Priority**: High  
**Dependencies**: Task 11  
**Estimated Effort**: 2-3 days

**Description**: Expand WebSocket events for combat-specific functionality.

**Implementation Details**:
- Add initiative and turn change events
- Create action execution and result events
- Add effect application and removal events
- Implement round progression events
- Add error handling for combat events
- Create event batching for performance
- Add event history and replay capability

**Acceptance Criteria**:
- [ ] Initiative events update all clients correctly
- [ ] Turn change events are properly synchronized
- [ ] Action events show results to all participants
- [ ] Effect events update visual state
- [ ] Error events provide clear feedback
- [ ] Event batching improves performance
- [ ] Event history supports debugging

**Files to Create/Modify**:
- Update `packages/server/src/features/encounters/socket-handler.mts`
- Update `packages/shared/src/types/socket/encounters.mts`
- Update client socket handling

---

### Task 13: Create Initiative Tracker UI Component

**Priority**: High  
**Dependencies**: Task 12  
**Estimated Effort**: 2-3 days

**Description**: Build UI component for displaying and managing initiative.

**Implementation Details**:
- Create initiative list display component
- Add drag-and-drop reordering capability
- Implement turn highlighting and indicators
- Add initiative editing functionality
- Create compact and expanded view modes
- Add accessibility features
- Implement responsive design for different screen sizes

**Acceptance Criteria**:
- [ ] Initiative list displays correctly
- [ ] Drag-and-drop reordering works smoothly
- [ ] Current turn is clearly highlighted
- [ ] Initiative values can be edited
- [ ] Component has compact and expanded modes
- [ ] Accessibility features are implemented
- [ ] Responsive design works on all target platforms

**Files to Create/Modify**:
- `packages/web/src/components/encounter/InitiativeTracker.vue` (new)
- `packages/web/src/components/encounter/InitiativeEntry.vue` (new)
- Update encounter store for initiative management

---

## Phase 3: Desktop HUD System (3-4 weeks)

### Task 14: Create HUD Store and Panel Management System

**Priority**: High  
**Dependencies**: Task 13  
**Estimated Effort**: 2-3 days

**Description**: Build the foundation for the desktop HUD interface.

**Implementation Details**:
- Create HUD store for panel state management
- Implement panel registration and lifecycle
- Add panel positioning and z-index management
- Create panel state persistence
- Add panel configuration and defaults
- Implement panel visibility and focus management
- Add keyboard shortcuts for panel operations

**Acceptance Criteria**:
- [ ] HUD store manages panel state correctly
- [ ] Panel registration and removal works
- [ ] Panel positioning is maintained
- [ ] Panel state persists across sessions
- [ ] Panel configuration is customizable
- [ ] Panel visibility can be toggled
- [ ] Keyboard shortcuts work properly

**Files to Create/Modify**:
- `packages/web/src/stores/hudStore.mts` (new)
- `packages/web/src/composables/useHUD.mts` (new)
- `packages/web/src/types/hud.mts` (new)

---

### Task 15: Implement Draggable/Resizable Panel Component

**Priority**: High  
**Dependencies**: Task 14  
**Estimated Effort**: 3-4 days

**Description**: Create the core draggable and resizable panel component for the HUD.

**Implementation Details**:
- Build draggable panel component using VueUse
- Add resizing functionality with handles
- Implement snapping and docking behavior
- Create panel header with controls
- Add panel content area with scrolling
- Implement panel minimization and maximization
- Add collision detection and boundary constraints

**Acceptance Criteria**:
- [ ] Panels can be dragged smoothly
- [ ] Resizing works with proper constraints
- [ ] Snapping and docking feels natural
- [ ] Panel controls are intuitive
- [ ] Content scrolling works correctly
- [ ] Minimize/maximize states work
- [ ] Panels stay within screen boundaries

**Files to Create/Modify**:
- `packages/web/src/components/hud/HUDPanel.vue` (new)
- `packages/web/src/components/hud/PanelHeader.vue` (new)
- `packages/web/src/composables/useDraggable.mts` (new)
- `packages/web/src/composables/useResizable.mts` (new)

---

### Task 16: Build Toolbar System with Tool Selection

**Priority**: High  
**Dependencies**: Task 15  
**Estimated Effort**: 2-3 days

**Description**: Create toolbar system for common encounter tools.

**Implementation Details**:
- Build vertical toolbar component
- Add tool registration and management
- Implement tool selection and activation
- Create tool icons and tooltips
- Add tool grouping and organization
- Implement tool state persistence
- Add keyboard shortcuts for tools

**Acceptance Criteria**:
- [ ] Toolbar displays tools correctly
- [ ] Tool selection updates state
- [ ] Tool activation works properly
- [ ] Icons and tooltips are clear
- [ ] Tool grouping is logical
- [ ] Tool states persist across sessions
- [ ] Keyboard shortcuts work for tools

**Files to Create/Modify**:
- `packages/web/src/components/hud/Toolbar.vue` (new)
- `packages/web/src/components/hud/ToolButton.vue` (new)
- `packages/web/src/stores/toolStore.mts` (new)

---

### Task 17: Create Enhanced Initiative Tracker Panel

**Priority**: Medium  
**Dependencies**: Task 16  
**Estimated Effort**: 2-3 days

**Description**: Integrate initiative tracker into the HUD panel system.

**Implementation Details**:
- Adapt initiative tracker for panel system
- Add panel-specific features and controls
- Implement initiative management interface
- Add visual enhancements for desktop
- Create initiative editing and reordering
- Add character portrait integration
- Implement advanced display options

**Acceptance Criteria**:
- [ ] Initiative tracker works within panel system
- [ ] Panel-specific controls are functional
- [ ] Initiative editing is intuitive
- [ ] Visual design is polished
- [ ] Character portraits display correctly
- [ ] Display options are customizable
- [ ] Performance is smooth with many participants

**Files to Create/Modify**:
- `packages/web/src/components/hud/InitiativePanel.vue` (new)
- Update initiative tracker for panel integration

---

### Task 18: Integrate Character Sheet Display

**Priority**: Medium  
**Dependencies**: Task 17  
**Estimated Effort**: 3-4 days

**Description**: Add character sheet display capability to the HUD.

**Implementation Details**:
- Create character sheet panel component
- Add integration with existing character system
- Implement read-only and editable modes
- Add character selection and pinning
- Create tabbed interface for multiple characters
- Add character stat modification interface
- Implement character sheet customization

**Acceptance Criteria**:
- [ ] Character sheets display correctly in panels
- [ ] Read-only and editable modes work
- [ ] Character selection is intuitive
- [ ] Multiple character sheets can be pinned
- [ ] Stat modifications work properly
- [ ] Sheet customization is functional
- [ ] Performance is good with multiple sheets

**Files to Create/Modify**:
- `packages/web/src/components/hud/CharacterSheetPanel.vue` (new)
- `packages/web/src/components/hud/CharacterSelector.vue` (new)
- Update character store for HUD integration

---

### Task 19: Add Panel State Persistence

**Priority**: Medium  
**Dependencies**: Task 18  
**Estimated Effort**: 1-2 days

**Description**: Implement persistence for panel positions and configurations.

**Implementation Details**:
- Add localStorage integration for panel state
- Implement user preference management
- Create import/export functionality for layouts
- Add default layout restoration
- Implement per-campaign layout saving
- Add layout sharing between users
- Create layout management interface

**Acceptance Criteria**:
- [ ] Panel positions persist across sessions
- [ ] User preferences are saved correctly
- [ ] Layout import/export works
- [ ] Default layouts can be restored
- [ ] Per-campaign layouts are supported
- [ ] Layout sharing works between users
- [ ] Layout management is user-friendly

**Files to Create/Modify**:
- `packages/web/src/services/layoutPersistence.mts` (new)
- `packages/web/src/components/hud/LayoutManager.vue` (new)
- Update HUD store for persistence

---

## Phase 4: Tablet Adaptation (3-4 weeks)

### Task 20: Implement Device Detection and Adaptive Routing

**Priority**: High  
**Dependencies**: Task 19  
**Estimated Effort**: 1-2 days

**Description**: Create device detection system and adaptive component routing.

**Implementation Details**:
- Enhance device detection composable
- Add screen size and input method detection
- Implement component routing based on device type
- Create device-specific configuration management
- Add performance optimization per device type
- Implement orientation change handling
- Add device capability detection

**Acceptance Criteria**:
- [ ] Device type detection is accurate
- [ ] Component routing works for all device types
- [ ] Device-specific configurations load correctly
- [ ] Performance optimizations apply appropriately
- [ ] Orientation changes are handled smoothly
- [ ] Device capabilities are detected correctly
- [ ] Fallback routing works for unknown devices

**Files to Create/Modify**:
- Update `packages/web/src/composables/useDeviceAdaptation.mts`
- `packages/web/src/services/deviceOptimization.mts` (new)
- Update encounter view routing

---

### Task 21: Create Touch-Optimized Panel Variants

**Priority**: High  
**Dependencies**: Task 20  
**Estimated Effort**: 3-4 days

**Description**: Build touch-optimized versions of HUD panels for tablets.

**Implementation Details**:
- Create touch-optimized panel component
- Implement larger touch targets and spacing
- Add gesture support for panel operations
- Create touch-friendly drag handles
- Implement auto-hide behavior for screen space
- Add haptic feedback integration
- Create touch-specific animations

**Acceptance Criteria**:
- [ ] Touch targets meet accessibility guidelines (44px minimum)
- [ ] Panel dragging works smoothly with touch
- [ ] Gesture operations are intuitive
- [ ] Auto-hide behavior conserves screen space
- [ ] Haptic feedback enhances interaction
- [ ] Animations are optimized for touch devices
- [ ] Performance is smooth on tablet hardware

**Files to Create/Modify**:
- `packages/web/src/components/hud/TouchPanel.vue` (new)
- `packages/web/src/composables/useTouch.mts` (new)
- `packages/web/src/components/hud/TouchControls.vue` (new)

---

### Task 22: Add Gesture Support Using VueUse

**Priority**: Medium  
**Dependencies**: Task 21  
**Estimated Effort**: 2-3 days

**Description**: Implement gesture recognition for common tablet interactions.

**Implementation Details**:
- Integrate VueUse gesture composables
- Add pinch-to-zoom for map interaction
- Implement swipe gestures for panel management
- Create long-press for context menus
- Add two-finger pan for map navigation
- Implement gesture conflict resolution
- Add gesture customization options

**Acceptance Criteria**:
- [ ] Pinch-to-zoom works smoothly on map
- [ ] Swipe gestures control panel visibility
- [ ] Long-press triggers context menus
- [ ] Two-finger pan works for map navigation
- [ ] Gesture conflicts are resolved properly
- [ ] Gesture settings are customizable
- [ ] Gestures feel natural and responsive

**Files to Create/Modify**:
- `packages/web/src/composables/useGestures.mts` (new)
- Update map component for gesture support
- Update panel components for swipe support

---

### Task 23: Implement Tablet-Specific Toolbar

**Priority**: Medium  
**Dependencies**: Task 22  
**Estimated Effort**: 2-3 days

**Description**: Create tablet-optimized toolbar with bottom orientation.

**Implementation Details**:
- Create bottom-oriented toolbar component
- Add larger icons and touch targets
- Implement collapsible tool groups
- Add contextual tool display
- Create thumb-friendly positioning
- Add tool customization for tablets
- Implement adaptive icon sizing

**Acceptance Criteria**:
- [ ] Bottom toolbar is accessible with thumbs
- [ ] Icons are appropriately sized for touch
- [ ] Tool groups collapse to save space
- [ ] Contextual tools appear when relevant
- [ ] Positioning works in both orientations
- [ ] Tool customization is functional
- [ ] Icon sizing adapts to device capabilities

**Files to Create/Modify**:
- `packages/web/src/components/hud/TabletToolbar.vue` (new)
- `packages/web/src/components/hud/TabletToolGroup.vue` (new)
- Update toolbar store for tablet variants

---

### Task 24: Add Touch-Friendly Sizing and Spacing

**Priority**: Medium  
**Dependencies**: Task 23  
**Estimated Effort**: 2-3 days

**Description**: Implement comprehensive touch-friendly sizing throughout the interface.

**Implementation Details**:
- Create touch sizing design tokens
- Update all interactive elements for touch
- Add appropriate spacing for fat finger problem
- Implement adaptive sizing based on device
- Create touch target guidelines
- Add visual feedback for touch interactions
- Implement accessibility improvements

**Acceptance Criteria**:
- [ ] All touch targets meet 44px minimum
- [ ] Spacing prevents accidental touches
- [ ] Adaptive sizing works across devices
- [ ] Touch guidelines are consistently applied
- [ ] Visual feedback is clear and immediate
- [ ] Accessibility improvements are implemented
- [ ] Interface feels natural on tablets

**Files to Create/Modify**:
- `packages/web/src/styles/touch-tokens.css` (new)
- Update all component styles for touch sizing
- `packages/web/src/utils/touchOptimization.mts` (new)

---

### Task 25: Create Swipe Gestures for Panel Management

**Priority**: Medium  
**Dependencies**: Task 24  
**Estimated Effort**: 2-3 days

**Description**: Implement swipe gestures for efficient panel management on tablets.

**Implementation Details**:
- Add swipe-to-close for panels
- Implement swipe-to-minimize functionality
- Create edge swipes for panel summoning
- Add swipe-to-switch for tabbed panels
- Implement gesture customization
- Add gesture conflict prevention
- Create gesture tutorial system

**Acceptance Criteria**:
- [ ] Swipe-to-close works reliably
- [ ] Panel minimization via swipe is smooth
- [ ] Edge swipes summon panels correctly
- [ ] Tab switching via swipe is intuitive
- [ ] Gesture settings are customizable
- [ ] Conflicts with map gestures are prevented
- [ ] Tutorial helps users learn gestures

**Files to Create/Modify**:
- Update `packages/web/src/composables/useGestures.mts`
- `packages/web/src/components/hud/GestureTutorial.vue` (new)
- Update panel components for swipe support

---

## Phase 5: Enhanced Features (4-5 weeks)

### Task 26: Expand Combat Action System

**Priority**: High  
**Dependencies**: Task 25  
**Estimated Effort**: 3-4 days

**Description**: Add advanced combat actions and improve the action framework.

**Implementation Details**:
- Add area-of-effect targeting and templates
- Implement reaction and opportunity attack system
- Create complex action sequences and chaining
- Add action prediction and planning interface
- Implement action history and undo capability
- Create action macros and shortcuts
- Add action animation coordination

**Acceptance Criteria**:
- [ ] AoE targeting works with visual templates
- [ ] Reaction system triggers appropriately
- [ ] Action sequences execute correctly
- [ ] Action prediction helps players plan
- [ ] Action history and undo work reliably
- [ ] Action macros can be created and used
- [ ] Animations coordinate with action execution

**Files to Create/Modify**:
- Update `packages/server/src/features/encounters/actions.service.mts`
- `packages/web/src/components/encounter/ActionTemplates.vue` (new)
- `packages/web/src/components/encounter/ActionHistory.vue` (new)

---

### Task 27: Add Visual Effects and Animations

**Priority**: Medium  
**Dependencies**: Task 26  
**Estimated Effort**: 3-4 days

**Description**: Implement visual effects system for enhanced feedback.

**Implementation Details**:
- Create particle effect system using Pixi.js
- Add attack and spell effect animations
- Implement damage number display
- Create status effect visualizations
- Add screen shake and impact effects
- Implement effect intensity scaling
- Add performance optimization for effects

**Acceptance Criteria**:
- [ ] Particle effects enhance combat feedback
- [ ] Attack animations are visually appealing
- [ ] Damage numbers display clearly
- [ ] Status effects are visually distinct
- [ ] Screen effects add impact without distraction
- [ ] Effect intensity can be adjusted
- [ ] Performance remains smooth with effects

**Files to Create/Modify**:
- `packages/web/src/services/effectsEngine.mts` (new)
- `packages/web/src/components/encounter/EffectsRenderer.vue` (new)
- `packages/web/src/utils/animations.mts` (new)

---

### Task 28: Implement Sound System

**Priority**: Low  
**Dependencies**: Task 27  
**Estimated Effort**: 2-3 days

**Description**: Add audio feedback and sound effects to enhance the experience.

**Implementation Details**:
- Create audio management system
- Add sound effects for combat actions
- Implement ambient soundscape support
- Create volume and audio preference controls
- Add spatial audio for positional effects
- Implement audio caching and preloading
- Add accessibility features for audio

**Acceptance Criteria**:
- [ ] Sound effects enhance action feedback
- [ ] Audio preferences are customizable
- [ ] Spatial audio adds immersion
- [ ] Audio caching improves performance
- [ ] Accessibility features are implemented
- [ ] Audio doesn't impact performance
- [ ] Sound system works across platforms

**Files to Create/Modify**:
- `packages/web/src/services/audioManager.mts` (new)
- `packages/web/src/components/hud/AudioControls.vue` (new)
- `packages/web/src/utils/spatialAudio.mts` (new)

---

### Task 29: Create Advanced GM Tools

**Priority**: Medium  
**Dependencies**: Task 28  
**Estimated Effort**: 3-4 days

**Description**: Build advanced tools for Game Master efficiency and control.

**Implementation Details**:
- Create quick action panels for common GM tasks
- Add batch token management tools
- Implement encounter state saving and loading
- Create automated combat progression tools
- Add encounter analytics and reporting
- Implement custom rule enforcement tools
- Create encounter template system

**Acceptance Criteria**:
- [ ] Quick actions improve GM workflow
- [ ] Batch operations work efficiently
- [ ] Encounter states save and load correctly
- [ ] Automation tools reduce GM workload
- [ ] Analytics provide useful insights
- [ ] Custom rules can be enforced
- [ ] Templates speed up encounter creation

**Files to Create/Modify**:
- `packages/web/src/components/hud/GMToolPanel.vue` (new)
- `packages/web/src/components/encounter/QuickActions.vue` (new)
- `packages/server/src/features/encounters/templates.service.mts` (new)

---

### Task 30: Build Plugin System Foundation

**Priority**: Medium  
**Dependencies**: Task 29  
**Estimated Effort**: 4-5 days

**Description**: Create plugin system foundation for game system extensions.

**Implementation Details**:
- Define plugin interfaces and contracts
- Create plugin registration and loading system
- Implement plugin lifecycle management
- Add plugin configuration and settings
- Create plugin API for encounter extensions
- Implement plugin error handling and isolation
- Add plugin marketplace foundation

**Acceptance Criteria**:
- [ ] Plugin interfaces are well-defined
- [ ] Plugin loading works reliably
- [ ] Plugin lifecycle is managed properly
- [ ] Plugin configurations are persistent
- [ ] Plugin API provides necessary functionality
- [ ] Plugin errors don't crash the system
- [ ] Plugin marketplace foundation is ready

**Files to Create/Modify**:
- `packages/shared/src/base/plugin.mts` (new)
- `packages/server/src/features/plugins/` (new directory)
- `packages/web/src/services/pluginManager.mts` (new)

---

### Task 31: Optimize Rendering and Performance

**Priority**: High  
**Dependencies**: Task 30  
**Estimated Effort**: 3-4 days

**Description**: Implement comprehensive performance optimizations.

**Implementation Details**:
- Add viewport culling for token rendering
- Implement level-of-detail system
- Create texture atlas optimization
- Add rendering batching and pooling
- Implement WebSocket event batching
- Create performance monitoring and metrics
- Add performance settings and controls

**Acceptance Criteria**:
- [ ] Viewport culling improves performance
- [ ] LOD system scales with zoom levels
- [ ] Texture optimization reduces memory usage
- [ ] Rendering batching improves frame rates
- [ ] WebSocket batching reduces network load
- [ ] Performance metrics are available
- [ ] Performance settings are adjustable

**Files to Create/Modify**:
- Update `packages/web/src/composables/useEncounterMap.mts`
- `packages/web/src/services/performanceMonitor.mts` (new)
- `packages/web/src/components/hud/PerformancePanel.vue` (new)

---

## Phase 6: Phone Companion & Polish (2-3 weeks)

### Task 32: Create Phone Companion Component

**Priority**: Medium  
**Dependencies**: Task 31  
**Estimated Effort**: 2-3 days

**Description**: Build simplified companion interface for phone users.

**Implementation Details**:
- Create phone-specific encounter component
- Add simplified initiative display
- Implement basic character sheet view
- Create encounter status display
- Add spectator mode functionality
- Implement basic player actions
- Create device hint messaging

**Acceptance Criteria**:
- [ ] Phone component displays correctly
- [ ] Initiative display is readable
- [ ] Character sheet is functional
- [ ] Encounter status is clear
- [ ] Spectator mode works properly
- [ ] Player actions are accessible
- [ ] Device hints guide users appropriately

**Files to Create/Modify**:
- `packages/web/src/components/encounter/PhoneEncounterCompanion.vue` (new)
- `packages/web/src/components/encounter/PhoneInitiativeList.vue` (new)
- `packages/web/src/components/encounter/PhoneCharacterSheet.vue` (new)

---

### Task 33: Implement Basic Player Actions on Phone

**Priority**: Medium  
**Dependencies**: Task 32  
**Estimated Effort**: 2-3 days

**Description**: Enable basic combat actions for phone users.

**Implementation Details**:
- Create simplified action interface
- Add touch-optimized action buttons
- Implement action confirmation dialogs
- Create action result display
- Add action history for phone users
- Implement action limitations for phone
- Create action tutorial for phone interface

**Acceptance Criteria**:
- [ ] Basic actions work on phone
- [ ] Touch interface is responsive
- [ ] Confirmation dialogs prevent mistakes
- [ ] Action results are clearly displayed
- [ ] Action history is accessible
- [ ] Action limitations are reasonable
- [ ] Tutorial helps new phone users

**Files to Create/Modify**:
- `packages/web/src/components/encounter/PhoneActions.vue` (new)
- `packages/web/src/components/encounter/PhoneActionDialog.vue` (new)
- Update encounter store for phone action support

---

### Task 34: Add Spectator Mode for Phone Users

**Priority**: Low  
**Dependencies**: Task 33  
**Estimated Effort**: 1-2 days

**Description**: Create read-only spectator mode for phone users.

**Implementation Details**:
- Implement encounter viewing without interaction
- Add participant list and status display
- Create turn progression visualization
- Add encounter event feed
- Implement connection status display
- Create refresh and reconnection handling
- Add spectator preferences and settings

**Acceptance Criteria**:
- [ ] Spectator mode displays encounter correctly
- [ ] Participant status is visible
- [ ] Turn progression is clear
- [ ] Event feed keeps users informed
- [ ] Connection status is obvious
- [ ] Refresh works without losing state
- [ ] Spectator settings are available

**Files to Create/Modify**:
- `packages/web/src/components/encounter/SpectatorMode.vue` (new)
- `packages/web/src/components/encounter/EventFeed.vue` (new)
- Update phone companion for spectator integration

---

### Task 35: Final Testing and Bug Fixes

**Priority**: High  
**Dependencies**: Task 34  
**Estimated Effort**: 3-4 days

**Description**: Comprehensive testing and bug resolution across all platforms.

**Implementation Details**:
- Create comprehensive test suite
- Test cross-platform compatibility
- Verify real-time synchronization
- Test performance under load
- Validate security and permissions
- Create regression test suite
- Document known issues and limitations

**Acceptance Criteria**:
- [ ] All major functionality works correctly
- [ ] Cross-platform compatibility is verified
- [ ] Real-time sync works reliably
- [ ] Performance meets target metrics
- [ ] Security vulnerabilities are addressed
- [ ] Regression tests pass consistently
- [ ] Documentation covers known issues

**Files to Create/Modify**:
- `packages/server/src/features/encounters/__tests__/` (new directory)
- `packages/web/src/components/encounter/__tests__/` (new directory)
- Create integration test suite

---

### Task 36: Performance Optimization

**Priority**: High  
**Dependencies**: Task 35  
**Estimated Effort**: 2-3 days

**Description**: Final performance optimization and tuning.

**Implementation Details**:
- Optimize bundle sizes for production
- Add lazy loading for non-critical components
- Implement service worker for caching
- Optimize database queries and indexes
- Add CDN integration for assets
- Create performance monitoring dashboard
- Add performance regression testing

**Acceptance Criteria**:
- [ ] Bundle sizes are optimized
- [ ] Lazy loading improves initial load time
- [ ] Service worker provides offline capability
- [ ] Database performance is optimized
- [ ] CDN reduces asset load times
- [ ] Performance monitoring is active
- [ ] Performance regression tests are in place

**Files to Create/Modify**:
- Update build configuration for optimization
- `packages/web/src/services/serviceWorker.mts` (new)
- `packages/server/src/monitoring/performance.mts` (new)

---

### Task 37: Create User Documentation

**Priority**: Medium  
**Dependencies**: Task 36  
**Estimated Effort**: 2-3 days

**Description**: Create comprehensive user and developer documentation.

**Implementation Details**:
- Write user guide for encounter system
- Create GM guide for advanced features
- Document API endpoints and schemas
- Create developer integration guide
- Add troubleshooting documentation
- Create video tutorials for key features
- Document deployment and configuration

**Acceptance Criteria**:
- [ ] User documentation covers all features
- [ ] GM guide explains advanced functionality
- [ ] API documentation is complete
- [ ] Developer guide enables integrations
- [ ] Troubleshooting guide resolves common issues
- [ ] Video tutorials enhance understanding
- [ ] Deployment documentation is accurate

**Files to Create/Modify**:
- `docs/encounter-system-user-guide.md` (new)
- `docs/encounter-system-gm-guide.md` (new)
- `docs/encounter-system-api.md` (new)
- `docs/encounter-system-developer-guide.md` (new)

---

## Success Criteria

The encounter system will be considered successful when:

- [ ] GMs can create and manage encounters with tokens on maps
- [ ] Initiative tracking and turn management work reliably
- [ ] Real-time synchronization works across all platforms
- [ ] Desktop HUD provides efficient GM workflow
- [ ] Tablet interface is touch-optimized and functional
- [ ] Phone companion provides useful player experience
- [ ] Performance meets targets on all platforms
- [ ] System integrates seamlessly with existing DungeonLab features
- [ ] Plugin system supports game system extensions
- [ ] User experience is intuitive and responsive

## Risk Mitigation

1. **Technical Complexity**: Break down tasks into smaller, testable components
2. **Performance Issues**: Regular performance testing, especially on tablets
3. **Platform Compatibility**: Test on target devices throughout development
4. **Real-time Reliability**: Implement robust error handling and reconnection
5. **User Experience**: Conduct user testing after each major phase
6. **Integration Issues**: Regular integration testing with existing systems
7. **Scope Creep**: Strict adherence to phase deliverables and success criteria 