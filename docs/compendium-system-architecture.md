# Compendium System Architecture

## 🚀 Project Status

**Current Progress: Phase 4 Complete with Server Cleanup**

- ✅ **Phase 1**: Type System Foundation - Complete D&D 5e type system with Zod schemas
- ✅ **Phase 2**: Core Infrastructure - Database models, REST API, and plugin integration
- ✅ **Phase 3**: Generic Import System - ZIP import processing with background jobs
- ✅ **Phase 4**: Foundry Converter Tool - Standalone CLI for converting Foundry packs **COMPLETED**
- ⏳ **Phase 5**: User Interface - Compendium browser and management UI
- ⏳ **Phase 6**: Polish and Optimization - Performance and advanced features

**✅ Server Cleanup Complete**
- ✅ **VTTDocument Model Consolidation**: Fixed duplicate model overwrite error by consolidating models
- ✅ **Clean Architecture**: Server has zero Foundry-specific dependencies or code
- ✅ **Standalone Converter**: Converter runs completely independently without server dependencies

## Overview

This document outlines the architecture for a comprehensive compendium system for Dungeon Lab that supports importing content from multiple sources, including Foundry VTT packs, and provides a standardized format for content distribution and management.

## Goals

1. **Generic Import System** - Support importing compendiums from ZIP files with standardized JSON structure
2. **Foundry VTT Integration** - Convert Foundry VTT LevelDB packs to our format
3. **Asset Management** - Handle images and other assets with MinIO integration
4. **Plugin Integration** - Work seamlessly with the existing plugin architecture
5. **User Experience** - Provide intuitive UI for managing compendiums
6. **Scalability** - Support large datasets efficiently

## Core Architecture

### 1. Compendium Data Model

#### Compendium Document Schema
```typescript
interface ICompendium {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  pluginId: string;
  gameSystemId: string;
  category: 'official' | 'community' | 'homebrew';
  tags: string[];
  license: string;
  sourceUrl?: string;
  iconId?: string;
  
  // Content statistics
  stats: {
    actors: number;
    items: number;
    documents: number;
    assets: number;
  };
  
  // Import metadata
  importedAt: Date;
  importedBy: string;
  importSource: 'zip' | 'foundry' | 'manual';
  importMetadata: Record<string, any>;
  
  // Base fields
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
}
```

#### Compendium Entry Schema
```typescript
interface ICompendiumEntry {
  id: string;
  compendiumId: string;
  entryType: 'actor' | 'item' | 'document';
  entryId: string; // Reference to Actor, Item, or VTTDocument
  originalId?: string; // Original ID from source system
  category?: string;
  subcategory?: string;
  tags: string[];
  featured: boolean;
  
  // Search optimization
  searchText: string; // Combined searchable text
  
  // Base fields
  createdAt: Date;
  updatedAt: Date;
}
```

### 2. Database Schemas

#### MongoDB Collections

**Compendiums Collection**
- Stores compendium metadata
- Indexed by pluginId, gameSystemId, category
- Full-text search on name, description, tags

**CompendiumEntries Collection**
- Links compendium to actual content (actors/items/documents)
- Indexed by compendiumId, entryType, entryId
- Full-text search on searchText field

**Existing Collections Enhanced**
- Add `compendiumId` field to Actor, Item, and VTTDocument schemas
- Add `originalSourceId` for tracking import sources
- Maintain backward compatibility

### 3. Import System Architecture

#### Generic ZIP Import Format

**Required Structure:**
```
compendium.zip
├── manifest.json          # Compendium metadata
├── actors/                # Actor JSON files
│   ├── actor-1.json
│   └── actor-2.json
├── items/                 # Item JSON files
│   ├── item-1.json
│   └── item-2.json
├── documents/             # Document JSON files
│   ├── document-1.json
│   └── document-2.json
└── assets/                # Images and other assets
    ├── images/
    │   ├── actor-portraits/
    │   ├── item-icons/
    │   └── tokens/
    └── other/
```

**Manifest Schema:**
```json
{
  "name": "Player's Handbook Content",
  "description": "Official D&D 5e Player's Handbook content",
  "version": "1.0.0",
  "author": "Wizards of the Coast",
  "pluginId": "dnd-5e-2024",
  "gameSystemId": "dnd5e",
  "category": "official",
  "tags": ["core", "phb", "official"],
  "license": "SRD",
  "iconPath": "assets/images/phb-icon.png",
  "contents": {
    "actors": 150,
    "items": 300,
    "documents": 50,
    "assets": 200
  }
}
```

#### Foundry VTT Converter Tool

**🔧 Architecture Decision: Standalone Package**
The Foundry converter is implemented as a completely separate package (`@dungeon-lab/foundry-converter`) that runs independently of the server. This architectural decision ensures:

- **Clean Separation of Concerns**: Foundry-specific code is isolated from the main server
- **No Server Dependencies**: Converter runs offline without requiring server startup  
- **Simplified Deployment**: Server can be deployed without Foundry-specific dependencies
- **Independent Updates**: Foundry converter can be updated without affecting server stability
- **Security**: Reduces server attack surface by removing LevelDB and Foundry-specific code
- **Server Cleanup**: All Foundry-related dependencies removed from server package.json
- **Development Simplicity**: Developers can work on converter without running the full server stack

**Implementation Status:**
- ✅ Converter package created as standalone CLI tool
- ✅ Server no longer imports or depends on Foundry converter
- ✅ LevelDB processing moved entirely to converter package
- ✅ Asset processing and validation handled by converter
- ⏳ Server package.json cleanup pending (remove unused Foundry dependencies)

**Usage:**
```bash
# Convert a single pack
npx @dungeon-lab/foundry-converter \
  --input ~/Library/Application\ Support/FoundryVTT/Data/systems/dnd5e/packs/actors24 \
  --output ~/dungeon-lab-packs/actors24 \
  --system dnd-5e-2024

# Convert all packs in a directory
npx @dungeon-lab/foundry-converter \
  --input ~/Library/Application\ Support/FoundryVTT/Data/systems/dnd5e/packs \
  --output ~/dungeon-lab-packs \
  --system dnd-5e-2024 \
  --all
```

**Content Type Mapping:**
Based on analysis of all D&D 5e packs, here's the complete mapping:

```typescript
// Foundry Type -> Dungeon Lab Model
const FOUNDRY_TYPE_MAPPING = {
  // Actors
  'npc': 'Actor',
  'character': 'Actor',
  
  // Items  
  'weapon': 'Item',
  'equipment': 'Item', 
  'consumable': 'Item',
  'tool': 'Item',
  'loot': 'Item',
  'container': 'Item',
  'base': 'Item',           // Base item templates
  'enchantment': 'Item',    // Enchantments/modifications
  
  // VTT Documents
  'spell': 'VTTDocument',   // Spells as reference documents
  'background': 'VTTDocument',
  'class': 'VTTDocument',
  'subclass': 'VTTDocument', 
  'feat': 'VTTDocument',
  'race': 'VTTDocument',
  'rule': 'VTTDocument',    // Rules text
  'text': 'VTTDocument',    // Text documents
  'document': 'VTTDocument', // Journal entries
  'unknown': 'VTTDocument', // Journal content (tables24, rules packs)
  'RollTable': 'VTTDocument', // Random tables
  'spells': 'VTTDocument',  // Spell list documents
  
  // Skip these types
  'Item': 'SKIP',          // Foundry organizational folders
  'folder': 'SKIP'         // Foundry folders
};
```

**Converter Output Format:**
The converter outputs packs in a standardized format that can be imported through the generic import system:

