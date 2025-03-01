import { GameSystemPlugin, GameSystemRegistration } from '@dungeon-lab/shared';

// Character actor type data schema
const characterDataSchema = {
  type: 'object',
  required: ['abilities', 'class', 'race', 'hitPoints', 'level'],
  properties: {
    abilities: {
      type: 'object',
      required: ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'],
      properties: {
        strength: { type: 'number', minimum: 1, maximum: 30 },
        dexterity: { type: 'number', minimum: 1, maximum: 30 },
        constitution: { type: 'number', minimum: 1, maximum: 30 },
        intelligence: { type: 'number', minimum: 1, maximum: 30 },
        wisdom: { type: 'number', minimum: 1, maximum: 30 },
        charisma: { type: 'number', minimum: 1, maximum: 30 }
      }
    },
    class: { type: 'string' },
    race: { type: 'string' },
    background: { type: 'string' },
    hitPoints: { type: 'number', minimum: 0 },
    level: { type: 'number', minimum: 1, maximum: 20 },
    proficiencyBonus: { type: 'number' },
    savingThrows: {
      type: 'object',
      properties: {
        strength: { type: 'boolean' },
        dexterity: { type: 'boolean' },
        constitution: { type: 'boolean' },
        intelligence: { type: 'boolean' },
        wisdom: { type: 'boolean' },
        charisma: { type: 'boolean' }
      }
    },
    skills: {
      type: 'object',
      properties: {
        acrobatics: { type: 'boolean' },
        animalHandling: { type: 'boolean' },
        arcana: { type: 'boolean' },
        athletics: { type: 'boolean' },
        deception: { type: 'boolean' },
        history: { type: 'boolean' },
        insight: { type: 'boolean' },
        intimidation: { type: 'boolean' },
        investigation: { type: 'boolean' },
        medicine: { type: 'boolean' },
        nature: { type: 'boolean' },
        perception: { type: 'boolean' },
        performance: { type: 'boolean' },
        persuasion: { type: 'boolean' },
        religion: { type: 'boolean' },
        sleightOfHand: { type: 'boolean' },
        stealth: { type: 'boolean' },
        survival: { type: 'boolean' }
      }
    },
    initiative: { type: 'number' },
    armorClass: { type: 'number' },
    speed: { type: 'number' },
    inventory: { type: 'array', items: { type: 'string' } }
  }
};

// Item type data schema
const weaponDataSchema = {
  type: 'object',
  required: ['damage', 'damageType', 'range', 'properties'],
  properties: {
    damage: { type: 'string' },
    damageType: { type: 'string' },
    range: { type: 'string' },
    properties: { type: 'array', items: { type: 'string' } }
  }
};

const dnd5e2024GameSystem: GameSystemRegistration = {
  name: 'D&D 5e 2024 Edition',
  version: '0.1.0',
  description: 'Implementation of the Dungeons & Dragons 5e 2024 Edition game system',
  author: 'Dungeon Lab Team',
  website: 'https://example.com/dnd5e2024',
  actorTypes: [
    {
      name: 'character',
      description: 'Player character',
      dataSchema: characterDataSchema,
      uiComponent: 'dnd5e2024-character-sheet'
    },
    {
      name: 'npc',
      description: 'Non-player character',
      dataSchema: characterDataSchema,
      uiComponent: 'dnd5e2024-npc-sheet'
    }
  ],
  itemTypes: [
    {
      name: 'weapon',
      description: 'Weapon item',
      dataSchema: weaponDataSchema,
      uiComponent: 'dnd5e2024-weapon-sheet'
    },
    {
      name: 'spell',
      description: 'Spell',
      dataSchema: {
        type: 'object',
        required: ['level', 'school', 'castingTime', 'range', 'components', 'duration', 'description'],
        properties: {
          level: { type: 'number', minimum: 0, maximum: 9 },
          school: { type: 'string' },
          castingTime: { type: 'string' },
          range: { type: 'string' },
          components: { type: 'string' },
          duration: { type: 'string' },
          description: { type: 'string' }
        }
      },
      uiComponent: 'dnd5e2024-spell-sheet'
    }
  ]
};

/**
 * D&D 5e 2024 Plugin
 */
const dnd5e2024Plugin: GameSystemPlugin = {
  id: 'dnd5e2024',
  name: 'D&D 5e 2024 Edition',
  version: '0.1.0',
  description: 'Implementation of the Dungeons & Dragons 5e 2024 Edition game system',
  author: 'Dungeon Lab Team',
  website: 'https://example.com/dnd5e2024',
  type: 'gameSystem',
  enabled: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  gameSystem: dnd5e2024GameSystem,
  
  // Initialize the plugin
  initialize: async () => {
    console.log('Initializing D&D 5e 2024 plugin');
    // Additional initialization logic would go here
  },
  
  // Get actor sheet component name
  getActorSheet: (actorType: string) => {
    if (actorType === 'character') {
      return 'dnd5e2024-character-sheet';
    } else if (actorType === 'npc') {
      return 'dnd5e2024-npc-sheet';
    }
    return undefined;
  },
  
  // Get item sheet component name
  getItemSheet: (itemType: string) => {
    if (itemType === 'weapon') {
      return 'dnd5e2024-weapon-sheet';
    } else if (itemType === 'spell') {
      return 'dnd5e2024-spell-sheet';
    }
    return undefined;
  },
  
  // Validate actor data
  validateActorData: (actorType: string, data: Record<string, unknown>) => {
    // In a real implementation, this would validate the data against the schema
    // For now, we'll just return true
    return true;
  },
  
  // Validate item data
  validateItemData: (itemType: string, data: Record<string, unknown>) => {
    // In a real implementation, this would validate the data against the schema
    // For now, we'll just return true
    return true;
  }
};

export default dnd5e2024Plugin; 