# 3D Dice Rolling Integration Plan

## Overview

This document outlines the complete implementation plan for integrating 3D dice rolling functionality into Dungeon Lab using `@3d-dice/dice-box-threejs` with server-authoritative roll determination.

### Goals
- Add visually appealing 3D dice rolling triggered by chat commands (`/roll` or `/r`)
- Maintain server-authoritative rolling for multiplayer consistency
- Display dice over the encounter view without blocking map visibility
- Support complex dice notation (e.g., `2d20+3d4-5`)
- Automatically clean up dice after animation completes

### Key Requirements
- **Server-determined results**: All dice outcomes calculated by server
- **Predetermined 3D animation**: Dice settle to exact server values using `@notation`
- **Multiplayer synchronization**: All players see identical dice animations
- **Non-intrusive overlay**: Transparent background over encounter map
- **Auto-cleanup**: Dice disappear 5 seconds after settling
- **Backward compatibility**: Existing roll system continues to work

## Architecture Overview

### Current System
The application already has a complete dice rolling system:
- **ChatComponent** intercepts `/roll` commands
- **Server DiceService** calculates random results
- **Socket handler** broadcasts results to all session participants
- **Chat displays** final results

### Enhancement Strategy
We will enhance the existing system rather than replace it:
1. Extend server dice service to support complex notation and return detailed breakdowns
2. Add 3D visualization layer that consumes server results
3. Convert server results to predetermined dice-box-threejs notation
4. Animate dice over encounter view with server-determined outcomes

## Technical Implementation

### 1. Server-Side Enhancements

#### Enhanced Dice Service (`/packages/server/src/services/dice.service.mts`)

**Current Structure:**
```typescript
rollDice(formula: string, userId: string): {
  formula: string;
  rolls: { die: number; result: number }[];
  modifier: number;
  total: number;
  userId: string;
  timestamp: Date;
}
```

**Enhanced Structure:**
```typescript
interface EnhancedRollResult {
  formula: string;                    // "2d20+3d4-5"
  diceResults: {
    [dieType: string]: number[];      // { d20: [15, 8], d4: [3, 1, 4] }
  };
  modifier: number;                   // -5
  total: number;                      // 26
  userId: string;
  timestamp: Date;
  
  // Backward compatibility
  rolls: { die: number; result: number }[];
}
```

**Implementation Changes:**
- Parse complex formulas like `2d20+3d4-5`, `1d20+5`, `4d6`
- Group results by die type for easy 3D conversion
- Maintain backward compatibility with existing `rolls` format
- Support standard D&D dice: d4, d6, d8, d10, d12, d20, d100

**Example Enhanced Parser:**
```typescript
private parseComplexFormula(formula: string): {
  diceGroups: { count: number; die: number }[];
  modifier: number;
} {
  // Parse "2d20+3d4-5" into:
  // diceGroups: [{ count: 2, die: 20 }, { count: 3, die: 4 }]
  // modifier: -5
}
```

#### Enhanced Socket Handler (`/packages/server/src/websocket/handlers/roll-command.handler.mts`)

**Changes:**
- Use enhanced dice service
- Return structured results for 3D visualization
- Maintain existing broadcast behavior
- Keep backward compatibility for existing clients

### 2. Client-Side Implementation

#### Package Installation
```json
// packages/web/package.json
{
  "dependencies": {
    "@3d-dice/dice-box-threejs": "^latest"
  }
}
```

#### Static Assets Setup
Copy dice assets from `@3d-dice/dice-box-threejs` package to:
```
packages/web/public/assets/dice-box/
├── models/
├── textures/
└── sounds/
```

#### 3D Dice Service (`/packages/web/src/services/dice-3d.service.mts`)

