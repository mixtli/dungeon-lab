# VTT Gameplay Implementation Plan

## 🎯 **Mission: From Infrastructure to Actual D&D Gameplay**

Transform the solid game state architecture (~95% complete) into a **fully functional Virtual Tabletop** with token movement, initiative tracking, combat system, and spell casting.

## 📊 **Current State Assessment (January 2025)**

### ✅ **Infrastructure Ready**
- **Game State Architecture**: Complete unified state management system
- **Real-time Sync**: Socket-based GM→Player broadcasts working
- **GM Authority**: Permission system and session management complete
- **Plugin Integration**: D&D 5e plugin with reactive game state access
- **Type Safety**: Full TypeScript coverage with proper schemas
- **Component Foundation**: 8 key components migrated to game state store

### 🎮 **Missing: Actual Gameplay Features**
- **Token Operations**: Place, move, update tokens on maps
- **Initiative System**: Roll initiative, track turns, combat flow
- **Combat Actions**: Attack rolls, damage, condition tracking
- **Spell Casting**: Target selection, resource management, effects
- **Player Actions**: Request/approval system for player autonomy

### 🚧 **Implementation Strategy**
Build **incrementally** - each phase delivers immediately playable features while testing the architecture progressively.

---

## 🎭 **PHASE 1: Token System** (Week 1: 5-7 days)

> **Goal**: Complete token placement, movement, and management system

### **Why Token System First?**
- **Foundation for Everything**: Combat, spells, movement all require tokens
- **High Visual Impact**: Immediate player engagement and satisfaction
- **Architecture Validation**: Tests the entire game state update system
- **Real-time Proof**: Validates socket synchronization end-to-end

### **Phase 1.1: Basic Token Operations** (Days 1-2)

#### **Token Creation System**
**File**: `ActorTokenGenerator.vue`
**Current State**: Has TODO for token creation

**Implementation**:
```typescript
// Replace existing TODO in ActorTokenGenerator.vue
async function createTokenFromActor(actor: IActor, position: { x: number, y: number }) {
  if (!gameStateStore.canUpdate) {
    console.warn('Only GM can create tokens');
    return;
  }

  const newToken = {
    id: generateId(),
    actorId: actor.id,
    name: actor.name,
    position,
    size: determineTokenSize(actor),
    imageUrl: actor.avatar?.url || actor.defaultTokenImage?.url,
    currentHealth: actor.pluginData?.maxHitPoints || 10,
    maxHealth: actor.pluginData?.maxHitPoints || 10,
    conditions: [],
    isHidden: false,
    createdAt: Date.now()
  };

  const operations: StateOperation[] = [{
    path: "currentEncounter.tokens",
    operation: "push",
    value: newToken
  }];

  await gameStateStore.updateGameState(operations);
  
  // Emit success notification
  notificationStore.success(`Created token for ${actor.name}`);
}
```

**UI Components Needed**:
- **Token Creation Dialog**: Actor selection, position picker, token options
- **Drag & Drop Interface**: Drag actors from sidebar to map
- **Token Preview**: Show token appearance before placement

#### **Token Movement System**
**File**: `EncounterView.vue` 
**Current State**: Has TODO for token movement

**Implementation**:
```typescript
// Real-time token dragging with validation
async function onTokenDrag(tokenId: string, newPosition: { x: number, y: number }) {
  // Optimistic update for smooth UX
  updateTokenPositionLocally(tokenId, newPosition);
  
  // Validate movement (range, obstacles, permissions)
  const validation = await validateTokenMovement(tokenId, newPosition);
  if (!validation.valid) {
    // Revert optimistic update
    revertTokenPosition(tokenId);
    notificationStore.error(validation.reason);
    return;
  }

  // Send update to server
  const tokenIndex = findTokenIndex(tokenId);
  const operations: StateOperation[] = [{
    path: `currentEncounter.tokens.${tokenIndex}.position`,
    operation: "set",
    value: newPosition
  }];

  const result = await gameStateStore.updateGameState(operations);
  if (!result.success) {
    // Server rejected - revert optimistic update
    revertTokenPosition(tokenId);
  }
}
```

**Movement Validation Logic**:
```typescript
interface MovementValidation {
  valid: boolean;
  reason?: string;
  maxRange?: number;
}

function validateTokenMovement(tokenId: string, newPosition: Position): MovementValidation {
  const token = findToken(tokenId);
  if (!token) return { valid: false, reason: 'Token not found' };
  
  // Check permissions
  if (!canMoveToken(token)) {
    return { valid: false, reason: 'No permission to move this token' };
  }
  
  // Check movement range (if in combat)
  if (isInCombat() && isPlayerToken(token)) {
    const maxRange = getMovementRange(token);
    const distance = calculateDistance(token.position, newPosition);
    if (distance > maxRange) {
      return { valid: false, reason: `Movement exceeds range (${distance}ft > ${maxRange}ft)` };
    }
  }
  
  // Check for obstacles/collisions
  const collision = checkCollisions(newPosition, token.size);
  if (collision) {
    return { valid: false, reason: 'Position blocked by obstacle or other token' };
  }
  
  return { valid: true };
}
```

### **Phase 1.2: Token Properties & Updates** (Days 3-4)

#### **Token Health Management**
```typescript
async function updateTokenHealth(tokenId: string, newHealth: number, source: string = 'manual') {
  const tokenIndex = findTokenIndex(tokenId);
  const token = gameStateStore.currentEncounter?.tokens[tokenIndex];
  if (!token) return;

  // Clamp health to valid range
  const clampedHealth = Math.max(0, Math.min(newHealth, token.maxHealth));
  
  const operations: StateOperation[] = [{
    path: `currentEncounter.tokens.${tokenIndex}.currentHealth`,
    operation: "set", 
    value: clampedHealth
  }];

  // Add death/unconscious conditions automatically
  if (clampedHealth === 0 && !token.conditions.includes('unconscious')) {
    operations.push({
      path: `currentEncounter.tokens.${tokenIndex}.conditions`,
      operation: "push",
      value: 'unconscious'
    });
  }

  await gameStateStore.updateGameState(operations);
  
  // Visual feedback
  showDamageNumber(tokenId, token.currentHealth - clampedHealth);
  
  // Death save tracking for player characters
  if (clampedHealth === 0 && isPlayerCharacter(token)) {
    startDeathSaves(tokenId);
  }
}
```

