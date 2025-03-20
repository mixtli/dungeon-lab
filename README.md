# Dungeon Lab

A Virtual Table Top (VTT) system for Table Top Role Playing Games (TTRPGs) with a plugin architecture to support multiple game systems.

## Features

- **Multi-system Support**: Run games in D&D 5e, Pathfinder, or any other system with the appropriate plugin
- **Extensible Plugin Architecture**: Create custom game system plugins with their own data models and UI components
- **Modern Tech Stack**: Built with Vue.js, TypeScript, Express, and MongoDB
- **Real-time Collaboration**: Play with friends in real-time with synchronized game state

## Project Structure

This project uses npm workspaces to organize the codebase:

- `packages/client`: Vue.js frontend application
- `packages/server`: Express backend server
- `packages/shared`: Shared code and types between client and server
- `packages/plugins`: Game system plugins

## Development

### Prerequisites

- Node.js (v18+)
- npm (v8+)
- MongoDB

### Setup

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/dungeon-lab.git
   cd dungeon-lab
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the development servers:
   ```
   npm run dev
   ```

This will start both the client and server in development mode.

### Building for Production

```
npm run build
```

## Plugin Development

Dungeon Lab supports a plugin architecture for different game systems. See the [Plugin Development Guide](docs/plugin-development.md) for more information on creating your own game system plugin.

## Plugin System

Dungeon Lab supports a plugin system that allows extending the application with new game systems, extensions, and themes.

### Plugin Configuration

Plugins are configured using a `config.json` file in the root of each plugin's directory. The file should have the following structure:

```json
{
  "id": "plugin-id",
  "name": "Plugin Name",
  "version": "0.1.0",
  "description": "Plugin description",
  "author": "Plugin Author",
  "website": "https://example.com/plugin",
  "type": "gameSystem",
  "enabled": true
}
```

- `id`: Unique identifier for the plugin
- `name`: Display name of the plugin
- `version`: Semantic version of the plugin
- `description`: Brief description of the plugin
- `author`: Plugin author's name
- `website`: Plugin's website (optional)
- `type`: Plugin type, one of `gameSystem`, `extension`, or `theme`
- `enabled`: Whether the plugin is enabled by default

### Creating a Plugin

To create a new plugin:

1. Create a new directory in the `packages/plugins` directory
2. Create a `config.json` file in the plugin directory
3. Implement the plugin code in the `src` directory
4. Export a default object that implements the appropriate plugin interface

Example structure for a game system plugin:

```
packages/plugins/my-game-system/
├── manifest.json
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts       # Server-side entry point
    ├── server/        # Server-side code
    │   ├── index.mts   # server-side entry point
    │   └── ...
    ├── web/           # Client-side code
    │   ├── index.mts   # Client-side entry point
    │   └── ...
    ├── shared/           # Plugin shared code
    │   ├── index.mts   
    │   └── ...
    └── ...
```

## License

MIT