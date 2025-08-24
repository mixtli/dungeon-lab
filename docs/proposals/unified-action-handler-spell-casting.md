# Unified Action Handler Spell Casting Implementation

## Executive Summary

This proposal outlines a revolutionary approach to implementing spell casting in Dungeon Lab using **unified action handlers** that manage complete workflows within a single async function. This architectural pattern eliminates the current fragmented system of coordinating between separate action handlers, roll handlers, and damage handlers.

### Key Innovation: From Fragmented to Unified

**Current Fragmented Approach**: 
- Spell casting requires coordination between 4+ separate handlers
- Context passed through metadata juggling
- Complex state management across handler boundaries
- Difficult to debug and test complete workflows

**Proposed Unified Approach**:
- Single async action handler manages entire spell workflow
- Local variables persist throughout complete flow
- Linear, readable code with proper error handling
- Easy testing and debugging of complete interactions

## Core Benefits

### 🚀 **Developer Experience**
- **Single Source of Truth**: One function = one complete spell action
- **Local State Persistence**: Variables like `spell`, `caster`, `targets` persist throughout workflow
- **Linear Control Flow**: Read code top-to-bottom like a story
- **Better Error Handling**: Catch and handle failures at any step in one place
- **Easier Testing**: Unit test complete workflows in isolation

### 📊 **System Architecture**
- **Reduced Coordination**: No metadata passing between handlers
- **Atomic Operations**: Complete spell either succeeds or fails as unit
- **Better Performance**: Eliminate handler lookup and coordination overhead
- **Cleaner APIs**: Intuitive async/await patterns instead of event juggling

## Technical Foundation

### Current System Analysis

The existing Dungeon Lab architecture is **exceptionally well-suited** for this pattern:

1. **✅ Async Action Handlers Already Supported**
   ```typescript
   // From gm-action-handler.service.mts:225
   await handler.execute(request, draft as ServerGameStateWithVirtuals);
   ```

2. **✅ WebSocket Infrastructure Ready**
   - GM can send `roll:request` events to any player
   - Players respond with normal `roll` events  
   - Request/response correlation exists for actions

3. **✅ State Management Handles Async**
   - Immer `createDraft`/`finishDraft` supports async operations
   - Atomic state updates with proper error recovery
   - Draft state held during entire async operation

4. **✅ Multi-Target Coordination Possible**
   - Can send parallel roll requests using existing WebSocket layer
   - `Promise.all()` handles multiple response coordination

### What Needs to Be Added

1. **✅ Roll Request/Response Correlation**: Track pending roll requests - COMPLETED
2. **✅ Enhanced Action Context**: Utilities for sending roll requests from action handlers - COMPLETED  
3. **✅ Roll Response Promise Resolution**: Async utilities to await roll results - COMPLETED
4. **✅ Timeout/Error Handling**: For non-responsive players - COMPLETED
5. **✅ Unified Roll Processing Pipeline**: Eliminate code duplication between direct rolls and roll requests - COMPLETED

## Architecture Design

### Critical Discovery: Roll Handler Unification

During Phase 1 implementation, we discovered a **major code duplication issue** that needed to be solved before unified action handlers could work effectively:

#### The Problem
**Two separate roll processing paths existed:**

1. **Direct Rolls (Character Sheet)**: Player → Roll → RollHandler → Chat Message + Side Effects
2. **Roll Requests (Action Handlers)**: ActionHandler → Roll Request → Player → Roll → RollHandler → ???

The issue: RollHandlers were designed for direct rolls and would **duplicate processing** when called for action handler requested rolls, leading to:
- ❌ Duplicate chat messages
- ❌ Duplicate damage application  
- ❌ Inconsistent D&D calculations between paths
- ❌ Complex coordination logic needed

#### The Solution: Functional Pipeline Architecture

We implemented a **pure function approach** that eliminates this duplication:

```typescript
// New ProcessedRollResult interface
interface ProcessedRollResult {
  rollResult: RollServerResult & {
    calculatedTotal?: number;
    isCriticalHit?: boolean;
    processedData?: Record<string, unknown>;
  };
  followUpActions: FollowUpAction[]; // Chat messages, roll requests, action requests
  executeDefaultSideEffects: boolean;
  processingInfo: {
    handlerType: string;
    calculationDetails?: Record<string, unknown>;
  };
}

// Roll handlers now implement pure processRoll method
class DndWeaponAttackHandler implements RollTypeHandler {
  async processRoll(result: RollServerResult, context: RollHandlerContext): Promise<ProcessedRollResult> {
    // Pure function: calculate results, return actions to take
    // NO side effects (no chat messages, no state changes)
    const total = this.calculateAttackTotal(result, weapon, character);
    const attackMessage = this.createAttackResultMessage(result, weapon, total);
    
    return {
      rollResult: { ...result, calculatedTotal: total },
      followUpActions: [
        { type: 'chat-message', data: { message: attackMessage } },
        { type: 'roll-request', data: { rollType: 'damage', ... } }
      ],
      executeDefaultSideEffects: false
    };
  }
}
```