```
output-directory/
├── manifest.json          # Pack metadata
├── actors/                # Actor JSON files
│   ├── {id}-{name}.json
│   └── ...
├── items/                 # Item JSON files
│   ├── {id}-{name}.json
│   └── ...
├── documents/             # VTT Document JSON files
│   ├── {id}-{name}.json
│   └── ...
└── assets/                # Asset references
    └── mapping.json       # Original to new path mapping
```

**Converter Architecture:**
```typescript
// Standalone converter with plugin integration
export class FoundryConverter {
  async convertAllPacks(foundryDataPath: string): Promise<CompendiumImportData> {
    const packs = [
      'actors24', 'backgrounds', 'classes', 'classes24', 'classfeatures',
      'content24', 'equipment24', 'feats24', 'heroes', 'items', 
      'monsterfeatures', 'monsters', 'origins24', 'races', 'rules',
      'spells', 'spells24', 'subclasses', 'tables', 'tables24', 'tradegoods'
    ];
    
    const allData = { actors: [], items: [], documents: [], assets: [] };
    
    for (const packName of packs) {
      const packData = await this.convertPack(path.join(foundryDataPath, packName));
      this.mergePackData(allData, packData, packName);
    }
    
    return this.deduplicateContent(allData);
  }
  
  async convertPack(packPath: string): Promise<PackImportData> {
    const db = new Level(packPath, { valueEncoding: 'json' });
    const results = { actors: [], items: [], documents: [], assets: [] };
    
    for await (const [key, value] of db.iterator()) {
      const targetType = FOUNDRY_TYPE_MAPPING[value.type];
      
      if (targetType === 'SKIP') continue;
      
      switch (targetType) {
        case 'Actor':
          const actor = await this.mapFoundryToActor(value);
          if (actor) results.actors.push(actor);
          break;
        case 'Item':
          const item = await this.mapFoundryToItem(value);
          if (item) results.items.push(item);
          break;
        case 'VTTDocument':
          const doc = await this.mapFoundryToDocument(value);
          if (doc) results.documents.push(doc);
          break;
      }
      
      // Extract assets from any content type
      const assets = this.extractAssets(value);
      results.assets.push(...assets);
    }
    
    await db.close();
    return results;
  }
  
  private async mapFoundryToActor(foundryData: any): Promise<IActor | null> {
    // Handle embedded items for characters/NPCs
    const embeddedItems = this.extractEmbeddedItems(foundryData.items || []);
    
    return {
      name: foundryData.name,
      type: foundryData.type, // 'npc' or 'character'
      gameSystemId: 'dnd5e',
      pluginId: 'dnd-5e-2024',
      data: foundryData.system,
      avatarId: await this.processImage(foundryData.img),
      defaultTokenImageId: await this.processImage(foundryData.prototypeToken?.texture?.src),
      // Store embedded items for later processing
      _embeddedItems: embeddedItems
    };
  }
  
  private async mapFoundryToItem(foundryData: any): Promise<IItem | null> {
    return {
      name: foundryData.name,
      type: foundryData.type,
      gameSystemId: 'dnd5e', 
      pluginId: 'dnd-5e-2024',
      data: foundryData.system,
      imageId: await this.processImage(foundryData.img),
      weight: foundryData.system?.weight?.value,
      cost: foundryData.system?.price?.value
    };
  }
  
  private async mapFoundryToDocument(foundryData: any): Promise<IVTTDocument | null> {
    // Map Foundry document types to our documentType field
    const documentTypeMap = {
      'spell': 'spell',
      'background': 'background', 
      'class': 'class',
      'subclass': 'subclass',
      'feat': 'feat',
      'race': 'race',
      'rule': 'rule',
      'text': 'reference',
      'document': 'journal',
      'unknown': 'reference',
      'RollTable': 'table',
      'spells': 'spell-list'
    };
    
    return {
      name: foundryData.name,
      slug: this.generateSlug(foundryData.name),
      pluginId: 'dnd-5e-2024',
      documentType: documentTypeMap[foundryData.type] || 'reference',
      description: foundryData.system?.description?.value || foundryData.description || '',
      data: foundryData.system || foundryData
    };
  }
  
  private extractEmbeddedItems(foundryItems: any[]): any[] {
    // Extract spells, equipment, feats from actor items
    return foundryItems.map(item => ({
      name: item.name,
      type: item.type,
      data: item.system,
      img: item.img
    }));
  }
  
  private deduplicateContent(allData: any): CompendiumImportData {
    // Remove duplicates based on name + type
    // Priority: newer packs (e.g., spells24 over spells)
    const seenItems = new Set();
    
    allData.items = allData.items.filter(item => {
      const key = `${item.name}-${item.type}`;
      if (seenItems.has(key)) return false;
      seenItems.add(key);
      return true;
    });
    
    // Similar deduplication for other content types
    return allData;
  }
  
  private extractAssets(foundryData: any): AssetData[] { /* ... */ }
}
```

**Foundry Pack Analysis Results:**
```typescript
// Complete pack inventory from analysis
const FOUNDRY_PACK_INVENTORY = {
  'actors24': { npc: 331, vehicle: 1, total: 3187 },        // Monsters, NPCs, vehicles
  'backgrounds': { background: 1, feat: 1, total: 5 },      // Character backgrounds
  'classes': { class: 12, total: 12 },                      // Base character classes
  'classes24': { class: 12, subclass: 12, feat: 255, total: 461 }, // Classes + features
  'classfeatures': { feat: 234, total: 295 },               // Class features and abilities
  'content24': { text: 563, document: 79, total: 1142 },    // Reference content
  'equipment24': { weapon: 277, equipment: 242, total: 977 }, // Weapons, armor, gear
  'feats24': { feat: 17, total: 27 },                       // Character feats
  'heroes': { character: 12, mixed: 385, total: 397 },      // Sample characters + gear
  'items': { weapon: 277, equipment: 242, total: 937 },     // Additional equipment
  'monsterfeatures': { feat: 251, total: 252 },             // Monster abilities
  'monsters': { npc: 331, mixed: 1893, total: 2224 },       // Monsters + abilities
  'origins24': { race: 14, background: 4, total: 73 },      // Races and backgrounds
  'races': { race: 9, feat: 25, total: 50 },                // Character races
  'rules': { rule: 311, text: 97, total: 448 },             // Rules reference
  'spells': { spell: 319, total: 383 },                     // Legacy spells
  'spells24': { spell: ~300, total: 609 },                  // Updated spells
  'subclasses': { subclass: 12, total: 12 },                // Character subclasses
  'tables': { text: 192, document: 72, total: 295 },        // Random tables (legacy)
  'tables24': { text: 563, document: 79, total: 718 },      // Random tables (updated)
  'tradegoods': { loot: 23, total: 23 }                     // Trade goods and commodities
};

// Total estimated content for D&D 5e 2024
const TOTAL_ESTIMATED_CONTENT = {
  actors: 350,      // NPCs, monsters, sample characters
  items: 800,       // Weapons, equipment, consumables, tools, loot
  documents: 1500,  // Spells, classes, races, feats, rules, tables
  assets: 500       // Images for portraits, tokens, items
};
```

**Special Import Considerations:**

1. **Pack Priorities** - Prefer `*24` packs over legacy versions for D&D 2024 content
2. **Embedded Content** - Monsters and characters have embedded spells/equipment 
3. **Cross-References** - Class features reference parent classes
4. **Asset Paths** - Most assets use relative paths to Foundry's icons directory
5. **Deduplication** - Same content appears in multiple packs with slight variations

### 4. Import Processing Pipeline

