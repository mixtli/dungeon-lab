# Dungeon Lab Plugin Architecture

## Overview

The Dungeon Lab plugin architecture provides a flexible and extensible system for implementing different Table Top Role Playing Game (TTRPG) systems. The architecture separates core VTT functionality from game-specific rules and components, allowing multiple game systems to coexist within the same platform.

## Architecture Overview

The plugin system consists of several key components:

1. **Plugin Interfaces** - Core contracts that all plugins must implement
2. **Registry Services** - Manage plugin discovery, loading, and component registration
3. **Context Providers** - Supply plugins with access to APIs and services
4. **Component System** - Vue 3 component registration and management
5. **Mechanics System** - Game rule implementations (dice, combat, etc.)
6. **Event System** - Inter-plugin and plugin-to-app communication

## Main Classes and Components

### Core Interfaces (Shared Package)

- **Plugin**: Base interface for all plugins
  - Properties: id, name, version, description, author
  - Methods: onLoad(), onUnload(), registerComponents(), registerMechanics()

- **GameSystemPlugin**: Extends Plugin for game-specific implementations
  - Additional properties: gameSystem, characterTypes, itemTypes

- **PluginContext**: Provides plugins with application access
  - socket: Socket.io event system for all real-time communication
  - store: Key-value storage for plugin state
  - events: Plugin-specific event emission and subscription for framework communication

- **ComponentRegistry**: Manages Vue 3 components
  - register(), get(), getByPlugin(), unregister()

- **MechanicsRegistry**: Manages game mechanics
  - register(), get(), getByPlugin(), unregister()

### Client-Side Classes

- **PluginRegistryService**: Main client-side registry
  - Loads plugins via socket communication
  - Manages plugin lifecycle and context storage
  - Provides plugin access to app and context retrieval

- **ComponentRegistryImpl**: Concrete component registry
- **MechanicsRegistryImpl**: Concrete mechanics registry
- **PluginStoreImpl**: Plugin state management
- **PluginEventSystemImpl**: Event bus implementation

### Server-Side Classes

- **ServerPluginRegistry**: Auto-discovers plugins
  - Scans filesystem for plugins
  - Validates plugin metadata
  - Manages plugin lifecycle and metadata

## Class Diagram

