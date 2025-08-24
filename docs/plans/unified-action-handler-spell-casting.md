# Unified Action Handler Spell Casting - Implementation Plan

## Overview

This implementation plan breaks down the unified action handler spell casting system into concrete phases and trackable tasks. Based on the comprehensive proposal in `docs/proposals/unified-action-handler-spell-casting.md`, this plan provides a systematic roadmap for implementing the new architecture.

## Current Status ✅

**Phase 1: Infrastructure Foundation** - 100% Complete (4/4 tasks) 
- ✅ **1.1 Roll Request Service Implementation** - Complete with 20/20 tests passing
- ✅ **1.2 Async Action Context Implementation** - Complete with 16/16 tests passing  
- ✅ **1.3 GM Action Handler Integration** - Complete with ActionContext creation and passing
- ✅ **1.4 Functional Pipeline Architecture** - Complete with unified roll processing

**Ready for Phase 2:** All infrastructure for the unified action handler pattern is complete and tested. The system now supports:
- Promise-based roll request/response correlation with timeout handling using single `rollId` correlation
- Multi-target roll coordination with proper error handling  
- AsyncActionContext interface providing all utilities needed for spell casting
- Functional pipeline architecture eliminating code duplication between direct rolls and roll requests
- Unified side effect coordination (chat messages, follow-up rolls, actions)
- Pure function roll processing with ProcessedRollResult interface
- Comprehensive test coverage (36/36 total tests passing)
- Consistent `rollId` naming across all roll events (roll:request, roll, roll:result, roll:request:error) - no metadata correlation needed

**Key Architectural Achievement**: Direct rolls from character sheets and roll requests from action handlers now use **identical processing logic**, eliminating the code duplication that would have made spell casting implementation complex and error-prone.

## Implementation Strategy

### Core Principle
Implement infrastructure first, then build incrementally from simple to complex spell mechanics. Each phase builds on the previous phase's foundations.

### Success Criteria
- ✅ Single unified `executeSpellCast` function handles all spell types (ready for implementation)
- ✅ Local variable persistence throughout complete spell workflows  
- ✅ Promise-based roll request/response correlation
- ✅ Atomic success/failure for complete spell operations
- ✅ Comprehensive error handling and timeout management
- ✅ Full backward compatibility with existing action handler system
- ✅ **Unified roll processing pipeline** - Both direct rolls and roll requests use identical logic
- ✅ **Pure function architecture** - Roll handlers are testable and side-effect free
- ✅ **Eliminated code duplication** - No separate processing paths for different roll sources

---

## Phase 1: Infrastructure Foundation ✅ **100% COMPLETE (4/4 tasks)**
*Estimated Duration: 2-3 weeks* | **Progress: 2 weeks completed**

### 1.1 Roll Request Service Implementation ✅ **COMPLETED**
**Priority: Critical** | **Estimate: 1 week** | **Actual: 1 week**

- [x] **Create RollRequestService class** (`packages/web/src/services/roll-request.service.mts`)
  - [x] Implement Promise-based request/response correlation
  - [x] Add timeout handling (default 60s, configurable)
  - [x] Implement request ID generation and tracking
  - [x] Add cleanup methods for expired requests
  - [x] Handle player disconnection scenarios
  - **Acceptance Criteria**: ✅ Service can send roll request and return Promise that resolves with RollServerResult

- [x] **Add multi-target roll coordination**
  - [x] Implement `sendMultipleRollRequests()` method
  - [x] Use `Promise.all()` for parallel roll handling
  - [x] Handle partial failures gracefully
  - **Acceptance Criteria**: ✅ Can send multiple roll requests in parallel and collect all results

- [x] **Create comprehensive unit tests** (`packages/web/src/services/__tests__/roll-request.service.test.mts`)
  - [x] Test successful request/response cycles  
  - [x] Test timeout scenarios
  - [x] Test player disconnection handling
  - [x] Test multi-target coordination
  - **Acceptance Criteria**: ✅ >95% code coverage, all edge cases tested