#### **Condition Management**
```typescript
async function applyCondition(tokenId: string, condition: string, duration?: number) {
  const tokenIndex = findTokenIndex(tokenId);
  
  const operations: StateOperation[] = [{
    path: `currentEncounter.tokens.${tokenIndex}.conditions`,
    operation: "push",
    value: duration ? { name: condition, duration, startTurn: getCurrentTurn() } : condition
  }];

  await gameStateStore.updateGameState(operations);
  
  // Visual indicator
  showConditionEffect(tokenId, condition);
}

async function removeCondition(tokenId: string, condition: string) {
  const tokenIndex = findTokenIndex(tokenId);
  
  const operations: StateOperation[] = [{
    path: `currentEncounter.tokens.${tokenIndex}.conditions`,
    operation: "pull",
    value: condition
  }];

  await gameStateStore.updateGameState(operations);
}
```

### **Phase 1.3: Token Permissions & Multi-player** (Day 5)

#### **Player Token Control**
```typescript
function canMoveToken(token: IToken): boolean {
  const gameSessionStore = useGameSessionStore();
  const userId = gameSessionStore.currentUser?.id;
  
  // GM can move any token
  if (gameSessionStore.isGM) return true;
  
  // Players can only move their own character tokens
  if (token.ownerId === userId) return true;
  
  // Special permission system for shared tokens
  return token.permissions?.includes(userId) || false;
}

function canUpdateToken(token: IToken, property: string): boolean {
  // Health updates might be restricted differently than movement
  if (property === 'currentHealth') {
    return canMoveToken(token) || gameSessionStore.isGM;
  }
  
  return canMoveToken(token);
}
```

#### **Real-time Token Sync**
```typescript
// Listen for token updates from other players
watchEffect(() => {
  if (gameStateStore.currentEncounter?.tokens) {
    // Update token positions with smooth animation
    gameStateStore.currentEncounter.tokens.forEach(token => {
      const tokenElement = document.getElementById(`token-${token.id}`);
      if (tokenElement) {
        animateTokenToPosition(tokenElement, token.position);
      }
    });
  }
});
```

### **Phase 1 Deliverables & Success Criteria**

**By End of Week 1, Players Can**:
- ✅ **Create Tokens**: Drag actors from sidebar onto maps
- ✅ **Move Tokens**: Drag tokens around with real-time sync to other players
- ✅ **Update Health**: Click on tokens to adjust HP, see damage numbers
- ✅ **Apply Conditions**: Right-click context menu for conditions
- ✅ **Multi-player Sync**: All players see token changes instantly
- ✅ **Permission System**: Players control their tokens, GM controls all

**Technical Validation**:
- ✅ Game state updates work end-to-end
- ✅ Socket broadcasting synchronizes all clients
- ✅ Optimistic updates provide smooth UX
- ✅ Error handling and rollbacks function properly

---

## ⚔️ **PHASE 2: Initiative & Combat System** (Week 2: 5-7 days)

> **Goal**: Complete turn-based combat with initiative tracking and basic attacks

### **Why Initiative System Next?**
- **Enables Turn-Based Play**: Foundation for structured combat
- **High Player Engagement**: Rolling dice is core D&D experience  
- **Tests Complex State**: Initiative order requires array manipulation
- **Unlocks Combat Actions**: Turn management enables attacks and spells

### **Phase 2.1: Initiative Rolling & Tracking** (Days 1-2)

#### **Initiative Roll System**
**File**: `CombatTab.vue`
**Current State**: Has TODO for initiative rolling

**Implementation**:
```typescript
interface InitiativeEntry {
  id: string;
  name: string; 
  actorId: string;
  tokenId?: string;
  initiative: number;
  hasActed: boolean;
  isDelayed: boolean;
  isPlayer: boolean;
}

async function rollInitiativeForAll() {
  if (!gameStateStore.canUpdate) return;
  
  const tokens = gameStateStore.currentEncounter?.tokens || [];
  const entries: InitiativeEntry[] = [];
  
  for (const token of tokens) {
    const actor = getActorForToken(token);
    const initiativeModifier = getInitiativeModifier(actor);
    
    // Roll 1d20 + modifier
    const roll = Math.floor(Math.random() * 20) + 1 + initiativeModifier;
    
    entries.push({
      id: generateId(),
      name: token.name,
      actorId: token.actorId,
      tokenId: token.id,
      initiative: roll,
      hasActed: false,
      isDelayed: false,
      isPlayer: isPlayerCharacter(actor)
    });
  }
  
  // Sort by initiative (highest first)
  entries.sort((a, b) => b.initiative - a.initiative);
  
  const operations: StateOperation[] = [
    {
      path: "currentEncounter.initiativeTracker",
      operation: "set",
      value: {
        entries,
        currentTurn: 0,
        round: 1,
        isActive: true
      }
    }
  ];
  
  await gameStateStore.updateGameState(operations);
  
  // Visual feedback
  showInitiativeResults(entries);
}

async function rollInitiativeForToken(tokenId: string) {
  const token = findToken(tokenId);
  const actor = getActorForToken(token);
  
  // Show roll dialog for players, auto-roll for NPCs  
  let roll: number;
  if (isPlayerCharacter(actor) && !gameSessionStore.isGM) {
    roll = await showInitiativeRollDialog(actor);
  } else {
    const modifier = getInitiativeModifier(actor);
    roll = Math.floor(Math.random() * 20) + 1 + modifier;
  }
  
  // Add to initiative tracker
  await addToInitiativeTracker(token, roll);
}
```