```mermaid
classDiagram
    %% Core Interfaces
    class Plugin {
        <<interface>>
        +id: string
        +name: string
        +version: string
        +description?: string
        +author?: string
        +onLoad(context: PluginContext): Promise~void~
        +onUnload(): Promise~void~
        +registerComponents(registry: ComponentRegistry): void
        +registerMechanics(registry: MechanicsRegistry): void
    }

    class GameSystemPlugin {
        <<interface>>
        +gameSystem: string
        +characterTypes: string[]
        +itemTypes: string[]
    }

    class PluginContext {
        <<interface>>
        +socket: SocketAPI
        +store: PluginStore
        +events: PluginEventSystem
    }

    class SocketAPI {
        <<interface>>
        +emit~T~(event: string, data?: T, callback?: Function): void
        +on~T~(event: string, handler: Function): Function
        +off(event: string, handler?: Function): void
        +emitActor(action: string, data?: any, callback?: Function): void
        +emitItem(action: string, data?: any, callback?: Function): void
        +emitDocument(action: string, data?: any, callback?: Function): void
    }

    class PluginStore {
        <<interface>>
        +get~T~(key: string): T
        +set~T~(key: string, value: T): void
        +subscribe~T~(key: string, callback: Function): Function
    }

    class PluginEventSystem {
        <<interface>>
        +emit~T~(event: string, data?: T): void
        +on~T~(event: string, handler: Function): Function
    }

    class ComponentRegistry {
        <<interface>>
        +register(id: string, component: PluginComponent, metadata?: ComponentMetadata): void
        +get(id: string): PluginComponent
        +getByPlugin(pluginId: string): ComponentEntry[]
        +unregister(id: string): void
        +unregisterByPlugin(pluginId: string): void
    }

    class MechanicsRegistry {
        <<interface>>
        +register(id: string, mechanic: GameMechanic, metadata?: MechanicMetadata): void
        +get(id: string): GameMechanic
        +getByPlugin(pluginId: string): MechanicEntry[]
        +unregister(id: string): void
        +unregisterByPlugin(pluginId: string): void
    }

    %% Client-Side Implementations
    class PluginRegistryService {
        -clientPlugins: Map
        -pluginContexts: Map
        -initialized: boolean
        +initialize(): Promise~void~
        +getPlugins(): GameSystemPlugin[]
        +getGameSystemPlugin(id: string): GameSystemPlugin
        +loadGameSystemPlugin(id: string): Promise~GameSystemPlugin~
        +loadPluginsFromServer(): Promise~void~
        +getPluginContext(pluginId: string): PluginContext
    }

    class ComponentRegistryImpl {
        -components: Map
        +register(id: string, component: PluginComponent, metadata?: ComponentMetadata): void
        +get(id: string): PluginComponent
        +getByPlugin(pluginId: string): ComponentEntry[]
        +unregister(id: string): boolean
        +unregisterByPlugin(pluginId: string): void
        +list(): ComponentEntry[]
    }

    class MechanicsRegistryImpl {
        -mechanics: Map
        +register(id: string, mechanic: GameMechanic, metadata?: MechanicMetadata): void
        +get(id: string): GameMechanic
        +getByPlugin(pluginId: string): MechanicEntry[]
        +unregister(id: string): boolean
        +unregisterByPlugin(pluginId: string): void
        +list(): MechanicEntry[]
    }

    class PluginStoreImpl {
        -store: Map
        +get~T~(key: string): T
        +set~T~(key: string, value: T): void
        +has(key: string): boolean
        +delete(key: string): boolean
        +clear(): void
        +keys(): string[]
        +subscribe~T~(key: string, callback: Function): Function
    }

    class PluginEventSystemImpl {
        -events: EventEmitter
        +emit~T~(event: string, data?: T): void
        +on~T~(event: string, handler: Function): Function
    }

    %% Server-Side Implementation
    class ServerPluginRegistry {
        -plugins: Map
        +discoverPlugins(): Promise~void~
        +loadPluginFromDirectory(path: string): Promise~void~
        +registerPlugin(plugin: Plugin): void
        +getPlugin(id: string): Plugin
        +getAllPlugins(): Plugin[]
        +validateGameSystemId(id: string): boolean
    }

    %% Relationships
    GameSystemPlugin --|> Plugin : extends
    Plugin ..> PluginContext : uses
    Plugin ..> ComponentRegistry : uses
    Plugin ..> MechanicsRegistry : uses
    
    PluginContext *-- SocketAPI : contains
    PluginContext *-- PluginStore : contains
    PluginContext *-- PluginEventSystem : contains
    
    PluginRegistryService --> GameSystemPlugin : manages
    PluginRegistryService ..> ComponentRegistryImpl : creates
    PluginRegistryService ..> MechanicsRegistryImpl : creates
    
    ComponentRegistryImpl ..|> ComponentRegistry : implements
    MechanicsRegistryImpl ..|> MechanicsRegistry : implements
    PluginStoreImpl ..|> PluginStore : implements
    PluginEventSystemImpl ..|> PluginEventSystem : implements
    
    ServerPluginRegistry --> Plugin : manages
```

## Component Diagram

```mermaid
graph TB
    subgraph "Client Side"
        subgraph "Web Package"
            UI[Vue UI Components]
            PRS[PluginRegistryService]
            CR[ComponentRegistry]
            MR[MechanicsRegistry]
            PS[PluginStore]
            PES[PluginEventSystem]
        end
        
        subgraph "Plugin Package"
            DNDP[D&D 5e Plugin]
            PC[Plugin Components]
            PM[Plugin Mechanics]
        end
    end
    
    subgraph "Server Side"
        subgraph "Server Package"
            SS[Socket Server]
            SPR[ServerPluginRegistry]
            SH[Socket Handlers]
        end
        
        subgraph "File System"
            PD[Plugin Directories]
            PJ[package.json files]
        end
    end
    
    subgraph "Shared Package"
        SI[Shared Interfaces]
        ST[Shared Types]
    end
    
    %% Client connections
    UI --> PRS
    PRS --> CR
    PRS --> MR
    PRS --> PS
    PRS --> PES
    
    DNDP --> CR
    DNDP --> MR
    PC --> CR
    PM --> MR
    
    %% Server connections
    SS --> SH
    SH --> SPR
    SPR --> PD
    SPR --> PJ
    
    %% Client-Server connection
    PRS -.->|WebSocket| SS
    
    %% Shared connections
    PRS --> SI
    DNDP --> SI
    SPR --> SI
```

## Sequence Diagrams

### Plugin Discovery and Registration