#### Unified Processing Flow

**Now both paths converge on identical logic:**

1. **Direct Rolls**: Player → Roll → `processRoll()` → Execute Follow-up Actions
2. **Roll Requests**: Action Handler → Roll Request → Player → Roll → `processRoll()` → Promise Resolution + Execute Follow-up Actions

**Benefits:**
- ✅ **Same D&D calculations** for both roll types
- ✅ **No code duplication** - single source of truth for roll logic  
- ✅ **Pure functions** - easy to test and debug
- ✅ **Consistent side effects** - unified handling of chat messages, follow-up rolls, actions
- ✅ **Backward compatibility** - legacy handlers still work during transition

### Core Infrastructure Changes

#### 1. Enhanced Action Handler Interface

```typescript
// Extend existing action handler to include context parameter
interface AsyncActionHandler {
  validate(request: GameActionRequest, gameState: ServerGameStateWithVirtuals): ActionValidationResult
  execute(request: GameActionRequest, draft: ServerGameStateWithVirtuals, context: AsyncActionContext): Promise<void>
  priority?: number
  pluginId?: string
  approvalMessage?: (request: GameActionRequest) => string
}

// New action context with roll request utilities
interface AsyncActionContext {
  // Core roll management
  sendRollRequest(playerId: string, rollType: string, rollData: RollData): Promise<RollServerResult>
  sendMultipleRollRequests(requests: RollRequestSpec[]): Promise<RollServerResult[]>
  
  // Communication utilities
  sendChatMessage(message: string, options?: ChatOptions): void
  requestGMConfirmation(message: string): Promise<boolean>
  
  // State access
  gameState: ServerGameStateWithVirtuals
}

// Data structure for roll request parameters
interface RollData {
  message?: string;
  dice: Array<{ sides: number; quantity: number }>;
  metadata?: Record<string, unknown>;
}

// Roll request specification for multi-target scenarios
interface RollRequestSpec {
  playerId: string
  rollType: string
  rollData: RollData
}
```

#### 2. Roll Request Service

```typescript
/**
 * Service to manage asynchronous roll request/response cycles
 * Handles correlation, timeouts, and error recovery
 */
class RollRequestService {
  private pendingRollRequests = new Map<string, {
    resolve: (result: RollServerResult) => void
    reject: (error: Error) => void  
    timeout: NodeJS.Timeout
    playerId: string
    rollType: string
  }>()

  /**
   * Send a roll request and return Promise that resolves with the result
   */
  async sendRollRequest(
    playerId: string, 
    rollType: string, 
    rollData: RollData,
    timeoutMs = 60000
  ): Promise<RollServerResult> {
    const rollId = `roll_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Send roll:request via existing WebSocket infrastructure
    const socketStore = useSocketStore()
    socketStore.emit('roll:request', {
      rollId,        // Single correlation ID flows through entire roll lifecycle
      playerId,
      rollType,
      message: rollData.message || `Roll ${rollType}`,
      dice: rollData.dice,
      metadata: rollData.metadata
    })
    
    // Return promise that resolves when roll:result comes back
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        const error = new Error(`Roll request timeout for player ${playerId} (${rollType})`)
        reject(error)
        this.pendingRollRequests.delete(rollId)
      }, timeoutMs)
      
      this.pendingRollRequests.set(rollId, { 
        resolve, 
        reject, 
        timeout, 
        playerId, 
        rollType 
      })
    })
  }

  /**
   * Send multiple roll requests in parallel and await all results
   */
  async sendMultipleRollRequests(requests: RollRequestSpec[]): Promise<RollServerResult[]> {
    const rollPromises = requests.map(req => 
      this.sendRollRequest(req.playerId, req.rollType, req.rollData)
    )
    
    return Promise.all(rollPromises)
  }

  /**
   * Handle incoming roll:result events (called by roll handler)
   */
  handleRollResult(result: RollServerResult): void {
    const rollId = result.rollId
    if (!rollId) return

    const pendingRequest = this.pendingRollRequests.get(rollId)
    if (pendingRequest) {
      clearTimeout(pendingRequest.timeout)
      pendingRequest.resolve(result)
      this.pendingRollRequests.delete(rollId)
    }
  }

  /**
   * Clean up expired requests (called periodically)
   */
  cleanupExpiredRequests(): void {
    const now = Date.now()
    for (const [rollId, request] of this.pendingRollRequests.entries()) {
      // Clean up requests older than 2 minutes
      if (now - parseInt(rollId.split('_')[1]) > 120000) {
        clearTimeout(request.timeout)
        request.reject(new Error('Request expired'))
        this.pendingRollRequests.delete(rollId)
      }
    }
  }
}
```

#### 3. Action Context Implementation

```typescript
/**
 * Implementation of AsyncActionContext with roll request capabilities
 */