#### Phase 1: Validation and Preparation
1. **Upload Processing** - Extract ZIP/validate structure
2. **Manifest Validation** - Verify required fields and format
3. **Content Validation** - Check JSON schemas and data integrity
4. **Asset Validation** - Verify image formats and sizes
5. **Conflict Detection** - Check for existing content conflicts

#### Phase 2: Asset Processing
1. **Asset Upload** - Upload to MinIO with organized paths
2. **Image Processing** - Generate thumbnails and optimize
3. **Asset Registration** - Create Asset documents in MongoDB
4. **Reference Mapping** - Map asset references in content

#### Phase 3: Content Import
1. **Database Transaction** - Ensure atomicity
2. **Content Creation** - Create Actor/Item/Document records
3. **Compendium Registration** - Create compendium and entry records
4. **Search Indexing** - Build search optimization data
5. **Cleanup** - Remove temporary files

#### Phase 4: Post-Processing
1. **Validation** - Verify import success
2. **Statistics** - Update compendium stats
3. **Notifications** - Notify user of completion
4. **Audit Log** - Record import activity

### 5. API Endpoints

#### Compendium Management
```typescript
// REST Endpoints
GET    /compendiums                    # List compendiums
GET    /compendiums/:id                # Get compendium details
POST   /compendiums/import             # Import from ZIP
POST   /compendiums/import/foundry     # Import from Foundry
DELETE /compendiums/:id                # Delete compendium
PUT    /compendiums/:id                # Update metadata

// Search and Browse
GET    /compendiums/:id/contents       # Get compendium contents
GET    /compendiums/search             # Search across compendiums
GET    /compendiums/:id/actors         # Get actors in compendium
GET    /compendiums/:id/items          # Get items in compendium
GET    /compendiums/:id/documents      # Get documents in compendium
```

#### WebSocket Events
```typescript
// Real-time import progress
'compendium:import:progress'   # Import progress updates
'compendium:import:complete'   # Import completion
'compendium:import:error'      # Import error

// Content updates
'compendium:content:added'     # New content added
'compendium:content:updated'   # Content updated
'compendium:content:removed'   # Content removed
```

### 6. User Interface

#### Compendium Browser
- **Grid/List View** - Browse compendiums with filtering
- **Search Interface** - Full-text search across content
- **Category Filters** - Filter by official/community/homebrew
- **Tag System** - Filter and discover by tags
- **Preview Panels** - Quick preview of content

#### Import Wizard
- **Upload Interface** - Drag-and-drop ZIP upload
- **Foundry Import** - Select Foundry data directory
- **Progress Tracking** - Real-time import progress
- **Error Handling** - Clear error messages and resolution
- **Preview Mode** - Preview content before final import

#### Management Interface
- **Compendium Details** - Edit metadata and settings
- **Content Overview** - Statistics and content breakdown
- **Update System** - Handle compendium updates
- **Export Tools** - Export compendiums to ZIP format

### 7. Technical Implementation

#### Backend Services

**CompendiumService**
```typescript
class CompendiumService {
  async importFromZip(file: Buffer, metadata: ImportMetadata): Promise<ICompendium>
  async importFromFoundry(packPaths: string[]): Promise<ICompendium>
  async deleteCompendium(id: string): Promise<void>
  async searchContent(query: SearchQuery): Promise<SearchResults>
  async getCompendiumContents(id: string, filters: ContentFilters): Promise<CompendiumContent>
}
```

**AssetImportService**
```typescript
class AssetImportService {
  async processAssets(assets: AssetData[], compendiumId: string): Promise<AssetMapping>
  async uploadToMinio(asset: AssetData, path: string): Promise<IAsset>
  async generateThumbnails(imageAsset: IAsset): Promise<IAsset[]>
}
```


#### Frontend Components

**Compendium Browser** (`CompendiumBrowser.vue`)
- Grid/list toggle
- Search and filtering
- Pagination
- Category navigation

**Import Wizard** (`CompendiumImportWizard.vue`)
- Multi-step import process
- File upload handling
- Progress visualization
- Error display

**Content Viewer** (`CompendiumContentViewer.vue`)
- Tabbed interface (Actors/Items/Documents)
- Quick preview modals
- Add to campaign functionality

### 8. D&D 5e Type System and Validation

#### Zod Schema Architecture

The D&D 5e 2024 plugin will define comprehensive Zod schemas for all content types, providing both runtime validation and TypeScript type inference.

**Schema Organization:**
```typescript
// packages/plugins/dnd-5e-2024/src/shared/schemas/
├── actors/
│   ├── character.schema.mts      // Player character data
│   ├── npc.schema.mts           // Non-player character data  
│   ├── monster.schema.mts       // Monster/creature data
│   └── vehicle.schema.mts       // Vehicle data
├── items/
│   ├── weapon.schema.mts        // Weapons
│   ├── armor.schema.mts         // Armor and shields
│   ├── equipment.schema.mts     // General equipment
│   ├── consumable.schema.mts    // Potions, scrolls, etc.
│   ├── tool.schema.mts          // Tools and kits
│   ├── container.schema.mts     // Bags, chests, etc.
│   └── loot.schema.mts          // Treasure and valuables
├── documents/
│   ├── spell.schema.mts         // Spell definitions
│   ├── class.schema.mts         // Character classes
│   ├── subclass.schema.mts      // Class specializations
│   ├── background.schema.mts    // Character backgrounds
│   ├── race.schema.mts          // Character races/species
│   ├── feat.schema.mts          // Feats and abilities
│   ├── rule.schema.mts          // Rules text
│   └── table.schema.mts         // Random tables
├── common/
│   ├── abilities.schema.mts     // Ability scores (STR, DEX, etc.)
│   ├── skills.schema.mts        // Skill definitions
│   ├── damage.schema.mts        // Damage types and formulas
│   ├── conditions.schema.mts    // Status conditions
│   └── currency.schema.mts      // Money and treasure
└── index.mts                    // Export all schemas
```

#### Core Schema Definitions

**Common Schemas:**
```typescript
// abilities.schema.mts
export const abilityScoreSchema = z.object({
  value: z.number().min(1).max(30),
  proficient: z.number().min(0).max(2), // 0=none, 1=proficient, 2=expertise
  max: z.number().nullable(),
  bonuses: z.object({
    check: z.string().default(''),
    save: z.string().default('')
  })
});

export const abilitiesSchema = z.object({
  str: abilityScoreSchema,
  dex: abilityScoreSchema,
  con: abilityScoreSchema,
  int: abilityScoreSchema,
  wis: abilityScoreSchema,
  cha: abilityScoreSchema
});

// damage.schema.mts
export const damageSchema = z.object({
  number: z.number().nullable(),
  denomination: z.number().min(0), // die size (d6 = 6, d20 = 20)
  types: z.array(z.string()),
  custom: z.object({
    enabled: z.boolean(),
    formula: z.string().optional()
  }),
  scaling: z.object({
    number: z.number().default(1)
  }),
  bonus: z.string().default('')
});

// currency.schema.mts
export const currencySchema = z.object({
  cp: z.number().min(0).default(0), // copper pieces
  sp: z.number().min(0).default(0), // silver pieces  
  ep: z.number().min(0).default(0), // electrum pieces
  gp: z.number().min(0).default(0), // gold pieces
  pp: z.number().min(0).default(0)  // platinum pieces
});
```