```mermaid
sequenceDiagram
    participant FS as File System
    participant SPR as ServerPluginRegistry
    participant Socket as Socket Server
    participant PRS as PluginRegistryService
    participant UI as Vue UI
    
    Note over SPR: Server Startup
    SPR->>FS: Scan /packages/plugins directory
    FS-->>SPR: List of plugin directories
    
    loop For each plugin directory
        SPR->>FS: Read package.json
        FS-->>SPR: Plugin metadata
        SPR->>SPR: Validate plugin metadata
        SPR->>SPR: Register plugin
    end
    
    Note over PRS: Client Initialization
    UI->>PRS: initialize()
    PRS->>Socket: emit('plugin:list')
    Socket->>SPR: getAllPlugins()
    SPR-->>Socket: Plugin list
    Socket-->>PRS: 'plugin:list:response' event
    PRS->>PRS: Convert to GameSystemPlugin
    PRS->>PRS: Cache plugins
    PRS-->>UI: Ready
```

### Plugin Loading and Initialization

```mermaid
sequenceDiagram
    participant User
    participant Settings as SettingsView
    participant PRS as PluginRegistryService
    participant Plugin
    participant CR as ComponentRegistry
    participant MR as MechanicsRegistry
    participant Context as PluginContext
    
    User->>Settings: Select game system
    Settings->>PRS: loadGameSystemPlugin(id)
    PRS->>PRS: Check cache
    PRS->>Plugin: Create instance
    
    Note over PRS: Create context
    PRS->>Context: Create with socket, store, events
    
    PRS->>Plugin: onLoad(context)
    Plugin->>Plugin: Initialize internal state
    Plugin->>Context: socket.on('plugin:my-game:*', handler)
    Plugin-->>PRS: Load complete
    
    PRS->>Plugin: registerComponents(registry)
    Plugin->>CR: register(id, component, metadata)
    CR-->>Plugin: Registered
    
    PRS->>Plugin: registerMechanics(registry)
    Plugin->>MR: register(id, mechanic, metadata)
    MR-->>Plugin: Registered
    
    PRS-->>Settings: Plugin loaded
    Settings-->>User: Ready to use
```

### Character Creation Flow

```mermaid
sequenceDiagram
    participant User
    participant CreateView as ActorCreateView
    participant PRS as PluginRegistryService
    participant Plugin
    participant CR as ComponentRegistry
    participant Socket as Socket Connection
    participant CharSheet as CharacterSheet Component
    
    User->>CreateView: Navigate to create character
    CreateView->>PRS: getPlugins()
    PRS-->>CreateView: Available game systems
    CreateView-->>User: Display game system list
    
    User->>CreateView: Select game system
    CreateView->>PRS: getGameSystemPlugin(id)
    PRS-->>CreateView: GameSystemPlugin
    
    CreateView->>CR: get('character-sheet')
    CR-->>CreateView: CharacterSheet component
    CreateView->>CreateView: Render component
    
    User->>CharSheet: Fill character data
    CharSheet->>CharSheet: Validate data
    CharSheet-->>CreateView: Character data
    
    CreateView->>Socket: emit('actor:create', characterData, callback)
    Socket-->>CreateView: 'actor:created' event with new character
    CreateView-->>User: Navigate to character sheet
```

### Dice Rolling Through Mechanics

```mermaid
sequenceDiagram
    participant User
    participant UI as Game UI
    participant MR as MechanicsRegistry
    participant DS as DiceSystem
    participant Socket as Socket Connection
    participant Chat as Chat System
    
    User->>UI: Click roll dice
    UI->>MR: get('dice-system')
    MR-->>UI: DiceSystem mechanic
    
    UI->>DS: roll("2d6+3")
    DS->>DS: Parse expression
    DS->>DS: Generate random numbers
    DS->>DS: Calculate total
    DS-->>UI: DiceResult
    
    UI->>Socket: emit('roll', rollData, callback)
    Socket-->>Chat: 'roll-result' event
    Chat->>Chat: Display roll result
    Chat-->>User: Show in chat
```

### Plugin Event Communication

```mermaid
sequenceDiagram
    participant Plugin1 as D&D Plugin
    participant Socket as Socket Connection
    participant Plugin2 as Combat Tracker
    participant Plugin3 as Character Sheet
    participant UI as Main UI
    
    Note over Plugin1: Character levels up
    Plugin1->>Socket: emit('plugin:character:levelUp', data)
    
    Socket->>Plugin2: 'plugin:character:levelUp' event
    Plugin2->>Plugin2: Update combat stats
    
    Socket->>Plugin3: 'plugin:character:levelUp' event
    Plugin3->>Plugin3: Refresh character display
    
    Socket->>UI: 'plugin:character:levelUp' event
    UI->>UI: Show level up notification
    
    Note over Plugin2: Initiative rolled
    Plugin2->>Socket: emit('plugin:combat:initiativeRolled', data)
    
    Socket->>Plugin1: 'plugin:combat:initiativeRolled' event
    Plugin1->>Plugin1: Apply initiative bonuses
    
    Socket->>UI: 'plugin:combat:initiativeRolled' event
    UI->>UI: Update turn order display
```

