# DungeonLab Virtual Table Top


## Overview
DungeonLab is a Virtual Table Top (VTT) for role playing games.  It will eventually have the following broad features:

* Character Creation
* Editable Character Sheets with dice rolls
* Campaign management
* Encounter management (battles on a map grid)
* Possibly a map builder

## Packages
* Server:  
      Express on nodejs. Serves a REST json API and websocket API.

* Web Client:  
Vue 3 application.

* Shared:  
Code shared by both the client server.  Mainly types, some abstract base classes, and some helper functions.

* Plugins:   
Game systems and other features can be implemented in plugins which can have both a client and server component.  Each plugin has three subfolders for web, server, and shared.

### Dependencies
We want to maintain careful control of which way build time dependencies go.  The client and server code should never depend on each other directly.  All code may depend on code in the shared package, however code in plugin's shared folder can only be depended on by code in that plugin.


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






 