**Additional Improvements Delivered:**
- [x] **Simplified rollId correlation** - Single `rollId` field flows through entire roll chain (roll:request → roll → roll:result → roll:request:error)
- [x] **Enhanced WebSocket integration** - Clean correlation without metadata complexity
- [x] **Memory management** - Automatic cleanup prevents leaks
- [x] **Comprehensive error handling** - Timeout, disconnection, and partial failure scenarios

**Dependencies**: None

### 1.2 Async Action Context Implementation ✅ **COMPLETED**
**Priority: Critical** | **Estimate: 1 week** | **Actual: 1 week**

- [x] **Define AsyncActionContext interface** (`packages/shared/src/interfaces/action-context.interface.mts`)
  - [x] Add roll request methods (`sendRollRequest`, `sendMultipleRollRequests`)
  - [x] Add communication utilities (`sendChatMessage`, `requestGMConfirmation`)
  - [x] Add game state access properties
  - **Acceptance Criteria**: ✅ Interface provides all utilities needed for spell casting workflows

- [x] **Implement ActionContextImpl class** (`packages/web/src/services/action-context.service.mts`)
  - [x] Integrate with RollRequestService
  - [x] Implement chat message functionality  
  - [x] Add GM confirmation dialog support
  - [x] Include cleanup methods
  - **Acceptance Criteria**: ✅ Context provides working implementations of all interface methods

- [x] **Create unit tests for ActionContext** (`packages/web/src/services/__tests__/action-context.service.test.mts`)
  - [x] Test roll request integration
  - [x] Test chat message functionality
  - [x] Test error handling and cleanup
  - **Acceptance Criteria**: ✅ All context methods work correctly with proper error handling (16/16 tests passing)

**Additional Improvements Delivered:**
- [x] **Consistent rollId naming** - Updated all roll-related events to use `rollId` field for better greppability (eliminates metadata-based correlation)
- [x] **Graceful error handling** - Chat failures don't break spell execution
- [x] **Comprehensive logging** - Full visibility into action context operations
- [x] **Dependency injection design** - Clean testable architecture with proper mocking support

**Dependencies**: 1.1 Roll Request Service

### 1.3 GM Action Handler Integration ✅ **COMPLETED**
**Priority: Critical** | **Estimate: 1 week** | **Actual: 1 week**

- [x] **Update GMActionHandlerService** (`packages/web/src/services/gm-action-handler.service.mts`)
  - [x] Modify `executeMultiHandlerAction` to create ActionContext
  - [x] Pass context as third parameter to `handler.execute()`
  - [x] Ensure backward compatibility with existing handlers
  - [x] Add proper error handling for context operations
  - **Acceptance Criteria**: ✅ Existing action handlers continue working unchanged, new handlers can use context

- [x] **Update action handler interface** (`packages/web/src/services/action-handler.interface.mts`)
  - [x] Make context parameter optional for backward compatibility
  - [x] Update TypeScript types appropriately
  - **Acceptance Criteria**: ✅ Both old and new handler signatures work correctly

- [x] **Add roll result handling integration**
  - [x] Connect RollRequestService to existing roll handler via RollHandlerService
  - [x] Ensure roll results are properly correlated using rollId
  - [x] Fix duplicate processing issues between services
  - **Acceptance Criteria**: ✅ Roll request/response cycle works end-to-end without duplication

**Additional Improvements Delivered:**
- [x] **Unified roll processing pipeline** - Eliminates code duplication between direct rolls and roll requests
- [x] **Backward compatible context passing** - Existing handlers unaffected, new handlers can access context
- [x] **Proper error handling** - Context creation failures handled gracefully
- [x] **Integration testing** - Verified with existing weapon attack system

**Dependencies**: 1.1 Roll Request Service, 1.2 Async Action Context

### 1.4 Functional Pipeline Architecture ✅ **COMPLETED** 
**Priority: Critical** | **Estimate: 2 days** | **Actual: 2 days**

> **Major Architectural Enhancement**: During implementation, we discovered a critical code duplication issue between direct rolls (character sheet) and roll requests (action handlers). This phase implemented a functional pipeline architecture that eliminates this duplication.