**Actor Schemas:**
```typescript
// actors/character.schema.mts
export const characterDataSchema = z.object({
  // Core abilities (STR, DEX, CON, INT, WIS, CHA)
  abilities: abilitiesSchema,
  
  // Character attributes
  attributes: z.object({
    ac: z.record(z.unknown()), // Complex AC calculation system
    hp: z.object({
      value: z.number().min(0),
      max: z.number().min(1),
      temp: z.number().min(0).default(0),
      tempmax: z.number().min(0).default(0)
    }),
    init: z.record(z.unknown()), // Initiative modifiers
    movement: z.object({
      walk: z.number().min(0).default(30),
      fly: z.number().min(0).default(0),
      swim: z.number().min(0).default(0),
      climb: z.number().min(0).default(0),
      burrow: z.number().min(0).default(0),
      hover: z.boolean().default(false)
    }),
    attunement: z.record(z.unknown()),
    senses: z.record(z.unknown()),
    spellcasting: z.record(z.unknown()),
    death: z.record(z.unknown()), // Death saves
    exhaustion: z.number().min(0).max(6).default(0),
    inspiration: z.boolean().default(false),
    concentration: z.record(z.unknown())
  }),
  
  // Character details and background
  details: z.object({
    biography: z.object({
      value: z.string().default(''),
      public: z.string().default('')
    }),
    alignment: z.string().optional(),
    race: z.string().optional(),
    background: z.string().optional(),
    originalClass: z.string().optional(),
    xp: z.object({
      value: z.number().min(0).default(0),
      max: z.number().optional()
    }),
    appearance: z.string().default(''),
    trait: z.string().default(''),
    ideal: z.string().default(''),
    bond: z.string().default(''),
    flaw: z.string().default(''),
    eyes: z.string().default(''),
    height: z.string().default(''),
    faith: z.string().default(''),
    hair: z.string().default(''),
    weight: z.string().default(''),
    gender: z.string().default(''),
    skin: z.string().default(''),
    age: z.string().default('')
  }),
  
  // Character traits and resistances
  traits: z.object({
    size: z.enum(['tiny', 'sm', 'med', 'lg', 'huge', 'grg']),
    languages: z.record(z.unknown()),
    di: z.record(z.unknown()), // damage immunities
    dr: z.record(z.unknown()), // damage resistances  
    dv: z.record(z.unknown()), // damage vulnerabilities
    ci: z.record(z.unknown()), // condition immunities
    weapon: z.record(z.unknown()), // weapon proficiencies
    armor: z.record(z.unknown()), // armor proficiencies
    tool: z.record(z.unknown()), // tool proficiencies
    sense: z.record(z.unknown()) // special senses
  }),
  
  // Money and resources
  currency: currencySchema,
  
  // Skills (18 core D&D skills)
  skills: z.object({
    acr: z.record(z.unknown()), // Acrobatics
    ani: z.record(z.unknown()), // Animal Handling
    arc: z.record(z.unknown()), // Arcana
    ath: z.record(z.unknown()), // Athletics
    dec: z.record(z.unknown()), // Deception
    his: z.record(z.unknown()), // History
    ins: z.record(z.unknown()), // Insight
    itm: z.record(z.unknown()), // Intimidation
    inv: z.record(z.unknown()), // Investigation
    med: z.record(z.unknown()), // Medicine
    nat: z.record(z.unknown()), // Nature
    prc: z.record(z.unknown()), // Perception
    prf: z.record(z.unknown()), // Performance
    per: z.record(z.unknown()), // Persuasion
    rel: z.record(z.unknown()), // Religion
    slt: z.record(z.unknown()), // Sleight of Hand
    ste: z.record(z.unknown()), // Stealth
    sur: z.record(z.unknown())  // Survival
  }),
  
  // Tools and spellcasting
  tools: z.record(z.unknown()),
  spells: z.record(z.unknown()),
  bonuses: z.record(z.unknown()),
  resources: z.record(z.unknown()),
  favorites: z.array(z.unknown()).default([]),
  bastion: z.record(z.unknown()).optional()
});

export type CharacterData = z.infer<typeof characterDataSchema>;

// actors/npc.schema.mts (NPCs and Monsters use same structure)
export const npcDataSchema = z.object({
  // Core abilities
  abilities: abilitiesSchema,
  
  // Creature attributes
  attributes: z.object({
    init: z.record(z.unknown()),
    movement: z.object({
      walk: z.number().min(0).default(30),
      fly: z.number().min(0).default(0),
      swim: z.number().min(0).default(0),
      climb: z.number().min(0).default(0),
      burrow: z.number().min(0).default(0),
      hover: z.boolean().default(false)
    }),
    attunement: z.record(z.unknown()),
    senses: z.record(z.unknown()),
    spellcasting: z.record(z.unknown()),
    exhaustion: z.number().min(0).max(6).default(0),
    concentration: z.record(z.unknown()),
    ac: z.record(z.unknown()),
    hd: z.record(z.unknown()), // Hit dice
    hp: z.object({
      value: z.number().min(1),
      max: z.number().min(1),
      formula: z.string().optional()
    }),
    death: z.record(z.unknown())
  }),
  
  // Creature details
  details: z.object({
    biography: z.object({
      value: z.string().default(''),
      public: z.string().default('')
    }),
    alignment: z.string().optional(),
    ideal: z.string().default(''),
    bond: z.string().default(''),
    flaw: z.string().default(''),
    race: z.string().optional(),
    type: z.object({
      value: z.string(), // creature type (beast, humanoid, etc.)
      subtype: z.string().default(''),
      swarm: z.string().default(''),
      custom: z.string().default('')
    }),
    environment: z.string().default(''),
    cr: z.union([z.number(), z.string()]), // Challenge Rating
    spellLevel: z.number().min(0).default(0)
  }),
  
  // Creature traits and immunities  
  traits: z.object({
    size: z.enum(['tiny', 'sm', 'med', 'lg', 'huge', 'grg']),
    di: z.record(z.unknown()), // damage immunities
    dr: z.record(z.unknown()), // damage resistances
    dv: z.record(z.unknown()), // damage vulnerabilities
    dm: z.record(z.unknown()), // damage modifiers
    ci: z.record(z.unknown()), // condition immunities
    languages: z.record(z.unknown())
  }),
  
  // Money, skills, tools, spells
  currency: currencySchema,
  skills: z.object({
    acr: z.record(z.unknown()), // All 18 D&D skills
    ani: z.record(z.unknown()),
    arc: z.record(z.unknown()),
    ath: z.record(z.unknown()),
    dec: z.record(z.unknown()),
    his: z.record(z.unknown()),
    ins: z.record(z.unknown()),
    itm: z.record(z.unknown()),
    inv: z.record(z.unknown()),
    med: z.record(z.unknown()),
    nat: z.record(z.unknown()),
    prc: z.record(z.unknown()),
    prf: z.record(z.unknown()),
    per: z.record(z.unknown()),
    rel: z.record(z.unknown()),
    slt: z.record(z.unknown()),
    ste: z.record(z.unknown()),
    sur: z.record(z.unknown())
  }),
  tools: z.record(z.unknown()),
  spells: z.record(z.unknown()),
  bonuses: z.record(z.unknown()),
  resources: z.record(z.unknown()),
  source: z.object({
    custom: z.string().default(''),
    rules: z.string().optional(),
    license: z.string().optional(),
    book: z.string().optional()
  })
});

export type NPCData = z.infer<typeof npcDataSchema>;
```