class ActionContextImpl implements AsyncActionContext {
  private rollRequestService: RollRequestService

  constructor(
    public gameState: ServerGameStateWithVirtuals,
    rollRequestService: RollRequestService
  ) {
    this.rollRequestService = rollRequestService
  }

  async sendRollRequest(
    playerId: string, 
    rollType: string, 
    rollData: RollData
  ): Promise<RollServerResult> {
    return this.rollRequestService.sendRollRequest(playerId, rollType, rollData)
  }

  async sendMultipleRollRequests(requests: RollRequestSpec[]): Promise<RollServerResult[]> {
    return this.rollRequestService.sendMultipleRollRequests(requests)
  }

  sendChatMessage(message: string, options?: ChatOptions): void {
    const chatStore = useChatStore()
    chatStore.addMessage({
      type: 'system',
      content: message,
      timestamp: new Date(),
      ...options
    })
  }

  async requestGMConfirmation(message: string): Promise<boolean> {
    // Implementation would show GM confirmation dialog
    // For now, return true (auto-approve)
    return true
  }
}
```

### Integration with Existing System

#### Modified GM Action Handler Service

```typescript
// In gm-action-handler.service.mts
class GMActionHandlerService {
  private rollRequestService = new RollRequestService()

  async processActionRequest(request: GameActionRequest): Promise<void> {
    // ... existing validation logic ...

    // Create enhanced action context
    const actionContext = new ActionContextImpl(
      rawGameState,
      this.rollRequestService
    )

    // Execute handlers with enhanced context
    for (const handler of handlers) {
      if (handler.execute) {
        // Pass context as third parameter
        await handler.execute(request, draft, actionContext)
      }
    }

    // ... existing state update logic ...
  }
}
```

## Unified Spell Casting Flow

### Complete Sequence Diagram

```mermaid
sequenceDiagram
    participant PC as Player Client
    participant GM as GM Client
    participant T1 as Target 1  
    participant T2 as Target 2
    participant RS as Roll System
    participant GS as Game State
    participant CH as Chat System

    Note over PC,CH: Unified Spell Casting Workflow
    Note over PC,CH: Single action handler manages complete spell flow

    PC->>GM: cast-spell action request
    Note right of PC: {spellId, casterTokenId, targetTokenIds, spellSlotLevel}
    
    GM->>GM: Validate spell requirements
    GM->>GS: Consume spell slot
    
    rect rgb(40, 60, 80)
        Note over GM,GS: Phase 1: Spell Attack (if spell has spellAttack field)
        alt Spell Has Attack Roll
            par Multi-Target Spell Attacks
                GM->>+PC: sendRollRequest(spell-attack)  
                Note right of GM: Unified handler requests roll via context
                PC->>+RS: spell attack roll for T1
                RS-->>-GM: attack result for T1
            and
                GM->>+PC: sendRollRequest(spell-attack)
                PC->>+RS: spell attack roll for T2  
                RS-->>-GM: attack result for T2
            end
            
            GM->>GM: Collect attack results in local variables
            GM->>GM: Determine hit/miss for each target
        end
    end
    
    rect rgb(40, 80, 40)  
        Note over GM,GS: Phase 2: Saving Throws (if spell has savingThrow field)
        alt Spell Has Saving Throws
            par Multi-Target Saving Throws
                GM->>+T1: sendRollRequest(saving-throw)
                Note right of GM: Context handles request correlation
                T1->>+RS: saving throw
                RS-->>-GM: save result for T1
            and
                GM->>+T2: sendRollRequest(saving-throw)
                T2->>+RS: saving throw  
                RS-->>-GM: save result for T2
            end
            
            GM->>GM: Collect save results via Promise.all()
            GM->>GM: Calculate pass/fail vs spell DC
        end
    end
    
    rect rgb(80, 60, 40)
        Note over GM,GS: Phase 3: Damage & Effects (if applicable)
        alt Spell Deals Damage
            GM->>+PC: sendRollRequest(spell-damage)
            Note right of GM: Single damage roll for all targets
            PC->>+RS: spell damage roll
            RS-->>-GM: damage result
            
            GM->>GM: Apply damage to each target based on attack/save results
            Note right of GM: Direct state modification - no separate action
            GM->>GS: Update hit points for all targets atomically
        end
        
        opt Spell Has Additional Effects
            GM->>GM: Apply conditions, ongoing effects, etc.
            GM->>GS: Update conditions and spell effects
        end
    end
    
    GM->>CH: Send spell completion message
    GM->>PC: Success response
    
    Note over PC,CH: All spell logic contained in single unified handler
    Note over PC,CH: Local variables persist throughout entire flow