#### **Initiative Tracker UI**
```vue
<!-- CombatTab.vue Template Enhancement -->
<template>
  <div class="initiative-tracker" v-if="currentEncounter?.initiativeTracker?.isActive">
    <div class="initiative-header">
      <h3>Initiative Order</h3>
      <div class="turn-info">
        Round {{ currentEncounter.initiativeTracker.round }} 
        - Turn {{ currentEncounter.initiativeTracker.currentTurn + 1 }}
      </div>
    </div>
    
    <div class="initiative-list">
      <div 
        v-for="(entry, index) in sortedInitiative" 
        :key="entry.id"
        :class="{
          'initiative-entry': true,
          'current-turn': index === currentEncounter.initiativeTracker.currentTurn,
          'has-acted': entry.hasActed,
          'is-delayed': entry.isDelayed,
          'is-player': entry.isPlayer
        }"
      >
        <div class="entry-avatar">
          <img :src="getTokenImage(entry.tokenId)" :alt="entry.name" />
          <div class="initiative-number">{{ entry.initiative }}</div>
        </div>
        
        <div class="entry-info">
          <div class="entry-name">{{ entry.name }}</div>
          <div class="entry-status">
            <span v-if="entry.hasActed" class="acted">✓ Acted</span>
            <span v-if="entry.isDelayed" class="delayed">⏸ Delayed</span>
            <span v-if="index === currentEncounter.initiativeTracker.currentTurn" class="current">
              👑 Current Turn
            </span>
          </div>
        </div>
        
        <div class="entry-actions" v-if="canManageInitiative">
          <button @click="delayTurn(entry.id)" v-if="!entry.hasActed">Delay</button>
          <button @click="skipTurn(entry.id)" v-if="!entry.hasActed">Skip</button>
        </div>
      </div>
    </div>
    
    <div class="initiative-controls" v-if="canManageInitiative">
      <button @click="nextTurn" class="btn-primary">Next Turn</button>
      <button @click="previousTurn" class="btn-secondary">Previous</button>
      <button @click="endCombat" class="btn-danger">End Combat</button>
    </div>
  </div>
</template>
```

### **Phase 2.2: Turn Management** (Days 2-3)

#### **Turn Progression System**
```typescript
async function nextTurn() {
  if (!gameStateStore.canUpdate) return;
  
  const tracker = gameStateStore.currentEncounter?.initiativeTracker;
  if (!tracker || !tracker.isActive) return;
  
  let nextTurn = tracker.currentTurn + 1;
  let nextRound = tracker.round;
  
  // End of round - advance round, reset to first participant
  if (nextTurn >= tracker.entries.length) {
    nextTurn = 0;
    nextRound += 1;
    
    // Reset all hasActed flags for new round
    const operations: StateOperation[] = [
      {
        path: "currentEncounter.initiativeTracker.round",
        operation: "set",
        value: nextRound
      },
      {
        path: "currentEncounter.initiativeTracker.currentTurn", 
        operation: "set",
        value: nextTurn
      }
    ];
    
    // Reset hasActed for all entries
    tracker.entries.forEach((entry, index) => {
      operations.push({
        path: `currentEncounter.initiativeTracker.entries.${index}.hasActed`,
        operation: "set",
        value: false
      });
    });
    
    await gameStateStore.updateGameState(operations);
    
    // Process end-of-round effects
    await processEndOfRoundEffects();
    
    return;
  }
  
  // Mark current turn as acted (if not skipped)
  const currentEntry = tracker.entries[tracker.currentTurn];
  const operations: StateOperation[] = [
    {
      path: `currentEncounter.initiativeTracker.entries.${tracker.currentTurn}.hasActed`,
      operation: "set",
      value: true
    },
    {
      path: "currentEncounter.initiativeTracker.currentTurn",
      operation: "set", 
      value: nextTurn
    }
  ];
  
  await gameStateStore.updateGameState(operations);
  
  // Notify current player
  const nextEntry = tracker.entries[nextTurn];
  if (nextEntry.isPlayer) {
    notificationStore.info(`It's ${nextEntry.name}'s turn!`);
  }
  
  // Auto-process NPC turns (if GM)
  if (!nextEntry.isPlayer && gameSessionStore.isGM) {
    setTimeout(() => processNPCTurn(nextEntry), 1000);
  }
}

async function delayTurn(entryId: string) {
  const tracker = gameStateStore.currentEncounter?.initiativeTracker;
  if (!tracker) return;
  
  const entryIndex = tracker.entries.findIndex(e => e.id === entryId);
  if (entryIndex === -1) return;
  
  const operations: StateOperation[] = [{
    path: `currentEncounter.initiativeTracker.entries.${entryIndex}.isDelayed`,
    operation: "set",
    value: true
  }];
  
  await gameStateStore.updateGameState(operations);
  
  // Automatically advance to next turn
  await nextTurn();
}
```

### **Phase 2.3: Basic Combat Actions** (Days 3-4)

#### **Attack System**
```typescript
interface AttackAction {
  attackerId: string;
  defenderId: string; 
  weaponId?: string;
  attackType: 'melee' | 'ranged' | 'spell';
  advantage: boolean;
  disadvantage: boolean;
}

async function performAttack(action: AttackAction) {
  const attacker = getTokenById(action.attackerId);
  const defender = getTokenById(action.defenderId);
  
  if (!attacker || !defender) {
    notificationStore.error('Invalid attack targets');
    return;
  }
  
  // Calculate attack roll
  const attackRoll = await rollAttack(attacker, action);
  const defenderAC = getArmorClass(defender);
  
  const hit = attackRoll.total >= defenderAC;
  
  // Create attack result
  const result = {
    id: generateId(),
    attackerId: action.attackerId,
    defenderId: action.defenderId,
    attackRoll,
    hit,
    damage: hit ? await rollDamage(attacker, action) : null,
    timestamp: Date.now()
  };
  
  // Apply damage if hit
  if (hit && result.damage) {
    await updateTokenHealth(action.defenderId, defender.currentHealth - result.damage.total, 'combat');
  }
  
  // Visual effects
  showAttackAnimation(attacker.position, defender.position, hit);
  
  // Combat log entry
  addCombatLogEntry({
    type: 'attack',
    attacker: attacker.name,
    defender: defender.name,
    roll: attackRoll,
    damage: result.damage,
    hit,
    timestamp: Date.now()
  });
  
  // Broadcast to all players
  const operations: StateOperation[] = [{
    path: "currentEncounter.combatLog",
    operation: "push",
    value: result
  }];
  
  await gameStateStore.updateGameState(operations);
}

async function rollAttack(attacker: IToken, action: AttackAction): Promise<DiceRoll> {
  const actor = getActorForToken(attacker);
  const weapon = action.weaponId ? getItemById(action.weaponId) : null;
  
  // Base attack bonus (from character stats)
  let attackBonus = getAttackBonus(actor, action.attackType, weapon);
  
  // Roll d20 with advantage/disadvantage
  let roll1 = Math.floor(Math.random() * 20) + 1;
  let roll2 = action.advantage || action.disadvantage ? Math.floor(Math.random() * 20) + 1 : roll1;
  
  let finalRoll = roll1;
  if (action.advantage) {
    finalRoll = Math.max(roll1, roll2);
  } else if (action.disadvantage) {
    finalRoll = Math.min(roll1, roll2);
  }
  
  return {
    dice: action.advantage || action.disadvantage ? [roll1, roll2] : [roll1],
    finalRoll,
    bonus: attackBonus,
    total: finalRoll + attackBonus,
    advantage: action.advantage,
    disadvantage: action.disadvantage
  };
}
```