```typescript
export class Dice3DService {
  private diceBox: DiceBox | null = null;
  private container: HTMLElement | null = null;
  private isRolling = false;
  private cleanupTimer: NodeJS.Timeout | null = null;

  /**
   * Initialize the 3D dice system
   */
  async initialize(container: HTMLElement): Promise<void> {
    this.container = container;
    
    // Initialize dice-box-threejs with transparent background
    this.diceBox = new DiceBox(container, {
      assetPath: '/assets/dice-box/',
      theme: 'default',
      offscreen: true,
      transparent: true,
      shadows: true,
      lightIntensity: 0.8
    });
    
    await this.diceBox.init();
  }

  /**
   * Roll dice with predetermined server results
   */
  async rollWithResults(serverResult: EnhancedRollResult): Promise<void> {
    if (!this.diceBox || this.isRolling) return;
    
    this.isRolling = true;
    
    // Convert server results to threejs predetermined notation
    const notation = this.convertToThreeJSNotation(serverResult);
    
    console.log('Rolling with predetermined notation:', notation);
    
    // Roll dice with predetermined results
    await this.diceBox.roll(notation);
    
    // Setup auto-cleanup
    this.scheduleCleanup();
  }

  /**
   * Convert server results to dice-box-threejs notation
   * Example: { d20: [15, 8], d4: [3, 1, 4] } → "2d20@15,8+3d4@3,1,4"
   */
  private convertToThreeJSNotation(result: EnhancedRollResult): string {
    const parts: string[] = [];
    
    for (const [dieType, values] of Object.entries(result.diceResults)) {
      const dieSize = dieType.substring(1); // Remove 'd' prefix
      const count = values.length;
      const predetermined = values.join(',');
      parts.push(`${count}d${dieSize}@${predetermined}`);
    }
    
    let notation = parts.join('+');
    
    // Add modifier if present
    if (result.modifier !== 0) {
      notation += result.modifier > 0 ? `+${result.modifier}` : `${result.modifier}`;
    }
    
    return notation;
  }

  /**
   * Schedule dice cleanup after 5 seconds
   */
  private scheduleCleanup(): void {
    if (this.cleanupTimer) {
      clearTimeout(this.cleanupTimer);
    }
    
    this.cleanupTimer = setTimeout(() => {
      this.clearDice();
    }, 5000);
  }

  /**
   * Clear dice from the scene
   */
  clearDice(): void {
    if (this.diceBox) {
      this.diceBox.clear();
    }
    this.isRolling = false;
    
    if (this.cleanupTimer) {
      clearTimeout(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.clearDice();
    if (this.diceBox) {
      this.diceBox.destroy();
      this.diceBox = null;
    }
    this.container = null;
  }
}
```

#### Dice Overlay Component (`/packages/web/src/components/dice/DiceOverlay.vue`)

```vue
<template>
  <div 
    v-if="isVisible"
    class="dice-overlay"
    ref="diceContainer"
  >
    <!-- Three.js canvas will be injected here -->
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { Dice3DService } from '../../services/dice-3d.service.mjs';
import { useSocketStore } from '../../stores/socket.store.mjs';
import type { EnhancedRollResult } from '../../types/dice-3d.types.mjs';

// Props
interface Props {
  visible?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  visible: true
});

// Refs
const diceContainer = ref<HTMLElement | null>(null);
const isVisible = ref(false);
const dice3DService = new Dice3DService();

// Stores
const socketStore = useSocketStore();

// Initialize 3D dice when container is ready
onMounted(async () => {
  if (diceContainer.value) {
    await dice3DService.initialize(diceContainer.value);
    console.log('3D dice service initialized');
  }
});

// Cleanup on unmount
onUnmounted(() => {
  dice3DService.destroy();
});

// Listen for roll results from server
if (socketStore.socket) {
  socketStore.socket.on('roll-result', async (data: { 
    type: 'roll-result', 
    result: EnhancedRollResult 
  }) => {
    console.log('Received roll result for 3D display:', data.result);
    
    // Show overlay
    isVisible.value = true;
    
    // Start 3D dice animation with predetermined results
    await dice3DService.rollWithResults(data.result);
    
    // Hide overlay after cleanup (handled by service)
    setTimeout(() => {
      isVisible.value = false;
    }, 6000); // Give extra time for fade-out
  });
}
</script>

<style scoped>
.dice-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 15; /* Above map (10), below HUD (50) */
  pointer-events: none; /* Allow map interaction beneath */
  background: transparent;
  
  /* Ensure Three.js canvas fills the container */
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Three.js canvas styling */
:deep(canvas) {
  background: transparent !important;
  max-width: 100%;
  max-height: 100%;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .dice-overlay {
    /* Adjust for smaller screens */
    padding: 20px;
  }
}
</style>
```

#### Enhanced Chat Integration (`/packages/web/src/components/chat/ChatComponent.vue`)

**Changes to existing handleRollCommand function:**

