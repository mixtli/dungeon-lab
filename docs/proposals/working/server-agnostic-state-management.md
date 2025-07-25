# Server-Agnostic State Management Architecture

## Executive Summary

### Problem Statement
The current Dungeon Lab state management system requires the server to understand game-specific concepts (HP, damage, D&D rules), violating the plugin architecture principle of server agnosticism. This creates maintenance overhead, limits extensibility to other game systems, and couples the core platform to specific game mechanics.

### Key Insights
1. **VTT State is Different**: Unlike typical web applications, VTT state consists primarily of temporary modifications to well-defined base entities from the compendium system
2. **Compendium Leverage**: The existing compendium system can serve as the foundation for a differential state model
3. **Plugin Isolation**: Game logic should remain entirely in plugins, with the server handling only generic state synchronization
4. **Event-Driven Nature**: VTT interactions are naturally event-driven (attacks, movements, spell casts) rather than CRUD operations

### Recommended Approach
**Compendium-Centric Event Sourcing** - A hybrid approach that treats game state as a stream of events applied to compendium entities, with the server acting as a pure event log without understanding game semantics.

## Architecture Options

### Option 1: Compendium-Centric Event Sourcing ⭐ **RECOMMENDED**

#### Core Concept
The server becomes a pure event log that stores and orders events without interpreting them. All game logic happens on clients through plugins. State is represented as differences from compendium defaults.

#### Architecture Overview

```mermaid
graph TB
    subgraph "Client 1 (Player)"
        C1[Plugin Engine]
        C1S[Local State]
        C1E[Event Queue]
    end
    
    subgraph "Client 2 (GM)"
        C2[Plugin Engine]
        C2S[Local State]
        C2E[Event Queue]
    end
    
    subgraph "Server"
        ES[Event Store]
        SQ[Sequence Counter]
        BC[Broadcast Engine]
    end
    
    subgraph "Compendium"
        CD[Compendium Data]
        CM[Monster Templates]
        CS[Spell Definitions]
    end
    
    C1E -->|Event + Sequence| ES
    C2E -->|Event + Sequence| ES
    ES --> BC
    BC -->|Broadcast Event| C1
    BC -->|Broadcast Event| C2
    
    C1 --> CD
    C2 --> CD
    
    C1S -.->|Computed from| CD
    C2S -.->|Computed from| CD
```

#### State Model

```typescript
// Traditional approach - full object in MongoDB
interface TraditionalActor {
  _id: string;
  name: string;
  hp: number;
  maxHp: number;
  ac: number;
  stats: Stats;
  // ... hundreds of fields
}

// New approach - compendium reference + overrides
interface GameEntity {
  compendiumRef: string;        // "dnd5e:monsters:goblin"
  instanceId: string;           // "encounter1_goblin_1"
  overrides: Record<string, {
    value: any;
    timestamp: number;
    userId: string;
  }>;
}

// Example instance
const goblinInstance = {
  compendiumRef: "dnd5e:monsters:goblin",
  instanceId: "battle1_goblin1",
  overrides: {
    "attributes.hp.value": { 
      value: 7,                 // Was 15 in compendium
      timestamp: 1704067200000,
      userId: "player1"
    },
    "position": { 
      value: { x: 100, y: 150 }, // Runtime-only data
      timestamp: 1704067210000,
      userId: "gm"
    }
  }
}
```

#### Attack Flow Sequence

```mermaid
sequenceDiagram
    participant P1 as Player 1<br/>(Attacker)
    participant Plugin as D&D Plugin<br/>(Client)
    participant Queue as Event Queue
    participant Server as Event Server
    participant P2 as Player 2<br/>(Witness)
    participant GM as GM Client
    participant Comp as Compendium

    Note over P1,Plugin: Player initiates attack
    P1->>Plugin: Click attack on goblin token
    Plugin->>Comp: Get goblin base stats
    Comp-->>Plugin: Base HP: 15, AC: 15
    Plugin->>Plugin: Roll attack (d20+5 = 18)
    Plugin->>Plugin: Roll damage (1d8+3 = 8)
    
    Note over Plugin,Queue: Create generic event
    Plugin->>Queue: Enqueue attack event
    Queue->>Queue: Assign sequence number: 1234
    
    Note over Queue,Server: Send to server
    Queue->>Server: emit('event:submit', attackEvent)
    Server->>Server: Store event with sequence 1234
    Server->>Server: Increment global sequence
    
    Note over Server,GM: Broadcast to all clients
    Server-->>P1: emit('event:applied', {seq: 1234, event})
    Server-->>P2: emit('event:applied', {seq: 1234, event})
    Server-->>GM: emit('event:applied', {seq: 1234, event})
    
    Note over P2,GM: All clients apply same event
    P2->>Plugin: Apply event to local state
    Plugin->>Comp: Get goblin base stats
    Plugin->>Plugin: Apply damage: 15 - 8 = 7 HP
    Plugin->>P2: Update UI (HP bar to 7/15)
    
    GM->>Plugin: Apply event to local state  
    Plugin->>Plugin: Same calculation: 7 HP
    Plugin->>GM: Update UI (HP bar to 7/15)
```

