# Encounter System Implementation Plan

## Overview

The encounter system will provide turn-based combat between player characters and NPCs/monsters on a shared map. Players will be able to control their characters during their turns, performing game-system-specific actions while the Game Master manages NPCs and monsters. All actions and movements will be synchronized across all connected clients.

This implementation focuses on **desktop and tablet platforms** with a rich HUD interface, while providing a simplified companion experience for phone users.

## Architecture Philosophy

This implementation adopts a **focused, incremental approach**:

- **Phase 1**: Core encounter functionality with basic UI
- **Later phases**: Enhanced UI, additional scene types, and advanced features
- **Platform strategy**: Desktop-first, tablet-adapted, phone-companion
- **Scope management**: Build encounters well before expanding to other scene types

The foundation is designed to be extensible, allowing future expansion to social scenes, exploration scenes, and custom scene types, but the initial implementation focuses exclusively on encounter/combat functionality.

## Target Platforms

### **Primary Platforms (Full HUD Experience)**
- **Desktop**: Full-featured HUD with complex panel management
- **Tablet**: Touch-optimized HUD with gesture support (10"+ recommended)

### **Secondary Platform (Companion Experience)**
- **Phone**: Simplified companion interface for players and spectators

### **Platform Detection Strategy**
```typescript
const deviceStrategy = {
  desktop: { minWidth: 1200, input: 'mouse' }, // Full HUD
  tablet: { minWidth: 768, maxWidth: 1199, input: 'touch' }, // Touch HUD
  phone: { maxWidth: 767, input: 'touch' } // Companion mode
};
```

## Server-Side Architecture

### **Core Components**

#### **EncounterController**

- **CRUD operations** for encounters within campaigns
- **Status management** (active, paused, completed)
- **Permission validation** using existing auth middleware
- **Input sanitization** and data validation

```typescript
// src/features/encounters/encounter.controller.mts
class EncounterController {
  async createEncounter(req: AuthenticatedRequest, res: Response) {
    // Validate user permissions (GM of campaign)
    // Sanitize and validate input
    // Create encounter with audit fields
  }

  async updateEncounter(req: AuthenticatedRequest, res: Response) {
    // Optimistic locking with version field
    // Audit trail logging
    // Real-time sync via WebSocket
  }

  async getEncounter(req: AuthenticatedRequest, res: Response) {
    // Permission check (campaign member)
    // Return filtered data based on user role
  }
}
```

#### **EncounterService**

- **Business logic** for encounter management
- **Token placement** and validation
- **Initiative calculation** and turn management
- **Combat action processing**
- **Effect management**

```typescript
// src/features/encounters/encounter.service.mts
class EncounterService {
  async addToken(encounterId: string, tokenData: CreateTokenData, userId: string) {
    // Validate encounter exists and user has permission
    // Create token with proper audit fields
    // Emit real-time update
    // Return created token
  }

  async moveToken(encounterId: string, tokenId: string, position: Position, userId: string) {
    // Validate token ownership or GM permission
    // Check movement constraints
    // Update position with optimistic locking
    // Emit token:moved event
  }

  async nextTurn(encounterId: string, userId: string) {
    // Validate GM permission
    // Update initiative tracker
    // Handle end-of-round effects
    // Emit turn:changed event
  }
}
```

#### **WebSocket Event Handlers**

```typescript
// src/features/encounters/encounter.socket.mts
export function setupEncounterSocketHandlers(io: SocketIOServer) {
  io.on('connection', (socket) => {
    // Join encounter room
    socket.on('encounter:join', async (data) => {
      const { encounterId } = validateEncounterJoin.parse(data);
      // Validate user permission to view encounter
      await socket.join(`encounter:${encounterId}`);
    });

    // Token movement
    socket.on('token:move', async (data) => {
      const { encounterId, tokenId, position } = validateTokenMove.parse(data);
      // Validate and process move
      // Emit to all clients in encounter room
      socket.to(`encounter:${encounterId}`).emit('token:moved', result);
    });

    // Combat actions
    socket.on('encounter:action', async (data) => {
      // Validate action based on game system plugin
      // Process action and effects
      // Emit action result to room
    });
  });
}
```

### **Security and Validation**

#### **Permission System**

```typescript
// Enhanced permission validation
interface EncounterPermissions {
  canView: boolean;    // Campaign member
  canControl: boolean; // GM or token owner
  canModify: boolean;  // GM only
  canDelete: boolean;  // GM only
}

async function validateEncounterPermission(
  userId: string, 
  encounterId: string, 
  action: keyof EncounterPermissions
): Promise<boolean> {
  // Check campaign membership
  // Check GM status
  // Check token ownership for control actions
  // Return permission result
}
```

#### **Input Sanitization and Rate Limiting**

```typescript
// Rate limiting configuration
const rateLimits = {
  tokenMoves: { maxPerMinute: 30 },
  actions: { maxPerTurn: 10 },
  encounterUpdates: { maxPerMinute: 20 }
};

// Input validation with zod
const moveTokenSchema = z.object({
  encounterId: z.string().uuid(),
  tokenId: z.string().uuid(),
  position: z.object({
    x: z.number().min(0).max(10000),
    y: z.number().min(0).max(10000)
  })
});
```

### **Database Integration**

#### **MongoDB Schema with Proper Indexing**

```typescript
// Optimized database queries
const encounterIndexes = [
  { campaignId: 1, status: 1 }, // Find active encounters
  { 'tokens.actorId': 1 },      // Find tokens by actor
  { createdAt: -1 },            // Recent encounters
  { updatedAt: -1 }             // Recently modified
];

// Transaction handling for complex operations
async function updateEncounterWithTokens(
  encounterId: string, 
  updates: EncounterUpdate
) {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      // Update encounter
      // Update related tokens
      // Emit real-time events
    });
  } finally {
    await session.endSession();
  }
}
```

## Map Implementation with Pixi.js

The map component is central to the encounter system, providing the visual foundation for all token interactions. The implementation uses **Pixi.js for high-performance encounter gameplay**, while the existing map editor continues to use Konva.js for editing functionality.

### **Dual Architecture Approach**

**Map Editor (Konva.js)**: Complex interaction, editing tools, precise manipulation  
**Encounter Viewer (Pixi.js)**: High performance, real-time gameplay, smooth animations

This architectural decision leverages the strengths of each library:
- **Konva.js**: Superior for complex editing with rich interaction models
- **Pixi.js**: Optimized for real-time performance with many animated objects

**Both systems read the same UVTT data directly from MongoDB** - no conversion or bridge needed.

### **Map Components Clarification**

**Important**: DungeonLab has three distinct map-related components that serve different purposes:

1. **MapDetailView.vue** (`packages/web/src/views/map/MapDetailView.vue`)
   - **Purpose**: Simple admin page for viewing/editing map metadata
   - **Functionality**: Displays map image, edits name/description/grid size, debug view
   - **Technology**: Basic Vue component with form controls
   - **Scope**: Map metadata management only
   - **⚠️ NOT part of encounter system** - should remain unchanged

2. **Map Editor** (`packages/web/src/components/MapEditor/`)
   - **Purpose**: Complex map creation and editing tools
   - **Functionality**: Draw walls, place portals/lights, UVTT editing
   - **Technology**: Konva.js for precise editing interactions
   - **Scope**: Map content creation and modification
   - **Status**: Already implemented

3. **Encounter Map Viewer** (Task 5.5 - to be created)
   - **Purpose**: High-performance encounter gameplay
   - **Functionality**: Display maps with tokens, real-time interactions
   - **Technology**: Pixi.js for performance and animations
   - **Scope**: Encounter/combat visualization and interaction
   - **Status**: To be implemented

**All three components read the same UVTT data from MongoDB but serve completely different use cases.**

### **Encounter-Specific Map Features with Pixi.js**

```typescript
// src/services/encounter/PixiMapRenderer.mts
export class EncounterMapRenderer {
  private app: PIXI.Application;
  private mapContainer: PIXI.Container;
  private tokenContainer: PIXI.Container;
  private backgroundSprite: PIXI.Sprite;
  
  // Platform-specific rendering optimizations
  private renderConfig: PixiRenderConfig;
  
  // Token management systems
  private tokenPool: Map<string, PIXI.Sprite>;
  private tokenAnimator: TokenAnimator;
  private viewportManager: ViewportManager;
  
  constructor(canvas: HTMLCanvasElement, config: EncounterMapConfig) {
    this.app = new PIXI.Application({
      view: canvas,
      ...this.getPlatformRenderConfig(config.platform)
    });
    
    this.setupContainers();
    this.initializeTokenSystem();
    this.setupEventHandlers();
  }
  
  /**
   * Load map directly from UVTT data (same format as Konva editor uses)
   */
  async loadMapFromUVTT(uvttData: UVTTData): Promise<void> {
    // Load background image
    this.backgroundSprite = await PIXI.Sprite.from(uvttData.image);
    this.mapContainer.addChild(this.backgroundSprite);
    
    // Render walls from line_of_sight data
    if (uvttData.line_of_sight) {
      this.renderWalls(uvttData.line_of_sight, uvttData.resolution);
    }
    
    // Render portals and lights if present
    if (uvttData.portals) this.renderPortals(uvttData.portals, uvttData.resolution);
    if (uvttData.lights) this.renderLights(uvttData.lights, uvttData.resolution);
  }
  
  private renderWalls(walls: Point[][], resolution: UVTTResolution): void {
    walls.forEach(wall => {
      const graphics = new PIXI.Graphics();
      graphics.lineStyle(2, 0x000000, 0.8);
      
      if (wall.length > 0) {
        const startPoint = this.gridToPixel(wall[0], resolution);
        graphics.moveTo(startPoint.x, startPoint.y);
        
        wall.slice(1).forEach(point => {
          const pixelPoint = this.gridToPixel(point, resolution);
          graphics.lineTo(pixelPoint.x, pixelPoint.y);
        });
      }
      
      this.mapContainer.addChild(graphics);
    });
  }
  
  private gridToPixel(gridPos: Point, resolution: UVTTResolution): Point {
    return {
      x: (gridPos.x - resolution.map_origin.x) * resolution.pixels_per_grid,
      y: (gridPos.y - resolution.map_origin.y) * resolution.pixels_per_grid
    };
  }
  
  private getPlatformRenderConfig(platform: Platform): PIXI.ApplicationOptions {
    const configs = {
      desktop: {
        antialias: true,
        resolution: window.devicePixelRatio,
        powerPreference: 'high-performance',
        backgroundColor: 0x1a1a1a
      },
      tablet: {
        antialias: true,
        resolution: Math.min(window.devicePixelRatio, 2),
        powerPreference: 'default', 
        backgroundColor: 0x1a1a1a
      },
      phone: {
        antialias: false,
        resolution: 1,
        powerPreference: 'low-power',
        backgroundColor: 0x1a1a1a
      }
    };
    return configs[platform];
  }
}
```

### **Simplified Data Flow**

The architecture is clean and straightforward:

```
Database (MongoDB)
    ↓
UVTT Data (Universal Format)
    ↓           ↓
Konva Editor   Pixi Viewer
(Map Editing)  (Encounters)
```

**Key Points**:
- **Single Source of Truth**: UVTT data in MongoDB
- **No Data Conversion**: Both systems read the same format
- **Library Agnostic**: UVTT format works with any rendering library
- **Simple Integration**: Pixi.js reads existing map data directly

### **Performance Optimizations for Pixi.js**

#### **Rendering Optimizations**
- **Viewport Culling**: Only render tokens visible in viewport using Pixi.js culling
- **Sprite Pooling**: Reuse token sprites to minimize garbage collection
- **Batch Rendering**: Group similar visual elements using Pixi.js batching
- **Texture Atlas**: Combine token images using PIXI.BaseTexture management
- **Level of Detail**: Reduce token complexity at high zoom levels

#### **Platform-Specific Optimizations**
- **Desktop**: Full quality rendering with particle effects and shadows
- **Tablet**: Balanced approach with selective effects and medium quality
- **Phone**: Minimal effects, optimized for battery life and performance

#### **Memory Management**
- Automatic texture cleanup for off-screen tokens
- Sprite pooling for frequently used elements  
- Lazy loading of token assets
- Progressive image loading based on viewport
- Efficient removal from display lists when not needed

```typescript
// Performance optimization example
export class TokenRenderer {
  private tokenPool: PIXI.Sprite[] = [];
  private activeTokens: Map<string, PIXI.Sprite> = new Map();
  
  acquireToken(tokenData: TokenData): PIXI.Sprite {
    let sprite = this.tokenPool.pop();
    if (!sprite) {
      sprite = new PIXI.Sprite();
      sprite.interactive = true;
      this.setupTokenEvents(sprite);
    }
    
    // Configure sprite for this token
    sprite.texture = PIXI.Texture.from(tokenData.imageUrl);
    sprite.x = tokenData.position.x;
    sprite.y = tokenData.position.y;
    
    this.activeTokens.set(tokenData.id, sprite);
    return sprite;
  }
  
  releaseToken(tokenId: string): void {
    const sprite = this.activeTokens.get(tokenId);
    if (sprite) {
      sprite.parent?.removeChild(sprite);
      this.tokenPool.push(sprite);
      this.activeTokens.delete(tokenId);
    }
  }
}
```

## Plugin Integration Strategy

The encounter system provides extension points for game system plugins to customize combat behavior while maintaining core functionality.

### **Plugin Interface for Encounters**

```typescript
// packages/shared/src/base/plugin.mts
export interface EncounterPlugin {
  // Initiative system customization
  calculateInitiative?(actor: Actor, modifiers?: Record<string, number>): number;
  
  // Available actions for tokens
  getAvailableActions?(token: Token, encounter: Encounter): CombatAction[];
  
  // Action validation and processing
  validateAction?(action: CombatAction, context: ActionContext): ValidationResult;
  processAction?(action: CombatAction, context: ActionContext): ActionResult;
  
  // Effect system integration
  createEffect?(effectData: EffectData): Effect;
  applyEffect?(effect: Effect, target: Token): EffectApplication;
  removeEffect?(effectId: string, target: Token): void;
  
  // Turn management hooks
  onTurnStart?(token: Token, encounter: Encounter): void;
  onTurnEnd?(token: Token, encounter: Encounter): void;
  onRoundStart?(encounter: Encounter): void;
  onRoundEnd?(encounter: Encounter): void;
}
```

### **D&D 5e Plugin Integration**

```typescript
// packages/plugins/dnd-5e-2024/server/encounter.plugin.mts
export class DnD5eEncounterPlugin implements EncounterPlugin {
  calculateInitiative(actor: Actor, modifiers: Record<string, number> = {}): number {
    const dexMod = Math.floor((actor.stats.dexterity - 10) / 2);
    const initiativeBonus = actor.stats.initiativeBonus || 0;
    const roll = Math.floor(Math.random() * 20) + 1;
    
    return roll + dexMod + initiativeBonus + (modifiers.initiative || 0);
  }

  getAvailableActions(token: Token, encounter: Encounter): CombatAction[] {
    const actor = this.getActor(token.actorId);
    const actions: CombatAction[] = [];
    
    // Basic actions
    actions.push(
      { type: 'attack', name: 'Attack', category: 'action' },
      { type: 'dodge', name: 'Dodge', category: 'action' },
      { type: 'dash', name: 'Dash', category: 'action' },
      { type: 'help', name: 'Help', category: 'action' }
    );
    
    // Spell actions if caster
    if (actor.spellcasting) {
      const spells = this.getAvailableSpells(actor);
      actions.push(...spells.map(spell => ({
        type: 'spell',
        name: spell.name,
        category: 'action',
        data: { spellId: spell.id }
      })));
    }
    
    return actions;
  }

  async processAction(action: CombatAction, context: ActionContext): Promise<ActionResult> {
    switch (action.type) {
      case 'attack':
        return this.processAttack(action, context);
      case 'spell':
        return this.processSpell(action, context);
      case 'dodge':
        return this.processDodge(action, context);
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }
  
  private async processAttack(action: CombatAction, context: ActionContext): Promise<ActionResult> {
    // D&D 5e specific attack resolution
    const attacker = context.actor;
    const target = context.target;
    
    // Roll attack
    const attackRoll = this.rollD20() + attacker.stats.attackBonus;
    const targetAC = target.stats.armorClass;
    
    if (attackRoll >= targetAC) {
      // Hit - roll damage
      const damage = this.rollDamage(attacker.weapon);
      
      return {
        success: true,
        description: `${attacker.name} hits ${target.name} for ${damage} damage`,
        effects: [{
          type: 'damage',
          target: target.id,
          value: damage
        }]
      };
    } else {
      return {
        success: false,
        description: `${attacker.name} misses ${target.name}`,
        effects: []
      };
    }
  }
}
```

## Conclusion

This revised implementation plan provides a **practical, incremental approach** to building a robust encounter system that serves the needs of both players and GMs across desktop and tablet platforms.

### **Key Improvements from Original Plan**:

1. **Focused Scope**: Concentrates on encounters first, not a full scene system
2. **Platform Strategy**: Desktop + tablet focus with phone companion
3. **Incremental Delivery**: Each phase delivers working functionality
4. **Practical Architecture**: Simplified data models and state management
5. **Performance Focused**: Optimizations built in from the start

### **Success Factors**:

- **Start Simple**: Phase 1 delivers basic but working encounter functionality
- **Build Incrementally**: Each phase adds value without breaking existing features
- **User-Centered**: Regular testing and feedback integration
- **Platform-Aware**: Optimized experience for each target platform
- **Extensible Foundation**: Ready for future expansion to scene system

### **Next Steps**:

1. **Validate Technical Approach**: Review with development team
2. **Prototype Phase 1**: Build core data models and basic UI
3. **User Testing**: Early feedback on basic encounter functionality
4. **Iterate and Refine**: Adjust based on real-world usage

This plan balances ambition with practicality, ensuring a successful implementation that can grow over time into the full vision while delivering immediate value to users.

## Revised Implementation Phases

### **Phase 1: Core Infrastructure (4-6 weeks)**

**Goal**: Establish basic encounter functionality with simple UI

#### **Deliverables**:
- Basic Encounter and Token data models
- MongoDB schemas and indexing
- Core REST API endpoints (`/api/encounters`)
- Basic encounter controller and service
- Simple WebSocket connection and room management
- Basic token placement and movement
- Simple desktop UI (no HUD yet)

#### **Technical Tasks**:
1. Set up encounter data models in shared package
2. Create encounter controller with CRUD operations
3. Implement basic encounter service with token management
4. Set up WebSocket event handling for token movement
5. Create simple Vue component for encounter view
6. Implement basic map integration (existing map component)
7. Add permission validation using existing auth middleware

#### **Success Criteria**:
- GMs can create and manage encounters
- Tokens can be placed and moved on map
- Real-time synchronization working for token movement
- Basic permission system in place

### **Phase 2: Combat Mechanics (4-6 weeks)**

**Goal**: Add initiative tracking, turn management, and basic combat actions

#### **Deliverables**:
- Initiative tracker system
- Turn management and round progression
- Basic combat actions framework
- Effect system foundation
- Enhanced WebSocket events for combat
- Simple initiative UI component

#### **Technical Tasks**:
1. Implement initiative calculation and tracking
2. Add turn management logic to encounter service
3. Create combat action processing framework
4. Implement basic effect system
5. Add combat-specific WebSocket events
6. Create initiative tracker UI component
7. Add turn-based permission validation

#### **Success Criteria**:
- Initiative can be calculated and displayed
- Turn order is maintained and progresses correctly
- Basic combat actions can be performed
- Effects can be applied and tracked

### **Phase 3: Desktop HUD System (3-4 weeks)**

**Goal**: Implement the rich HUD interface for desktop users

#### **Deliverables**:
- Full HUD panel system for desktop
- Draggable, resizable panels
- Toolbar system with common tools
- Enhanced initiative tracker panel
- Character sheet integration
- Panel state persistence

#### **Technical Tasks**:
1. Create HUD store and panel management system
2. Implement draggable/resizable panel component
3. Build toolbar component with tool selection
4. Create enhanced initiative tracker panel
5. Integrate character sheet display
6. Add panel position persistence
7. Implement desktop-specific interactions

#### **Success Criteria**:
- Rich desktop HUD interface is functional
- Panels can be moved, resized, and customized
- User preferences are saved and restored
- Interface is intuitive and efficient for GMs

### **Phase 4: Tablet Adaptation (3-4 weeks)**

**Goal**: Adapt HUD system for touch devices and tablets

#### **Deliverables**:
- Touch-optimized panel system
- Gesture support for common actions
- Tablet-specific UI adaptations
- Auto-layout for different screen sizes
- Touch-friendly controls throughout

#### **Technical Tasks**:
1. Implement device detection and adaptive routing
2. Create touch-optimized panel variants
3. Add gesture support using VueUse
4. Implement tablet-specific toolbar (bottom-oriented)
5. Add touch-friendly sizing and spacing
6. Create swipe gestures for panel management
7. Optimize performance for tablet devices

#### **Success Criteria**:
- HUD system works well on tablets (10"+ screens)
- Touch interactions are smooth and intuitive
- Interface adapts automatically to screen size
- Performance is acceptable on tablet hardware

### **Phase 5: Enhanced Features (4-5 weeks)**

**Goal**: Add advanced features and polish the system

#### **Deliverables**:
- Advanced combat actions and effects
- Improved visual feedback and animations
- Sound effects and notifications
- Advanced GM tools
- Plugin system foundation
- Performance optimizations

#### **Technical Tasks**:
1. Expand combat action system
2. Add visual effects and animations
3. Implement sound system
4. Create advanced GM tools (quick actions, shortcuts)
5. Build plugin system foundation
6. Optimize rendering and real-time performance
7. Add comprehensive error handling

#### **Success Criteria**:
- Combat system feels polished and responsive
- Visual and audio feedback enhances experience
- Advanced tools improve GM efficiency
- System performs well under load

### **Phase 6: Phone Companion & Polish (2-3 weeks)**

**Goal**: Add phone companion interface and final polish

#### **Deliverables**:
- Simple phone companion interface
- Cross-device synchronization
- Final bug fixes and optimizations
- User documentation
- Deployment preparation

#### **Technical Tasks**:
1. Create phone companion component
2. Implement basic player actions on phone
3. Add spectator mode for phone users
4. Final testing and bug fixes
5. Performance optimization
6. Create user documentation
7. Prepare for production deployment

#### **Success Criteria**:
- Phone users have useful companion experience
- All platforms work together seamlessly
- System is ready for production use
- Documentation is complete

## Future Expansion Phases

### **Phase 7: Scene System (Later)**
- Expand to support social and exploration scenes
- Scene transitions and management
- Enhanced scene-specific features

### **Phase 8: Advanced Features (Later)**
- Advanced effects and spell systems
- Custom scene types
- Automation and scripting
- Advanced plugin system

## Risk Mitigation Strategies

### **Technical Risks**:
1. **Performance Issues**: Regular performance testing, especially on tablets
2. **WebSocket Reliability**: Implement reconnection and state sync
3. **Cross-Device Compatibility**: Test on multiple devices throughout
4. **Data Synchronization**: Careful conflict resolution and optimistic updates

### **Scope Risks**:
1. **Feature Creep**: Strict adherence to phase deliverables
2. **Platform Complexity**: Focus on desktop first, then adapt
3. **Integration Issues**: Regular integration testing with existing system

### **User Experience Risks**:
1. **Interface Complexity**: User testing after each major phase
2. **Learning Curve**: Provide good defaults and progressive disclosure
3. **Mobile Usability**: Test early and often on actual devices

## Success Metrics

### **Phase 1 Metrics**:
- Basic encounters can be created and used
- Real-time token movement works reliably
- No major performance issues

### **Phase 2 Metrics**:
- Combat flows smoothly through initiative order
- Turn-based actions work correctly
- GM can manage combat effectively

### **Phase 3 Metrics**:
- Desktop users prefer HUD to simple interface
- Panel system is intuitive and customizable
- GM productivity improves significantly

### **Phase 4 Metrics**:
- Tablet interface gets positive user feedback
- Touch interactions feel natural
- Performance acceptable on target tablets

### **Overall Success**:
- System is adopted by existing user base
- Combat encounters run smoothly
- Real-time collaboration works reliably
- Users report improved gaming experience
