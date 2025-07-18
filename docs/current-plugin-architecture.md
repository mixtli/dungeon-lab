# Current Plugin Architecture

## Executive Summary

### Vision
The current Dungeon Lab plugin architecture provides a structured, three-tier system for extending the VTT platform with game-specific functionality. This architecture separates concerns between web UI, server logic, and shared components while maintaining type safety and validation throughout.

### Key Objectives
- **Separation of Concerns**: Clear boundaries between web, server, and shared code
- **Type Safety**: Full TypeScript integration with Zod schema validation
- **Component Architecture**: Handlebars-based templating with modular components
- **Data Validation**: Comprehensive validation at plugin and document levels
- **Build Integration**: Seamless integration with the existing Vite/npm workspace build system

### Current Approach Benefits
- **Familiar Development**: Uses standard web technologies (TypeScript, Handlebars, CSS)
- **Strong Typing**: Full TypeScript support throughout the plugin lifecycle
- **Validated Data**: Zod schemas ensure data integrity at all levels
- **Modular Design**: Clear component boundaries enable easy maintenance
- **Build System Integration**: Works seamlessly with existing monorepo tooling

## Technical Architecture

### Plugin Structure

#### Three-Tier Directory Layout
```
packages/plugins/dnd-5e-2024/
├── manifest.json              # Plugin metadata
├── package.json              # Standard npm package configuration
├── src/
│   ├── shared/               # Common types and validation
│   │   ├── types/            # TypeScript type definitions
│   │   │   ├── index.mts     # Type exports
│   │   │   ├── character.mts # Character data types
│   │   │   ├── item.mts      # Item data types
│   │   │   └── actor.mts     # Actor data types
│   │   ├── data/             # Static game data
│   │   └── validation.mts    # Validation functions
│   ├── server/               # Server-side implementation
│   │   ├── index.mts         # Server plugin entry point
│   │   └── routes/           # Plugin-specific API routes
│   └── web/                  # Client-side implementation
│       ├── index.mts         # Web plugin entry point
│       ├── document-cache.mts # Document caching service
│       ├── helpers/          # Handlebars helpers
│       └── ui/               # UI components
│           ├── characterCreation/
│           │   ├── index.mts      # Component implementation
│           │   ├── template.hbs   # Handlebars template
│           │   ├── styles.css     # Component styles
│           │   └── formSchema.mts # Form validation schema
│           └── characterSheet/
│               ├── index.mts      # Component implementation
│               ├── template.hbs   # Handlebars template
│               └── styles.css     # Component styles
├── data/                     # Game system data files
│   ├── class/               # Character classes
│   ├── spells.json         # Spell definitions
│   ├── items.json          # Item definitions
│   └── backgrounds.json    # Background definitions
├── dist/                    # Built output
└── tests/                   # Plugin tests
```

#### Simple Manifest Format
```json
{
  "id": "dnd-5e-2024",
  "name": "D&D 5e 2024 Edition",
  "version": "0.1.0",
  "description": "Implementation of the Dungeons & Dragons 5e 2024 Edition game system",
  "author": "Dungeon Lab Team",
  "website": "https://example.com/dnd5e2024",
  "type": "gameSystem",
  "enabled": true
}
```

### Plugin Lifecycle and Registration

#### Base Plugin Classes
```typescript
// Base plugin interface
export interface IPlugin {
  config: IPluginConfiguration;
  type: 'gameSystem' | 'extension' | 'theme' | undefined;
  
  // Lifecycle hooks
  onLoad(): Promise<void>;
  onUnload(): Promise<void>; 
  onRegister(): Promise<void>;
}

// Base implementation with schema management
export abstract class BasePlugin implements IPlugin {
  protected schemas: IPluginSchemas = {};
  
  async validateData(documentType: string, data: unknown): Promise<boolean> {
    const schema = this.getSchema(documentType);
    // Validation implementation using Zod
  }
}
```