### **Phase 2.4: Combat UI Integration** (Day 5)

#### **Combat Action Bar**
```vue
<!-- CombatActionBar.vue - New Component -->
<template>
  <div class="combat-action-bar" v-if="isCurrentPlayerTurn">
    <div class="action-categories">
      <div class="action-category">
        <h4>Actions</h4>
        <button @click="showAttackMenu" class="action-btn">
          ⚔️ Attack
        </button>
        <button @click="showSpellMenu" class="action-btn">
          ✨ Cast Spell
        </button>
        <button @click="dashAction" class="action-btn">
          🏃 Dash
        </button>
      </div>
      
      <div class="action-category">
        <h4>Bonus Actions</h4>
        <button @click="showBonusActions" class="action-btn secondary">
          ⚡ Bonus Action
        </button>
      </div>
      
      <div class="action-category">
        <h4>Movement</h4>
        <div class="movement-info">
          {{ remainingMovement }}ft remaining
        </div>
        <button @click="endMovement" class="action-btn secondary">
          🛑 End Movement
        </button>
      </div>
    </div>
    
    <div class="turn-controls">
      <button @click="endTurn" class="btn-primary">End Turn</button>
      <button @click="delayAction" class="btn-secondary">Delay</button>
    </div>
  </div>
</template>
```

### **Phase 2 Deliverables & Success Criteria**

**By End of Week 2, Players Can**:
- ✅ **Roll Initiative**: Automatic and manual initiative rolling for all participants
- ✅ **Track Turns**: Clear visual indication of current turn and turn order
- ✅ **Make Attacks**: Basic melee/ranged attacks with hit/miss resolution
- ✅ **Apply Damage**: Automatic HP updates from successful attacks
- ✅ **Manage Turns**: Next turn, delay, skip, end combat
- ✅ **Combat Log**: Complete history of all combat actions

**D&D Gameplay Working**:
- ✅ **Start Combat**: Roll initiative for all participants
- ✅ **Turn Sequence**: Players act in initiative order
- ✅ **Basic Combat**: Attack rolls, damage, HP tracking
- ✅ **Combat Flow**: Rounds, turn management, end combat

---

## ✨ **PHASE 3: Spell System** (Week 3: 5-7 days)

> **Goal**: Complete spell casting with targeting, resource management, and effects

### **Why Spell System Next?**
- **Core D&D Feature**: Spells are central to D&D gameplay experience
- **Complex Targeting**: Tests advanced UI interactions and validation
- **Resource Management**: Spell slots, components, concentration
- **Plugin Integration**: Deep integration with D&D 5e spell data

### **Phase 3.1: Basic Spell Casting** (Days 1-2)

#### **Spell Selection System**
```typescript
interface SpellCastingAction {
  casterId: string;
  spellId: string;
  spellLevel: number;
  usingSlot?: number;
  targets: string[];
  position?: { x: number, y: number }; // For area spells
  upcast?: boolean;
}

async function castSpell(action: SpellCastingAction) {
  const caster = getTokenById(action.casterId);
  const spell = await getSpellData(action.spellId);
  
  if (!caster || !spell) {
    notificationStore.error('Invalid spell or caster');
    return;
  }
  
  // Validate spell slot usage
  const slotValidation = await validateSpellSlot(caster, action);
  if (!slotValidation.valid) {
    notificationStore.error(slotValidation.reason);
    return;
  }
  
  // Validate targets
  const targetValidation = await validateSpellTargets(spell, action.targets, action.position);
  if (!targetValidation.valid) {
    notificationStore.error(targetValidation.reason);
    return;
  }
  
  // Consume spell slot
  if (action.usingSlot) {
    await consumeSpellSlot(action.casterId, action.usingSlot);
  }
  
  // Handle concentration
  if (spell.concentration) {
    await startConcentration(action.casterId, action.spellId);
  }
  
  // Apply spell effects
  await applySpellEffects(spell, action);
  
  // Visual effects
  showSpellCastingAnimation(caster.position, action.targets, spell);
  
  // Combat log
  addCombatLogEntry({
    type: 'spell',
    caster: caster.name,
    spell: spell.name,
    targets: action.targets.map(id => getTokenById(id)?.name).filter(Boolean),
    level: action.usingSlot || spell.level,
    timestamp: Date.now()
  });
}
```