- [x] **Create ProcessedRollResult interface** (`packages/shared/src/interfaces/processed-roll-result.interface.mts`)
  - [x] Define pure function interface for roll processing
  - [x] Add follow-up action types (chat messages, roll requests, action requests)
  - [x] Support backward compatibility with legacy handlers
  - **Acceptance Criteria**: ✅ Interface supports all D&D roll types with side effect coordination

- [x] **Refactor roll handlers to pure functions**
  - [x] Update DndAbilityCheckHandler with `processRoll` method
  - [x] Update DndWeaponAttackHandler with complex attack/damage logic
  - [x] Update DndWeaponDamageHandler with damage application logic
  - [x] Maintain backward compatibility via delegation
  - **Acceptance Criteria**: ✅ Roll handlers now work identically for direct rolls and roll requests

- [x] **Enhance RollHandlerService coordination**
  - [x] Add functional approach detection and execution
  - [x] Implement follow-up action coordination (chat, rolls, actions)
  - [x] Maintain fallback to legacy handlers during transition
  - [x] Add comprehensive logging and error handling
  - **Acceptance Criteria**: ✅ Both roll paths use identical processing logic

**Critical Problem Solved:**
- **Before**: Direct rolls and roll requests used different processing paths, causing code duplication
- **After**: Both paths converge on identical pure function processing with unified side effects

**Additional Benefits:**
- [x] **Eliminated Code Duplication** - Same D&D calculations for both roll paths
- [x] **Pure Function Architecture** - Roll processing is now testable and side-effect free
- [x] **Unified Side Effects** - Chat messages, follow-up rolls, and actions handled consistently
- [x] **Enhanced Debuggability** - Clear separation of processing logic from side effects

**Dependencies**: 1.1 Roll Request Service, 1.2 Async Action Context, 1.3 GM Action Handler Integration

---

## Phase 2: Basic Spell Casting Implementation  
*Estimated Duration: 2-3 weeks*

### 2.1 Spell Data Integration
**Priority: High** | **Estimate: 1 week**

> **Key Requirements**: 
> - Use `pluginContext.getDocument()` for spell lookup (spells may not be in gameState)
> - Support both characters AND actors as casters/targets (not just characters)
> - Follow existing weapon handler patterns for actor/character handling

- [ ] **Create spell lookup utilities** (`packages/plugins/dnd-5e-2024/src/services/spell-lookup.service.mts`)
  - [ ] Implement `lookupSpell(spellId, pluginContext)` function using `pluginContext.getDocument()`
  - [ ] Add spell data validation and error handling for compendium/database lookups
  - [ ] Create helper functions for spell property checks (attack, save, damage, effects)
  - [ ] Add spell slot management utilities for both characters and actors
  - **Acceptance Criteria**: Can reliably lookup spell data from compendium and validate spell properties

- [ ] **Add caster/target utilities supporting both characters and actors**
  - [ ] Implement `getCasterForToken(tokenId, gameState)` - returns ICharacter | IActor
  - [ ] Implement `getTargetForToken(tokenId, gameState)` - returns ICharacter | IActor  
  - [ ] Add `getSpellAttackBonus(caster)` calculation supporting both document types
  - [ ] Add `getSpellDC(caster)` calculation supporting both document types
  - [ ] Implement `hasAvailableSpellSlot(caster, level)` for characters and actors
  - [ ] Implement `consumeSpellSlot(caster, level, draft)` for characters and actors
  - **Acceptance Criteria**: All spell casting utilities work with both character and actor casters/targets

- [ ] **Add spell slot data structure utilities**
  - [ ] Create `getSpellSlotData(caster)` to extract spell slots from pluginData
  - [ ] Add validation for different spell slot storage formats (character vs actor)
  - [ ] Implement spell slot restoration utilities (short rest, long rest)
  - [ ] Add spell slot tracking and persistence in document state
  - **Acceptance Criteria**: Spell slot management works consistently across document types