#### Server Plugin Implementation
```typescript
// Server-side plugin base class
export class ServerPlugin extends BasePlugin implements IServerPlugin {
  public router: Router;
  
  constructor(config: IPluginConfiguration) {
    super(config);
    this.router = Router();
    
    // Auto-generated info endpoint
    this.router.get('/info', (_, res) => {
      res.json({
        id: this.config.id,
        name: this.config.name,
        // ... other metadata
      });
    });
  }
}

// D&D 5e server plugin implementation
export class DnD5e2024ServerPlugin extends ServerPlugin implements IGameSystemPlugin {
  public type = 'gameSystem' as const;
  
  // Game system validation methods
  validateActorData = validateActorData;
  validateItemData = validateItemData;
  validateVTTDocumentData = validateVTTDocumentData;
}
```

#### Web Plugin Implementation
```typescript
// Web-side plugin base class
export class WebPlugin extends BasePlugin implements IWebPlugin {
  private readonly components = new Map<string, IPluginComponent>();
  
  protected registerComponent(component: IPluginComponent): void {
    this.components.set(component.id, component);
  }
  
  loadComponent(componentId: string): IPluginComponent | undefined {
    return this.components.get(componentId);
  }
}

// D&D 5e web plugin implementation
class DnD5e2024WebPlugin extends WebPlugin implements IGameSystemPluginWeb {
  public type = 'gameSystem' as const;
  
  private async initializePlugin(): Promise<void> {
    // Initialize document cache
    initializeCache(this.api);
    
    // Register components
    this.registerComponents();
    
    // Preload documents
    this.preloadDocuments();
  }
  
  private registerComponents(): void {
    this.registerComponent(new CharacterCreationComponent(this.api));
    this.registerComponent(new CharacterSheetComponent(this.api));
  }
}
```

#### Plugin Registry and Loading
```typescript
// Server-side plugin registry
class PluginRegistryService {
  private plugins: Map<string, IGameSystemPluginServer> = new Map();
  
  async initialize(): Promise<void> {
    // Scan plugins directory
    const entries = await readdir(PLUGINS_DIR);
    const pluginDirs = entries.filter(entry => !IGNORED_DIRS.includes(entry));
    
    // Load each plugin
    for (const dir of pluginDirs) {
      const pluginPath = join(PLUGINS_DIR, dir, 'dist/server/index.mjs');
      const plugin = (await import(pluginPath)).default;
      
      // Initialize plugin lifecycle
      await plugin.onLoad?.();
      await plugin.onRegister?.();
      
      // Store in registry
      this.plugins.set(plugin.config.id, plugin);
    }
  }
}
```

### Component Architecture

#### Handlebars-Based UI Components
```typescript
// Base component class
export abstract class PluginComponent implements IPluginComponent {
  protected handlebars: typeof Handlebars;
  protected container?: HTMLElement;
  
  constructor(
    public readonly id: string,
    public readonly name: string,
    protected api: IPluginAPI
  ) {
    this.handlebars = Handlebars.create();
  }
  
  // Lifecycle methods
  async onMount(container: HTMLElement): Promise<void> {
    this.container = container;
    this.injectStyles();
    await this.render();
  }
  
  async render(data?: Record<string, unknown>): Promise<void> {
    if (!this.container) return;
    
    const template = this.handlebars.compile(this.getTemplate());
    this.container.innerHTML = template(data || {});
    this.afterRender();
  }
  
  // Abstract methods for implementation
  protected abstract getTemplate(): string;
  protected abstract getStyles(): string;
  protected abstract registerHelpers(): void;
}
```