#### **Spell Targeting Interface**
```vue
<!-- SpellTargetingOverlay.vue - New Component -->
<template>
  <div class="spell-targeting-overlay" v-if="isTargeting">
    <div class="targeting-info">
      <h3>{{ selectedSpell.name }}</h3>
      <p>{{ getTargetingDescription() }}</p>
      <div class="selected-targets">
        <span v-for="target in selectedTargets" :key="target.id">
          {{ target.name }}
        </span>
      </div>
    </div>
    
    <!-- Area of Effect Preview -->
    <div 
      v-if="selectedSpell.area"
      class="aoe-preview"
      :style="aoePreviewStyle"
    ></div>
    
    <div class="targeting-controls">
      <button @click="confirmSpell" :disabled="!canCastSpell" class="btn-primary">
        Cast Spell
      </button>
      <button @click="cancelTargeting" class="btn-secondary">
        Cancel
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
const isTargeting = ref(false);
const selectedSpell = ref<Spell | null>(null);
const selectedTargets = ref<IToken[]>([]);
const mousePosition = ref({ x: 0, y: 0 });

function startSpellTargeting(spell: Spell) {
  selectedSpell.value = spell;
  selectedTargets.value = [];
  isTargeting.value = true;
  
  // Change cursor to targeting mode
  document.body.style.cursor = 'crosshair';
  
  // Add event listeners
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('click', onTargetClick);
}

function onTargetClick(event: MouseEvent) {
  const target = getTokenAtPosition(event.clientX, event.clientY);
  
  if (!target) {
    // Clicked empty space - for area spells
    if (selectedSpell.value?.area) {
      confirmSpellAtPosition({ x: event.clientX, y: event.clientY });
    }
    return;
  }
  
  // Toggle target selection
  const index = selectedTargets.value.findIndex(t => t.id === target.id);
  if (index >= 0) {
    selectedTargets.value.splice(index, 1);
  } else {
    if (canTargetToken(target)) {
      selectedTargets.value.push(target);
    }
  }
}

function canTargetToken(token: IToken): boolean {
  if (!selectedSpell.value) return false;
  
  const spell = selectedSpell.value;
  const caster = getCurrentPlayerToken();
  
  // Range check
  const distance = calculateDistance(caster.position, token.position);
  if (distance > spell.range) {
    notificationStore.warning(`Target out of range (${distance}ft > ${spell.range}ft)`);
    return false;
  }
  
  // Line of sight check
  if (spell.requiresLineOfSight && !hasLineOfSight(caster.position, token.position)) {
    notificationStore.warning('No line of sight to target');
    return false;
  }
  
  // Target type validation
  if (spell.targetType === 'hostile' && isFriendly(token)) {
    notificationStore.warning('Cannot target friendly creature with this spell');
    return false;
  }
  
  return true;
}
</script>
```

### **Phase 3.2: Resource Management** (Days 2-3)

#### **Spell Slot Tracking**
```typescript
interface SpellSlots {
  level1: { used: number; total: number };
  level2: { used: number; total: number };
  level3: { used: number; total: number };
  level4: { used: number; total: number };
  level5: { used: number; total: number };
  level6: { used: number; total: number };
  level7: { used: number; total: number };
  level8: { used: number; total: number };
  level9: { used: number; total: number };
}

async function consumeSpellSlot(casterId: string, slotLevel: number) {
  const casterActor = getActorById(casterId);
  if (!casterActor) return;
  
  const spellSlots = casterActor.pluginData?.spellSlots as SpellSlots;
  const slotKey = `level${slotLevel}` as keyof SpellSlots;
  
  if (!spellSlots || spellSlots[slotKey].used >= spellSlots[slotKey].total) {
    throw new Error(`No ${slotLevel}${getOrdinalSuffix(slotLevel)} level spell slots remaining`);
  }
  
  // Update spell slot usage
  const actorIndex = gameStateStore.actors.findIndex(a => a.id === casterId);
  const operations: StateOperation[] = [{
    path: `actors.${actorIndex}.pluginData.spellSlots.${slotKey}.used`,
    operation: "inc",
    value: 1
  }];
  
  await gameStateStore.updateGameState(operations);
}

async function recoverSpellSlots(actorId: string, restType: 'short' | 'long') {
  const actorIndex = gameStateStore.actors.findIndex(a => a.id === actorId);
  if (actorIndex === -1) return;
  
  const operations: StateOperation[] = [];
  
  if (restType === 'long') {
    // Long rest recovers all spell slots
    for (let level = 1; level <= 9; level++) {
      operations.push({
        path: `actors.${actorIndex}.pluginData.spellSlots.level${level}.used`,
        operation: "set",
        value: 0
      });
    }
  } else {
    // Short rest recovery varies by class (Warlock, etc.)
    const actor = gameStateStore.actors[actorIndex];
    const characterClass = actor.pluginData?.characterClass;
    
    if (characterClass === 'warlock') {
      // Warlocks recover all slots on short rest
      const pactSlotLevel = actor.pluginData?.pactMagic?.slotLevel || 1;
      operations.push({
        path: `actors.${actorIndex}.pluginData.spellSlots.level${pactSlotLevel}.used`,
        operation: "set",
        value: 0
      });
    }
  }
  
  if (operations.length > 0) {
    await gameStateStore.updateGameState(operations);
    notificationStore.success(`${actor.name} recovered spell slots from ${restType} rest`);
  }
}
```

### **Phase 3.3: Concentration & Duration** (Days 3-4)

#### **Concentration System**
```typescript
interface ConcentrationEffect {
  id: string;
  casterId: string;
  spellId: string;
  spellName: string;
  startTime: number;
  duration?: number; // in rounds, undefined for permanent
}

async function startConcentration(casterId: string, spellId: string) {
  // End any existing concentration
  await breakConcentration(casterId);
  
  const spell = await getSpellData(spellId);
  const effect: ConcentrationEffect = {
    id: generateId(),
    casterId,
    spellId,
    spellName: spell.name,
    startTime: Date.now(),
    duration: spell.duration
  };
  
  const operations: StateOperation[] = [{
    path: "currentEncounter.concentrationEffects",
    operation: "push",
    value: effect
  }];
  
  await gameStateStore.updateGameState(operations);
  
  // Visual indicator on caster token
  showConcentrationIndicator(casterId, spell.name);
}

async function makeConcentrationSave(casterId: string, damage: number) {
  const dc = Math.max(10, Math.floor(damage / 2));
  const roll = Math.floor(Math.random() * 20) + 1;
  const constitutionSave = getConstitutionSaveBonus(casterId);
  const total = roll + constitutionSave;
  
  const success = total >= dc;
  
  // Combat log entry
  addCombatLogEntry({
    type: 'concentrationSave',
    caster: getTokenById(casterId)?.name,
    roll: { d20: roll, bonus: constitutionSave, total },
    dc,
    success,
    timestamp: Date.now()
  });
  
  if (!success) {
    await breakConcentration(casterId);
    notificationStore.info(`${getTokenById(casterId)?.name} lost concentration!`);
  }
  
  return success;
}

async function breakConcentration(casterId: string) {
  const encounter = gameStateStore.currentEncounter;
  if (!encounter?.concentrationEffects) return;
  
  const effectIndex = encounter.concentrationEffects.findIndex(e => e.casterId === casterId);
  if (effectIndex === -1) return;
  
  const effect = encounter.concentrationEffects[effectIndex];
  
  // Remove the effect
  const operations: StateOperation[] = [{
    path: `currentEncounter.concentrationEffects`,
    operation: "pull",
    value: { id: effect.id }
  }];
  
  await gameStateStore.updateGameState(operations);
  
  // End spell effects
  await endSpellEffects(effect.spellId, casterId);
  
  // Remove visual indicators
  hideConcentrationIndicator(casterId);
}
```