- [ ] **Create comprehensive unit tests**
  - [ ] Test spell lookup via `pluginContext.getDocument()` with mock responses
  - [ ] Test spell slot management for both characters and actors
  - [ ] Test spell attack/DC calculations for different caster types
  - [ ] Test caster/target lookup for tokens linked to different document types
  - [ ] Test error handling for missing spells, invalid casters, etc.
  - **Acceptance Criteria**: All spell data operations work reliably with >90% code coverage

**Dependencies**: Phase 1 complete

### 2.2 Basic Spell Casting Handler
**Priority: Critical** | **Estimate: 1.5 weeks**

- [ ] **Implement executeSpellCast action handler** (`packages/plugins/dnd-5e-2024/src/handlers/spell-cast.handler.mts`)
  - [ ] Create unified function signature with AsyncActionContext
  - [ ] Implement spell data lookup and validation
  - [ ] Add spell slot consumption
  - [ ] Implement basic error handling and logging
  - **Acceptance Criteria**: Handler can be called and performs basic spell casting setup

- [ ] **Implement Phase 1: Spell Attack logic**
  - [ ] Add conditional logic for `spell.spellAttack` 
  - [ ] Implement multi-target attack roll requests
  - [ ] Add hit/miss determination
  - [ ] Handle early exit for complete misses
  - **Acceptance Criteria**: Attack spells work correctly with proper hit/miss logic

- [ ] **Implement Phase 3: Basic damage application**
  - [ ] Add conditional logic for `spell.damage`
  - [ ] Implement single damage roll for all targets  
  - [ ] Apply damage only to hit targets
  - [ ] Add proper logging and chat messages
  - **Acceptance Criteria**: Attack spells deal damage correctly to hit targets only

- [ ] **Register spell casting action**
  - [ ] Add to multi-handler registry
  - [ ] Configure appropriate priority
  - [ ] Add validation rules
  - **Acceptance Criteria**: Spell casting action can be triggered from UI

**Dependencies**: 2.1 Spell Data Integration

### 2.3 Attack Spell Testing (Fire Bolt)
**Priority: High** | **Estimate: 3-4 days**

- [ ] **Create integration tests for Fire Bolt**
  - [ ] Test complete workflow from action request to damage application
  - [ ] Verify spell slot consumption
  - [ ] Test attack hit scenarios  
  - [ ] Test attack miss scenarios
  - [ ] Verify proper chat message generation
  - **Acceptance Criteria**: Fire Bolt spells work end-to-end with proper state changes

- [ ] **Add error handling tests**
  - [ ] Test spell slot validation failures
  - [ ] Test roll request timeouts
  - [ ] Test invalid spell data handling
  - **Acceptance Criteria**: All error scenarios are handled gracefully

- [ ] **Performance testing**
  - [ ] Test with multiple concurrent spell casts
  - [ ] Verify memory cleanup after spell completion
  - [ ] Test timeout cleanup functionality
  - **Acceptance Criteria**: System performs well under load

**Dependencies**: 2.2 Basic Spell Casting Handler

---

## Phase 3: Advanced Spell Mechanics
*Estimated Duration: 3-4 weeks*

### 3.1 Saving Throw Implementation
**Priority: High** | **Estimate: 1.5 weeks**

- [ ] **Implement Phase 2: Saving Throw logic** 
  - [ ] Add conditional logic for `spell.savingThrow`
  - [ ] Implement multi-target save requests to different players
  - [ ] Add save success/failure determination
  - [ ] Handle area effect target determination
  - **Acceptance Criteria**: Saving throw spells request saves from correct targets

- [ ] **Enhance Phase 3: Save-based damage**
  - [ ] Add damage modification based on save results
  - [ ] Implement half damage on successful saves
  - [ ] Support different damage application rules
  - **Acceptance Criteria**: Spells like Fireball apply correct damage based on saves

- [ ] **Create Fireball integration test**
  - [ ] Test multi-target saving throws
  - [ ] Verify save-based damage calculation
  - [ ] Test mixed save success/failure scenarios
  - **Acceptance Criteria**: Fireball spells work completely with proper save handling

**Dependencies**: Phase 2 complete

### 3.2 Dual-Mechanic Spell Support
**Priority: High** | **Estimate: 1.5 weeks**