#### Character Creation Component Implementation
```typescript
export class CharacterCreationComponent extends PluginComponent {
  private state: CharacterCreationState = {
    formData: {},
    currentPage: 'class-page',
    validationErrors: {},
    isValid: false,
    // Document references
    classDocument: null,
    speciesDocument: null,
    backgroundDocument: null
  };
  
  protected getTemplate(): string {
    return template; // Imported from template.hbs?raw
  }
  
  protected getStyles(): string {
    return styles; // Imported from styles.css?raw
  }
  
  protected registerHelpers(): void {
    // Register standard Handlebars helpers
    registerHelpers(this.handlebars);
    
    // Register document helpers for data access
    registerDocumentHelpers(this.handlebars);
    
    // Custom helpers for component state
    this.handlebars.registerHelper('getClassDocument', () => {
      return this.state.classDocument;
    });
  }
  
  // Form validation using Zod schemas
  validateForm(form: HTMLFormElement): z.SafeParseReturnType<unknown, unknown> {
    return characterCreationFormSchema.safeParse(this.serializeForm(form));
  }
  
  // Data transformation for character creation
  translateFormData(formData: CharacterCreationFormData): ICharacterData {
    // Complex transformation logic to convert form data
    // to the full character schema format
  }
}
```

### Security and Validation Architecture

#### Multi-Layer Validation System

**1. TypeScript Type Safety**
```typescript
// Discriminated unions for type safety
export type IActorData = ICharacter | IMonster | INPC;
export type IItemData = IWeapon | IArmor | ITool | IGear | IConsumable;

// Type-safe document access
export const actorTypes = {
  character: characterDataSchema,
  monster: monsterSchema,
  npc: npcSchema
} as const;
```

**2. Zod Schema Validation**
```typescript
// Character data schema
export const characterDataSchema = z.object({
  name: z.string().min(1),
  species: z.string(),
  background: z.string(),
  classes: z.array(characterClassSchema),
  alignment: z.string(),
  abilities: abilitiesSchema,
  // ... additional fields
});

// Validation functions with error handling
export function validateActorData(
  actorType: string,
  data: unknown
): z.SafeParseReturnType<unknown, unknown> {
  const schema = actorTypes[actorType as keyof typeof actorTypes];
  
  if (schema) {
    return schema.safeParse(data);
  } else {
    return {
      success: false,
      error: new z.ZodError([{
        code: z.ZodIssueCode.custom,
        path: [],
        message: `Unknown actor type: ${actorType}`
      }])
    };
  }
}
```

**3. Form Validation**
```typescript
// Form-specific schemas
export const characterCreationFormSchema = z.object({
  name: z.string().optional(),
  class: z.object({
    id: z.string().min(1, 'Class selection is required'),
    name: z.string()
  }),
  origin: z.object({
    species: z.object({
      id: z.string().min(1, 'Species selection is required'),
      name: z.string()
    }),
    background: z.object({
      id: z.string().min(1, 'Background selection is required'),
      name: z.string()
    })
  }),
  abilities: abilitiesFormSchema,
  details: characterDetailsSchema
});
```

#### Trust Model
- **Developer Trust**: Code is developed in-house and trusted
- **Type Safety**: TypeScript catches errors at compile time
- **Runtime Validation**: Zod schemas validate data at runtime
- **Form Validation**: User input is validated before processing
- **No Code Execution**: Templates use Handlebars (safe templating)

### Build and Integration

#### NPM Workspace Integration
```json
// Plugin package.json
{
  "name": "@dungeon-lab/plugin-dnd-5e-2024",
  "type": "module",
  "main": "dist/index.mjs",
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "types": "./dist/index.d.mts"
    },
    "./server": {
      "import": "./dist/server/index.mjs",
      "types": "./dist/server/index.d.mts"
    },
    "./web": {
      "import": "./dist/web/index.mjs",
      "types": "./dist/web/index.d.mts"
    }
  },
  "scripts": {
    "build": "tsc -b --force",
    "check": "tsc --noEmit",
    "lint": "eslint src",
    "test": "vitest run"
  }
}
```

#### Asset Handling with Vite
```typescript
// Assets imported as strings with Vite
import template from './template.hbs?raw';
import styles from './styles.css?raw';

// Type definitions for asset imports
declare module '*.hbs?raw' {
  const content: string;
  export default content;
}

declare module '*.css?raw' {
  const content: string;
  export default content;
}
```