#### Event Structure

```typescript
interface GameEvent {
  // Server-managed metadata
  id: string;                    // UUID for deduplication
  sequence: number;              // Global sequence number
  timestamp: number;             // Server timestamp
  userId: string;                // Event originator
  sessionId: string;             // Game session context
  
  // Plugin-specific data (opaque to server)
  type: string;                  // "plugin:dnd5e:attack"
  payload: {
    // Plugin defines this structure
    action: {
      type: "weapon_attack",
      weaponId: "longsword",
      rolls: {
        attack: { d20: 12, modifiers: 6, total: 18 },
        damage: { dice: "1d8+3", result: 8 }
      }
    },
    target: {
      compendiumRef: "dnd5e:monsters:goblin",
      instanceId: "battle1_goblin1"
    },
    result: {
      hit: true,
      effects: ["damage:8:slashing"]
    },
    // State changes computed by plugin
    stateChanges: {
      "attributes.hp.value": { from: 15, to: 7 }
    }
  };
  
  // Optional checksum for integrity
  checksum?: string;
}
```

#### Conflict Resolution

Since the server doesn't understand game semantics, conflicts are resolved through deterministic rules:

```typescript
class ConflictResolver {
  resolve(events: GameEvent[]): GameEvent[] {
    // Sort by timestamp, then by user ID hash for determinism
    return events.sort((a, b) => {
      if (a.timestamp !== b.timestamp) {
        return a.timestamp - b.timestamp;
      }
      return a.userId.localeCompare(b.userId);
    });
  }
}

// Example: Two simultaneous attacks on same goblin
const event1 = { 
  timestamp: 1704067200000, 
  userId: "player1", 
  payload: { stateChanges: { "attributes.hp.value": { from: 15, to: 7 } } }
};

const event2 = { 
  timestamp: 1704067200000, 
  userId: "player2", 
  payload: { stateChanges: { "attributes.hp.value": { from: 15, to: 10 } } }
};

// After resolution: player1 goes first (lexicographically)
// Final HP: 15 → 7 → 2 (not 10)
```

#### Client State Computation

```typescript
class GameStateManager {
  private compendium: CompendiumService;
  private events: GameEvent[] = [];
  
  // Compute current state by replaying events
  computeEntityState(compendiumRef: string, instanceId: string): any {
    // Start with compendium base
    const baseEntity = this.compendium.get(compendiumRef);
    let currentState = deepClone(baseEntity);
    
    // Apply all events for this instance in order
    const relevantEvents = this.events.filter(e => 
      e.payload.target?.instanceId === instanceId ||
      e.payload.source?.instanceId === instanceId
    );
    
    for (const event of relevantEvents) {
      currentState = this.applyEvent(currentState, event);
    }
    
    return currentState;
  }
  
  private applyEvent(state: any, event: GameEvent): any {
    // Plugin interprets the event
    const plugin = this.getPlugin(event.type);
    return plugin.applyEvent(state, event);
  }
}
```

#### **Pros:**
- ✅ Server completely agnostic to game rules
- ✅ Leverages existing compendium investment
- ✅ Minimal storage (only differences)
- ✅ Time travel debugging (replay any point)
- ✅ Natural event-driven architecture
- ✅ Deterministic conflict resolution
- ✅ Plugin isolation maintained

#### **Cons:**
- ❌ New clients must replay events to catch up
- ❌ Complex conflict resolution for some scenarios
- ❌ Event log can grow large over time
- ❌ Requires event compaction/snapshotting

