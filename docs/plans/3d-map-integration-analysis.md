# Analysis: Integrating 3D Maps from DungeonMaps into Dungeon Lab

*Last updated: 2026-03-04*

## Context

The `dungeonmaps` project is a standalone 3D dungeon map editor built with Three.js (via TresJS/Vue). The question is: what would it take to replace Dungeon Lab's current 2D map system with this 3D approach, and what are the implications?

**Update (March 2026):** DungeonMaps now includes fog of war, dynamic lighting, and token POV walking (both 2D and 3D first-person). These were previously identified as the hardest unsolved problems — they are now implemented and ready to port.

## Direct Answers to Your Questions

### Can we render 3D maps in Pixi.js?

**No.** Pixi.js is fundamentally a 2D renderer. It has no concept of 3D geometry, depth buffers, perspective cameras, or model loading. There is no plugin, extension, or shader hack that bridges this. If you want extruded walls, GLB props, and real lighting — you need a 3D renderer like Three.js.

### Would we switch away from Pixi for the encounter viewer?

**Yes, eventually.** You can't display 3D map content in Pixi. The encounter viewer must use Three.js to render 3D maps. During migration, both renderers can coexist (a flag selects which one), but long-term Pixi gets removed entirely.

### Could we use Pixi for 2D mobile + Three.js for 3D desktop?

**You could, but you shouldn't.** Maintaining two completely separate rendering pipelines means every feature (fog of war, dynamic lighting, token interactions, health bars, targeting, drag-and-drop) must be implemented and maintained twice. Bug surface doubles. This is unsustainable for this project's size.

### Mobile strategy?

**Three.js everywhere, with orthographic top-down camera on mobile.** DungeonMaps already has a working orthographic mode that produces a clean 2D-like top-down view. On mobile:
- Lock camera to orthographic top-down (no rotation)
- Disable shadows entirely
- Render at lower resolution (0.75x device pixel ratio)
- Use `powerPreference: 'low-power'`
- One-finger pan, two-finger pinch-to-zoom (same UX as current Pixi viewer)

**Realistic performance:** A mid-range 2023 phone can handle ~200 walls, 50 props, 20 lights (no shadows), 10 tokens at 30+ FPS in orthographic mode. Pre-2020 devices will struggle with complex scenes.

---

## Features Now Available from DungeonMaps

### Fog of War (implemented)

**Approach:** CPU-driven polygon-based ray-casting — not shader-based.

**How it works:**
- Casts rays from a viewpoint toward all wall segment endpoints (3 rays per endpoint: angle ± epsilon + exact angle)
- Finds nearest intersection per ray, builds a visibility polygon
- Walls have independent `blockVision` and `blockLight` properties (full/half/none)
- Portals (open doors, windows) remove their parent wall segment from the blocking list
- Calculates TWO visibility polygons simultaneously:
  - `fullVisible` — blocked by full + half walls (rendered at opacity 1.0)
  - `halfVisible` — blocked by only full walls (rendered at opacity 0.35)
- Rendered as a `FogOfWarOverlay.vue` component layered above the scene (z=0.02)

**Key files:**
- `dungeonmaps/packages/client/src/utils/visibility.ts` — core ray-casting engine
- `dungeonmaps/packages/client/src/components/viewport/FogOfWarOverlay.vue` — rendering
- `dungeonmaps/packages/client/src/utils/polygonOps.ts` — polygon union/intersection

**Limitations:**
- Performance is O(rays × wall_segments) — could be slow with hundreds of walls
- 2D projection only (ignores wall height/elevation for blocking)
- Uses circular boundary (64 segments) for sight range limit
- Depends on `polygon-clipping` library (0.15.7) for polygon boolean ops

### Dynamic Lighting (implemented)

**Approach:** Same ray-casting as FOW, applied per light source.

**How it works:**
- Each light element generates an illumination polygon using `computeLightPolygon()`
- Uses wall `blockLight` property (separate from `blockVision`)
- When global illumination is OFF: visible area = line-of-sight ∩ union(all light polygons)
- If no lights and no personal vision → entire area is dark
- Three.js native lights (PointLight, SpotLight) provide actual 3D illumination and shadows
- The FOW overlay controls what the *player can see*, while Three.js lights control *how bright things appear*

**Integration with FOW:**
- FOW overlay composites vision + lighting into a single mask
- Full/half distinction applies to vision only; lights treat all blockers equally

### Token POV Walking (implemented — 2D and 3D)

**Approach:** Dual-camera system with shared walk position state.

**2D Walking** (`useWalk2D.ts`):
- WASD movement at 5 units/second, frame-rate independent (delta timing)
- OrbitControls target follows the walk position to keep the player centered
- Works in orthographic top-down camera mode
- FOW overlay updates from walk position in real-time