**Item Schemas:**
```typescript
// Base item schema (shared by all item types)
const baseItemSchema = z.object({
  // Description and identification
  description: z.object({
    value: z.string().default(''),
    chat: z.string().default('')
  }),
  identifier: z.string(),
  source: z.object({
    custom: z.string().default(''),
    rules: z.string().optional(),
    license: z.string().optional(),
    book: z.string().optional()
  }),
  
  // Physical properties
  identified: z.boolean().default(true),
  unidentified: z.object({
    description: z.string().default('')
  }),
  container: z.string().nullable().default(null),
  quantity: z.number().min(1).default(1),
  weight: z.object({
    value: z.number().min(0),
    units: z.enum(['lb', 'kg']).default('lb')
  }),
  price: z.object({
    value: z.number().min(0),
    denomination: z.enum(['cp', 'sp', 'ep', 'gp', 'pp']).default('gp')
  }),
  
  // Magic item properties
  rarity: z.enum(['common', 'uncommon', 'rare', 'veryrare', 'legendary', 'artifact']).default('common'),
  attunement: z.enum(['', 'required', 'optional']).default(''),
  attuned: z.boolean().default(false),
  equipped: z.boolean().default(false),
  
  // Combat/usage properties
  cover: z.number().nullable().default(null),
  crewed: z.boolean().default(false),
  hp: z.object({
    value: z.number().nullable().default(null),
    max: z.number().nullable().default(null),
    dt: z.number().nullable().default(null), // damage threshold
    conditions: z.string().default('')
  }),
  
  // Usage and activities
  uses: z.object({
    spent: z.number().default(0),
    recovery: z.array(z.string()).default([]),
    max: z.string().default('')
  }),
  activities: z.record(z.string(), z.record(z.unknown())).default({})
});

// items/weapon.schema.mts
export const weaponDataSchema = baseItemSchema.extend({
  // Weapon-specific type
  type: z.object({
    value: z.enum(['simpleM', 'simpleR', 'martialM', 'martialR', 'siege']),
    baseItem: z.string().default('')
  }),
  
  // Weapon damage
  damage: z.object({
    base: z.object({
      number: z.number().nullable(),
      denomination: z.number().min(0), // die size
      types: z.array(z.string()),
      custom: z.object({
        enabled: z.boolean().default(false)
      }),
      scaling: z.object({
        number: z.number().default(1)
      }),
      bonus: z.string().default('')
    }),
    versatile: z.object({
      number: z.number().nullable(),
      denomination: z.number().min(0),
      types: z.array(z.string()),
      custom: z.object({
        enabled: z.boolean().default(false)
      }),
      scaling: z.object({
        number: z.number().default(1)
      }),
      bonus: z.string().default('')
    })
  }),
  
  // Weapon properties and bonuses
  magicalBonus: z.number().default(0),
  properties: z.array(z.string()).default([]), // ['finesse', 'light', 'versatile', etc.]
  proficient: z.number().nullable().default(null),
  
  // Weapon range
  range: z.object({
    value: z.number().nullable().default(null),
    long: z.number().nullable().default(null),
    reach: z.number().nullable().default(null),
    units: z.string().default('')
  }),
  
  // Weapon mastery (D&D 2024)
  mastery: z.string().default(''),
  
  // Ammunition
  ammunition: z.record(z.unknown()).default({}),
  
  // Armor value (for shields)
  armor: z.object({
    value: z.number().nullable().default(null)
  })
});

export type WeaponData = z.infer<typeof weaponDataSchema>;

// items/equipment.schema.mts (for armor, gear, etc.)
export const equipmentDataSchema = baseItemSchema.extend({
  // Equipment type
  type: z.object({
    value: z.enum(['light', 'medium', 'heavy', 'shield', 'clothing', 'trinket', 'vehicle', 'other']),
    baseItem: z.string().default('')
  }),
  
  // Armor properties
  armor: z.object({
    value: z.number().nullable().default(null),
    magicalBonus: z.number().nullable().default(null),
    dex: z.number().nullable().default(null) // max dex bonus
  }),
  
  // Additional equipment properties
  properties: z.array(z.string()).default([]),
  speed: z.object({
    value: z.number().nullable().default(null),
    conditions: z.string().default('')
  }),
  strength: z.number().nullable().default(null), // strength requirement
  proficient: z.number().nullable().default(null)
});

export type EquipmentData = z.infer<typeof equipmentDataSchema>;

// items/consumable.schema.mts
export const consumableDataSchema = baseItemSchema.extend({
  type: z.object({
    value: z.enum(['potion', 'scroll', 'wand', 'rod', 'ammo', 'food', 'poison', 'other']),
    baseItem: z.string().default('')
  }),
  
  // Consumable-specific properties
  properties: z.array(z.string()).default([]),
  magicalBonus: z.number().default(0)
});

export type ConsumableData = z.infer<typeof consumableDataSchema>;
```

**Document Schemas:**
```typescript
// documents/spell.schema.mts
export const spellDataSchema = z.object({
  // Core spell properties
  level: z.number().min(0).max(9), // 0 = cantrip
  school: z.enum(['abj', 'con', 'div', 'enc', 'evo', 'ill', 'nec', 'trs']),
  identifier: z.string(),
  
  // Description and source
  description: z.object({
    value: z.string(),
    chat: z.string().default('')
  }),
  source: z.object({
    custom: z.string().default(''),
    rules: z.string().optional(),
    license: z.string().optional(),
    book: z.string().optional()
  }),
  
  // Spell components (stored as properties array in Foundry)
  properties: z.array(z.string()), // ['vocal', 'somatic', 'material', 'concentration']
  
  // Material components
  materials: z.object({
    value: z.string().default(''),
    consumed: z.boolean().default(false),
    cost: z.number().min(0).default(0),
    supply: z.number().min(0).default(0)
  }),
  
  // Preparation mode
  preparation: z.object({
    mode: z.enum(['prepared', 'pact', 'always', 'atwill', 'innate']),
    prepared: z.boolean().default(false)
  }),
  
  // Casting details
  activation: z.object({
    type: z.enum(['action', 'bonus', 'reaction', 'minute', 'hour']),
    condition: z.string().default(''),
    value: z.number().nullable()
  }),
  
  // Duration
  duration: z.object({
    value: z.string(), // Can be number or string like "10" 
    units: z.enum(['inst', 'turn', 'round', 'minute', 'hour', 'day', 'month', 'year', 'perm', 'spec'])
  }),
  
  // Range
  range: z.object({
    units: z.enum(['self', 'touch', 'ft', 'mi', 'any', 'spec']),
    special: z.string().default('')
  }),
  
  // Target
  target: z.object({
    affects: z.object({
      choice: z.boolean(),
      count: z.string(),
      type: z.string(),
      special: z.string().default('')
    }),
    template: z.object({
      units: z.string().default(''),
      contiguous: z.boolean().default(false),
      type: z.string().default('')
    })
  }),
  
  // Uses and recovery
  uses: z.object({
    max: z.string().default(''),
    spent: z.number().default(0),
    recovery: z.array(z.string()).default([])
  }),
  
  // Activities (Foundry's complex spell effects system)
  activities: z.record(z.string(), z.object({
    type: z.string(),
    _id: z.string(),
    sort: z.number(),
    name: z.string().default(''),
    img: z.string().default(''),
    activation: z.object({
      type: z.string(),
      value: z.number().nullable(),
      override: z.boolean().default(false)
    }),
    // ... other activity fields as needed
  })).default({})
});

export type SpellData = z.infer<typeof spellDataSchema>;

// documents/class.schema.mts
export const classDataSchema = z.object({
  identifier: z.string(), // unique class identifier
  levels: z.number().min(1).max(20).default(1),
  hitDice: z.object({
    faces: z.number().min(4).max(12), // d4, d6, d8, d10, d12
    number: z.number().min(1).default(1)
  }),
  primaryAbility: z.array(z.enum(['str', 'dex', 'con', 'int', 'wis', 'cha'])),
  saves: z.array(z.enum(['str', 'dex', 'con', 'int', 'wis', 'cha'])),
  skills: z.object({
    number: z.number().min(0),
    choices: z.array(z.string()),
    value: z.array(z.string())
  }),
  spellcasting: z.object({
    progression: z.enum(['none', 'full', 'half', 'third', 'pact', 'artificer']).default('none'),
    ability: z.enum(['int', 'wis', 'cha']).optional(),
    ritual: z.boolean().default(false),
    focus: z.boolean().default(false)
  }),
  advancement: z.array(z.object({
    type: z.string(),
    level: z.number().min(1).max(20),
    configuration: z.record(z.unknown())
  }))
});

export type ClassData = z.infer<typeof classDataSchema>;
```