---

### Option 2: Operational Transform with Generic Operations

#### Core Concept
Define atomic operations (SET, ADD, REMOVE, MOVE) that work on JSON paths. The server can order and transform these operations without understanding their semantic meaning.

#### Architecture Overview

```mermaid
graph TB
    subgraph "Client 1"
        A1[Action Handler]
        O1[Operation Generator]
        T1[Transform Engine]
    end
    
    subgraph "Client 2"  
        A2[Action Handler]
        O2[Operation Generator]
        T2[Transform Engine]
    end
    
    subgraph "Server"
        OT[Operational Transform Engine]
        ST[State Tree]
        VE[Version Engine]
    end
    
    A1 --> O1
    O1 -->|Operations| OT
    A2 --> O2  
    O2 -->|Operations| OT
    
    OT --> ST
    OT -->|Transformed Ops| T1
    OT -->|Transformed Ops| T2
    
    T1 --> A1
    T2 --> A2
```

#### Operation Structure

```typescript
interface Operation {
  id: string;
  type: 'set' | 'add' | 'remove' | 'move';
  path: string;           // JSON path: "/instances/goblin1/hp"
  value?: any;
  oldValue?: any;         // For validation
  version: number;        // Document version
  timestamp: number;
  userId: string;
}

// Attack creates multiple operations
const attackOperations: Operation[] = [
  {
    id: uuid(),
    type: 'set',
    path: '/instances/goblin1/attributes/hp/value',
    value: 7,
    oldValue: 15,
    version: 42,
    timestamp: Date.now(),
    userId: 'player1'
  },
  {
    id: uuid(),
    type: 'add', 
    path: '/combat/log',
    value: {
      type: 'attack',
      attacker: 'player1',
      target: 'goblin1', 
      damage: 8
    },
    version: 42,
    timestamp: Date.now(),
    userId: 'player1'
  }
];
```

#### Transform Algorithm

```typescript
class OperationalTransform {
  // Transform operation A against operation B
  transform(opA: Operation, opB: Operation): [Operation, Operation] {
    // Same path - conflict resolution needed
    if (opA.path === opB.path) {
      if (opA.type === 'set' && opB.type === 'set') {
        // Last writer wins based on timestamp
        if (opA.timestamp > opB.timestamp) {
          return [opA, { ...opB, type: 'noop' }];
        } else {
          return [{ ...opA, type: 'noop' }, opB];
        }
      }
    }
    
    // Different paths - both operations can proceed
    return [opA, opB];
  }
  
  // Apply operation to state tree
  apply(state: any, op: Operation): any {
    const newState = { ...state };
    
    switch (op.type) {
      case 'set':
        setPath(newState, op.path, op.value);
        break;
      case 'add':
        addToPath(newState, op.path, op.value);
        break;
      case 'remove':
        removePath(newState, op.path);
        break;
    }
    
    return newState;
  }
}
```

#### **Pros:**
- ✅ Well-proven technology (Google Docs, Figma)
- ✅ Server handles conflicts generically  
- ✅ Real-time collaboration naturally supported
- ✅ Fine-grained operations enable efficient updates

#### **Cons:**
- ❌ Complex transform rules for all operation combinations
- ❌ May not handle all game mechanics elegantly
- ❌ Still requires understanding of data structure
- ❌ Performance overhead for complex transforms

---

### Option 3: Immutable State Trees with Cryptographic Hashing

#### Core Concept
State is represented as immutable trees where each change creates a new version with a cryptographic hash. The server validates hash integrity without understanding content.

#### Architecture Overview

```mermaid
graph TB
    subgraph "Client Network"
        C1[Client 1]
        C2[Client 2] 
        C3[Client 3]
    end
    
    subgraph "Server"
        VD[Version Database]
        HV[Hash Validator]
        CD[Conflict Detector]
    end
    
    subgraph "State Tree"
        V1[Version 1<br/>hash: abc123]
        V2[Version 2<br/>hash: def456] 
        V3[Version 3<br/>hash: ghi789]
        
        V1 --> V2
        V2 --> V3
    end
    
    C1 -->|Propose Version| HV
    C2 -->|Propose Version| HV
    C3 -->|Propose Version| HV
    
    HV --> CD
    CD --> VD
    VD --> C1
    VD --> C2  
    VD --> C3
```