#### Development Workflow
```bash
# Build all plugins
npm run plugins:build

# Build and watch for development
npm run dev  # Starts both web and server with plugin building

# Type checking
npm run check

# Linting
npm run lint
```

### Document Cache and Data Management

#### Document Caching System
```typescript
// Document cache for efficient data access
export class DocumentCache {
  private cache = new Map<string, Map<string, unknown>>();
  private initialized = false;
  
  async preloadAllDocuments(): Promise<void> {
    const documentTypes = ['class', 'species', 'background', 'spell', 'item'];
    
    for (const type of documentTypes) {
      await this.loadDocumentsOfType(type);
    }
    
    this.initialized = true;
  }
  
  getDocumentById(type: string, id: string): unknown | undefined {
    return this.cache.get(type)?.get(id);
  }
}

// Global cache functions
export function getClass(classId: string): ICharacterClassDocument | undefined {
  return cache.getDocumentById('class', classId) as ICharacterClassDocument;
}

export function getDocumentById(type: string, id: string): unknown | undefined {
  return cache.getDocumentById(type, id);
}
```

#### Handlebars Integration
```typescript
// Document helpers for templates
export function registerDocumentHelpers(handlebars: typeof Handlebars): void {
  // Get documents by type
  handlebars.registerHelper('getClasses', () => {
    return cache.getDocumentsOfType('class');
  });
  
  handlebars.registerHelper('getSpecies', () => {
    return cache.getDocumentsOfType('species');
  });
  
  // Conditional helpers
  handlebars.registerHelper('ifEquals', function(arg1, arg2, options) {
    return (arg1 == arg2) ? options.fn(this) : options.inverse(this);
  });
}
```

## Current Architecture Strengths

### Developer Experience
- **Familiar Technologies**: Standard web development stack
- **Full TypeScript Support**: Complete type safety throughout
- **Hot Reload**: Vite development server with automatic rebuilding
- **Modular Structure**: Clear separation of concerns
- **Standard Tooling**: Uses npm, TypeScript, ESLint, Vitest

### Type Safety and Validation
- **Compile-Time Safety**: TypeScript catches errors early
- **Runtime Validation**: Zod schemas ensure data integrity
- **Discriminated Unions**: Type-safe handling of different data types
- **Form Validation**: Comprehensive validation of user input

### Component Architecture
- **Handlebars Templates**: Safe, familiar templating system
- **CSS Modules**: Scoped styles per component
- **Event Handling**: Standard DOM event management
- **State Management**: Simple state objects with session storage

### Build System Integration
- **Monorepo Friendly**: Works seamlessly with npm workspaces
- **Standard Build Tools**: Uses TypeScript compiler and Vite
- **Asset Bundling**: Handles templates, styles, and scripts efficiently
- **Development Workflow**: Integrated with existing dev processes

## Current Architecture Limitations

### Complexity and Abstractions
- **Three-Tier Structure**: Requires understanding multiple layers
- **Component Inheritance**: Deep inheritance hierarchy for components
- **Handlebars Complexity**: Templates can become complex for interactive UIs
- **State Management**: Manual state synchronization between layers

### Development Velocity
- **Build Step Required**: Changes require TypeScript compilation
- **Template Limitations**: Handlebars restricts dynamic behavior
- **Event Handling**: Manual DOM event management is verbose
- **State Synchronization**: Complex logic to keep form and component state in sync

### Flexibility Constraints
- **Template-Based UI**: Limited to Handlebars templating capabilities
- **Component Structure**: Rigid component base class requirements
- **Data Flow**: Complex data transformation between form and character schemas
- **Custom Mechanics**: Difficult to implement unique game mechanics

### Maintenance Overhead
- **Multiple Build Outputs**: Separate builds for web/server/shared
- **Type Definitions**: Extensive type maintenance required
- **Schema Duplication**: Form schemas often duplicate data schemas
- **Event Handler Complexity**: Large amounts of manual event handling code

