import { z } from 'zod';
import { baseSchema } from './base.schema.mjs';
import { assetSchema } from './asset.schema.mjs';

/**
 * Schema for 2D coordinates in logical units (not pixels)
 * Used throughout the map system for position data
 */
export const coordinateSchema = z.object({
  x: z.number(),
  y: z.number()
});

/**
 * Schema for 3D coordinates with elevation
 * Used for objects that exist at specific heights
 */
export const coordinate3dSchema = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number() // Height/elevation in logical units
});

/**
 * Schema for 2D polygon (array of coordinate points)
 * Used for terrain regions, collision areas, etc.
 */
const polygonSchema = z.array(coordinateSchema);

/**
 * Schema for 3D polygon with elevation data
 * Used for elevated terrain, bridges, platforms
 */
const polygon3dSchema = z.array(coordinate3dSchema);

/**
 * Schema for UVTT resolution (kept for backward compatibility)
 */
export const resolutionSchema = z.object({
  map_origin: z.object({
    x: z.number().default(0),
    y: z.number().default(0).optional()
  }).optional(),
  map_size: z.object({
    x: z.number().positive(),
    y: z.number().positive()
  }).optional(),
  pixels_per_grid: z.number().int().positive().optional()
});

/**
 * Modern grid system schema
 * Defines the logical grid structure independent of pixel resolution
 */
export const gridSystemSchema = z.object({
  // Size of each grid cell in logical units (typically 5 feet for D&D)
  cellSize: z.number().positive().default(5),
  
  // Grid offset from map origin (for aligning with background images)
  offset: coordinateSchema.default({ x: 0, y: 0 }),
  
  // Number of grid cells in each dimension
  dimensions: z.object({
    width: z.number().int().positive(),
    height: z.number().int().positive()
  }),
  
  // Grid display options
  display: z.object({
    visible: z.boolean().default(true),
    color: z.string().default('#000000'),
    opacity: z.number().min(0).max(1).default(0.3),
    lineWidth: z.number().positive().default(1)
  }).optional()
});

/**
 * Coordinate system for converting between pixels and logical units
 * This allows the same map data to work at different resolutions
 */
export const coordinateSystemSchema = z.object({
  // Pixels per logical unit (e.g., 20 pixels = 1 foot)
  pixelsPerUnit: z.number().positive().default(20),
  
  // Origin point in pixels where logical coordinate (0,0) is located
  origin: coordinateSchema.default({ x: 0, y: 0 }),
  
  // Map dimensions in pixels (for image sizing)
  imageDimensions: z.object({
    width: z.number().int().positive(),
    height: z.number().int().positive()
  })
});

/**
 * Schema for UVTT portal (kept for backward compatibility)
 */
export const portalSchema = z.object({
  position: coordinateSchema,
  bounds: z.array(coordinateSchema),
  rotation: z.number(), // in radians
  closed: z.boolean(),
  freestanding: z.boolean()
});

/**
 * Enhanced portal/door schema for modern VTT features
 */
export const doorSchema = z.object({
  // Unique identifier for this door
  id: z.string(),
  
  // Door position and geometry
  position: coordinateSchema,
  bounds: z.array(coordinateSchema), // Door frame outline
  
  // Door properties
  rotation: z.number().default(0), // in radians
  width: z.number().positive(), // door width in logical units
  height: z.number().positive().default(8), // door height (for 3D collision)
  
  // Door state and behavior
  state: z.enum(['closed', 'open', 'locked', 'stuck']).default('closed'),
  material: z.enum(['wood', 'stone', 'metal', 'magic', 'glass']).default('wood'),
  
  // Interaction properties
  requiresKey: z.boolean().default(false),
  keyId: z.string().optional(), // Reference to required key item
  lockDC: z.number().int().min(0).max(30).optional(), // Difficulty to pick lock
  breakDC: z.number().int().min(0).max(30).optional(), // Difficulty to break down
  
  // Visual and audio
  openSound: z.string().optional(), // Sound effect when opening
  closeSound: z.string().optional(), // Sound effect when closing
  
  // Metadata
  name: z.string().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).default([]) // For AI and automation
});

/**
 * Schema for UVTT light (kept for backward compatibility)
 */
export const lightSchema = z.object({
  position: coordinateSchema,
  range: z.number(),
  intensity: z.number(),
  /**
   * Color as 8-character hex string: RRGGBBAA (6 for RGB, 2 for alpha channel, no #)
   * Example: 'ff575112' (RGB: ff5751, Alpha: 12)
   * This is the format used in the database. Convert to/from other formats as needed for UI libraries.
   */
  color: z.string(),
  shadows: z.boolean()
});

/**
 * Enhanced lighting schema for modern VTT features
 */
