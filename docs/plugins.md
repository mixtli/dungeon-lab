# DungeonLab Plugins Guide

This document provides instructions and best practices for creating plugins for the DungeonLab platform. Plugins allow you to extend the functionality of DungeonLab with new game systems, themes, tools, and more.

## Overview

Plugins in DungeonLab follow a modular architecture with three main components:

1. **Server Plugin**: Backend functionality implemented in Node.js
2. **Web Plugin**: Frontend functionality implemented in the Vue framework
3. **Shared Code**: Common types, validation, and utilities used by both server and web components

## Plugin Structure

A typical plugin follows this directory structure:

```
plugins/your-plugin-name/
├── data/              # Game data, references, templates
├── manifest.json      # Plugin metadata and configuration
├── package.json       # Dependencies and exports
├── tsconfig.json      # TypeScript configuration
├── src/
│   ├── server/        # Server-side implementation
│   │   ├── index.mts  # Main server plugin entry point
│   │   └── routes/    # API endpoints
│   ├── web/           # Web client implementation
│   │   ├── index.mts  # Main web plugin entry point
│   │   ├── ui/        # UI components
│   │   └── helpers/   # Web-specific helper functions
│   ├── shared/        # Shared code between server and web
│   │   ├── types/     # TypeScript interfaces and types
│   │   ├── data/      # Shared data structures
│   │   └── validation.mts # Common validation logic
│   └── types/         # Additional type definitions
└── tests/             # Plugin tests
```

## Getting Started

### 1. Create the Basic Plugin Structure

Start by creating a new plugin package with the following basic files:

1. **manifest.json** - Contains metadata about your plugin:

```json
{
  "id": "your-plugin-id",
  "name": "Your Plugin Name",
  "version": "0.1.0",
  "description": "Description of your plugin",
  "author": "Your Name",
  "website": "https://your-website.com",
  "type": "gameSystem",  // Possible types: gameSystem, theme, tool, etc.
  "enabled": true
}
```

2. **package.json** - Defines dependencies and export paths:

```json
{
  "name": "@dungeon-lab/plugin-your-plugin-id",
  "version": "0.1.0",
  "description": "Description of your plugin",
  "author": "Your Name",
  "license": "MIT",
  "type": "module",
  "main": "dist/index.mjs",
  "types": "dist/index.d.mts",
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
    },
    "./package.json": "./package.json"
  },
  "scripts": {
    "build": "tsc -b --force",
    "clean": "rimraf dist",
    "test": "vitest run"
  },
  "dependencies": {
    "@dungeon-lab/server": "file:../../server",
    "@dungeon-lab/shared": "file:../../shared"
  },
  "devDependencies": {
    "@types/node": "^22.13.11",
    "typescript": "^5.8.2",
    "vitest": "^1.6.1"
  }
}
```

3. **tsconfig.json** - TypeScript configuration:

```json
{
  "extends": "../../../tsconfig.json",
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "./dist",
    "rootDir": "./src",
    "allowJs": true,
    "composite": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "noUnusedLocals": true,
    "paths": {
      "@dungeon-lab/shared": ["../../shared/src"],
      "@dungeon-lab/shared/*": ["../../shared/src/*"],
      "@dungeon-lab/server": ["../../server/src"],
      "@dungeon-lab/server/*": ["../../server/src/*"]
    }
  },
  "include": [
    "src/**/*.d.ts",
    "src/**/*.mts",
    "src/**/*.ts",
    "src/**/*.js",
    "src/**/*.mjs",
    "src/**/*.hbs"
  ],
  "references": [
    { "path": "../../shared" }
  ],
  "ts-node": {
    "esm": true
  }
}
```

### 2. Create the Server Plugin

Create a server plugin class in `src/server/index.mts`:

```typescript
import { IGameSystemPlugin } from '@dungeon-lab/shared/index.mjs';
import { ServerPlugin } from '@dungeon-lab/shared/base/server.mjs';
import { validateActorData, validateItemData, validateVTTDocumentData } from '../shared/validation.mjs';
import config from '../../manifest.json' with { type: 'json' };

export class YourServerPlugin extends ServerPlugin implements IGameSystemPlugin {
  public type = 'gameSystem' as const;

  constructor() {
    super({
      ...config,
      type: 'gameSystem',
      enabled: true
    });
  }

  // Implement validation methods
  validateActorData = validateActorData;
  validateItemData = validateItemData;
  validateVTTDocumentData = validateVTTDocumentData;
}

// Export an instance of the plugin
export default new YourServerPlugin();
```