### **Phase 3.4: Advanced Spell Effects** (Day 5)

#### **Area of Effect Spells**
```typescript
async function applyAreaSpell(spell: Spell, centerPosition: Position, casterId: string) {
  const affectedTokens = getTokensInArea(centerPosition, spell.area);
  const results: SpellEffectResult[] = [];
  
  for (const token of affectedTokens) {
    let result: SpellEffectResult = {
      targetId: token.id,
      targetName: token.name,
      success: true,
      damage: null,
      effects: []
    };
    
    // Saving throw if required
    if (spell.savingThrow) {
      const saveResult = await rollSavingThrow(token.id, spell.savingThrow);
      result.savingThrow = saveResult;
      
      // Apply effects based on save result
      if (saveResult.success && spell.saveForHalf) {
        // Half damage on successful save
        result.damage = await rollSpellDamage(spell, casterId, 0.5);
      } else if (!saveResult.success) {
        // Full effect on failed save
        result.damage = await rollSpellDamage(spell, casterId);
        result.effects = spell.effects || [];
      }
    } else {
      // No save - apply full effects
      result.damage = await rollSpellDamage(spell, casterId);
      result.effects = spell.effects || [];
    }
    
    // Apply damage
    if (result.damage) {
      await updateTokenHealth(token.id, token.currentHealth - result.damage.total, 'spell');
    }
    
    // Apply conditions/effects
    for (const effect of result.effects) {
      await applyCondition(token.id, effect.type, effect.duration);
    }
    
    results.push(result);
  }
  
  // Show area effect animation
  showAreaEffectAnimation(centerPosition, spell.area, spell.school);
  
  return results;
}

function getTokensInArea(center: Position, area: SpellArea): IToken[] {
  const tokens = gameStateStore.currentEncounter?.tokens || [];
  
  return tokens.filter(token => {
    const distance = calculateDistance(center, token.position);
    
    switch (area.type) {
      case 'sphere':
        return distance <= area.radius;
      case 'cone':
        return isInCone(center, token.position, area.radius, area.direction);
      case 'line':
        return isInLine(center, token.position, area.length, area.width);
      case 'cube':
        return isInCube(center, token.position, area.size);
      default:
        return false;
    }
  });
}
```

### **Phase 3 Deliverables & Success Criteria**

**By End of Week 3, Players Can**:
- ✅ **Cast Spells**: Select spells from character spell lists
- ✅ **Target Selection**: Click on tokens or areas to target spells
- ✅ **Resource Management**: Spell slot tracking and consumption
- ✅ **Concentration**: Track concentration spells and saves
- ✅ **Area Effects**: Fireball, cone of cold, etc. affect multiple targets
- ✅ **Spell Effects**: Damage, conditions, durations properly applied

**D&D Spellcasting Working**:
- ✅ **Spell Selection**: Browse and select from character's known spells
- ✅ **Upcast Spells**: Use higher level slots for more powerful effects
- ✅ **Saving Throws**: Automatic calculation and rolling
- ✅ **Concentration**: Loss on damage, breaks previous concentration

---

## 🎲 **PHASE 4: Player Action Request System** (Week 4: 3-5 days)

> **Goal**: Player autonomy with GM oversight - "May I cast fireball?" system

### **Why Player Actions Last?**
- **Depends on Previous Systems**: Needs tokens, combat, and spells working first
- **Complex Workflow**: Request→Validation→GM Approval→Execution chain
- **User Experience Focus**: Balances player agency with GM control
- **Final Integration**: Tests all systems working together

### **Phase 4.1: Action Request Framework** (Days 1-2)

#### **Player Action Request System**
```typescript
interface GameActionRequest {
  id: stringn ;
  playerId: string;
  sessionId: string;
  timestamp: number;
  action: ActionType;
  pluginId?: string;
  parameters: Record<string, unknown>;
  priority: 'low' | 'normal' | 'high' | 'immediate';
  description?: string;
}

type ActionType = 
  | 'move-token'
  | 'attack' 
  | 'cast-spell'
  | 'use-ability'
  | 'apply-condition'
  | 'update-health';

class PlayerActionService {
  async requestAction(
    action: ActionType,
    parameters: Record<string, unknown>,
    options: { priority?: string; description?: string } = {}
  ): Promise<ActionRequestResult> {
    
    // Auto-resolve plugin for action type
    const pluginId = this.resolvePluginForAction(action, parameters);
    
    const request: GameActionRequest = {
      id: generateId(),
      playerId: gameSessionStore.currentUser.id,
      sessionId: gameSessionStore.currentSession.id,
      timestamp: Date.now(),
      action,
      pluginId,
      parameters,
      priority: (options.priority as any) || 'normal',
      description: options.description
    };
    
    // For immediate actions or simple moves, try auto-approval
    if (request.priority === 'immediate' || this.canAutoApprove(request)) {
      const approved = await this.tryAutoApproval(request);
      if (approved) {
        return { success: true, approved: true, requestId: request.id };
      }
    }
    
    // Send to GM for approval
    return new Promise((resolve) => {
      socketStore.emit('gameAction:request', request, (response: ActionRequestResponse) => {
        resolve({
          success: response.success,
          approved: response.approved,
          requestId: request.id,
          error: response.error
        });
      });
    });
  }
  
  private canAutoApprove(request: GameActionRequest): boolean {
    // Simple movement within movement range
    if (request.action === 'move-token') {
      const { distance, remainingMovement } = request.parameters;
      return (distance as number) <= (remainingMovement as number);
    }
    
    // Basic attacks with weapons (not spells)
    if (request.action === 'attack') {
      const { attackType } = request.parameters;
      return attackType === 'melee' || attackType === 'ranged';
    }
    
    // Cantrips and 1st level spells might be auto-approved
    if (request.action === 'cast-spell') {
      const { spellLevel } = request.parameters;
      return (spellLevel as number) <= 1;
    }
    
    return false;
  }
  
  private async tryAutoApproval(request: GameActionRequest): Promise<boolean> {
    // Validate the action is legal
    const validation = await this.validateAction(request);
    if (!validation.valid) return false;
    
    // Execute the action directly
    await this.executeAction(request);
    return true;
  }
}
```