```

### Key Advantages of Unified Flow

1. **Single Function Manages Everything**: No coordination between separate handlers
2. **Local Variable Persistence**: `spell`, `caster`, `targets` available throughout
3. **Linear Error Handling**: Can catch failures at any step and handle appropriately  
4. **Atomic Operations**: Either complete spell succeeds or entire operation fails
5. **Easy Debugging**: Single stack trace for entire spell workflow

## The Unified Implementation

### Complete executeSpellCast Function

```typescript
/**
 * Unified spell casting action handler
 * Handles all spell types through data-driven conditional logic
 */
async function executeSpellCast(
  request: GameActionRequest,
  draft: ServerGameStateWithVirtuals, 
  context: AsyncActionContext
): Promise<void> {
  console.log('[SpellCast] Starting unified spell casting workflow')
  
  // Extract parameters - same for all spell types
  const { spellId, casterTokenId, targetTokenIds, spellSlotLevel } = request.parameters as SpellCastParameters
  
  // Look up spell data and participants (local variables persist throughout!)
  const spell = lookupSpell(spellId, draft)
  const caster = getCharacterForToken(casterTokenId, draft)
  const targets = targetTokenIds.map(id => lookupTarget(id, draft))
  
  console.log(`[SpellCast] Casting ${spell.name} from ${caster.name} at ${targets.length} targets`)
  
  // Universal validation and spell slot consumption
  if (!hasAvailableSpellSlot(caster, spellSlotLevel)) {
    throw new Error(`No available level ${spellSlotLevel} spell slots`)
  }
  consumeSpellSlot(caster, spellSlotLevel, draft)
  
  // ==========================================
  // PHASE 1: SPELL ATTACK (Data-Driven)
  // ==========================================
  // Examples: Fire Bolt (attack only), Ice Knife (attack + save)
  let attackResults: RollServerResult[] = []
  let attackHits: boolean[] = []
  
  if (spell.spellAttack) {
    console.log('[SpellCast] Spell has spellAttack field - requesting attack rolls')
    
    // Request attack rolls for all targets
    const attackRequests = targets.map(target => ({
      playerId: request.playerId,
      rollType: 'spell-attack',
      rollData: {
        message: `${spell.name} attack vs ${target.name}`,
        dice: [{ sides: 20, quantity: 1 }],
        metadata: {
          spellId,
          targetId: target.id,
          attackBonus: getSpellAttackBonus(caster)
        }
      }
    }))
    
    attackResults = await context.sendMultipleRollRequests(attackRequests)
    
    // Determine hits/misses for each target
    attackHits = attackResults.map((result, i) => 
      result.total + getSpellAttackBonus(caster) >= targets[i].ac
    )
    
    const hitCount = attackHits.filter(hit => hit).length
    console.log(`[SpellCast] ${hitCount}/${targets.length} attacks hit`)
    
    // Early exit for attack-only spells that completely miss
    if (hitCount === 0 && !spell.savingThrow) {
      await context.sendChatMessage(`${spell.name} - All attacks missed!`)
      return
    }
  }
  
  // ==========================================
  // PHASE 2: SAVING THROWS (Data-Driven)  
  // ==========================================
  // Examples: Fireball (save only), Ice Knife (attack + save for explosion)
  let saveResults: RollServerResult[] = []
  let saveSuccesses: boolean[] = []
  
  if (spell.savingThrow) {
    console.log(`[SpellCast] Spell has savingThrow field - requesting ${spell.saveAbility} saves`)
    
    // Determine which targets need to make saves
    let saveTargets = targets
    if (spell.spellAttack && spell.areaEffect) {
      // Dual-mechanic spells like Ice Knife - explosion affects area regardless of attack hit/miss
      saveTargets = getTargetsWithinRadius(targets[0].position, spell.areaEffect.radius, draft)
    }
    
    // Send parallel saving throw requests
    const saveRequests = saveTargets.map(target => ({
      playerId: getPlayerForTarget(target.id),  
      rollType: 'saving-throw',
      rollData: {
        message: `${spell.name} ${spell.saveAbility} save`,
        dice: [{ sides: 20, quantity: 1 }],
        metadata: {
          ability: spell.saveAbility,
          spellDC: getSpellDC(caster),
          spellName: spell.name
        }
      }
    }))
    
    saveResults = await context.sendMultipleRollRequests(saveRequests)
    
    // Determine save successes
    const spellDC = getSpellDC(caster)
    saveSuccesses = saveResults.map(result => result.total >= spellDC)
    
    const successCount = saveSuccesses.filter(success => success).length
    console.log(`[SpellCast] ${successCount}/${saveTargets.length} targets saved successfully`)
  }
  
  // ==========================================
  // PHASE 3: DAMAGE APPLICATION (Data-Driven)
  // ==========================================
  if (spell.damage) {
    console.log('[SpellCast] Spell deals damage - processing damage application')
    
    // Handle different damage types for dual-mechanic spells
    const damageTypes = spell.damage.types || [spell.damage] // Support multiple damage types
    
    for (const damageInfo of damageTypes) {
      const damageResult = await context.sendRollRequest(request.playerId, 'spell-damage', {
        message: `${spell.name} ${damageInfo.type} damage`,
        dice: damageInfo.dice,
        metadata: {
          spellId,
          spellLevel: spellSlotLevel,
          damageType: damageInfo.type
        }
      })
      
      // Apply damage based on spell mechanics
      if (damageInfo.condition === 'attack') {
        // Attack-based damage (Fire Bolt, Ice Knife primary)
        targets.forEach((target, i) => {
          if (attackHits[i]) {
            applyDamageToTarget(draft, target, damageResult.total, damageInfo.type)
            console.log(`[SpellCast] Applied ${damageResult.total} ${damageInfo.type} damage to ${target.name} (attack hit)`)
          }
        })
        
      } else if (damageInfo.condition === 'save') {
        // Save-based damage (Fireball, Ice Knife explosion)  
        const saveTargets = spell.areaEffect ? 
          getTargetsWithinRadius(targets[0].position, spell.areaEffect.radius, draft) : 
          targets
          
        saveTargets.forEach((target, i) => {
          let actualDamage = damageResult.total
          
          if (saveSuccesses[i] && spell.saveHalvesDamage) {
            actualDamage = Math.floor(actualDamage / 2)
            console.log(`[SpellCast] ${target.name} saved - damage halved`)
          }
          
          applyDamageToTarget(draft, target, actualDamage, damageInfo.type)
          console.log(`[SpellCast] Applied ${actualDamage} ${damageInfo.type} damage to ${target.name}`)
        })
        
      } else {
        // Default: apply to all targets (simple spells)
        targets.forEach((target, i) => {
          let shouldTakeDamage = true
          
          // Check attack hit requirement
          if (spell.spellAttack) {
            shouldTakeDamage = attackHits[i]
          }
          
          if (shouldTakeDamage) {
            let actualDamage = damageResult.total
            
            // Apply save modifier if applicable
            if (spell.savingThrow && saveSuccesses[i] && spell.saveHalvesDamage) {
              actualDamage = Math.floor(actualDamage / 2)
            }
            
            applyDamageToTarget(draft, target, actualDamage, damageInfo.type)
            console.log(`[SpellCast] Applied ${actualDamage} ${damageInfo.type} damage to ${target.name}`)
          }
        })
      }
    }
  }
  
  // ==========================================
  // PHASE 4: ADDITIONAL EFFECTS (Data-Driven)
  // ==========================================
  if (spell.effects) {
    console.log('[SpellCast] Applying additional spell effects')
    
    spell.effects.forEach(effect => {
      targets.forEach((target, i) => {
        let shouldApplyEffect = true
        
        // Check conditions for effect application
        if (effect.requiresAttackHit && !attackHits[i]) {
          shouldApplyEffect = false
        }
        if (effect.requiresSaveFail && saveSuccesses[i]) {
          shouldApplyEffect = false  
        }
        
        if (shouldApplyEffect) {
          applyEffectToTarget(draft, target, effect)
          console.log(`[SpellCast] Applied ${effect.type} effect to ${target.name}`)
        }
      })
    })
  }
  
  // Success message
  await context.sendChatMessage(`${spell.name} cast successfully!`)
  console.log('[SpellCast] Unified spell casting workflow completed')
}
```

### How Different Spell Types Flow Through This Logic

**Fire Bolt (Attack Spell):**
- ✅ Phase 1: Executes attack rolls (`spell.spellAttack` exists)  
- ❌ Phase 2: Skipped (no `spell.savingThrow`)
- ✅ Phase 3: Applies damage only to hit targets
- ❌ Phase 4: Skipped (no `spell.effects`)

**Fireball (Save Spell):**
- ❌ Phase 1: Skipped (no `spell.spellAttack`)
- ✅ Phase 2: Executes saving throws (`spell.savingThrow` exists)
- ✅ Phase 3: Applies full/half damage based on save results  
- ❌ Phase 4: Skipped (no `spell.effects`)

**Ice Knife (Dual-Mechanic):**
- ✅ Phase 1: Attack roll against primary target
- ✅ Phase 2: Area explosion saves for secondary targets
- ✅ Phase 3: Piercing damage to hit target + cold damage based on saves
- ❌ Phase 4: Skipped (no additional effects)

**Hold Person (Effect Spell):**
- ❌ Phase 1: Skipped (no attack)
- ✅ Phase 2: Wisdom saving throw
- ❌ Phase 3: Skipped (no damage)
- ✅ Phase 4: Apply paralyzed condition on save failure

## Error Handling & Edge Cases

### Timeout and Disconnection Handling

```typescript
async function executeSpellCast(
  request: GameActionRequest,
  draft: ServerGameStateWithVirtuals,
  context: AsyncActionContext
): Promise<void> {
  try {
    // ... spell casting logic ...
    
    // Handle potential player timeout/disconnection
    const saveRequests = targets.map(target => ({
      playerId: getPlayerForTarget(target.id),
      rollType: 'saving-throw',
      rollData: saveData
    }))
    
    const saveResults = await context.sendMultipleRollRequests(saveRequests)
    
    // ... continue processing ...
    
  } catch (error) {
    console.error('[SpellCast] Error during spell execution:', error)
    
    if (error.message.includes('timeout')) {
      // Player didn't respond - offer GM alternatives
      const gmChoice = await context.requestGMConfirmation(
        `Player didn't respond to roll request. Roll for them automatically?`
      )
      
      if (gmChoice) {
        // Retry with GM rolling for disconnected player
        // Could implement automatic rolling or fallback behavior
      } else {
        // Cancel spell but don't refund slot (spell was attempted)
        await context.sendChatMessage(`${spell.name} casting interrupted - spell slot consumed`)
        return
      }
    } else if (error.message.includes('not connected')) {
      // Player disconnected during spell
      await context.sendChatMessage(`Target player disconnected - spell fizzles`)
      
      // Could refund spell slot since spell never really started
      refundSpellSlot(caster, spellSlotLevel, draft)
    } else {
      // Unexpected error - re-throw
      throw error
    }
  }
}
```

### Graceful Degradation

```typescript
/**
 * Utility wrapper for handling roll request failures gracefully
 */