**3D First-Person Walking** (`useFirstPerson.ts`):
- Click on ground enters first-person mode at that position
- Dedicated PerspectiveCamera (fov=75) at eye height (y=1.6)
- WASD movement respects camera yaw (forward = where you're looking)
- Mouse-drag rotates view (yaw + pitch, clamped to prevent flipping)
- `fpPosition` (3D) syncs back to `walkPosition` (2D) so FOW follows the player
- Escape exits back to normal editing mode

**Camera System** (`SceneCanvas.vue`):
- Three camera modes: `perspective` (orbit), `orthographic` (top-down), `firstperson` (POV)
- Seamless switching between modes
- Walk state managed in `editorStore` (walkActive, walkPosition, fpPosition, fpYaw, fpPitch)

**Limitations:**
- No collision detection — can walk through walls
- No wall-height awareness in first-person (walls always extend to infinity for vision)

### Implications for Dungeon Lab

**Before these features existed**, the migration plan listed fog of war, dynamic lighting, and vision blocking as "hardest unsolved problems" to build from scratch post-migration. **Now they can be ported directly**, which fundamentally changes the migration timeline and risk.

**Token POV walking** is a gameplay feature we hadn't even planned for. In Dungeon Lab, this translates to: during an encounter, a player could walk through the dungeon from their character's perspective, seeing only what their token can see. This is a compelling feature that most VTTs don't offer.

**For the GM-authoritative model:** Walk mode in DungeonMaps is single-user/editor mode. In Dungeon Lab, each player's walk position would be their token's position. The GM would see the full map. Vision/FOW would be per-player, computed from each player's token position. The ray-casting runs client-side, so each client computes its own visibility — no server-side vision calculation needed. This fits cleanly with the GM-authoritative architecture since vision is a *view concern*, not a *state concern*.

---

## Architecture Impact Summary

### What Changes

| Component | Current | After Integration |
|-----------|---------|-------------------|
| **Map Editor** | Konva.js (2D canvas) | TresJS/Three.js (3D) — port from DungeonMaps |
| **Encounter Viewer** | Pixi.js (2D sprites) | TresJS/Three.js (3D scene) |
| **Token Rendering** | PIXI.Sprite + PIXI.Graphics | Three.js billboarded sprites + CSS2DRenderer for health bars |
| **Viewport Controls** | Custom ViewportManager (touch) | Three.js OrbitControls (constrained for mobile) |
| **Map Data Model** | Image-based with 2D overlays | Element-based 3D model (terrain, walls, props, lights, portals) |
| **Coordinate System** | XY ground plane, pixel-based | XZ ground plane (Three.js standard), grid-unit-based |
| **Fog of War** | Schema only, not implemented | Polygon ray-casting from DungeonMaps |
| **Dynamic Lighting** | Schema only, not implemented | Ray-cast light polygons + Three.js native lights |
| **Player POV** | Not planned | 2D walk + 3D first-person from DungeonMaps |
| **Dependencies** | pixi.js, vue-konva, konva | @tresjs/core, @tresjs/cientos, three, polygon-clipping |

### What Stays the Same

- **GM-authoritative architecture** — unchanged, still works through gameAction:request/gameState:update
- **WebSocket real-time communication** — renderer is just a view layer, comms don't change
- **Plugin architecture** — maps stay system-agnostic, props/models are assets not plugin code
- **Authentication, session management** — unaffected
- **Server-side** — minimal changes (asset storage for GLB models, updated map schema)

### Data Model Migration

The two projects have fundamentally different map models:

**Dungeon Lab (current):** Image background + 2D annotation overlays (walls as lines, doors as line segments, terrain as polygons). Coordinates map 1:1 to image pixels.

**DungeonMaps:** Element-based 3D model (TerrainElement flat planes, WallElement extruded segments, PropElement GLB models, LightElement, PortalElement as wall children). 1 unit = 1 grid cell.

**Key schema changes needed:**
- Add `MaterialDef` (color, textureRef, roughness, metalness, tiling) to walls, terrain
- Add `assetRef` for GLB model references on props
- Add layer system (`Layer[]` + `layerId` on elements)
- Switch coordinate convention from XY to XZ ground plane
- Make portals/doors children of walls (DungeonMaps approach — portals auto-move with walls)
- Add wall `blockVision` and `blockLight` properties (full/half/none) — already in DungeonMaps
- Since this is greenfield with no production data, we can change the schema freely

**Existing image-based maps** can be converted: the background image becomes a textured terrain plane at Y=0, walls/doors/lights convert to 3D elements with default materials.

### Token System Rewrite

The current `TokenRenderer.mts` (~1200 lines of Pixi-specific code) must be entirely rewritten:
- **Rendering:** Billboarded `THREE.Sprite` or textured `PlaneGeometry` facing camera
- **Selection/dragging:** Raycasting replaces Pixi hit testing (DungeonMaps already does this)
- **Health bars:** CSS2DRenderer (HTML elements positioned in 3D space) — more flexible than WebGL drawing
- **Grid snapping:** Trivial with grid-unit coords: `Math.round(worldX)`, `Math.round(worldZ)`
- **Touch:** Same long-press (500ms), same drag detection, just projected onto ground plane via raycast
- **POV mode:** Player's token position becomes the walk position for FOW/first-person view

### What Ports from DungeonMaps

**Core rendering:**
- Scene setup (`SceneCanvas.vue` — camera switching, controls, fog)
- Terrain rendering (`TerrainPlane.vue`)
- Wall rendering (`WallSegment.vue`)
- Prop rendering (`PropObject.vue` + GLB loading)
- Light rendering (`LightSource.vue`)
- Portal rendering (`PortalObject.vue`)
- Material system (textures, PBR properties)

**Fog of War & Lighting:**
- Visibility ray-casting engine (`visibility.ts`)
- FOW overlay rendering (`FogOfWarOverlay.vue`)
- Polygon boolean operations (`polygonOps.ts`)
- Light polygon computation (integrated in visibility.ts)

**Player POV:**
- 2D walk composable (`useWalk2D.ts`)
- First-person camera controller (`useFirstPerson.ts`)
- Walk state management (from `editorStore`)

**Editor tools:**
- Wall drawing, prop placement, transform gizmo
- History/undo-redo system (`historyStore`)
- Layer system
- Asset browser

---

## Migration Phases

### Phase 1: Data Model Unification
- Extend `map.schema.mts` with MaterialDef, layers, asset refs, XZ coords
- Add wall blocking properties (blockVision, blockLight with full/half/none)
- Build conversion utility for existing image-based maps
- No rendering changes yet

### Phase 2: Three.js Encounter Viewer
- Add TresJS dependencies to web package
- Create `ThreeMapViewer.vue` alongside existing `PixiMapViewer.vue`
- Port scene objects from DungeonMaps
- Port FOW overlay and visibility engine
- Port dynamic lighting integration
- Rewrite token rendering for Three.js (billboarded sprites)
- Implement touch controls (constrained OrbitControls)
- Both renderers coexist — setting selects which one

### Phase 3: Player POV in Encounters
- Adapt walk system for multiplayer (each player walks from their token position)
- Port 2D walk and 3D first-person composables
- Wire FOW to token position per player
- GM sees full map, players see from their token's vision

### Phase 4: Map Editor Migration
- Replace Konva-based editor with TresJS-based editor (ported from DungeonMaps)
- Integrate with Dungeon Lab's server-based asset system
- Port undo/redo, multi-select, transform gizmo

### Phase 5: Remove Old Renderers
- Remove Pixi.js, vue-konva, konva dependencies
- Remove PixiMapRenderer, old TokenRenderer, old ViewportManager

### Phase 6: Polish & Advanced Features
- Wall collision detection for first-person walking
- 3D token models (plugin-provided)
- Performance optimization for large maps (spatial indexing for ray-casting)
- Mobile touch optimization for walk mode

---

## Critical Files

**Dungeon Lab (to modify):**
- `packages/shared/src/schemas/map.schema.mts` — schema extension
- `packages/web/src/composables/usePixiMap.mts` — interface pattern to replicate for `useThreeMap`
- `packages/web/src/services/encounter/TokenRenderer.mts` — must rewrite for Three.js
- `packages/web/src/components/encounter/PixiMapViewer.vue` — replaced by ThreeMapViewer

**DungeonMaps (to port from):**
- `packages/client/src/components/viewport/SceneCanvas.vue` — TresJS scene setup + camera switching
- `packages/client/src/components/elements/*.vue` — all element renderers
- `packages/client/src/components/viewport/FogOfWarOverlay.vue` — FOW rendering
- `packages/client/src/utils/visibility.ts` — ray-casting visibility engine
- `packages/client/src/utils/polygonOps.ts` — polygon boolean operations
- `packages/client/src/composables/useWalk2D.ts` — 2D walking
- `packages/client/src/composables/useFirstPerson.ts` — 3D first-person camera
- `packages/client/src/types/map.ts` — target data model structure
- `packages/client/src/stores/` — editor, history, asset, material stores

## Verification

- Run existing encounter E2E tests against both Pixi and Three.js viewers during migration
- Test mobile touch controls (pan, zoom, token drag) via Playwright MCP on viewport sizes
- Performance test: create a large map (200 walls, 50 props) and verify 30+ FPS on mobile orthographic
- Verify GM-authoritative flow still works (token moves, state updates) with new renderer
- Test FOW: place token near walls, verify vision is blocked correctly
- Test dynamic lighting: place lights, toggle global illumination off, verify darkness outside light range
- Test first-person: enter POV mode, walk around, verify FOW follows and walls block vision