#### Type Discriminators and Validation

**Actor Type Discrimination:**
```typescript
// Type discriminated unions for actors
export type ActorData = 
  | { type: 'character'; data: CharacterData }
  | { type: 'npc'; data: MonsterData }
  | { type: 'vehicle'; data: VehicleData };

// Validation function
export function validateActorData(type: string, data: unknown): ValidationResult {
  switch (type) {
    case 'character':
      return characterDataSchema.safeParse(data);
    case 'npc':
      return monsterDataSchema.safeParse(data);
    case 'vehicle':
      return vehicleDataSchema.safeParse(data);
    default:
      return { success: false, error: new Error(`Unknown actor type: ${type}`) };
  }
}
```

**Item Type Discrimination:**
```typescript
export type ItemData =
  | { type: 'weapon'; data: WeaponData }
  | { type: 'equipment'; data: ArmorData }
  | { type: 'consumable'; data: ConsumableData }
  | { type: 'tool'; data: ToolData }
  | { type: 'loot'; data: LootData }
  | { type: 'container'; data: ContainerData };

export function validateItemData(type: string, data: unknown): ValidationResult {
  switch (type) {
    case 'weapon':
      return weaponDataSchema.safeParse(data);
    case 'equipment':
      return armorDataSchema.safeParse(data);
    // ... other cases
    default:
      return { success: false, error: new Error(`Unknown item type: ${type}`) };
  }
}
```

**Document Type Discrimination:**
```typescript
export type DocumentData =
  | { documentType: 'spell'; data: SpellData }
  | { documentType: 'class'; data: ClassData }
  | { documentType: 'background'; data: BackgroundData }
  | { documentType: 'race'; data: RaceData }
  | { documentType: 'feat'; data: FeatData };

export function validateDocumentData(documentType: string, data: unknown): ValidationResult {
  switch (documentType) {
    case 'spell':
      return spellDataSchema.safeParse(data);
    case 'class':
      return classDataSchema.safeParse(data);
    // ... other cases
    default:
      return { success: false, error: new Error(`Unknown document type: ${documentType}`) };
  }
}
```

#### Schema Validation Analysis

**Comparison of Proposed Schemas vs. Actual Foundry Data:**

Based on comprehensive analysis of Foundry VTT D&D 5e 2024 packs, here are the key findings:

**✅ Correctly Captured Fields:**
- **Actor abilities** - All 6 core abilities (STR, DEX, CON, INT, WIS, CHA) with proper structure
- **Skills** - All 18 D&D skills with correct abbreviations (acr, ani, arc, etc.)
- **Movement types** - Walk, fly, swim, climb, burrow, hover
- **Currency** - Standard D&D coin types (cp, sp, ep, gp, pp)
- **Core item properties** - Weight, price, rarity, attunement, identification
- **Spell fundamentals** - Level, school, components, materials, duration, range

**🔧 Schema Adjustments Made:**
- **Complex nested objects** - Many Foundry fields are complex nested objects that we simplified to `z.record(z.unknown())` for initial implementation
- **Activities system** - Foundry uses a complex "activities" system for spells/items that we accommodate as flexible records
- **Source attribution** - Added proper source tracking with rules, license, book fields
- **Type discrimination** - Properly mapped Foundry types to our content models

**⚠️ Notable Foundry Complexities:**
1. **Activities System** - Foundry uses dynamic activity objects for spell effects, item usage, etc.
2. **Advancement Arrays** - Classes, races, backgrounds use complex advancement progression arrays
3. **Nested Object Structures** - Many fields are deeply nested objects with game-specific logic
4. **Dynamic IDs** - Foundry uses generated IDs for embedded objects and cross-references

**🎯 Schema Strategy:**
Our schemas use a **hybrid approach**:
- **Strict typing** for core, well-understood fields (abilities, movement, etc.)
- **Flexible typing** (`z.record(z.unknown())`) for complex Foundry-specific systems
- **Gradual refinement** - Can add more specific schemas for complex fields as needed

**📋 Document Type Mappings Confirmed:**
```typescript
// All major D&D content types properly mapped
'spell' → VTTDocument (spellDataSchema)
'background' → VTTDocument (backgroundDataSchema) 
'class' → VTTDocument (classDataSchema)
'subclass' → VTTDocument (subclassDataSchema)
'feat' → VTTDocument (featDataSchema)
'race' → VTTDocument (raceDataSchema)
'weapon' → Item (weaponDataSchema)
'equipment' → Item (equipmentDataSchema)
'consumable' → Item (consumableDataSchema)
'tool' → Item (toolDataSchema)
'loot' → Item (lootDataSchema)
'npc' → Actor (npcDataSchema)
'character' → Actor (characterDataSchema)
```

#### Integration with Import System

**Updated Foundry Converter:**
```typescript
import { validateActorData, validateItemData, validateDocumentData } from '../schemas/index.mjs';

class FoundryVTTConverter {
  private async mapFoundryToActor(foundryData: any): Promise<IActor | null> {
    // Direct mapping of Foundry system data with minimal transformation
    const mappedData = foundryData.system;
    
    // Validate using Zod schema - allows both strict and flexible fields
    const validation = validateActorData(foundryData.type, mappedData);
    if (!validation.success) {
      console.warn(`Invalid actor data for ${foundryData.name}:`, validation.error);
      // Continue with partial data rather than failing completely
      return this.createActorWithPartialData(foundryData);
    }
    
    return {
      name: foundryData.name,
      type: foundryData.type,
      gameSystemId: 'dnd5e',
      pluginId: 'dnd-5e-2024',
      data: mappedData, // Preserve original Foundry structure
      avatarId: await this.processImage(foundryData.img),
      defaultTokenImageId: await this.processImage(foundryData.prototypeToken?.texture?.src)
    };
  }
  
  private createActorWithPartialData(foundryData: any): IActor | null {
    // Fallback for complex data that doesn't perfectly match schemas
    return {
      name: foundryData.name,
      type: foundryData.type,
      gameSystemId: 'dnd5e',
      pluginId: 'dnd-5e-2024', 
      data: foundryData.system || {}, // Accept any structure as fallback
      avatarId: null,
      defaultTokenImageId: null
    };
  }
}
```

**Schema Refinement Strategy:**
1. **Phase 1** - Use flexible schemas to import all content successfully
2. **Phase 2** - Gradually refine schemas for critical fields based on usage
3. **Phase 3** - Add strict validation for new content creation while preserving imported data

### 9. Plugin Integration

#### Plugin API Extensions
```typescript
interface PluginCompendiumAPI {
  // Schema-based validation
  getActorSchema(type: string): z.ZodSchema;
  getItemSchema(type: string): z.ZodSchema;
  getDocumentSchema(documentType: string): z.ZodSchema;
  
  // Validation functions
  validateActorData(type: string, data: unknown): ValidationResult;
  validateItemData(type: string, data: unknown): ValidationResult;
  validateDocumentData(documentType: string, data: unknown): ValidationResult;
  
  // Type-safe transformations
  transformImportedActor<T extends ActorData>(actor: IActor & { data: T }): IActor & { data: T };
  transformImportedItem<T extends ItemData>(item: IItem & { data: T }): IItem & { data: T };
  transformImportedDocument<T extends DocumentData>(doc: IVTTDocument & { data: T }): IVTTDocument & { data: T };
  
  // Custom compendium categories
  getCompendiumCategories(): CompendiumCategory[];
  
  // Search enhancements
  enhanceSearchQuery(query: string): string;
  customSearchFilters(): SearchFilter[];
}
```