export const enhancedLightSchema = z.object({
  // Unique identifier for this light source
  id: z.string(),
  
  // Light position (3D for elevation support)
  position: coordinate3dSchema,
  
  // Light properties
  type: z.enum(['point', 'directional', 'area', 'ambient']).default('point'),
  
  // Illumination settings
  brightRadius: z.number().min(0).default(0), // Bright light radius in logical units
  dimRadius: z.number().min(0).default(0), // Dim light radius in logical units
  intensity: z.number().min(0).max(1).default(1), // Light intensity (0-1)
  
  // Color and appearance
  color: z.string().default('#ffffff'), // Hex color with alpha support
  temperature: z.number().min(1000).max(10000).optional(), // Color temperature in Kelvin
  
  // Advanced lighting effects
  shadows: z.boolean().default(true),
  shadowQuality: z.enum(['low', 'medium', 'high']).default('medium'),
  falloffType: z.enum(['linear', 'quadratic', 'exponential']).default('quadratic'),
  
  // Animation effects
  animation: z.object({
    type: z.enum(['none', 'flicker', 'pulse', 'strobe', 'wave']).default('none'),
    speed: z.number().min(0).max(5).default(1), // Animation speed multiplier
    intensity: z.number().min(0).max(1).default(0.1) // Animation intensity (how much it varies)
  }).default({ type: 'none', speed: 1, intensity: 0.1 }),
  
  // State and control
  enabled: z.boolean().default(true),
  controllable: z.boolean().default(false), // Can players control this light?
  
  // Metadata
  name: z.string().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).default([]) // For grouping and automation
});

/**
 * Schema for UVTT environment (kept for backward compatibility)
 */
const environmentSchema = z.object({
  baked_lighting: z.boolean().default(false),
  ambient_light: z.string().default('#ffffff') // hex color code with default white
});

/**
 * Schema for wall segments in the new internal format
 * Walls block movement, sight, and/or sound depending on their properties
 */
export const wallSchema = z.object({
  // Unique identifier for this wall
  id: z.string(),
  
  // Wall geometry (line segment)
  start: coordinate3dSchema, // Start point with elevation
  end: coordinate3dSchema,   // End point with elevation
  
  // Physical properties
  height: z.number().positive().default(10), // Wall height in logical units
  thickness: z.number().positive().default(1), // Wall thickness for 3D collision
  material: z.enum(['stone', 'wood', 'metal', 'glass', 'magic', 'force']).default('stone'),
  
  // Blocking properties
  blocksMovement: z.boolean().default(true),
  blocksLight: z.boolean().default(true),
  blocksSound: z.boolean().default(true),
  
  // Vision properties
  transparency: z.number().min(0).max(1).default(0), // 0 = opaque, 1 = transparent
  oneWayVision: z.boolean().default(false), // Can see through from one side only
  visionDirection: z.number().optional(), // Direction for one-way vision (radians)
  
  // Interaction
  destructible: z.boolean().default(false),
  hitPoints: z.number().int().positive().optional(),
  damageThreshold: z.number().int().min(0).optional(),
  
  // Metadata
  name: z.string().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).default([])
});

/**
 * Schema for terrain regions
 * Defines areas with special movement, visual, or gameplay properties
 */
export const terrainSchema = z.object({
  // Unique identifier for this terrain region
  id: z.string(),
  
  // Terrain geometry (polygon)
  boundary: polygonSchema, // 2D boundary of the terrain
  elevation: z.number().default(0), // Base elevation of this terrain
  
  // Terrain type and properties
  type: z.enum([
    'normal',     // Standard terrain
    'difficult',  // Difficult terrain (half movement)
    'hazardous',  // Dangerous terrain (fire, acid, etc.)
    'impassable', // Cannot be entered
    'water',      // Water terrain
    'swamp',      // Swamp/marsh
    'ice',        // Slippery ice
    'sand',       // Shifting sand
    'lava',       // Molten lava
    'pit',        // Deep pit or chasm
    'stairs',     // Stairs between elevations
    'ramp',       // Gradual elevation change
    'teleporter'  // Magical teleportation area
  ]).default('normal'),
  
  // Movement properties
  movementCost: z.number().positive().default(1), // Movement cost multiplier
  minimumSpeed: z.number().min(0).default(0), // Minimum speed to cross (for pits, etc.)
  
  // Environmental effects
  damagePerRound: z.number().int().min(0).default(0), // Damage dealt each round
  damageType: z.enum(['fire', 'cold', 'acid', 'poison', 'necrotic', 'radiant']).optional(),
  
  // Visual properties
  color: z.string().optional(), // Overlay color for this terrain
  opacity: z.number().min(0).max(1).default(0.3), // Overlay opacity
  texture: z.string().optional(), // Texture asset ID
  
  // Special behaviors
  teleportDestination: coordinateSchema.optional(), // For teleporter terrain
  elevationChange: z.number().default(0), // Elevation change when crossing (for stairs/ramps)
  
  // Metadata
  name: z.string().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).default([])
});