### 3. Create the Web Plugin

Create a web plugin class in `src/web/index.mts`:

```typescript
import { IGameSystemPluginWeb, IPluginAPI } from '@dungeon-lab/shared/types/plugin.mjs';
import { WebPlugin } from '@dungeon-lab/shared/base/web.mjs';
import { validateActorData, validateItemData, validateVTTDocumentData } from '../shared/validation.mjs';
import manifest from '../../manifest.json' with { type: 'json' };

/**
 * Your Web Plugin
 */
class YourWebPlugin extends WebPlugin implements IGameSystemPluginWeb {
  public type = 'gameSystem' as const;

  constructor(private readonly api: IPluginAPI) {
    super({
      ...manifest,
      type: 'gameSystem',
      enabled: true
    });
    
    this.initializePlugin();
  }

  /**
   * Initialize the plugin
   */
  private async initializePlugin(): Promise<void> {
    try {
      // Register components
      this.registerComponents();
      
      console.log('Your Plugin initialized');
    } catch (error) {
      console.error('Failed to initialize Your Plugin:', error);
    }
  }

  /**
   * Register all available components
   */
  private registerComponents(): void {
    // Register your UI components here
    // this.registerComponent(new YourComponent(this.api));
  }

  // Use validation from shared code
  validateActorData = validateActorData;
  validateItemData = validateItemData;
  validateVTTDocumentData = validateVTTDocumentData;
}

// Export the plugin class
export default YourWebPlugin;
```

### 4. Create Shared Validation Logic

Create basic validation logic in `src/shared/validation.mts`:

```typescript
import { z } from 'zod';

/**
 * Validate actor data against the schema
 */
export function validateActorData(data: unknown): z.SafeParseReturnType<unknown, unknown> {
  // Implement your validation schema using zod
  const schema = z.object({
    // Define your schema here
  });
  
  return schema.safeParse(data);
}

/**
 * Validate item data against the schema
 */
export function validateItemData(data: unknown): z.SafeParseReturnType<unknown, unknown> {
  // Implement your validation schema using zod
  const schema = z.object({
    // Define your schema here
  });
  
  return schema.safeParse(data);
}

/**
 * Validate VTT document data against the schema
 */
export function validateVTTDocumentData(documentType: string, data: unknown): z.SafeParseReturnType<unknown, unknown> {
  // Implement validation based on document type
  switch (documentType) {
    case 'character':
      return validateActorData(data);
    case 'item':
      return validateItemData(data);
    default:
      // Return success for unknown document types
      return {
        success: true,
        data
      } as z.SafeParseReturnType<unknown, unknown>;
  }
}
```

## UI Components

UI components should be placed in the `src/web/ui/` directory. Each component should:

1. Extend the `PluginComponent` base class
2. Implement the necessary lifecycle methods
3. Use Handlebars templates for rendering

Here's a basic example:

```typescript
import { PluginComponent } from '@dungeon-lab/shared/base/plugin-component.mjs';
import { IPluginAPI } from '@dungeon-lab/shared/types/plugin-api.mjs';

// Import the template and styles
import template from './template.hbs';
import styles from './styles.css?raw';

export class YourComponent extends PluginComponent {
  constructor(api: IPluginAPI) {
    super('componentName', 'Component Display Name', api);
  }

  protected getTemplate(): string {
    return template;
  }

  protected getStyles(): string {
    return styles;
  }

  protected setupTemplateHandlers(): void {
    // Set up event handlers for your template
  }
}

export default YourComponent;
```

### Handlebars Templates

Create a template file `src/web/ui/your-component/template.hbs`:

```handlebars
<div class="your-component">
  <h2>{{title}}</h2>
  <div class="content">
    {{#if items.length}}
      <ul>
        {{#each items}}
          <li>{{this.name}}</li>
        {{/each}}
      </ul>
    {{else}}
      <p>No items available</p>
    {{/if}}
  </div>
</div>
```