```typescript
// Enhanced roll command handler
function handleRollCommand(formula: string) {
  if (!socketStore.socket) return;

  console.log('Processing roll command:', formula);

  socketStore.socket.emit('roll', {
    formula,
    gameSessionId: route.params.id as string
  }, (response: { success: boolean, error?: string }) => {
    if (!response.success) {
      console.error('Error processing roll command:', response.error);
      // TODO: Show user-friendly error message
    }
  });
}

// Enhanced message sending with /r shorthand support
function sendMessage() {
  if (!messageInput.value.trim() || !activeChatContext.value) return;
  
  // Check for roll commands (both /roll and /r)
  if (messageInput.value.startsWith('/roll ')) {
    const formula = messageInput.value.slice(6).trim();
    handleRollCommand(formula);
    messageInput.value = '';
    return;
  }
  
  // NEW: Support /r shorthand
  if (messageInput.value.startsWith('/r ')) {
    const formula = messageInput.value.slice(3).trim();
    handleRollCommand(formula);
    messageInput.value = '';
    return;
  }

  // ... rest of existing sendMessage logic
}
```

#### Encounter View Integration (`/packages/web/src/components/encounter/EncounterView.vue`)

**Integration into existing overlay system:**

```vue
<!-- In the encounter-overlays section -->
<div class="encounter-overlays absolute inset-0 pointer-events-none">
  
  <!-- NEW: 3D Dice Overlay -->
  <DiceOverlay />
  
  <!-- Existing overlays -->
  <TokenContextMenu
    v-if="contextMenuToken"
    :visible="!!contextMenuToken"
    :token="contextMenuToken"
    :position="contextMenuPosition"
    @close="contextMenuToken = null"
    @action="handleTokenAction"
  />
  
  <!-- ... other existing overlays -->
</div>
```

```typescript
// Add import
import DiceOverlay from '../dice/DiceOverlay.vue';
```

### 3. Type Definitions

#### Enhanced Dice Types (`/packages/shared/src/types/dice.mts`)

```typescript
export interface EnhancedRollResult {
  formula: string;                    // Original formula: "2d20+3d4-5"
  diceResults: {
    [dieType: string]: number[];      // { d20: [15, 8], d4: [3, 1, 4] }
  };
  modifier: number;                   // -5
  total: number;                      // 26
  userId: string;
  timestamp: Date;
  
  // Backward compatibility with existing system
  rolls: { die: number; result: number }[];
}

export interface DiceGroup {
  count: number;    // Number of dice
  die: number;      // Die size (4, 6, 8, 10, 12, 20, 100)
  results: number[]; // Individual roll results
}

export interface ParsedDiceFormula {
  diceGroups: DiceGroup[];
  modifier: number;
  originalFormula: string;
}
```

#### Client-Side Types (`/packages/web/src/types/dice-3d.types.mts`)

```typescript
import type { EnhancedRollResult } from '@dungeon-lab/shared/types/dice.mjs';

export interface Dice3DOptions {
  assetPath: string;
  theme: string;
  offscreen: boolean;
  transparent: boolean;
  shadows: boolean;
  lightIntensity: number;
}

export interface DiceBoxInstance {
  init(): Promise<void>;
  roll(notation: string): Promise<void>;
  clear(): void;
  destroy(): void;
}

export { EnhancedRollResult };
```

## Implementation Flow

### Complete Roll Sequence

1. **User Input**
   - User types `/r 2d20+3d4-5` in chat
   - ChatComponent intercepts the command

2. **Server Processing**
   - Enhanced dice service parses complex formula
   - Calculates individual results: `{ d20: [15, 8], d4: [3, 1, 4], modifier: -5 }`
   - Socket handler broadcasts to all session participants

3. **3D Visualization**
   - All clients receive structured roll data
   - DiceOverlay converts to threejs notation: `"2d20@15,8+3d4@3,1,4-5"`
   - dice-box-threejs animates dice with predetermined outcomes
   - All players see identical dice settling to same values

4. **Result Display**
   - Chat displays final result: "Rolled 2d20+3d4-5: **Total: 26**"
   - 3D dice remain visible for 5 seconds
   - Dice fade out and disappear

5. **Cleanup**
   - 3D scene cleared
   - Ready for next roll

### Error Handling

**Server-Side:**
- Invalid dice notation → Return error response
- Parser failures → Fallback to simple notation
- Database/session errors → Standard error handling

**Client-Side:**
- 3D initialization failure → Fallback to text-only rolls
- Asset loading errors → Show loading indicator
- WebGL not supported → Graceful degradation

## File Structure

