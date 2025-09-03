import { z } from 'zod';
import { baseSchema } from './base.schema.mjs';
import { assetSchema } from './asset.schema.mjs';

/**
 * Schema for 2D coordinates in world units
 * World units map 1:1 to source image pixels and are game-system agnostic
 */
export const coordinateSchema = z.object({
  x: z.number(),
  y: z.number()
});

/**
 * Schema for 3D coordinates with elevation in world units
 * Used for objects that exist at specific heights
 */
export const coordinate3dSchema = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number() // Height/elevation in world units
});

/**
 * Schema for 2D polygon (array of coordinate points in world units)
 * Used for terrain regions, collision areas, etc.
 */
const polygonSchema = z.array(coordinateSchema);

/**
 * Schema for 3D polygon with elevation data in world units
 * Used for elevated terrain, bridges, platforms
 */
export const polygon3dSchema = z.array(coordinate3dSchema);


/**
 * World coordinate system schema
 * Defines grid structure using world units that map 1:1 to source image pixels
 * Game systems interpret world units according to their own scale (e.g. feet, meters, squares)
 */
export const worldCoordinateSystemSchema = z.object({
  // World units per grid cell (abstract scaling factor)
  worldUnitsPerGridCell: z.number().positive(),
  
  // Grid alignment offset in world units (for aligning with background images)
  offset: coordinateSchema.default({ x: 0, y: 0 }),
  
  // Number of grid cells in each dimension
  dimensions: z.object({
    width: z.number().int().positive(),
    height: z.number().int().positive()
  }),
  
  // Source image dimensions in pixels (for rendering calculations)
  imageDimensions: z.object({
    width: z.number().int().positive(),
    height: z.number().int().positive()
  }),
  
  // Grid display options
  display: z.object({
    visible: z.boolean().default(true),
    color: z.string().default('#000000'),
    opacity: z.number().min(0).max(1).default(0.3),
    lineWidth: z.number().positive().default(1)
  }).default({
    visible: true,
    color: '#000000',
    opacity: 0.3,
    lineWidth: 1
  })
});



/**
 * Simplified portal/door schema using line segment geometry like Foundry VTT
 * Portals are represented as line segments for simplicity and consistency
 */
export const doorSchema = z.object({
  // Unique identifier for this door
  id: z.string(),
  
  // Door geometry as line segment [x1, y1, x2, y2] in world units
  coords: z.array(z.number()).length(4), // [x1, y1, x2, y2] line segment
  
  // Door state and behavior
  state: z.enum(['closed', 'open', 'locked', 'stuck']).default('closed'),
  material: z.enum(['wood', 'stone', 'metal', 'magic', 'glass', 'force']).default('wood'),
  
  // Visual properties
  stroke: z.string().default('#8B4513'), // Door color (brown by default)
  strokeWidth: z.number().positive().default(3), // Line width for rendering
  
  // Interaction properties
  requiresKey: z.boolean().default(false),
  
  // Visual and audio
  openSound: z.string().optional(), // Sound effect when opening
  closeSound: z.string().optional(), // Sound effect when closing
  
  // Metadata
  name: z.string().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).default([]) // For AI and automation
});


/**
 * Enhanced lighting schema for modern VTT features
 */
export const enhancedLightSchema = z.object({
  // Unique identifier for this light source
  id: z.string(),
  
  // Light position in world units (3D for elevation support)
  position: coordinate3dSchema,
  
  // Light properties
  type: z.enum(['point', 'directional', 'area', 'ambient']).default('point'),
  
  // Illumination settings  
  brightRadius: z.number().min(0).default(0), // Bright light radius in world units
  dimRadius: z.number().min(0).default(0), // Dim light radius in world units
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
 * Schema for wall segments in the new internal format
 * Walls block movement, sight, and/or sound depending on their properties
 */
export const wallSchema = z.object({
  // Unique identifier for this wall
  id: z.string(),
  
  // Wall geometry (line segment in world units)
  start: coordinate3dSchema, // Start point with elevation
  end: coordinate3dSchema,   // End point with elevation
  
  // Physical properties
  height: z.number().positive().default(10), // Wall height in world units
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
 * Uses polygon boundaries for precise collision detection and lighting occlusion
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
  movementCost: z.number().positive().default(1), // Movement cost multiplier (game-system specific)
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
 * All collision bounds are stored as polygons for unified collision detection and lighting
 */
export const mapObjectSchema = z.object({
  // Unique identifier for this object
  id: z.string(),
  
  // Object position and dimensions in world units
  position: coordinate3dSchema,
  rotation: z.number().default(0), // Rotation in radians
  
  // Collision bounds as polygon (relative to position)
  // All shapes are converted to polygons for unified collision detection
  bounds: polygonSchema, // Polygon points relative to position
  
  // Original shape metadata for user editing and export
  shapeType: z.enum(['circle', 'rectangle', 'polygon']).default('rectangle'),
  shapeData: z.object({
    // For circles: store original radius for user editing
    radius: z.number().positive().optional(),
    // For rectangles: store original width/height for user editing  
    width: z.number().positive().optional(),
    height: z.number().positive().optional(),
    // Number of points used in polygon approximation (for circles/rectangles)
    polygonPrecision: z.number().int().min(6).max(64).default(16).optional()
  }).optional(),
  
  // Physical properties
  height: z.number().positive().default(5), // Object height in world units
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
 * Polygon boundaries enable precise triggering and collision detection
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
  }).default({
    type: 'none',
    intensity: 0.5,
    windDirection: 0,
    windSpeed: 0,
    visibility: 1
  }),
  
  // Atmospheric effects
  atmosphere: z.object({
    fogColor: z.string().default('#cccccc'),
    fogDensity: z.number().min(0).max(1).default(0),
    skyColor: z.string().optional(), // For outdoor scenes
    horizonColor: z.string().optional()
  }).default({
    fogColor: '#cccccc',
    fogDensity: 0
  }),
  
  // Audio environment
  audio: z.object({
    ambientTrack: z.string().optional(), // Background music/sounds
    reverbLevel: z.number().min(0).max(1).default(0.3),
    soundOcclusion: z.boolean().default(true) // Whether walls block sound
  }).default({
    reverbLevel: 0.3,
    soundOcclusion: true
  })
});


/**
 * New internal map data schema
 * This is the primary format for storing map information in Dungeon Lab
 */
export const internalMapDataSchema = z.object({
  // Version for schema evolution
  version: z.string().default('1.0'),
  
  // World coordinate system
  coordinates: worldCoordinateSystemSchema,
  
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
  
  // Global settings for shape conversion and collision detection
  conversionSettings: z.object({
    // Default precision for converting circles/ellipses to polygons
    defaultPolygonPrecision: z.number().int().min(6).max(64).default(16),
    // Whether to use adaptive precision based on shape size
    useAdaptivePrecision: z.boolean().default(true),
    // Minimum segment length for adaptive precision (in world units)
    targetSegmentLength: z.number().positive().default(7.5)
  }).default({
    defaultPolygonPrecision: 16,
    useAdaptivePrecision: true,
    targetSegmentLength: 7.5
  }),
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

  // Primary map data using internal format
  mapData: internalMapDataSchema,

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