## Implementation Examples

### Creating a Plugin

```typescript
// packages/plugins/my-game/src/index.mts
import type { GameSystemPlugin, PluginContext } from '@dungeon-lab/shared/types/plugin.mjs';

export default {
  id: 'my-game-system',
  name: 'My Game System',
  version: '1.0.0',
  gameSystem: 'my-game',
  characterTypes: ['pc', 'npc'],
  itemTypes: ['weapon', 'armor', 'item'],
  
  async onLoad(context: PluginContext) {
    // Initialize plugin
    context.store.set('initialized', true);
    
    // Listen for plugin-specific socket events
    context.socket.on('plugin:my-game:character:update', (data) => {
      console.log('Character updated:', data);
    });
    
    // Listen for general game events
    context.events.on('game:started', () => {
      console.log('Game started!');
    });
  },
  
  async onUnload() {
    // Cleanup
  },
  
  registerComponents(registry) {
    registry.register('my-character-sheet', MyCharacterSheet, {
      pluginId: this.id,
      name: 'My Character Sheet',
      category: 'character-sheet'
    });
  },
  
  registerMechanics(registry) {
    registry.register('my-dice-system', new MyDiceSystem(), {
      pluginId: this.id,
      name: 'My Dice System',
      category: 'dice'
    });
  }
} as GameSystemPlugin;
```

### Plugin Package Structure

Plugins can use either a simple flat structure or organized subdirectories based on complexity:

#### Simple Structure (Recommended for most plugins)
```
packages/plugins/my-game/
├── package.json          # Plugin metadata
├── src/
│   ├── index.mts        # Plugin entry point
│   ├── component.vue    # Main Vue component
│   ├── types.mts        # Plugin-specific types
│   └── mechanics.mts    # Game mechanics
└── dist/                # Built output
```

#### Complex Structure (For large, multi-faceted plugins)
```
packages/plugins/my-game/
├── package.json          # Plugin metadata
├── src/
│   ├── index.mts        # Plugin entry point
│   ├── web/             # Client-side code
│   │   ├── components/  # Vue components
│   │   └── mechanics/   # Client mechanics
│   ├── server/          # Server-side code (if needed)
│   └── shared/          # Shared types/utils
└── dist/                # Built output
```

### Package.json Metadata

```json
{
  "name": "@dungeon-lab/plugin-my-game",
  "version": "1.0.0",
  "dungeonLab": {
    "pluginId": "my-game-system",
    "displayName": "My Game System",
    "gameSystem": "my-game"
  }
}
```

## Plugin Context Usage

The PluginContext provides plugins with controlled access to the application:

1. **Socket Communication**: Real-time bidirectional communication via Socket.io events
2. **State Management**: Plugin-specific reactive store
3. **Event System**: Communication with other plugins and the main app

## Plugin-Framework Communication Patterns

### Window Management Events

Plugins can emit special events to communicate with the framework for window management:

```typescript
// Plugin emits window events
context.events.emit('window:close');              // Request window closure
context.events.emit('window:drag-start', {        // Request drag operation
  startX: event.clientX,
  startY: event.clientY
});
context.events.emit('window:minimize');           // Request minimize/restore
```

### Framework Event Listening

The framework listens for plugin events and handles window management accordingly:

```typescript
// Framework listens for plugin window events
context.events.on('window:close', () => {
  // Close the floating window
  windowStore.closeWindow(windowId);
});

context.events.on('window:drag-start', (data) => {
  // Start drag operation for the window
  startWindowDrag(data.startX, data.startY);
});
```

### Plugin Component Props

Plugin components receive the PluginContext as an optional prop for framework communication:

```typescript
// Plugin component receives context
interface Props {
  character: IActor;
  context?: PluginContext;  // Optional for backwards compatibility
  readonly?: boolean;
}

// Usage in plugin component
const closeSheet = () => {
  if (props.context?.events) {
    props.context.events.emit('window:close');
  }
  // Fallback to regular event emission
  emit('close');
};
```

### Fallback Support

The framework provides fallback UI if plugins don't implement event communication:

```typescript
// Framework shows fallback chrome if no plugin events received
setTimeout(() => {
  const hasPluginContext = pluginRegistry.getPluginContext(pluginId);
  if (!hasPluginContext) {
    showFrameworkChrome.value = true; // Show framework-provided controls
  }
}, 1000);
```

