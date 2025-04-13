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

For instructions on creating a plugin, see: `docs/plugins.md`

### Dependencies

We want to maintain careful control of which way build time dependencies go. The client and server code should never depend on each other directly. All code may depend on code in the shared package, however code in plugin's shared folder can only be depended on by code in that plugin.

#### Allowed Build Time Dependencies

web -> shared
server -> shared
plugin/web -> shared
plugin/server -> shared
plugin/web -> plugin/shared
plugin/server -> plugin/shared
plugin/shared -> shared

#### Allowed Run Time Dependencies

At run time, the web and server will load plugins dynamically, but only depend upon an interface defined in the shared package.

## License

MIT