- [ ] **Enhance executeSpellCast for dual-mechanic spells**
  - [ ] Support spells with both `spellAttack` and `savingThrow`
  - [ ] Implement area effect calculation for explosions
  - [ ] Add multiple damage type support
  - [ ] Handle complex target determination logic
  - **Acceptance Criteria**: Spells like Ice Knife work with both attack and area save

- [ ] **Add conditional damage application**
  - [ ] Support `damageInfo.condition` logic  
  - [ ] Implement attack-based vs save-based damage
  - [ ] Handle multiple damage instances per spell
  - **Acceptance Criteria**: Complex spells apply different damage types correctly

- [ ] **Create Ice Knife integration test**
  - [ ] Test primary attack against main target
  - [ ] Test area explosion affecting multiple targets
  - [ ] Verify different damage types are applied correctly
  - [ ] Test scenarios where attack hits/misses but explosion still occurs
  - **Acceptance Criteria**: Ice Knife demonstrates complete dual-mechanic functionality

**Dependencies**: 3.1 Saving Throw Implementation

### 3.3 Effect Application System
**Priority: Medium** | **Estimate: 1 week**

- [ ] **Implement Phase 4: Additional Effects**
  - [ ] Add conditional logic for `spell.effects`
  - [ ] Implement effect application conditions
  - [ ] Add support for various effect types (conditions, buffs, etc.)
  - [ ] Handle effect duration and persistence
  - **Acceptance Criteria**: Spells can apply non-damage effects like conditions

- [ ] **Create effect utilities**
  - [ ] Implement `applyEffectToTarget(draft, target, effect)`
  - [ ] Add condition application logic
  - [ ] Support timed effects and ongoing effects
  - **Acceptance Criteria**: Various spell effects can be applied and tracked

- [ ] **Test with Hold Person spell**
  - [ ] Implement paralyzed condition application  
  - [ ] Test save vs effect application
  - [ ] Verify effect persists in game state
  - **Acceptance Criteria**: Hold Person spell demonstrates effect application

**Dependencies**: 3.2 Dual-Mechanic Spell Support

---

## Phase 4: Polish & Production Readiness
*Estimated Duration: 2-3 weeks*

### 4.1 Error Handling & Recovery
**Priority: High** | **Estimate: 1 week**

- [ ] **Implement comprehensive timeout handling**
  - [ ] Add graceful degradation for non-responsive players
  - [ ] Implement GM override options for timeouts  
  - [ ] Add automatic retry mechanisms where appropriate
  - [ ] Support spell cancellation with slot refund logic
  - **Acceptance Criteria**: System handles player disconnections and timeouts gracefully

- [ ] **Add error recovery mechanisms**
  - [ ] Implement `safeRollRequest()` wrapper function
  - [ ] Add fallback options for failed operations
  - [ ] Support partial spell completion scenarios
  - **Acceptance Criteria**: Spells degrade gracefully rather than failing catastrophically

- [ ] **Create comprehensive error scenario tests**
  - [ ] Test all timeout scenarios
  - [ ] Test player disconnection during spell casting
  - [ ] Test partial roll failure handling
  - **Acceptance Criteria**: All error scenarios have appropriate fallback behavior

**Dependencies**: Phase 3 complete

### 4.2 Performance & Memory Management  
**Priority: Medium** | **Estimate**: 4-5 days**

- [ ] **Implement memory management**
  - [ ] Add cleanup methods to ActionContext
  - [ ] Ensure roll requests are properly garbage collected
  - [ ] Add memory leak detection in tests
  - **Acceptance Criteria**: No memory leaks during extended spell casting sessions

- [ ] **Add performance optimizations**  
  - [ ] Implement request batching where possible
  - [ ] Add spell data caching
  - [ ] Optimize target lookup operations
  - **Acceptance Criteria**: Spell casting performs well with large numbers of targets

- [ ] **Load testing**
  - [ ] Test with multiple concurrent spell casts
  - [ ] Verify performance with large numbers of targets
  - [ ] Test memory usage under sustained load
  - **Acceptance Criteria**: System maintains performance under realistic game loads