### 9. Security and Permissions

#### Access Control
- **Admin Only** - Compendium creation and deletion
- **GM Access** - Import compendiums to campaigns
- **Player Access** - Browse and search compendiums
- **Content Ownership** - Track who imported what

#### Validation and Safety
- **File Size Limits** - Prevent excessive uploads
- **Content Validation** - Ensure data integrity
- **Malware Scanning** - Scan uploaded assets
- **Rate Limiting** - Prevent abuse of import system

### 10. Performance Considerations

#### Database Optimization
- **Indexing Strategy** - Optimize search and filtering queries
- **Aggregation Pipelines** - Efficient statistics and counting
- **Connection Pooling** - Handle concurrent imports
- **Caching Layer** - Cache frequently accessed compendiums

#### Asset Optimization
- **Lazy Loading** - Load assets on demand
- **CDN Integration** - Serve assets efficiently
- **Image Optimization** - Automatic compression and sizing
- **Progressive Loading** - Improve perceived performance

### 11. Implementation Phases

#### Phase 1: Type System Foundation ✅ COMPLETED
- ✅ **Comprehensive D&D 5e schemas** - Complete type system covering all 21 Foundry pack types
- ✅ **Type discriminators** - Validation functions for ActorData, ItemData, and DocumentData unions
- ✅ **Plugin organization** - Well-structured schema hierarchy in `/packages/plugins/dnd-5e-2024/src/types/`
- ✅ **Type-safe exports** - Full TypeScript integration with proper inference and validation
- ✅ **Foundry mapping** - Complete mapping utilities for all content types with skip logic

**Type Coverage:**
- **Actor types**: Character, NPC (with abilities, skills, movement, currency, etc.)
- **Item types**: Weapon, Equipment, Consumable, Tool, Loot, Container (with damage, price, effects)
- **Document types**: Spell, Class, Background, Race, Feat, Subclass (with activation, duration, requirements)
- **Common schemas**: Abilities, Currency, Damage, Skills, Movement, Source, Description

#### Phase 2: Core Infrastructure ✅ COMPLETED
- ✅ **Database schemas and models** - Compendium and CompendiumEntry models with full MongoDB integration
- ✅ **Enhanced existing models** - Added compendiumId field to Actor, Item, and VTTDocument with proper ObjectId references
- ✅ **Complete REST API** - 13 endpoints covering all compendium CRUD operations, content linking, and statistics
- ✅ **Plugin validation integration** - Extended Plugin interface with validateActorData, validateItemData, and validateVTTDocumentData methods
- ✅ **Service layer** - CompendiumService for business logic and CompendiumValidationService for plugin-based validation
- ✅ **Type safety** - Full TypeScript integration with proper error handling and validation pipelines
- ✅ **Authentication** - Protected endpoints with user session validation
- ✅ **Documentation** - Complete OpenAPI documentation for all endpoints

**Implemented API Endpoints:**
- `GET /api/compendiums` - List compendiums with filtering
- `POST /api/compendiums` - Create new compendium
- `GET /api/compendiums/:id` - Get specific compendium
- `PUT /api/compendiums/:id` - Update compendium
- `DELETE /api/compendiums/:id` - Delete compendium and entries
- `GET /api/compendiums/:id/entries` - Get compendium entries
- `POST /api/compendiums/:id/entries` - Create entry
- `GET /api/compendiums/entries/:id` - Get specific entry
- `PUT /api/compendiums/entries/:id` - Update entry
- `DELETE /api/compendiums/entries/:id` - Delete entry
- `POST /api/compendiums/:id/link` - Link existing content to compendium
- `DELETE /api/compendiums/entries/:id/unlink` - Unlink content from compendium
- `GET /api/compendiums/:id/stats` - Get compendium statistics

**Files Created/Modified in Phase 2:**
- `/packages/shared/src/schemas/compendium.schema.mts` - New compendium schemas
- `/packages/shared/src/types/plugin.mts` - Extended Plugin interface with validation methods
- `/packages/server/src/features/compendiums/` - Complete feature directory structure
  - `models/compendium.model.mts` - Compendium MongoDB model
  - `models/compendium-entry.model.mts` - CompendiumEntry MongoDB model
  - `services/compendium.service.mts` - Complete CRUD and business logic
  - `services/compendium-validation.service.mts` - Plugin-based validation
  - `controllers/compendium.controller.mts` - REST API controllers
  - `routes/compendium.routes.mts` - API route definitions
  - `index.mts` - Feature exports
- Enhanced existing models:
  - `/packages/shared/src/schemas/actor.schema.mts` - Added compendiumId field
  - `/packages/shared/src/schemas/item.schema.mts` - Added compendiumId field  
  - `/packages/shared/src/schemas/vtt-document.schema.mts` - Added compendiumId field
  - `/packages/server/src/features/actors/models/actor.model.mts` - Added compendium reference
  - `/packages/server/src/features/items/models/item.model.mts` - Added compendium reference
  - `/packages/server/src/features/documents/models/vtt-document.model.mts` - Added compendium reference
- `/packages/server/src/app.mts` - Registered compendium routes
- `/packages/server/src/services/plugin-registry.service.mts` - Updated with proper Plugin interface

#### Phase 3: Generic Import System ✅ COMPLETED
- ✅ **ZIP import processing** - Complete ZIP processor service with yauzl for efficient extraction and manifest validation
- ✅ **Content validation** - Integration with plugin validation system (simplified synchronous validation for MVP)
- ✅ **Background job processing** - Import jobs using Pulse (pulsecron) with real-time progress tracking
- ✅ **Transaction management** - Atomic imports with comprehensive rollback capability for failed operations
- ✅ **Asset processing** - Batch asset upload to MinIO with validation, header verification, and URL resolution
- ✅ **Import API endpoints** - Complete REST API for import operations with job status tracking
- ✅ **Error handling** - Comprehensive error handling with cleanup, recovery, and detailed error reporting
- ✅ **VTT Document support** - Created VTTDocument model for spells, classes, backgrounds, races, and feats

**Technical Architecture:**
- **ZIP Processing**: 500MB max file size, supports nested directory structures, validates file types
- **Job System**: Background processing with 2 concurrent jobs max, exponential backoff on failures
- **Asset Validation**: File header validation, MIME type checking, 50MB per asset limit
- **Transaction Safety**: MongoDB transactions with automatic rollback on any failure
- **Progress Tracking**: Real-time progress updates with stage tracking (validating → processing → uploading → complete)
- **Content Types**: Support for actors, items, and VTT documents with plugin-specific validation

**Files Created in Phase 3:**
Core Services:
- `/packages/server/src/services/zip-processor.service.mts` - ZIP extraction with yauzl, manifest validation, security checks
- `/packages/server/src/services/transaction.service.mts` - MongoDB transaction management and asset cleanup
- `/packages/server/src/services/schema-loader.service.mts` - Plugin schema loading (foundation for future async validation)
- `/packages/server/src/services/asset-resolver.service.mts` - Asset URL resolution and content processing

Import Feature:
- `/packages/server/src/features/compendiums/services/import.service.mts` - Core import orchestration logic
- `/packages/server/src/features/compendiums/jobs/compendium-import.job.mts` - Pulse background job handler
- `/packages/server/src/features/compendiums/controllers/import.controller.mts` - REST API controllers
- `/packages/server/src/features/vtt-documents/models/vtt-document.model.mts` - MongoDB model for game documents