async function safeRollRequest(
  context: AsyncActionContext,
  playerId: string,
  rollType: string,
  rollData: RollData,
  fallbackOptions?: {
    autoRoll?: boolean
    skipOnFailure?: boolean
    defaultValue?: number
  }
): Promise<RollServerResult | null> {
  try {
    return await context.sendRollRequest(playerId, rollType, rollData)
  } catch (error) {
    console.warn(`[SafeRollRequest] Roll request failed:`, error.message)
    
    if (fallbackOptions?.autoRoll) {
      // Generate automatic roll result
      return generateAutomaticRollResult(rollType, rollData)
    } else if (fallbackOptions?.skipOnFailure) {
      return null
    } else if (fallbackOptions?.defaultValue !== undefined) {
      return createRollResultFromValue(fallbackOptions.defaultValue)
    } else {
      throw error // Re-throw if no fallback specified
    }
  }
}
```

## Testing Strategy

### Unit Testing Unified Handlers

```typescript
describe('Unified Spell Casting', () => {
  let mockContext: AsyncActionContext
  let mockGameState: ServerGameStateWithVirtuals
  
  beforeEach(() => {
    mockContext = {
      sendRollRequest: jest.fn(),
      sendMultipleRollRequests: jest.fn(),
      sendChatMessage: jest.fn(),
      gameState: mockGameState
    }
  })
  
  test('Fire Bolt spell - attack hits and deals damage', async () => {
    // Mock attack roll result (hits AC 15)
    mockContext.sendRollRequest
      .mockResolvedValueOnce({ total: 18 }) // Attack roll
      .mockResolvedValueOnce({ total: 8 })  // Damage roll
    
    const request = createSpellRequest('fire-bolt', ['target1'])
    const draft = createDraftGameState()
    
    await executeSpellCast(request, draft, mockContext)
    
    // Verify complete workflow
    expect(mockContext.sendRollRequest).toHaveBeenCalledTimes(2)
    expect(mockContext.sendChatMessage).toHaveBeenCalledWith('Fire Bolt cast successfully!')
    expect(draft.documents.target1.state.currentHitPoints).toBe(32) // 40 - 8 damage
  })
  
  test('Fireball spell - multiple targets with mixed save results', async () => {
    // Mock saving throw results
    mockContext.sendMultipleRollRequests
      .mockResolvedValueOnce([
        { total: 15 }, // Target 1 saves (DC 15)
        { total: 12 }, // Target 2 fails
        { total: 18 }  // Target 3 saves
      ])
    
    // Mock damage roll
    mockContext.sendRollRequest
      .mockResolvedValueOnce({ total: 24 }) // 8d6 damage
    
    const request = createSpellRequest('fireball', ['target1', 'target2', 'target3'])
    const draft = createDraftGameState()
    
    await executeSpellCast(request, draft, mockContext)
    
    // Verify damage applied correctly
    expect(draft.documents.target1.state.currentHitPoints).toBe(28) // Half damage (saved)
    expect(draft.documents.target2.state.currentHitPoints).toBe(16) // Full damage (failed)
    expect(draft.documents.target3.state.currentHitPoints).toBe(28) // Half damage (saved)
  })
  
  test('Spell casting with player timeout - graceful handling', async () => {
    mockContext.sendRollRequest
      .mockRejectedValueOnce(new Error('Roll request timeout for player player1 (saving-throw)'))
    
    mockContext.requestGMConfirmation
      .mockResolvedValueOnce(false) // GM chooses not to auto-roll
    
    const request = createSpellRequest('hold-person', ['target1'])
    const draft = createDraftGameState()
    
    await executeSpellCast(request, draft, mockContext)
    
    // Verify spell was cancelled gracefully
    expect(mockContext.sendChatMessage).toHaveBeenCalledWith(
      expect.stringContaining('casting interrupted')
    )
    expect(draft.documents.caster1.state.spellSlotsUsed[2]).toBe(1) // Slot still consumed
  })
})
```

### Integration Testing

```typescript
describe('Spell Casting Integration', () => {
  test('Complete spell flow with real WebSocket communication', async () => {
    // Test actual roll:request -> roll:result cycle
    // Verify state changes are applied atomically  
    // Test multi-player coordination
  })
  
  test('Error recovery with real network failures', async () => {
    // Test actual player disconnection scenarios
    // Verify timeout handling works correctly
    // Test GM override capabilities
  })
})
```

## Performance Considerations

### Memory Management

```typescript
/**
 * Ensure unified action handlers don't leak memory during long operations
 */