### Component Styles

Create a CSS file `src/web/ui/your-component/styles.css`:

```css
.your-component {
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
  padding: 1rem;
}

.your-component h2 {
  color: #333;
  font-size: 1.5rem;
  margin-bottom: 1rem;
}

.your-component .content {
  background: #f5f5f5;
  padding: 1rem;
  border-radius: 4px;
}
```

## API Routes (Server Plugin)

To add API endpoints, create route handlers in the `src/server/routes/` directory:

```typescript
import { Router } from 'express';
import { authenticate } from '@dungeon-lab/server/middleware/auth.mjs';

export const yourRouter = Router();

// Protected route
yourRouter.get('/your-endpoint', authenticate, (req, res) => {
  // Handle the request
  res.json({ success: true, data: 'Your data' });
});

// Public route
yourRouter.get('/public-endpoint', (req, res) => {
  // Handle the request
  res.json({ success: true, data: 'Public data' });
});
```

Register routes in your server plugin:

```typescript
// In src/server/index.mts
import { yourRouter } from './routes/your-routes.mjs';

export class YourServerPlugin extends ServerPlugin implements IGameSystemPlugin {
  // ...existing code...
  
  constructor() {
    super({
      ...config,
      type: 'gameSystem',
      enabled: true
    });
    
    // Register routes
    this.registerRoutes('/your-plugin', yourRouter);
  }
}
```

## Data Management

For game system plugins, you'll likely need to manage game data. Create a document cache in `src/web/document-cache.mts`:

```typescript
import { IPluginAPI } from '@dungeon-lab/shared/types/plugin-api.mjs';

// Document cache
const documentCache: Record<string, Record<string, any>> = {
  classes: {},
  items: {},
  // Add more document types as needed
};

// API reference
let pluginAPI: IPluginAPI;

/**
 * Initialize the document cache with the plugin API
 */
export function initializeCache(api: IPluginAPI): void {
  pluginAPI = api;
}

/**
 * Get a document by its type and ID
 */
export function getDocumentById(type: string, id: string): any {
  if (!documentCache[type]) return null;
  return documentCache[type][id] || null;
}

/**
 * Preload all documents into the cache
 */
export async function preloadAllDocuments(): Promise<void> {
  try {
    // Load classes
    const classes = await pluginAPI.searchDocuments({ type: 'class' });
    classes.forEach(cls => {
      documentCache.classes[cls.id] = cls;
    });
    
    // Load other document types
    // ...
  } catch (error) {
    console.error('Error preloading documents:', error);
  }
}
```

## Testing Your Plugin

Create tests in the `tests/` directory using Vitest:

```typescript
import { describe, it, expect } from 'vitest';
import { validateActorData } from '../src/shared/validation.mjs';

describe('Validation', () => {
  it('should validate correct actor data', () => {
    const result = validateActorData({
      // Test data
    });
    expect(result.success).toBe(true);
  });
  
  it('should reject invalid actor data', () => {
    const result = validateActorData({
      // Invalid test data
    });
    expect(result.success).toBe(false);
  });
});
```

## Building and Deploying

To build your plugin:

1. Run `npm run build` in your plugin directory
2. The compiled files will be available in the `dist/` directory

To deploy your plugin:

1. Package your plugin into an installable format (ZIP or NPM package)
2. Publish it to the DungeonLab plugin repository or distribute it to users

## Best Practices

1. **Modular Design**: Keep your plugin modular with clear separation between server, web, and shared code.
2. **Type Safety**: Use TypeScript interfaces and types for all data structures.
3. **Validation**: Implement thorough validation for all user inputs.
4. **Error Handling**: Add proper error handling and logging throughout your plugin.
5. **Documentation**: Document your code and provide usage instructions.
6. **Testing**: Write tests for critical functionality.
7. **Performance**: Optimize for performance, especially for web components.
8. **Accessibility**: Ensure your UI components are accessible.

## Reference Implementation

For a complete reference implementation, review the DnD 5e 2024 plugin in the codebase.

---

This guide provides the basic structure and approach for creating plugins. For specific questions or advanced features, refer to the API documentation or contact the DungeonLab team.