/**
 * Schema for physical objects on the map
 * These are distinct from walls - they're discrete objects that can be interacted with
 */
export const mapObjectSchema = z.object({
  // Unique identifier for this object
  id: z.string(),
  
  // Object position and dimensions
  position: coordinate3dSchema,
  rotation: z.number().default(0), // Rotation in radians
  
  // Collision bounds (relative to position)
  collisionShape: z.enum(['circle', 'rectangle', 'polygon']).default('rectangle'),
  bounds: z.union([
    z.number().positive(), // Circle: radius
    z.object({ width: z.number().positive(), height: z.number().positive() }), // Rectangle
    polygonSchema // Polygon: array of points relative to position
  ]),
  
  // Physical properties
  height: z.number().positive().default(5), // Object height in logical units
  blocksMovement: z.boolean().default(true),
  blocksLight: z.boolean().default(false),
  blocksSound: z.boolean().default(false),
  
  // Object type and properties
  type: z.enum([
    'furniture',  // Tables, chairs, etc.
    'container',  // Chests, barrels
    'decoration', // Statues, paintings
    'mechanism',  // Levers, buttons
    'trap',       // Hidden or visible traps
    'treasure',   // Treasure piles
    'altar',      // Religious altars
    'pillar',     // Structural columns
    'door',       // Alternative door representation
    'other'       // Generic object
  ]).default('other'),
  
  // Interaction properties
  interactable: z.boolean().default(false),
  searchable: z.boolean().default(false),
  moveable: z.boolean().default(false),
  
  // Visual representation
  sprite: z.string().optional(), // Sprite/texture asset ID
  color: z.string().default('#8B4513'), // Default brown for objects
  opacity: z.number().min(0).max(1).default(1),
  
  // Metadata
  name: z.string().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).default([])
});

/**
 * Schema for special regions with custom behaviors
 * These define areas that trigger special effects or rules
 */
export const regionSchema = z.object({
  // Unique identifier for this region
  id: z.string(),
  
  // Region geometry
  boundary: polygonSchema, // 2D boundary
  elevationRange: z.object({
    min: z.number().default(-Infinity), // Minimum elevation this region affects
    max: z.number().default(Infinity)   // Maximum elevation this region affects
  }).optional(),
  
  // Region type and behavior
  type: z.enum([
    'teleport',     // Teleports tokens to another location
    'trap',         // Triggers when entered
    'aura',         // Ongoing effect while inside
    'sanctuary',    // Safe zone with special rules
    'antimagic',    // Magic doesn't work here
    'silence',      // Sound is blocked
    'darkness',     // Light sources don't work
    'weather',      // Weather effects
    'script',       // Custom scripted behavior
    'spawn'         // Creature spawn point
  ]),
  
  // Trigger conditions
  triggerOn: z.enum(['enter', 'exit', 'presence', 'interaction']).default('enter'),
  affectedTypes: z.array(z.enum(['player', 'npc', 'monster', 'object', 'all'])).default(['all']),
  
  // Teleport properties (for teleport regions)
  teleportDestination: coordinate3dSchema.optional(),
  teleportMapId: z.string().optional(), // For inter-map teleportation
  
  // Effect properties
  effectData: z.record(z.any()).optional(), // Flexible data for different region types
  
  // Visual properties
  visible: z.boolean().default(false), // Whether region boundary is visible to players
  color: z.string().default('#ff0000'),
  opacity: z.number().min(0).max(1).default(0.2),
  
  // Metadata
  name: z.string().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).default([])
});

/**
 * Enhanced environment schema for modern VTT features
 * Controls global lighting, weather, and atmospheric effects
 */