#### **GM Approval Interface**
```vue
<!-- GMActionApprovalPanel.vue - New Component -->
<template>
  <div class="gm-approval-panel" v-if="isGM && pendingRequests.length > 0">
    <div class="panel-header">
      <h3>Action Requests</h3>
      <div class="request-count">{{ pendingRequests.length }} pending</div>
    </div>
    
    <div class="request-list">
      <div 
        v-for="request in pendingRequests" 
        :key="request.id"
        :class="{
          'request-item': true,
          'high-priority': request.priority === 'high',
          'immediate': request.priority === 'immediate'
        }"
      >
        <div class="request-header">
          <div class="player-info">
            <img :src="getPlayerAvatar(request.playerId)" class="player-avatar" />
            <span class="player-name">{{ getPlayerName(request.playerId) }}</span>
          </div>
          <div class="request-time">{{ formatTimeAgo(request.timestamp) }}</div>
        </div>
        
        <div class="request-details">
          <div class="action-description">
            {{ formatActionDescription(request) }}
          </div>
          
          <div class="action-preview" v-if="hasPreview(request)">
            <!-- Visual preview of the action's effects -->
            <component :is="getPreviewComponent(request)" :request="request" />
          </div>
        </div>
        
        <div class="request-actions">
          <button 
            @click="approveRequest(request)" 
            class="btn-success"
            :disabled="!canApproveRequest(request)"
          >
            ✓ Approve
          </button>
          <button 
            @click="denyRequest(request)" 
            class="btn-danger"
          >
            ✗ Deny
          </button>
          <button 
            @click="modifyRequest(request)" 
            class="btn-secondary"
            v-if="canModifyRequest(request)"
          >
            ✏️ Modify
          </button>
        </div>
      </div>
    </div>
    
    <!-- Quick approval settings -->
    <div class="quick-approval-settings">
      <h4>Auto-Approval Settings</h4>
      <label>
        <input type="checkbox" v-model="autoApproveMovement" />
        Auto-approve token movement
      </label>
      <label>
        <input type="checkbox" v-model="autoApproveCantrips" />
        Auto-approve cantrips
      </label>
      <label>
        <input type="checkbox" v-model="autoApproveBasicAttacks" />
        Auto-approve basic attacks
      </label>
    </div>
  </div>
</template>

<script setup lang="ts">
const pendingRequests = ref<GameActionRequest[]>([]);

// Listen for new action requests
socketStore.on('gameAction:requestReceived', (request: GameActionRequest) => {
  pendingRequests.value.push(request);
  
  // Show notification
  notificationStore.info(`${getPlayerName(request.playerId)} requests: ${formatActionDescription(request)}`);
  
  // Auto-approve if settings allow
  if (shouldAutoApprove(request)) {
    setTimeout(() => approveRequest(request), 500);
  }
});

async function approveRequest(request: GameActionRequest) {
  try {
    // Execute the action
    await executePlayerAction(request);
    
    // Remove from pending list
    const index = pendingRequests.value.findIndex(r => r.id === request.id);
    if (index >= 0) pendingRequests.value.splice(index, 1);
    
    // Notify player of approval
    socketStore.emit('gameAction:approved', { 
      requestId: request.id,
      playerId: request.playerId 
    });
    
    notificationStore.success(`Approved: ${formatActionDescription(request)}`);
    
  } catch (error) {
    notificationStore.error(`Failed to approve action: ${error.message}`);
  }
}

async function denyRequest(request: GameActionRequest, reason?: string) {
  // Remove from pending list
  const index = pendingRequests.value.findIndex(r => r.id === request.id);
  if (index >= 0) pendingRequests.value.splice(index, 1);
  
  // Notify player of denial
  socketStore.emit('gameAction:denied', { 
    requestId: request.id,
    playerId: request.playerId,
    reason: reason || 'Action denied by GM'
  });
  
  notificationStore.info(`Denied: ${formatActionDescription(request)}`);
}
</script>
```

### **Phase 4.2: Smart Action Validation** (Days 2-3)