```
packages/web/
├── public/
│   └── assets/
│       └── dice-box/          (new - static assets)
│           ├── models/
│           ├── textures/
│           └── sounds/
├── src/
│   ├── components/
│   │   ├── dice/
│   │   │   └── DiceOverlay.vue     (new)
│   │   ├── encounter/
│   │   │   └── EncounterView.vue   (updated)
│   │   └── chat/
│   │       └── ChatComponent.vue   (updated)
│   ├── services/
│   │   └── dice-3d.service.mts     (new)
│   └── types/
│       └── dice-3d.types.mts       (new)

packages/server/src/
├── services/
│   └── dice.service.mts            (enhanced)
└── websocket/handlers/
    └── roll-command.handler.mts    (enhanced)

packages/shared/src/
└── types/
    ├── dice.mts                    (enhanced)
    └── socket/
        └── dice.mts                (enhanced)
```

## Testing Strategy

### Unit Tests
- **Dice3DService**: Test notation conversion, initialization, cleanup
- **Enhanced DiceService**: Test complex formula parsing
- **Socket Handler**: Test enhanced response format

### Integration Tests
- **Roll Command Flow**: Test complete client→server→client flow
- **3D Animation**: Test dice settling to predetermined values
- **Multiplayer Sync**: Test identical results across clients

### Manual Testing
- **Various Dice Notation**: `1d20`, `2d20+5`, `4d6`, `2d20+3d4-5`
- **Error Cases**: Invalid notation, network failures
- **Responsive Design**: Different screen sizes and orientations
- **Performance**: Multiple rapid rolls, cleanup behavior

## Success Criteria

### Functional Requirements
- ✅ User can type `/roll 2d20+3d4-5` or `/r 2d20+3d4-5`
- ✅ Server calculates authoritative results
- ✅ 3D dice appear over encounter map
- ✅ Dice animate with realistic physics
- ✅ Dice settle to exact server-determined values
- ✅ All players see identical animations
- ✅ Result appears in chat after animation
- ✅ Dice disappear after 5 seconds
- ✅ Map remains fully visible and interactive

### Technical Requirements
- ✅ Transparent overlay doesn't block map interaction
- ✅ Proper z-index layering (above map, below HUD)
- ✅ Responsive design works on mobile/tablet/desktop
- ✅ Graceful degradation if WebGL unavailable
- ✅ Memory cleanup prevents leaks
- ✅ Backward compatibility with existing rolls

### Performance Requirements
- ✅ 3D initialization < 2 seconds
- ✅ Roll animation starts immediately upon server response
- ✅ Smooth 60fps animation on supported devices
- ✅ No impact on map rendering performance
- ✅ Proper asset loading and caching

## Future Enhancements

### Phase 2 Features
- **Custom Dice Themes**: Different visual styles
- **Sound Effects**: Dice collision and settling sounds
- **Advanced Animations**: Dice exploding on critical hits/failures
- **Roll History**: Visual replay of recent rolls
- **Dice Preferences**: Per-user dice appearance settings

### Technical Improvements
- **WebWorker Integration**: Offload physics calculations
- **Advanced Lighting**: Dynamic shadows and reflections
- **Particle Effects**: Sparkles, dust clouds on impact
- **Performance Optimization**: LOD for dice models
- **Accessibility**: Screen reader support for roll results

## Risk Mitigation

### Technical Risks
- **dice-box-threejs age**: Package is 3 years old
  - *Mitigation*: Fork package if needed, Three.js ecosystem is stable
- **Performance on older devices**: 3D rendering overhead
  - *Mitigation*: Graceful degradation, settings to disable 3D
- **WebGL compatibility**: Not all browsers support WebGL
  - *Mitigation*: Feature detection, fallback to existing system

### Implementation Risks
- **Complex integration**: Multiple system changes
  - *Mitigation*: Incremental implementation, thorough testing
- **Multiplayer synchronization**: Dice timing issues
  - *Mitigation*: Server-authoritative approach ensures consistency
- **User experience**: 3D dice might be distracting
  - *Mitigation*: User preference toggle, subtle animations

## Conclusion

This plan provides a comprehensive roadmap for adding visually appealing 3D dice rolling to Dungeon Lab while maintaining the robust server-authoritative architecture that ensures fair play in multiplayer sessions. The implementation enhances the existing system rather than replacing it, ensuring backward compatibility and minimizing risk.

The key innovation is using predetermined results with the `@notation` feature of dice-box-threejs to create synchronized 3D animations that settle to server-calculated values, giving players the excitement of watching dice roll while maintaining the integrity required for multiplayer gaming.