### Socket API Usage Examples

```typescript
// Create an actor
context.socket.emitActor('create', characterData, (response) => {
  if (response.success) {
    console.log('Character created:', response.data);
  }
});

// Listen for actor updates
context.socket.on('actor:updated', (actor) => {
  if (actor.gameSystem === 'my-game') {
    // Update plugin state for this game system
    context.store.set(`character:${actor.id}`, actor);
  }
});

// Update an item
context.socket.emitItem('update', { id: itemId, ...itemData });

// Listen for document changes
context.socket.on('document:changed', (document) => {
  // React to document changes
});

// Plugin-specific events
context.socket.emit('plugin:my-game:custom-action', data);
context.socket.on('plugin:my-game:response', (response) => {
  // Handle plugin-specific response
});
```

## Socket Event Infrastructure

### Current Implementation

The plugin system uses Socket.io for all real-time communication with the following event patterns:

#### Actor Management Events
- `actor:list` - Get filtered list of actors with callback
- `actor:get` - Get single actor by ID with callback  
- `actor:update` - Update actor data with callback
- `actor:delete` - Delete actor with callback
- `actor:created` - Broadcast when actor is created
- `actor:updated` - Broadcast when actor is updated
- `actor:deleted` - Broadcast when actor is deleted

#### Item Management Events
- `item:list` - Get filtered list of items with callback
- `item:get` - Get single item by ID with callback
- `item:create` - Create new item with callback
- `item:update` - Update item data with callback
- `item:delete` - Delete item with callback
- `item:created` - Broadcast when item is created
- `item:updated` - Broadcast when item is updated
- `item:deleted` - Broadcast when item is deleted

#### Authentication and Permissions
- All socket connections require valid session authentication
- Events are filtered by user permissions and game system access
- GMs see all items for their game system, users see only their own

#### TypeScript Integration
- Proper typing for all socket events with Zod schemas
- Callback patterns for request/response communication
- No usage of `any` types - all events are strongly typed

A proper implementation includes:

1. Socket-based PluginContextProvider service with real-time communication
2. Isolated socket event namespaces per plugin
3. Reactive plugin-specific stores updated via socket events
4. Event routing and permission management through socket middleware

## Implementation Lessons Learned

### Real-World Plugin Development

The D&D 5e 2024 plugin implementation revealed several important architectural insights:

#### 1. **Flexible Directory Structure**
- Simple flat structures work well for most plugins
- Complex web/server/shared separation only needed for large, multi-faceted plugins
- Plugin complexity should drive structure choice, not rigid templates

#### 2. **Event-Based UI Framework Integration**
- Plugin events enable clean separation between plugin UI and framework concerns
- Window management through events allows plugins complete control over their appearance
- Fallback mechanisms ensure functionality even without event implementation

#### 3. **Context Storage and Retrieval**
- Framework needs to store and provide access to plugin contexts
- Components need access to plugin context for framework communication
- Optional context props maintain backwards compatibility

#### 4. **Progressive Enhancement Pattern**
- Plugins can work with basic Vue events
- Adding context enables advanced framework integration
- Framework provides fallbacks for missing plugin features

#### 5. **Component Flexibility**
- Plugins benefit from controlling their own UI styling and layout
- Framework should provide window management without constraining plugin design
- Event delegation allows for sophisticated UI interactions

### Architectural Validation

Our implementation successfully validated these core architectural principles:

✅ **Plugin Isolation**: No direct imports between plugin and main app  
✅ **Interface-Based Communication**: All communication through defined contracts  
✅ **Event-Driven Architecture**: UI management through event system  
✅ **Registry Pattern**: Component and mechanics registration works effectively  
✅ **Vue 3 Integration**: Modern reactive patterns with TypeScript support  
✅ **Backwards Compatibility**: Incremental adoption of framework features  

## Future Enhancements

1. **Hot Module Replacement**: Development-time plugin reloading via socket events
2. **Plugin Dependencies**: Allow plugins to depend on others with event-based dependency injection
3. **Permission System**: Control what socket events plugins can emit/listen to
4. **Plugin Marketplace**: Central repository for community plugins with socket-based distribution
5. **Version Management**: Handle plugin version compatibility through event schema versioning
6. **Event Sandboxing**: Isolate plugin socket events for security and performance
7. **Event Middleware**: Plugin-specific event processing and validation
8. **Real-time Plugin Collaboration**: Multi-user plugin interactions via shared socket rooms
9. **Advanced Window Management**: Support for modal dialogs, multi-window plugins, and workspace layouts
10. **Plugin Testing Framework**: Automated testing tools for plugin component and event validation