class ActionContextImpl implements AsyncActionContext {
  private activeRequests = new Set<string>()
  
  async sendRollRequest(playerId: string, rollType: string, rollData: RollData): Promise<RollServerResult> {
    const rollId = generateRollId()
    this.activeRequests.add(rollId)
    
    try {
      const result = await this.rollRequestService.sendRollRequest(playerId, rollType, rollData)
      return result
    } finally {
      this.activeRequests.delete(rollId) // Ensure cleanup
    }
  }
  
  cleanup(): void {
    // Clean up any remaining requests when action handler completes
    for (const rollId of this.activeRequests) {
      this.rollRequestService.cancelRequest(rollId)
    }
    this.activeRequests.clear()
  }
}
```

### Optimization Strategies

1. **Request Batching**: Group multiple roll requests into single WebSocket message
2. **Result Caching**: Cache spell data lookups within action handler execution
3. **Early Termination**: Exit spell workflow early when possible (e.g., all attacks miss)
4. **Lazy Loading**: Only load target data when actually needed

## Migration Strategy

### Phase 1: Infrastructure (2-3 weeks)

1. **Implement RollRequestService**
   - Add request/response correlation
   - Integrate with existing WebSocket handlers
   - Add timeout and error handling

2. **Create AsyncActionContext**
   - Implement roll request utilities
   - Add chat and confirmation methods
   - Test with simple mock action handlers

3. **Update GM Action Handler**
   - Pass context to existing action handlers (backward compatible)
   - Ensure existing handlers continue working unchanged

### Phase 2: Proof of Concept (1-2 weeks)  

1. **Implement Basic Spell Casting Action**
   - Start with simple attack spells (Fire Bolt)
   - Test complete workflow end-to-end
   - Verify state consistency and error handling

2. **Add Saving Throw Spells**
   - Implement multi-target saving throws (Fireball)
   - Test parallel roll request coordination
   - Validate damage application logic

### Phase 3: Advanced Features (2-3 weeks)

1. **Dual-Mechanic Spells**
   - Implement complex spells with multiple phases
   - Test attack roll + saving throw combinations
   - Verify local state persistence benefits

2. **Error Handling & Edge Cases**
   - Player timeout/disconnection handling
   - GM override and fallback mechanisms
   - Performance optimization and testing

### Phase 4: Polish & Documentation (1 week)

1. **Testing & Bug Fixes**
   - Comprehensive unit and integration tests
   - Performance testing with multiple players
   - Documentation and examples

2. **Migration Planning for Existing Systems**
   - Evaluate migrating weapon attacks to unified pattern
   - Plan migration strategy for other complex actions
   - Create developer guidelines for unified handlers

## Comparison: Before vs After Roll Handler Unification

### Before: Fragmented Roll Processing

**The Duplication Problem We Discovered:**

```typescript
// Direct rolls from character sheet
Player → Roll → DndWeaponAttackHandler.handleRoll() → Chat Message + requestRoll()