export const enhancedEnvironmentSchema = z.object({
  // Global lighting
  ambientLight: z.object({
    color: z.string().default('#ffffff'),
    intensity: z.number().min(0).max(1).default(0.1),
    temperature: z.number().min(1000).max(10000).optional() // Color temperature in Kelvin
  }),
  
  // Global vision settings
  globalIllumination: z.boolean().default(false), // Whether the entire map is lit
  darkvisionRange: z.number().min(0).default(60), // Default darkvision range
  
  // Weather effects
  weather: z.object({
    type: z.enum(['none', 'rain', 'snow', 'fog', 'storm', 'sandstorm']).default('none'),
    intensity: z.number().min(0).max(1).default(0.5),
    windDirection: z.number().default(0), // Wind direction in radians
    windSpeed: z.number().min(0).default(0), // Wind speed in logical units
    temperature: z.number().optional(), // Temperature for environmental effects
    visibility: z.number().min(0).default(1) // Visibility modifier (0-1)
  }).optional(),
  
  // Atmospheric effects
  atmosphere: z.object({
    fogColor: z.string().default('#cccccc'),
    fogDensity: z.number().min(0).max(1).default(0),
    skyColor: z.string().optional(), // For outdoor scenes
    horizonColor: z.string().optional()
  }).optional(),
  
  // Audio environment
  audio: z.object({
    ambientTrack: z.string().optional(), // Background music/sounds
    reverbLevel: z.number().min(0).max(1).default(0.3),
    soundOcclusion: z.boolean().default(true) // Whether walls block sound
  }).optional()
});

/**
 * Schema for the UVTT format data (kept for backward compatibility)
 */
export const uvttSchema = z.object({
  format: z.number().default(1.0).optional(), // UVTT version
  resolution: resolutionSchema.optional(),
  line_of_sight: z.array(polygonSchema).optional(),
  objects_line_of_sight: z.array(polygonSchema).optional(),
  portals: z.array(portalSchema).optional(),
  environment: environmentSchema.optional(),
  lights: z.array(lightSchema).optional()
});

/**
 * New internal map data schema
 * This is the primary format for storing map information in Dungeon Lab
 */
export const internalMapDataSchema = z.object({
  // Version for schema evolution
  version: z.string().default('1.0'),
  
  // Grid and coordinate system
  grid: gridSystemSchema,
  coordinates: coordinateSystemSchema,
  
  // Geometry layers
  walls: z.array(wallSchema).default([]),
  terrain: z.array(terrainSchema).default([]),
  objects: z.array(mapObjectSchema).default([]),
  regions: z.array(regionSchema).default([]),
  doors: z.array(doorSchema).default([]),
  
  // Lighting and environment
  lights: z.array(enhancedLightSchema).default([]),
  environment: enhancedEnvironmentSchema,
  
  // Metadata for AI and automation
  semanticData: z.object({
    mapType: z.enum(['dungeon', 'town', 'wilderness', 'building', 'other']).default('other'),
    theme: z.string().optional(), // e.g., 'medieval', 'modern', 'fantasy'
    difficulty: z.enum(['easy', 'medium', 'hard', 'deadly']).optional(),
    suggestedLevel: z.number().int().min(1).max(20).optional(),
    keywords: z.array(z.string()).default([]) // For search and categorization
  }).default({
    mapType: 'other',
    keywords: []
  }),
  
  // Extension points for plugins
  pluginData: z.record(z.string(), z.any()).default({})
});

// Base Map schema (updated to use new internal format)
export const mapSchema = baseSchema.extend({
  // Standard fields
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  userData: z.record(z.any()).optional(),

  // Direct asset references using string IDs (will be ObjectId in server models via zId)
  thumbnailId: z.string().optional(),
  imageId: z.string().optional(),
  
  // Owner reference
  ownerId: z.string().optional(), // Owner of the map (usually the game master)

  // Legacy grid information (kept for backward compatibility)
  aspectRatio: z.coerce.number().positive().optional(),

  // NEW: Primary map data using internal format
  mapData: internalMapDataSchema,

  // LEGACY: UVTT format fields (kept for import/export compatibility)
  // This will be populated during UVTT import and used for UVTT export
  uvtt: uvttSchema.optional(),

  // Additional fields for AI generation
  aiPrompt: z.string().optional(), // Original prompt used to generate the map
  aiModel: z.string().optional(),  // AI model used for generation
  generationVersion: z.number().optional() // Version of the generation for version tracking
});

/**
 * Map schema with virtual fields (populated assets)
 * Used when returning maps with their associated asset data
 */
export const mapSchemaWithVirtuals = mapSchema.extend({
  thumbnail: assetSchema.nullable().optional(),
  image: assetSchema.nullable().optional()
});

/**
 * Schema for map creation that includes an optional image field for validation
 * The mapData field will be initialized with default values if not provided
 */
export const mapCreateSchema = mapSchema
  .omit({
    id: true,
  })
  .extend({
    // Add an optional field for the image during creation (can be file upload or AI generated)
    image: z.any().optional(),
    
    // Make mapData optional during creation - will be initialized with defaults
    mapData: internalMapDataSchema.optional()
  });

// Schema specifically for importing UVTT files
export const mapImportUVTTSchema = z.object({
  // The file will be processed separately, but we need a field for validation
  uvttFile: z.any(),
  
  // Optionally override some fields during import
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  userData: z.record(z.any()).optional(),
  campaignId: z.string().optional() // Optional campaign to associate with
});