#### **Advanced Validation System**
```typescript
interface ActionValidationResult {
  valid: boolean;
  reason?: string;
  suggestions?: string[];
  requiredResources?: string[];
  alternativeActions?: ActionSuggestion[];
}

interface ActionSuggestion {
  action: ActionType;
  parameters: Record<string, unknown>;
  description: string;
  autoApprove: boolean;
}

class ActionValidationService {
  async validateAction(request: GameActionRequest): Promise<ActionValidationResult> {
    switch (request.action) {
      case 'move-token':
        return this.validateMovement(request);
      case 'attack':
        return this.validateAttack(request);
      case 'cast-spell':
        return this.validateSpellCast(request);
      default:
        return { valid: true };
    }
  }
  
  private async validateSpellCast(request: GameActionRequest): Promise<ActionValidationResult> {
    const { casterId, spellId, targets, usingSlot } = request.parameters;
    
    const caster = getTokenById(casterId as string);
    const spell = await getSpellData(spellId as string);
    
    if (!caster || !spell) {
      return { valid: false, reason: 'Invalid caster or spell' };
    }
    
    // Check spell slot availability
    const hasSlot = await hasAvailableSpellSlot(casterId as string, usingSlot as number);
    if (!hasSlot) {
      const suggestions = await this.suggestAlternativeSpellSlots(casterId as string, spell);
      return {
        valid: false,
        reason: `No ${usingSlot}${getOrdinalSuffix(usingSlot as number)} level spell slots available`,
        suggestions: suggestions.map(s => s.description),
        alternativeActions: suggestions
      };
    }
    
    // Validate targets
    const targetValidation = this.validateSpellTargets(spell, targets as string[]);
    if (!targetValidation.valid) {
      return targetValidation;
    }
    
    // Check concentration conflict
    const concentrationConflict = await this.checkConcentrationConflict(casterId as string, spell);
    if (concentrationConflict) {
      return {
        valid: true, // Valid but with warning
        reason: `Casting this spell will break concentration on ${concentrationConflict.spellName}. Continue?`
      };
    }
    
    return { valid: true };
  }
  
  private async suggestAlternativeSpellSlots(casterId: string, spell: Spell): Promise<ActionSuggestion[]> {
    const caster = getActorById(casterId);
    if (!caster?.pluginData?.spellSlots) return [];
    
    const suggestions: ActionSuggestion[] = [];
    const spellSlots = caster.pluginData.spellSlots as SpellSlots;
    
    // Suggest higher level slots if available
    for (let level = spell.level + 1; level <= 9; level++) {
      const slotKey = `level${level}` as keyof SpellSlots;
      const slot = spellSlots[slotKey];
      
      if (slot.used < slot.total) {
        suggestions.push({
          action: 'cast-spell',
          parameters: { ...spell, usingSlot: level },
          description: `Use ${level}${getOrdinalSuffix(level)} level slot (upcast)`,
          autoApprove: level <= 3 // Auto-approve lower upcasts
        });
      }
    }
    
    return suggestions;
  }
}
```

### **Phase 4.3: Integration & Polish** (Day 3)

#### **Unified Action Experience**
```typescript
// Enhanced component integration
export function usePlayerActions() {
  const actionService = new PlayerActionService();
  
  // Helper functions for common actions
  const requestTokenMove = async (tokenId: string, newPosition: Position) => {
    const token = getTokenById(tokenId);
    const distance = calculateDistance(token.position, newPosition);
    const remainingMovement = getRemainingMovement(tokenId);
    
    return actionService.requestAction('move-token', {
      tokenId,
      newPosition,
      distance,
      remainingMovement
    }, {
      priority: distance <= remainingMovement ? 'immediate' : 'normal',
      description: `Move ${token.name} ${distance}ft`
    });
  };
  
  const requestSpellCast = async (
    casterId: string, 
    spellId: string, 
    targets: string[],
    usingSlot?: number
  ) => {
    const spell = await getSpellData(spellId);
    const caster = getTokenById(casterId);
    
    return actionService.requestAction('cast-spell', {
      casterId,
      spellId,
      targets,
      usingSlot: usingSlot || spell.level
    }, {
      priority: spell.level <= 1 ? 'normal' : 'high',
      description: `${caster.name} casts ${spell.name}`
    });
  };
  
  const requestAttack = async (attackAction: AttackAction) => {
    const attacker = getTokenById(attackAction.attackerId);
    const defender = getTokenById(attackAction.defenderId);
    
    return actionService.requestAction('attack', attackAction, {
      priority: 'normal',
      description: `${attacker.name} attacks ${defender.name}`
    });
  };
  
  return {
    requestTokenMove,
    requestSpellCast,
    requestAttack,
    requestAction: actionService.requestAction.bind(actionService)
  };
}
```

### **Phase 4 Deliverables & Success Criteria**

**By End of Week 4, The VTT Has**:
- ✅ **Player Autonomy**: Players can request actions independently
- ✅ **GM Oversight**: All actions go through GM approval process
- ✅ **Smart Validation**: Invalid actions caught before GM sees them
- ✅ **Auto-Approval**: Simple actions approved automatically
- ✅ **Rich UI**: Visual previews, suggestions, and clear action descriptions
- ✅ **Real-time Flow**: Smooth request→approval→execution workflow

**Complete D&D Gameplay**:
- ✅ **Player Experience**: "I want to cast fireball" → click targets → GM approves → spell resolves
- ✅ **GM Experience**: See all player requests in one place, approve/deny with context
- ✅ **Collaborative Play**: Balance of player agency and GM control
- ✅ **Game Flow**: Turn-based combat with player actions integrated seamlessly

---

## 🎉 **FINAL RESULT: Complete VTT Experience**

### **What Players Experience After 4 Weeks:**

1. **🎭 Token Management**
   - Place character and monster tokens on maps
   - Move tokens with real-time synchronization
   - Update health and conditions visually

2. **⚔️ Combat System**
   - Roll initiative for encounters
   - Track turns with visual indicators
   - Make attack rolls with hit/miss resolution
   - Apply damage automatically

3. **✨ Spell System**
   - Select spells from character spell lists
   - Target tokens or areas for spells
   - Manage spell slots and concentration
   - Visual spell effects and damage

4. **🎲 Player Actions**
   - Request actions from GM
   - Get immediate feedback on validity
   - See action results in real-time
   - Collaborative gameplay with GM oversight

### **Technical Architecture Validation**

✅ **Game State System**: Proven with complex operations
✅ **Real-time Sync**: All players see changes instantly  
✅ **Plugin Integration**: D&D 5e rules properly integrated
✅ **Type Safety**: Full TypeScript coverage maintained
✅ **Performance**: Optimistic updates for smooth UX
✅ **Error Handling**: Graceful failure and recovery

### **From Infrastructure to Gameplay: Mission Accomplished! 🚀**

The solid architecture foundation enables rich, interactive D&D gameplay with proper multi-player synchronization, GM authority, and player autonomy - everything needed for a professional Virtual Tabletop experience.