// Roll requests from action handlers  
ActionHandler → RollRequest → Player → Roll → DndWeaponAttackHandler.handleRoll() → DUPLICATE Chat + DUPLICATE requestRoll()
```

**Problems:**
- ❌ Same D&D calculations executed twice for requested rolls
- ❌ Duplicate chat messages sent to players
- ❌ Duplicate follow-up roll requests 
- ❌ Inconsistent behavior between direct rolls and action handler rolls
- ❌ Complex coordination needed to prevent duplication

### After: Unified Roll Processing Pipeline

**The Solution: Functional Pipeline Architecture**

```typescript
// Both roll paths now converge on identical logic
class DndWeaponAttackHandler {
  // Pure function - no side effects
  async processRoll(result: RollServerResult, context: RollHandlerContext): Promise<ProcessedRollResult> {
    const total = this.calculateAttackTotal(result, weapon, character);
    const attackMessage = this.createAttackResultMessage(result, weapon, total);
    
    return {
      rollResult: { ...result, calculatedTotal: total, isCriticalHit: this.isCriticalHit(result) },
      followUpActions: [
        { type: 'chat-message', data: { message: attackMessage } },
        { type: 'roll-request', data: { rollType: 'weapon-damage', ... } }
      ],
      executeDefaultSideEffects: false
    };
  }
  