## Comparison with Proposed Architectures

### vs. In-House Plugin Architecture

**Advantages of Current System:**
- **Proven Stability**: Currently working and deployed
- **Type Safety**: Full TypeScript integration throughout
- **Separation of Concerns**: Clear boundaries between web/server/shared
- **Validation**: Comprehensive Zod schema validation

**Disadvantages vs. In-House:**
- **Development Speed**: Slower iteration due to build requirements
- **Code Complexity**: More abstraction layers to understand
- **Template Limitations**: Handlebars restricts dynamic UI capabilities
- **Manual Event Handling**: Verbose DOM manipulation code

### vs. Marketplace Architecture

**Advantages of Current System:**
- **No Security Overhead**: Direct code execution without sandboxing
- **Full Framework Access**: Can use any TypeScript/web features
- **Simple Deployment**: No marketplace or review process needed
- **Direct Debugging**: Standard development tools work without restrictions

**Disadvantages vs. Marketplace:**
- **No Distribution System**: Cannot easily share plugins
- **Limited Isolation**: No protection against plugin conflicts
- **No Content Review**: No quality control mechanism
- **Developer Ecosystem**: Cannot leverage community contributions

## Migration Considerations

### Potential Migration Paths

**1. Incremental Enhancement**
- Gradually replace Handlebars with Vue components
- Add hot reload capability to component development
- Simplify the component base class hierarchy
- Reduce build complexity while maintaining type safety

**2. Hybrid Approach**
- Keep current architecture for complex components
- Use simplified approach for new, simple components
- Gradually migrate high-maintenance components
- Maintain backward compatibility during transition

**3. Complete Migration**
- Plan comprehensive migration to new architecture
- Maintain feature parity during transition
- Provide migration tools for existing campaigns
- Ensure no data loss during the change

### Risk Assessment

**Low Risk:**
- Maintaining current system works well for existing features
- Proven stability and type safety
- Team familiarity with current patterns

**Medium Risk:**
- Development velocity may continue to be slower than desired
- Template complexity may limit future UI enhancements
- New team members need to learn current patterns

**High Risk:**
- Migration to new architecture could introduce bugs
- Data compatibility issues during transition
- Development time spent on migration vs. new features

## Conclusion

The current plugin architecture provides a solid, type-safe foundation for extending Dungeon Lab with game system functionality. It successfully separates concerns between web, server, and shared code while maintaining comprehensive validation and familiar development patterns.

### Key Architectural Decisions

**Three-Tier Structure**: The separation between web, server, and shared code provides clear boundaries and enables code reuse while maintaining appropriate separation of concerns.

**TypeScript + Zod Integration**: The combination of compile-time type safety and runtime validation provides excellent data integrity and developer experience.

**Handlebars Templating**: While limiting for complex interactions, Handlebars provides a safe, familiar templating system that prevents security issues.

**Component-Based Architecture**: The base component classes provide structure and reusable functionality, though they add complexity for simple use cases.

### Strengths for Dungeon Lab

**Production Ready**: The current system is deployed and working, providing stability for users.

**Type Safety**: Full TypeScript integration prevents many runtime errors and provides excellent developer experience.

**Extensibility**: The plugin system successfully enables game system implementations like D&D 5e.

**Maintainability**: Clear separation of concerns and strong typing make the codebase maintainable.

### Areas for Improvement

**Development Velocity**: The current system requires more boilerplate and build steps than simpler alternatives.

**UI Flexibility**: Handlebars templating limits the ability to create highly interactive or unique game mechanics.

**Component Complexity**: The component base classes add overhead for simple components.

**State Management**: Manual state synchronization between forms and components creates maintenance burden.

The current architecture represents a solid engineering approach that prioritizes type safety, maintainability, and clear separation of concerns. While it may not be the fastest for development velocity, it provides the reliability and structure needed for a production VTT system supporting complex game mechanics.