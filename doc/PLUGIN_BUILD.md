# Plugin Build System

This document describes how the plugin build system works in DungeonLab.

## Overview

The plugin build system uses Vite and import maps to handle plugin loading in both development and production environments. It's designed to:

1. Support TypeScript-based plugins
2. Enable dynamic plugin loading
3. Maintain clean module imports
4. Optimize build output

## Workspace Setup

DungeonLab uses npm workspaces to manage its monorepo structure. The workspace is configured as follows:

```
dungeon-lab/
├── package.json           # Root package.json with workspace configuration
├── packages/
│   ├── server/           # Server package
│   ├── shared/           # Shared package (used by plugins)
│   ├── web/             # Web client package
│   └── plugins/         # Plugin packages
│       └── test-dice-roller/  # Example plugin
```

### Plugin Package Setup

Each plugin should:
1. Be named `@dungeon-lab/plugin-{name}` in its package.json
2. Use `peerDependencies` for shared package dependencies
3. Include necessary build scripts

Example plugin package.json:
```json
{
  "name": "@dungeon-lab/plugin-my-plugin",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "tsc --build",
    "dev": "tsc --build --watch",
    "clean": "rimraf dist tsconfig.tsbuildinfo"
  },
  "peerDependencies": {
    "@dungeon-lab/shared": "^0.1.0"
  },
  "devDependencies": {
    "rimraf": "^5.0.5",
    "typescript": "^5.3.3"
  }
}
```

## Development Mode

In development mode (`npm run dev`):

- Plugins are loaded directly from source
- TypeScript files are compiled on-the-fly
- Import paths are mapped to source files
- Example: `@plugins/test-dice-roller` → `/packages/plugins/test-dice-roller/client/index.mjs`

## Production Mode

In production mode (`npm run build`):

- Plugins are built into separate chunks
- Output is organized by plugin
- Files are placed in `dist/assets/plugins/[plugin-id]/`
- Example: `@plugins/test-dice-roller` → `/assets/plugins/test-dice-roller/index.js`

## Plugin Structure

A typical plugin should have:

```
plugins/my-plugin/
├── package.json          # Plugin package configuration
├── tsconfig.json        # TypeScript configuration
├── config.json          # Plugin metadata and entry points
├── client/              # Client-side code
│   └── index.mts        # Client entry point
└── server/              # Server-side code
    └── index.mts        # Server entry point
```

### config.json Requirements

```json
{
  "id": "my-plugin",
  "name": "My Plugin",
  "version": "1.0.0"
}
```

## Plugin Management Commands

All commands should be run from the project root:

```bash
# Install all dependencies (including plugins)
npm install

# Build all plugins
npm run plugins:build

# Run plugins in development mode
npm run plugins:dev

# Clean plugin build artifacts
npm run plugins:clean

# Test plugin builds
npm run plugins:test

# Clean plugin test artifacts
npm run plugins:test:clean
```

## Import Maps

The system generates import maps that are injected into `index.html`:

```html
<script type="importmap">
{
  "imports": {
    "@plugins/my-plugin": "/assets/plugins/my-plugin/index.js"
  }
}
</script>
```

This allows clean imports in your code:

```typescript
import MyPlugin from '@plugins/my-plugin';
```

## Testing Plugin Builds

The test build process verifies:
1. Proper compilation of TypeScript
2. Generation of import maps
3. Correct output file structure
4. Plugin discovery and loading

## Troubleshooting

Common issues:

1. Missing import maps:
   - Check that plugins have valid manifest.json files
   - Ensure plugin package name follows the `@dungeon-lab/plugins/*` pattern

2. Build failures:
   - Run `npm install` from the project root
   - Ensure all plugin dependencies are listed correctly
   - Check for TypeScript errors in plugin code
   - Verify workspace configuration in root package.json

3. Runtime errors:
   - Verify import paths in plugin code
   - Check browser console for module loading errors
   - Ensure plugins are built before running the application

4. Workspace issues:
   - Always run `npm install` from the project root
   - Use `peerDependencies` for shared package dependencies
   - Follow the `@dungeon-lab/plugin/*` naming convention

## Adding New Plugins

1. Create a new plugin directory in `packages/plugins/`
2. Set up package.json with correct name and dependencies
3. Add manifest.json with required fields
4. Run `npm install` from project root
5. Test with `npm run plugins:test`
6. Build with `npm run plugins:build`
