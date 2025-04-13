# DungeonLab Architecture

## Overview

At a high level, this project is composed of a server running Express in NodeJS, and a web client which is implemented as a SPA using Vue. Additional clients could be built in the future, such as mobile apps.

In addition, the system supports a plugin architecture. Plugins implement the logic and UI for TTRPG game systems or other modular functionality. Each plugin can have two entrypoints, one for the server and one for the web client. A plugin may implement one or both.

## Packages

The system is comprised of several packages in the 'packages' directory. In order to organize the code, we are using npm workspaces. Each package has its own package.json. There is a master package.json in the project root.

The packages are:

- server:  
  Express on nodejs. Serves a REST json API and websocket API.

- web:  
  Vue 3 application.

- shared:  
  Code shared by both the client server. Mainly types, some abstract base classes, and some helper functions.

- plugins/dnd-5e-2024:  
  Game systems and other features can be implemented in plugins which can have both a client and server component. Each plugin has three subfolders for web, server, and shared.

## Plugins

### Overview

Plugins are defined in packages in the packages/plugins folder. Plugins define additional functionality beyond the base DungeonLab app. By itself, DungeonLab doesn't know anything about any particular TTRPG or have any content. TTRPG implementations and other additional functionality is provided by plugins

### Plugin Types

1.  Game Systems  
    Provide an implementation for a TTRPG. This will contain UI components such as character sheets, along with any data types and logic for the TTRPG. The game system plugin may have a server side component in addition to the web component. A server side plugin could be used for example to enforce game rules on the server.
2.  Modules  
    Module plugins are to supply additional generic functionality that is not tied to a game system. Examples could include a pretty dice roller, task automation, or various quality of life plugins
3.  Content Packs  
    These just contain additional content (items, monsters, etc)

### Plugin Structure

Each plugin has a particular directory structure that is similar to the main application.

```
src/
  web/
    index.mts
  server/
    index.mts
  shared/
    types/
```

- Web folder  
  The web folder contains the web portion of the plugin. By convention, the entrypoint is index.mts and it extends the WebPlugin class. Code in this directory should not depend on nodejs. It can depend on the DOM as it will run in the browser.

- Server folder  
  The server folder contains the server portion of the plugin. Code in this directory may depend on nodejs features, but may not depend on the DOM as it runs in node. By convention, index.mts contains a class that extends the ServerPlugin class.

- Shared foldler  
  The shared folder of the plugin contains code that can be shared between the web plugin and the server plugin. Since it needs to work in both contexts, code in this directory cannot depend on the DOM or on nodejs specific features.
  In particular, shared types for the plugin are defined in the shared/types folder.

#### Plugin integration with main app.

The plugins should not directly depend on the web or server package. Plugins may depend on the shared package.

The client and server each load plugins via a plugin registry. They do all communication with the plugin via the interfaces defined by the WebPlugin and ServerPlugin classes respectively. The main web client and server should ONLY call the plugins via those interfaces.

When the client and server load the plugin, they pass the plugin an API. If the plugin needs to initiate an interaction with the web client or server code, it can use this API interface. Plugins should never reference web or server source code directly.

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

### Tech Stack

1. Web Client

- Vue
- VueUse
- Tailwind
- Socket.io

2. Server

- Express
- Mongoose
- Socket.io

3. Plugins  
   Plugins can use any technology so long as they adhere to the Plugin APIs.
4. D&D Plugin
   The D&D Plugin is designed to use vanilla typescript with no framework to work as an example implementation.  
    _ Typescript ES6 modules
   _ Vanilla CSS \* Handlebars for templates