Schemas and Types:
- `/packages/shared/src/schemas/import.schema.mts` - Import validation schemas and progress tracking types

Enhanced Components:
- `/packages/server/src/middleware/validation.middleware.mts` - Added ZIP upload validation with 500MB limits
- `/packages/server/src/utils/asset-upload.utils.mts` - Enhanced with batch processing and validation
- `/packages/server/src/features/compendiums/routes/compendium.routes.mts` - Added import route definitions
- `/packages/server/src/jobs/index.mts` - Registered compendium import jobs

**Import API Endpoints:**
- `POST /api/compendiums/import` - Import compendium from ZIP (multipart/form-data, 500MB limit)
- `GET /api/compendiums/import/:jobId/status` - Get detailed import status with progress tracking
- `POST /api/compendiums/validate` - Validate ZIP file structure and manifest without importing
- `DELETE /api/compendiums/import/:jobId` - Cancel pending import jobs (pending jobs only)
- `GET /api/compendiums/import/jobs` - List all import jobs for authenticated user

**Import Process Flow:**
1. **Upload & Validation**: ZIP file uploaded, structure validated, manifest parsed
2. **Job Creation**: Background job created with Base64-encoded ZIP data
3. **Content Processing**: JSON files validated against plugin schemas
4. **Asset Upload**: Images uploaded to MinIO with batch processing
5. **Database Creation**: Atomic transaction creates compendium, entries, and content
6. **Progress Tracking**: Real-time updates via job status API
7. **Cleanup**: Automatic cleanup of temporary data and failed uploads

**Security & Validation:**
- **File Type Validation**: Only ZIP files accepted, header validation for images
- **Size Limits**: 500MB ZIP files, 50MB per asset, configurable limits
- **Content Validation**: Plugin-based validation for all content types
- **Path Security**: Protection against directory traversal attacks
- **Error Boundaries**: Comprehensive error handling with detailed logging

**Performance Features:**
- **Concurrent Processing**: 2 concurrent import jobs maximum
- **Memory Management**: Streaming ZIP processing, buffer cleanup
- **Progress Tracking**: In-memory progress storage with 1-hour TTL
- **Asset Optimization**: Batch asset uploads with parallel processing
- **Transaction Efficiency**: Single transaction for entire import process

**Future Enhancement Hooks:**
- Schema loader service prepared for async plugin validation
- Asset resolver ready for advanced URL rewriting
- Job system extensible for other background operations
- Validation pipeline ready for custom content types

**Note:** Import UI wizard and advanced validation features are planned for Phase 5

#### Phase 4: Foundry Converter Tool ✅ **COMPLETED**
- ✅ Standalone CLI package (`@dungeon-lab/foundry-converter`)
- ✅ LevelDB reader implementation for Foundry packs
- ✅ Plugin-based type mapping and validation
- ✅ Asset reference extraction and mapping
- ✅ Multi-pack conversion support
- ✅ Progress reporting and error handling
- ✅ Dry-run mode for preview
- ✅ Output in standard import format
- ✅ Complete D&D 5e 2024 schema validation system
- ✅ Two-layer validation (shared + plugin schemas)
- ✅ Comprehensive Foundry pack support (21 pack types)

**Key Features:**
- **Zero Server Dependencies**: Runs completely standalone without requiring server startup
- **Plugin Architecture**: Dynamically loads game system plugins for type mapping and validation
- **Standard Output Format**: Compatible with Phase 3 import system 
- **Batch Processing**: Supports converting single packs or entire directories
- **Schema Validation**: Two-layer validation with shared and plugin-specific schemas
- **Multi-LDB Support**: Handles multiple .ldb files per pack correctly
- **Asset Processing**: Token mapping with fa-token-mapping.json integration
- **Actor Inventory**: Properly handles embedded items with `!actors.items!` prefix

**Validation Success Rates (D&D 5e 2024):**
- **Overall Success Rate**: 97.8% (8,965/9,167 content documents successfully validated)
- **Equipment24**: 100% success (932/932 items)
- **Actors24**: 95.8% success (3,046/3,178 actors including NPCs, characters)
- **Spells24**: 100% success (300/300 spells after schema fixes)
- **Classes24**: 100% success for core content (12 classes, 12 subclasses, 255 feats, 121 conditions)
- **Origins24**: 94.5% success (69/73 backgrounds and races)
- **Feats24**: 100% success (17/17 feats)

**D&D Content Coverage:**
- **21 Foundry Pack Types**: Complete support for all D&D 5e 2024 content
- **8,965 Content Items**: Successfully validated and ready for import
- **500+ Assets**: Token images, portraits, and item icons properly mapped
- **Zero Server Coupling**: No Foundry-specific code remains in server

#### Phase 5: User Interface (Week 9-10)
- Compendium browser interface with type-aware previews
- Search and filtering with schema-based categorization
- Content preview and management
- Import progress visualization

#### Phase 6: Polish and Optimization (Week 11-12)
- Performance optimization
- Enhanced search features using type metadata
- Plugin API integration and schema extensions
- Comprehensive documentation and testing
- Validation error reporting and debugging tools

### 12. Server Cleanup Tasks ✅ **COMPLETED**

**✅ Foundry Code Removal Complete**

As part of the architectural decision to make the Foundry converter standalone, all server cleanup has been completed:

**Completed Tasks:**
- ✅ **VTTDocument Model Consolidation**: Fixed duplicate Mongoose model registration by consolidating `/features/vtt-documents/models/vtt-document.model.mts` and `/features/documents/models/vtt-document.model.mts`
- ✅ **Import Path Updates**: Updated all imports to use the enhanced VTTDocument model from `/features/documents/`
- ✅ **File Cleanup**: Removed duplicate model file and empty directory structure
- ✅ **Server Architecture**: Server now has clean separation from Foundry-specific code
- ✅ **Model Consistency**: Both `VTTDocument` and `VTTDocumentModel` exports available for backward compatibility

**Verified Clean State:**
- ✅ **No Foundry Dependencies**: Server package.json contains no level/leveldown dependencies
- ✅ **No LevelDB Code**: No LevelDB imports or utilities in server codebase  
- ✅ **Clean Imports**: All VTTDocument references point to consolidated enhanced model
- ✅ **Server Startup**: Server starts successfully without Mongoose overwrite errors

**Benefits Achieved:**
- **Clean Architecture**: Clear separation between server and conversion tools
- **Stable Operation**: No more model registration conflicts
- **Maintainable Code**: Single source of truth for VTTDocument model
- **Enhanced Features**: Server uses the model with plugin validation and slug generation

**Status:** ✅ **COMPLETED** - Server cleanup is fully complete and verified working.

### 13. Future Enhancements

#### Advanced Features
- **Version Control** - Track compendium versions and updates
- **Collaborative Editing** - Multi-user compendium editing
- **Marketplace Integration** - Content sharing platform
- **AI-Powered Tagging** - Automatic content categorization
- **Cross-Reference Detection** - Find related content automatically

#### Integration Opportunities
- **Other VTT Systems** - Import from Roll20, Fantasy Grounds
- **External APIs** - D&D Beyond, Open5e integration
- **Content Generators** - AI-powered content creation
- **Publishing Tools** - Export to various formats

## Conclusion

This compendium system provides a robust foundation for content management in Dungeon Lab, supporting both generic imports and specific Foundry VTT integration while maintaining the flexibility needed for future enhancements and additional content sources.

The modular design ensures that the system can grow with the platform's needs while providing users with a seamless experience for discovering, importing, and managing game content.