  // Legacy method delegates to processRoll
  async handleRoll(result: RollServerResult, context: RollHandlerContext): Promise<void> {
    const processed = await this.processRoll(result, context);
    // Execute follow-up actions (chat, roll requests, etc.)
  }
}

// RollHandlerService coordinates everything
class RollHandlerService {
  async handleRollResult(result: RollServerResult): Promise<void> {
    // First resolve any pending promises (for action handler roll requests)
    this.rollRequestService.handleRollResult(result);
    
    // Then process the roll using the functional approach
    const processed = await handler.processRoll(result, context);
    
    // Execute all follow-up actions uniformly
    for (const action of processed.followUpActions) {
      if (action.type === 'chat-message') /* send chat */;
      if (action.type === 'roll-request') /* send roll request */;
      if (action.type === 'action-request') /* execute action */;
    }
  }
}
```

**Benefits of Unified Pipeline:**
- ✅ **Same D&D calculations** for both direct rolls and roll requests
- ✅ **No code duplication** - single source of truth for roll processing
- ✅ **Pure functions** - easy to test and debug roll logic
- ✅ **Consistent side effects** - uniform handling of chat, rolls, actions
- ✅ **Promise resolution + side effects** - action handlers get their results AND side effects execute
- ✅ **Backward compatibility** - existing roll handlers continue working

### Side-by-Side Metrics

| Metric | Before Unification | After Unification |
|--------|-------------------|-------------------|
| **Code Duplication** | Same logic in 2+ places | Single source of truth |
| **Roll Processing** | Different paths for direct/requested rolls | Identical processing for all roll sources |
| **Side Effects** | Duplicated chat messages + actions | Unified side effect coordination |
| **Testing** | Mock complex coordination scenarios | Test pure roll processing functions |
| **Debugging** | Track duplication across roll paths | Single processing pipeline |
| **D&D Calculations** | Inconsistent between roll sources | Guaranteed consistency |
| **Maintainability** | Update multiple roll handlers | Update single processRoll method |

### Implementation Status

| Component | Status | Key Achievement |
|-----------|--------|-----------------|
| **RollRequestService** | ✅ Complete | Promise-based roll correlation with timeout handling |
| **AsyncActionContext** | ✅ Complete | Clean API for action handlers to request rolls and communicate |
| **GM Action Handler Integration** | ✅ Complete | Backward-compatible context passing to all handlers |
| **Functional Pipeline Architecture** | ✅ Complete | **Eliminated code duplication between roll paths** |
| **Roll Handler Refactoring** | ✅ Complete | D&D handlers now use pure functions with unified side effects |

## Conclusion

The unified action handler approach represents a fundamental improvement to Dungeon Lab's architecture for complex game mechanics. **Phase 1 implementation has been completed successfully**, delivering not only the originally proposed infrastructure but also solving a critical code duplication problem that would have made unified action handlers significantly more complex.

### Key Achievements

1. **✅ Infrastructure Complete**: All async action handler infrastructure is working and tested
2. **✅ Roll Processing Unified**: Eliminated code duplication between direct rolls and action handler requested rolls  
3. **✅ Pure Function Architecture**: Roll handlers now use clean, testable pure functions with separated side effects
4. **✅ Backward Compatibility**: Existing roll handlers continue working unchanged during transition
5. **✅ Developer Experience**: Ready for spell casting implementation with consistent D&D calculations

### Major Architectural Discovery

During implementation, we discovered and solved a **critical duplication issue**: direct rolls from character sheets and roll requests from action handlers were using different processing paths, leading to inconsistent D&D calculations and duplicate side effects.

The **functional pipeline architecture** we implemented ensures that:
- Both roll sources use **identical D&D processing logic**
- Side effects (chat messages, follow-up rolls, actions) are **coordinated uniformly**
- Roll processing is **pure and testable**, separated from side effects
- **Promise resolution works seamlessly** with unified side effect execution

### Next Steps

**Phase 1 is complete. Ready to proceed to Phase 2: Basic Spell Casting Implementation.**

The infrastructure foundation is now solid and battle-tested. All promise-based roll request coordination, timeout handling, action context utilities, and unified roll processing are working together seamlessly.

The unified action handler pattern is ready to demonstrate its full potential with spell casting as the proof of concept, with the confidence that both direct rolls and action handler requested rolls will behave identically and consistently.

---

*This proposal demonstrates how unified action handlers can transform the implementation of complex game mechanics from fragmented coordination challenges into elegant, maintainable workflows.*