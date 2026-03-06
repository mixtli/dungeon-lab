/**
 * Configuration constants for D&D 5e 2024 Plugin
 */

// Path to 5etools source data directory
export const ETOOLS_DATA_PATH = '/Users/mixtli/checkouts/5etools-src/data';

// Path to 5etools image directory
export const ETOOLS_IMG_PATH = '/Users/mixtli/checkouts/5etools-img';

// Plugin metadata
export const PLUGIN_CONFIG = {
  pluginId: 'dnd-5e-2024',
  gameSystemId: 'dnd-5e-2024',
  version: '1.0.0',
  name: 'D&D 5e (2024)',
  description: 'D&D 5e (2024) Game System Plugin for Dungeon Lab'
} as const;

// Supported content types
export const CONTENT_TYPES = {
  actors: ['character', 'npc'] as const,
  items: ['weapon', 'equipment', 'consumable', 'tool', 'loot', 'container'] as const,
  documents: ['spell', 'class', 'background', 'race', 'feat', 'subclass'] as const
} as const;

// 5etools data file mappings
export const ETOOLS_FILES = {
  monsters: {
    xmm: 'bestiary/bestiary-xmm.json',
    xphb: 'bestiary/bestiary-xphb.json',
    fluffXmm: 'bestiary/fluff-bestiary-xmm.json',
    fluffXphb: 'bestiary/fluff-bestiary-xphb.json'
  },
  spells: {
    xphb: 'spells/spells-xphb.json',
    fluffXphb: 'spells/fluff-spells-xphb.json'
  },
  classes: {
    directory: 'class',
    fluffDirectory: 'class'
  },
  backgrounds: 'backgrounds.json',
  races: 'races.json',
  feats: 'feats.json',
  items: {
    main: 'items.json',
    base: 'items-base.json'
  }
} as const;