#### Version Structure

```typescript
interface StateVersion {
  hash: string;                    // SHA-256 of content
  parentHash: string;              // Previous version
  sequence: number;                // Version number
  timestamp: number;               // Creation time
  userId: string;                  // Author
  
  // State changes as JSON patches
  patches: JsonPatchOperation[];   // RFC 6902 JSON Patch
  
  // Optional: compressed full state for snapshots
  snapshot?: {
    compressed: boolean;
    data: string;                  // Gzipped JSON
  };
  
  // Cryptographic integrity
  signature?: string;              // Digital signature
}

// Example attack creating new version
const attackVersion: StateVersion = {
  hash: "sha256:a1b2c3d4e5f6...",
  parentHash: "sha256:f6e5d4c3b2a1...", 
  sequence: 1235,
  timestamp: 1704067200000,
  userId: "player1",
  
  patches: [
    {
      op: "replace",
      path: "/instances/goblin1/attributes/hp/value",
      value: 7
    },
    {
      op: "add", 
      path: "/combat/events/-",
      value: {
        type: "attack",
        timestamp: 1704067200000,
        attacker: "player1",
        target: "goblin1",
        damage: 8
      }
    }
  ]
};
```

#### Hash-Based Conflict Detection

```mermaid
sequenceDiagram
    participant C1 as Client 1
    participant C2 as Client 2
    participant Server as Server
    participant State as State Tree
    
    Note over State: Current: version 100<br/>hash: abc123
    
    C1->>Server: Propose version 101<br/>parent: abc123
    C2->>Server: Propose version 101<br/>parent: abc123
    
    Note over Server: Concurrent versions detected
    
    Server->>Server: Validate hashes
    Server->>Server: Order by timestamp
    
    Server-->>C1: Accept version 101
    Server-->>C2: Conflict - rebase needed
    Server-->>C2: Current state: version 101
    
    C2->>C2: Recompute patches against v101
    C2->>Server: Propose version 102<br/>parent: new_hash
    
    Server-->>C2: Accept version 102
    Server-->>C1: Update to version 102
```

#### **Pros:**
- ✅ Cryptographically verifiable consistency
- ✅ Natural versioning and rollback
- ✅ Efficient delta transmission
- ✅ Works well with compendium approach

#### **Cons:**
- ❌ Hash computation overhead
- ❌ Complex conflict resolution for concurrent patches
- ❌ Storage overhead for version history
- ❌ Requires careful patch ordering

---

### Option 4: Delta-State CRDTs with Plugin-Defined Merge Rules

#### Core Concept
Use Conflict-free Replicated Data Types where concurrent updates merge automatically using plugin-defined rules. No conflicts by design.

#### Architecture Overview

```mermaid
graph LR
    subgraph "Plugin System"
        P1[D&D Plugin]
        P2[Pathfinder Plugin]  
        P3[Custom Plugin]
    end
    
    subgraph "CRDT Layer"
        MR[Merge Rules Registry]
        CS[CRDT State]
        ME[Merge Engine]
    end
    
    subgraph "Network"
        B[Broadcast Channel]
    end
    
    P1 --> MR
    P2 --> MR
    P3 --> MR
    
    MR --> ME
    CS --> ME
    ME --> CS
    
    ME <--> B
```

#### Merge Rules Definition

```typescript
interface CRDTMergeRules {
  [path: string]: (local: any, remote: any, context: MergeContext) => any;
}

class DnD5ePlugin {
  getCRDTMergeRules(): CRDTMergeRules {
    return {
      // HP can only decrease (damage is cumulative)
      'actors.*.attributes.hp.value': (local, remote) => 
        Math.min(local, remote),
        
      // Initiative order merges by timestamp
      'encounter.initiative.order': (local, remote, ctx) =>
        mergeArraysByTimestamp(local, remote, ctx.timestamp),
        
      // Conditions are a set union
      'actors.*.conditions': (local, remote) =>
        Array.from(new Set([...local, ...remote])),
        
      // Position uses latest timestamp
      'tokens.*.position': (local, remote, ctx) =>
        ctx.localTimestamp > ctx.remoteTimestamp ? local : remote,
        
      // Spell slots are minimum (can only be consumed)
      'actors.*.spells.slots.*.remaining': (local, remote) =>
        Math.min(local, remote)
    };
  }
}
```