**Dependencies**: 4.1 Error Handling & Recovery

### 4.3 Testing & Documentation
**Priority: Medium** | **Estimate: 1 week**

- [ ] **Create comprehensive test suite**
  - [ ] Unit tests for all new services and utilities
  - [ ] Integration tests for complete spell workflows
  - [ ] End-to-end tests with real WebSocket communication
  - [ ] Performance and stress tests
  - **Acceptance Criteria**: >90% code coverage, all scenarios tested

- [ ] **Add developer documentation**
  - [ ] Document unified action handler pattern
  - [ ] Create guide for implementing new spell types
  - [ ] Add troubleshooting guide for common issues
  - **Acceptance Criteria**: Other developers can understand and extend the system

- [ ] **Create migration documentation**
  - [ ] Document how to migrate existing complex actions
  - [ ] Provide before/after code examples
  - [ ] Create best practices guide
  - **Acceptance Criteria**: Clear path for adopting unified pattern in other systems

**Dependencies**: 4.2 Performance & Memory Management

### 4.4 Production Integration
**Priority: High** | **Estimate**: 3-4 days**

- [ ] **Integration with D&D 5e plugin UI**
  - [ ] Add spell casting buttons to character sheets
  - [ ] Implement spell slot tracking in UI
  - [ ] Add spell selection interface
  - [ ] Integrate with existing token targeting
  - **Acceptance Criteria**: Players can cast spells through existing UI

- [ ] **Final integration testing**
  - [ ] Test with complete D&D 5e game session
  - [ ] Verify compatibility with existing features
  - [ ] Test performance in realistic game scenarios
  - **Acceptance Criteria**: System works seamlessly in actual gameplay

- [ ] **Production deployment preparation**
  - [ ] Add feature flags for gradual rollout
  - [ ] Create monitoring and logging
  - [ ] Add rollback procedures  
  - **Acceptance Criteria**: System ready for production deployment

**Dependencies**: 4.3 Testing & Documentation

---

## Success Metrics

### Functional Requirements
- [ ] All spell types (attack, save, dual-mechanic, effect) work correctly
- [ ] Complete workflows execute atomically (success or failure as unit)
- [ ] Local variable persistence maintained throughout spell execution
- [ ] Multi-target coordination works reliably
- [ ] Error handling prevents partial or corrupted game states

### Technical Requirements  
- [ ] >90% code coverage across all new components
- [ ] <2 second response time for spell completion
- [ ] Zero memory leaks during extended sessions
- [ ] Graceful handling of all timeout and disconnection scenarios
- [ ] Full backward compatibility with existing action handler system

### User Experience Requirements
- [ ] Spell casting feels responsive and reliable
- [ ] Error messages are clear and actionable
- [ ] Roll requests are intuitive and well-formatted
- [ ] Chat messages provide appropriate spell feedback
- [ ] System works seamlessly with existing UI components

---

## Risk Mitigation

### Technical Risks
- **WebSocket correlation complexity**: Mitigate with comprehensive testing and monitoring
- **Memory leaks from async operations**: Address with explicit cleanup and automated detection
- **Performance impact of Promise coordination**: Monitor and optimize with caching/batching

### Integration Risks  
- **Backward compatibility issues**: Maintain old handler interface alongside new one
- **UI integration complexity**: Implement incrementally with feature flags
- **Existing system disruption**: Thorough testing and gradual rollout

### Project Risks
- **Scope creep**: Focus on core spell casting first, defer advanced features
- **Timeline delays**: Build incrementally with working functionality at each phase
- **Resource constraints**: Prioritize critical path items, defer nice-to-have features

---

## Conclusion

This implementation plan provides a systematic approach to building the unified action handler spell casting system. By implementing infrastructure first and building incrementally from simple to complex mechanics, we can ensure a robust, well-tested system that dramatically improves the developer experience for complex game mechanics while maintaining full backward compatibility.

The phased approach allows for course correction and ensures we have working functionality at each milestone, reducing project risk and enabling early user testing and feedback.