#### Update Flow

```mermaid
sequenceDiagram
    participant P1 as Player 1
    participant P2 as Player 2
    participant CRDT1 as CRDT State 1
    participant CRDT2 as CRDT State 2
    participant Network as Network

    P1->>CRDT1: Attack: goblin HP 15→7
    P2->>CRDT2: Attack: goblin HP 15→6
    
    CRDT1->>Network: Broadcast delta: {hp: 7, timestamp: t1}
    CRDT2->>Network: Broadcast delta: {hp: 6, timestamp: t2}
    
    Network->>CRDT2: Receive delta: {hp: 7, timestamp: t1}
    Network->>CRDT1: Receive delta: {hp: 6, timestamp: t2}
    
    Note over CRDT1: Merge: min(7, 6) = 6
    Note over CRDT2: Merge: min(6, 7) = 6
    
    CRDT1-->>P1: Update UI: HP = 6
    CRDT2-->>P2: Update UI: HP = 6
    
    Note over P1,P2: Eventually consistent!
```

#### **Pros:**
- ✅ No conflicts by mathematical design
- ✅ Eventually consistent
- ✅ Works offline naturally
- ✅ Plugin-defined semantics

#### **Cons:**
- ❌ Limited to commutative operations
- ❌ Complex for non-CRDT-friendly mechanics
- ❌ Debugging merged state is difficult
- ❌ May not preserve game rule integrity

---

## Comparative Analysis

| Criteria | Event Sourcing | Operational Transform | Immutable Trees | CRDTs |
|----------|---------------|----------------------|-----------------|-------|
| **Server Agnosticism** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Conflict Resolution** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Game Rule Preservation** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ |
| **Performance** | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Implementation Complexity** | ⭐⭐⭐ | ⭐⭐ | ⭐⭐ | ⭐⭐ |
| **Debugging/Observability** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ |
| **Compendium Integration** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Time Travel/Replay** | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐ |

## Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2)
```mermaid
gantt
    title Implementation Timeline
    dateFormat  YYYY-MM-DD
    section Phase 1
    Event Store Schema     :active, p1a, 2024-01-01, 3d
    Basic Event Broadcasting :p1b, after p1a, 4d
    Compendium Integration :p1c, after p1a, 5d
    Client Event Replay    :p1d, after p1b, 4d
    section Phase 2  
    Conflict Resolution    :p2a, after p1d, 5d
    Event Compaction      :p2b, after p2a, 3d
    Performance Optimization :p2c, after p2b, 4d
    section Phase 3
    Migration Tools       :p3a, after p2c, 5d
    Testing & Validation  :p3b, after p3a, 7d
    Production Deployment :p3c, after p3b, 3d
```

1. **Event Store Infrastructure**
   - Design event schema and storage
   - Implement basic event broadcasting
   - Create sequence number management

2. **Compendium Integration** 
   - Define entity reference system
   - Implement state override mechanism
   - Create compendium + state merger

### Phase 2: Core Features (Weeks 3-4)
1. **Conflict Resolution**
   - Implement timestamp-based ordering
   - Add GM authority rules
   - Create manual resolution UI

2. **Performance Optimization**
   - Event compaction algorithms
   - State snapshots for fast recovery
   - Lazy loading and caching

### Phase 3: Migration & Deployment (Weeks 5-6)
1. **Migration Strategy**
   - Convert existing MongoDB data
   - Dual-write during transition
   - Rollback capabilities

2. **Testing & Validation**
   - Multi-client synchronization tests
   - Performance benchmarks
   - Game rule integrity validation

## State Model Redesign

### Current MongoDB Schema
```typescript
// Current - full documents in MongoDB
interface Actor {
  _id: ObjectId;
  name: string;
  type: 'character' | 'monster';
  attributes: {
    hp: { value: number; max: number };
    ac: number;
    // ... hundreds of fields
  };
  // ... more complex nested data
}
```

### New Compendium-Centric Schema

```typescript
// Compendium entry (read-only templates)
interface CompendiumEntry {
  id: string;                    // "dnd5e:monsters:goblin"
  version: string;               // "2024.1.0"
  data: {
    name: string;
    type: string;
    attributes: {
      hp: { value: number; max: number };
      ac: number;
      // Complete stat block
    };
  };
}

// Game state (only differences)
interface GameEntity {
  compendiumRef: string;         // Reference to compendium entry
  instanceId: string;            // Unique in game session
  created: number;               // When added to game
  overrides: {
    [path: string]: {
      value: any;
      timestamp: number;
      userId: string;
      eventId: string;           // Trace back to event
    };
  };
}

// Runtime computed entity (never stored)
interface RuntimeEntity {
  // Merged data from compendium + overrides
  ...CompendiumEntry.data,
  
  // Runtime metadata
  instanceId: string;
  lastModified: number;
  version: number;
}
```

### Storage Optimization

```typescript
// Instead of storing full actor state:
{
  _id: "actor123",
  name: "Goblin Warrior",
  hp: 7,
  maxHp: 15,
  ac: 15,
  str: 8,
  dex: 14,
  // ... 200+ fields = ~2KB per actor
}

// Store only differences:
{
  compendiumRef: "dnd5e:monsters:goblin",
  instanceId: "encounter1_goblin1", 
  overrides: {
    "attributes.hp.value": { value: 7, timestamp: 1704067200, userId: "player1" },
    "position": { value: {x: 100, y: 150}, timestamp: 1704067210, userId: "gm" }
  }
  // ~200 bytes per actor with typical changes
}
```

**Storage savings**: 90%+ reduction in state storage size

## Performance Considerations

### Event Log Management
```mermaid
graph TD
    A[New Event] --> B{Event Count > 1000?}
    B -->|No| C[Add to Log]
    B -->|Yes| D[Create Snapshot]
    D --> E[Compact Old Events]
    E --> F[Update Log]
    C --> G[Broadcast Event]
    F --> G
```

### Optimization Strategies

1. **Event Compaction**
   ```typescript
   // Before compaction: 100 HP change events
   const events = [
     { type: "hp_change", hp: 14 },
     { type: "hp_change", hp: 13 },
     { type: "hp_change", hp: 12 },
     // ... 97 more events
     { type: "hp_change", hp: 7 }
   ];
   
   // After compaction: single net effect
   const compacted = [
     { type: "hp_change", hp: 7, originalEvents: 100 }
   ];
   ```

2. **State Snapshots**
   ```typescript
   interface StateSnapshot {
     sequence: number;           // Event sequence at snapshot
     timestamp: number;
     entities: Map<string, RuntimeEntity>;
     checksum: string;
   }
   
   // Client recovery: snapshot + events since snapshot
   const currentState = applyEvents(snapshot, eventsSince(snapshot.sequence));
   ```

3. **Lazy Loading**
   - Load only active encounter entities
   - Stream events as needed
   - Cache computed states with TTL

## Risk Assessment

### Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Event Log Growth** | High | Medium | Compaction + snapshots |
| **Client Sync Complexity** | Medium | High | Extensive testing, fallback mechanisms |
| **Performance Degradation** | Medium | Medium | Benchmarking, optimization phase |
| **Data Loss During Migration** | Low | High | Dual-write, extensive backups |

### Business Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Extended Development Time** | Medium | Medium | Phased rollout, MVP approach |
| **User Disruption** | Low | High | Backward compatibility, gradual migration |
| **Plugin Compatibility** | Medium | Medium | Plugin developer tools, migration guide |

### Migration Safety

```mermaid
graph TD
    A[Current MongoDB] --> B[Dual Write Phase]
    B --> C[Event Store]
    B --> D[Validation Phase]
    D --> E{Data Consistent?}
    E -->|Yes| F[Switch to Event Store]
    E -->|No| G[Fix Issues & Retry]
    G --> D
    F --> H[Deprecate MongoDB]
```

## Next Steps

1. **Architecture Decision**
   - Review options with team
   - Choose primary approach (recommend Option 1)
   - Define success criteria

2. **Proof of Concept**
   - Build minimal event store
   - Implement basic attack flow
   - Test with 2-3 clients

3. **Technical Design**
   - Detailed API specifications
   - Database schema design  
   - Plugin integration guidelines

4. **Development Planning**
   - Resource allocation
   - Timeline refinement
   - Risk mitigation plans

---

*This document serves as the foundation for transforming Dungeon Lab into a truly plugin-agnostic, scalable VTT platform while maintaining the game rule integrity that players expect.*