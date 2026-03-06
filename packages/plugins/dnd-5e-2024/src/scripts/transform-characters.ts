#!/usr/bin/env tsx

/**
 * Character Data Transformation Script
 * 
 * Transforms character JSON files from plugins/dnd-5e-2024/data/characters/
 * into the proper Character document format for the system.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { createWriteStream } from 'fs';
import archiver from 'archiver';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface LegacyCharacterData {
  userData: {
    uuid: string;
  };
  name: string;
  description: string;
  avatar: {
    url: string;
    type: string;
    size: number;
    name: string;
    data: null;
  };
  token: {
    url: string;
    type: string;
    size: number;
    name: string;
    data: null;
  };
  data: {
    species: string;
    classes: Array<{
      name: string;
      level: number;
      hitDiceType: string;
    }>;
    background: string;
    alignment: string;
    experiencePoints: number;
    proficiencyBonus: number;
    armorClass: number;
    initiative: number;
    speed: number;
    hitPoints: {
      maximum: number;
      current: number;
      temporary: number;
    };
    hitDice: {
      total: number;
      current: number;
      type: string;
    };
    abilities: {
      strength: {
        score: number;
        modifier: number;
        savingThrow: {
          proficient: boolean;
          bonus: number;
        };
      };
      dexterity: {
        score: number;
        modifier: number;
        savingThrow: {
          proficient: boolean;
          bonus: number;
        };
      };
      constitution: {
        score: number;
        modifier: number;
        savingThrow: {
          proficient: boolean;
          bonus: number;
        };
      };
      intelligence: {
        score: number;
        modifier: number;
        savingThrow: {
          proficient: boolean;
          bonus: number;
        };
      };
      wisdom: {
        score: number;
        modifier: number;
        savingThrow: {
          proficient: boolean;
          bonus: number;
        };
      };
      charisma: {
        score: number;
        modifier: number;
        savingThrow: {
          proficient: boolean;
          bonus: number;
        };
      };
    };
    equipment: Array<{
      id: string;
      quantity: number;
    }>;
    features: Array<{
      name: string;
      source: string;
      description: string;
    }>;
    biography: {
      appearance: string;
      backstory: string;
      personalityTraits: string;
      ideals: string;
      bonds: string;
      flaws: string;
    };
  };
}

type ReferenceObject = {
  _ref: {
    slug: string;
    documentType: string;
    pluginDocumentType: string;
  };
};

interface ContentFileWrapper {
  entry: {
    name: string;
    documentType: string;
    imageId?: string;
    category: string;
    tags: string[];
    sortOrder: number;
  };
  content: TransformedCharacterDocument;
}

interface TransformedCharacterDocument {
  // Base document fields
  id?: string;
  name: string;
  description?: string;
  slug: string;
  pluginDocumentType: string;
  pluginId: string;
  documentType: string;
  source?: string;
  campaignId?: string;
  compendiumId?: string;
  imageId?: string;
  
  // Actor-specific fields
  avatarId?: string;
  tokenImageId?: string;
  inventory?: Array<{
    itemId: string;
    quantity: number;
    equipped: boolean;
    slot?: string;
    condition?: number;
    metadata?: Record<string, unknown>;
  }>;
  
  // User data
  userData: Record<string, unknown>;
  
  // Plugin data
  pluginData: {
    name: string;
    species: ReferenceObject;
    background: ReferenceObject;
    lineage?: string;
    classes: Array<{
      class: ReferenceObject;
      level: number;
      subclass?: {
        subclass: ReferenceObject;
        level: number;
      };
      hitPointsRolled?: number[];
    }>;
    progression: {
      level: number;
      experiencePoints: number;
      proficiencyBonus: number;
      classLevels: Record<string, number>;
      hitDice: Record<string, { total: number; used: number }>;
    };
    attributes: {
      hitPoints: {
        current: number;
        maximum: number;
        temporary: number;
      };
      armorClass: {
        value: number;
        calculation: 'natural' | 'armor' | 'mage_armor' | 'unarmored_defense';
        sources?: string[];
      };
      initiative: {
        bonus: number;
        advantage: boolean;
      };
      movement: {
        walk: number;
        fly?: number;
        swim?: number;
        climb?: number;
        burrow?: number;
        hover?: boolean;
      };
      deathSaves: {
        successes: number;
        failures: number;
      };
      exhaustion: number;
      inspiration: boolean;
    };
    abilities: {
      strength: {
        base: number;
        racial: number;
        enhancement: number;
        override?: number;
        modifier: number;
        total: number;
        saveProficient: boolean;
        saveBonus: number;
      };
      dexterity: {
        base: number;
        racial: number;
        enhancement: number;
        override?: number;
        modifier: number;
        total: number;
        saveProficient: boolean;
        saveBonus: number;
      };
      constitution: {
        base: number;
        racial: number;
        enhancement: number;
        override?: number;
        modifier: number;
        total: number;
        saveProficient: boolean;
        saveBonus: number;
      };
      intelligence: {
        base: number;
        racial: number;
        enhancement: number;
        override?: number;
        modifier: number;
        total: number;
        saveProficient: boolean;
        saveBonus: number;
      };
      wisdom: {
        base: number;
        racial: number;
        enhancement: number;
        override?: number;
        modifier: number;
        total: number;
        saveProficient: boolean;
        saveBonus: number;
      };
      charisma: {
        base: number;
        racial: number;
        enhancement: number;
        override?: number;
        modifier: number;
        total: number;
        saveProficient: boolean;
        saveBonus: number;
      };
    };
    skills: Record<string, {
      proficient: boolean;
      expert: boolean;
      bonus: number;
      advantage: boolean;
      disadvantage: boolean;
    }>;
    proficiencies: {
      armor: string[];
      weapons: Array<ReferenceObject | string>;
      tools: Array<{
        tool: ReferenceObject | string;
        proficient: boolean;
        expert: boolean;
      }>;
      languages: Array<ReferenceObject | string>;
    };
    currency: {
      platinum: number;
      gold: number;
      electrum: number;
      silver: number;
      copper: number;
    };
    features: {
      classFeatures: Array<{
        name: string;
        class: string;
        level: number;
        description?: string;
        uses?: {
          current: number;
          maximum: number;
          per: 'short-rest' | 'long-rest' | 'day';
        };
      }>;
      feats: string[];
      speciesTraits: Array<{
        name: string;
        description: string;
        uses?: {
          current: number;
          maximum: number;
          per: 'short-rest' | 'long-rest' | 'day';
        };
      }>;
    };
    roleplay: {
      alignment?: string;
      personality: string;
      ideals: string;
      bonds: string;
      flaws: string;
      appearance: string;
      backstory: string;
    };
    size: 'tiny' | 'small' | 'medium' | 'large' | 'huge' | 'gargantuan';
    source?: string;
    creationDate?: Date;
    lastModified?: Date;
  };
}

/**
 * Creates a URL-friendly slug from a name
 */
function createSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

/**
 * Maps legacy alignment to 2024 format
 */
function mapAlignment(legacyAlignment: string): string {
  const alignmentMap: Record<string, string> = {
    'lawful-good': 'lawful-good',
    'neutral-good': 'neutral-good',
    'chaotic-good': 'chaotic-good',
    'lawful-neutral': 'lawful-neutral',
    'true-neutral': 'neutral',
    'chaotic-neutral': 'chaotic-neutral',
    'lawful-evil': 'lawful-evil',
    'neutral-evil': 'neutral-evil',
    'chaotic-evil': 'chaotic-evil'
  };
  
  return alignmentMap[legacyAlignment] || 'neutral';
}

/**
 * Maps legacy species to references
 */
function mapSpecies(species: string): ReferenceObject {
  // Map common species names to their document references
  const speciesMap: Record<string, string> = {
    'human': 'human',
    'elf': 'elf', 
    'dwarf': 'dwarf',
    'halfling': 'halfling',
    'dragonborn': 'dragonborn',
    'gnome': 'gnome',
    'half-elf': 'half-elf',
    'half-orc': 'half-orc',
    'tiefling': 'tiefling'
  };
  
  return {
    _ref: {
      slug: speciesMap[species] || species,
      documentType: 'vtt-document',
      pluginDocumentType: 'species'
    }
  };
}

/**
 * Maps legacy background to references
 */
function mapBackground(background: string): ReferenceObject {
  return {
    _ref: {
      slug: background,
      documentType: 'vtt-document',
      pluginDocumentType: 'background'
    }
  };
}

/**
 * Maps legacy class to references
 */
function mapClass(className: string): ReferenceObject {
  return {
    _ref: {
      slug: className,
      documentType: 'vtt-document',
      pluginDocumentType: 'character-class'
    }
  };
}

/**
 * Determines character size based on species
 */
function getCharacterSize(species: string): 'tiny' | 'small' | 'medium' | 'large' | 'huge' | 'gargantuan' {
  const smallSpecies = ['halfling', 'gnome'];
  return smallSpecies.includes(species) ? 'small' : 'medium';
}

/**
 * Transforms legacy character data to new format
 */
function transformCharacter(legacy: LegacyCharacterData): ContentFileWrapper {
  const slug = createSlug(legacy.name);
  const totalLevel = legacy.data.classes.reduce((sum, cls) => sum + cls.level, 0);
  const classLevels: Record<string, number> = {};
  const hitDice: Record<string, { total: number; used: number }> = {};
  
  // Process classes
  legacy.data.classes.forEach(cls => {
    classLevels[cls.name] = cls.level;
    hitDice[cls.name] = {
      total: cls.level,
      used: 0 // Default to no used hit dice
    };
  });

  // Initialize skills (all skills unproficient by default)
  const skills: Record<string, { proficient: boolean; expert: boolean; bonus: number; advantage: boolean; disadvantage: boolean }> = {
    'acrobatics': { proficient: false, expert: false, bonus: 0, advantage: false, disadvantage: false },
    'animal-handling': { proficient: false, expert: false, bonus: 0, advantage: false, disadvantage: false },
    'arcana': { proficient: false, expert: false, bonus: 0, advantage: false, disadvantage: false },
    'athletics': { proficient: false, expert: false, bonus: 0, advantage: false, disadvantage: false },
    'deception': { proficient: false, expert: false, bonus: 0, advantage: false, disadvantage: false },
    'history': { proficient: false, expert: false, bonus: 0, advantage: false, disadvantage: false },
    'insight': { proficient: false, expert: false, bonus: 0, advantage: false, disadvantage: false },
    'intimidation': { proficient: false, expert: false, bonus: 0, advantage: false, disadvantage: false },
    'investigation': { proficient: false, expert: false, bonus: 0, advantage: false, disadvantage: false },
    'medicine': { proficient: false, expert: false, bonus: 0, advantage: false, disadvantage: false },
    'nature': { proficient: false, expert: false, bonus: 0, advantage: false, disadvantage: false },
    'perception': { proficient: false, expert: false, bonus: 0, advantage: false, disadvantage: false },
    'performance': { proficient: false, expert: false, bonus: 0, advantage: false, disadvantage: false },
    'persuasion': { proficient: false, expert: false, bonus: 0, advantage: false, disadvantage: false },
    'religion': { proficient: false, expert: false, bonus: 0, advantage: false, disadvantage: false },
    'sleight-of-hand': { proficient: false, expert: false, bonus: 0, advantage: false, disadvantage: false },
    'stealth': { proficient: false, expert: false, bonus: 0, advantage: false, disadvantage: false },
    'survival': { proficient: false, expert: false, bonus: 0, advantage: false, disadvantage: false }
  };

  // Remove inventory for now - will handle equipment in a separate transformation
  const inventory: Array<{
    itemId: string;
    quantity: number;
    equipped: boolean;
    slot?: string;
    condition?: number;
    metadata?: Record<string, unknown>;
  }> = [];

  // Transform class features
  const classFeatures = legacy.data.features.map(feature => ({
    name: feature.name,
    class: feature.source,
    level: 1, // Default level
    description: feature.description
  }));

  const content: TransformedCharacterDocument = {
    id: `character-${slug}`,
    name: legacy.name,
    description: legacy.description,
    slug,
    pluginDocumentType: 'character',
    pluginId: 'dnd-5e-2024',
    documentType: 'character',
    source: 'custom',
    
    // Use asset paths from legacy data (these will need to be processed separately)
    avatarId: undefined, // Will need to upload assets separately
    tokenImageId: undefined, // Will need to upload assets separately
    
    inventory,
    userData: legacy.userData || {},
    
    pluginData: {
      name: legacy.name,
      species: mapSpecies(legacy.data.species),
      background: mapBackground(legacy.data.background),
      classes: legacy.data.classes.map(cls => ({
        class: mapClass(cls.name),
        level: cls.level
      })),
      progression: {
        level: totalLevel,
        experiencePoints: legacy.data.experiencePoints,
        proficiencyBonus: legacy.data.proficiencyBonus,
        classLevels,
        hitDice
      },
      attributes: {
        hitPoints: {
          current: legacy.data.hitPoints.current,
          maximum: legacy.data.hitPoints.maximum,
          temporary: legacy.data.hitPoints.temporary
        },
        armorClass: {
          value: legacy.data.armorClass,
          calculation: 'natural' as const
        },
        initiative: {
          bonus: legacy.data.initiative,
          advantage: false
        },
        movement: {
          walk: legacy.data.speed
        },
        deathSaves: {
          successes: 0,
          failures: 0
        },
        exhaustion: 0,
        inspiration: false
      },
      abilities: {
        strength: {
          base: legacy.data.abilities.strength.score,
          racial: 0,
          enhancement: 0,
          modifier: legacy.data.abilities.strength.modifier,
          total: legacy.data.abilities.strength.score,
          saveProficient: legacy.data.abilities.strength.savingThrow.proficient,
          saveBonus: legacy.data.abilities.strength.savingThrow.bonus
        },
        dexterity: {
          base: legacy.data.abilities.dexterity.score,
          racial: 0,
          enhancement: 0,
          modifier: legacy.data.abilities.dexterity.modifier,
          total: legacy.data.abilities.dexterity.score,
          saveProficient: legacy.data.abilities.dexterity.savingThrow.proficient,
          saveBonus: legacy.data.abilities.dexterity.savingThrow.bonus
        },
        constitution: {
          base: legacy.data.abilities.constitution.score,
          racial: 0,
          enhancement: 0,
          modifier: legacy.data.abilities.constitution.modifier,
          total: legacy.data.abilities.constitution.score,
          saveProficient: legacy.data.abilities.constitution.savingThrow.proficient,
          saveBonus: legacy.data.abilities.constitution.savingThrow.bonus
        },
        intelligence: {
          base: legacy.data.abilities.intelligence.score,
          racial: 0,
          enhancement: 0,
          modifier: legacy.data.abilities.intelligence.modifier,
          total: legacy.data.abilities.intelligence.score,
          saveProficient: legacy.data.abilities.intelligence.savingThrow.proficient,
          saveBonus: legacy.data.abilities.intelligence.savingThrow.bonus
        },
        wisdom: {
          base: legacy.data.abilities.wisdom.score,
          racial: 0,
          enhancement: 0,
          modifier: legacy.data.abilities.wisdom.modifier,
          total: legacy.data.abilities.wisdom.score,
          saveProficient: legacy.data.abilities.wisdom.savingThrow.proficient,
          saveBonus: legacy.data.abilities.wisdom.savingThrow.bonus
        },
        charisma: {
          base: legacy.data.abilities.charisma.score,
          racial: 0,
          enhancement: 0,
          modifier: legacy.data.abilities.charisma.modifier,
          total: legacy.data.abilities.charisma.score,
          saveProficient: legacy.data.abilities.charisma.savingThrow.proficient,
          saveBonus: legacy.data.abilities.charisma.savingThrow.bonus
        }
      },
      skills,
      proficiencies: {
        armor: [],
        weapons: [],
        tools: [],
        languages: []
      },
      currency: {
        platinum: 0,
        gold: 50, // Default starting gold
        electrum: 0,
        silver: 0,
        copper: 0
      },
      features: {
        classFeatures,
        feats: [],
        speciesTraits: []
      },
      roleplay: {
        alignment: mapAlignment(legacy.data.alignment),
        personality: legacy.data.biography.personalityTraits || '',
        ideals: legacy.data.biography.ideals || '',
        bonds: legacy.data.biography.bonds || '',
        flaws: legacy.data.biography.flaws || '',
        appearance: legacy.data.biography.appearance || '',
        backstory: legacy.data.biography.backstory || ''
      },
      size: getCharacterSize(legacy.data.species),
      source: 'custom',
      creationDate: new Date(),
      lastModified: new Date()
    }
  };

  return {
    entry: {
      name: legacy.name,
      documentType: 'character',
      imageId: undefined, // Will be set by the asset copying logic
      category: 'Characters',
      tags: ['character', 'custom'],
      sortOrder: 0
    },
    content
  };
}

/**
 * Copy image file to assets directory and return relative path
 */
async function copyImageAsset(sourcePath: string, assetName: string, assetsDir: string): Promise<string | undefined> {
  try {
    const sourceFile = path.resolve(__dirname, '../../data', sourcePath);
    const ext = path.extname(sourcePath) || '.png';
    const assetFileName = `${assetName}${ext}`;
    const targetFile = path.join(assetsDir, 'characters', assetFileName);
    
    // Ensure target directory exists
    await fs.mkdir(path.dirname(targetFile), { recursive: true });
    
    // Check if source file exists
    try {
      await fs.access(sourceFile);
      // Copy the file
      await fs.copyFile(sourceFile, targetFile);
      return `characters/${assetFileName}`;
    } catch {
      console.warn(`Asset not found: ${sourceFile}`);
      return undefined;
    }
  } catch (error) {
    console.error(`Error copying asset ${sourcePath}:`, error);
    return undefined;
  }
}

/**
 * Create a zip file from a directory
 */
async function createZipFile(sourceDir: string, targetZipPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const output = createWriteStream(targetZipPath);
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });

    output.on('close', () => {
      console.log(`Zip file created: ${archive.pointer()} total bytes`);
      resolve();
    });

    archive.on('error', (err) => {
      reject(err);
    });

    archive.pipe(output);

    // Add the entire directory to the zip
    archive.directory(sourceDir, false);

    archive.finalize();
  });
}

/**
 * Main transformation function
 */
async function main() {
  const charactersDir = path.resolve(__dirname, '../../data/characters');
  const outputDir = path.resolve(__dirname, '../../packs/custom-characters');
  
  // Create output directory structure like 5etools converter
  const contentDir = path.join(outputDir, 'content', 'characters');
  const assetsDir = path.join(outputDir, 'assets');
  
  await fs.mkdir(contentDir, { recursive: true });
  await fs.mkdir(path.join(assetsDir, 'characters'), { recursive: true });
  
  // Read all character files
  const files = await fs.readdir(charactersDir);
  const characterFiles = files.filter(file => file.endsWith('.json'));
  
  console.log(`Found ${characterFiles.length} character files to transform`);
  
  const transformedCharacters: ContentFileWrapper[] = [];
  
  for (const file of characterFiles) {
    try {
      const filePath = path.join(charactersDir, file);
      const content = await fs.readFile(filePath, 'utf-8');
      const legacyData: LegacyCharacterData = JSON.parse(content);
      
      console.log(`Transforming ${legacyData.name}...`);
      
      const transformed = transformCharacter(legacyData);
      
      // Handle avatar asset
      if (legacyData.avatar?.url) {
        const avatarPath = await copyImageAsset(
          legacyData.avatar.url,
          `${createSlug(legacyData.name)}-avatar`,
          assetsDir
        );
        if (avatarPath) {
          transformed.content.avatarId = avatarPath;
          transformed.entry.imageId = avatarPath;
        }
      }
      
      // Handle token asset  
      if (legacyData.token?.url) {
        const tokenPath = await copyImageAsset(
          legacyData.token.url,
          `${createSlug(legacyData.name)}-token`,
          assetsDir
        );
        if (tokenPath) {
          transformed.content.tokenImageId = tokenPath;
          // Use avatar for entry imageId, fall back to token
          if (!transformed.entry.imageId) {
            transformed.entry.imageId = tokenPath;
          }
        }
      }
      
      transformedCharacters.push(transformed);
      
      // Write individual character file to content directory
      const outputFile = path.join(contentDir, `character-${transformed.content.slug}.json`);
      await fs.writeFile(outputFile, JSON.stringify(transformed, null, 2));
      
    } catch (error) {
      console.error(`Error transforming ${file}:`, error);
    }
  }
  
  // Create manifest.json file like the 5etools converter
  const manifest = {
    name: 'Custom Characters',
    slug: 'custom-characters',
    description: 'Converted legacy character data',
    version: '1.0.0',
    gameSystemId: 'dnd-5e-2024',
    pluginId: 'dnd-5e-2024',
    contentTypes: ['character'],
    assetDirectory: 'assets',
    contentDirectory: 'content',
    authors: ['Character Converter'],
    license: 'Custom',
    sourceType: 'legacy-conversion',
    contents: {
      character: transformedCharacters.length
    }
  };
  
  await fs.writeFile(
    path.join(outputDir, 'manifest.json'),
    JSON.stringify(manifest, null, 2)
  );
  
  // Write combined characters file for reference
  await fs.writeFile(
    path.join(outputDir, 'all-characters.json'),
    JSON.stringify(transformedCharacters, null, 2)
  );
  
  // Create zip file
  console.log(`\nCreating zip file...`);
  const zipPath = path.join(path.dirname(outputDir), 'custom-characters.zip');
  await createZipFile(outputDir, zipPath);
  
  console.log(`\nTransformation complete!`);
  console.log(`- Transformed ${transformedCharacters.length} characters`);
  console.log(`- Content files saved to: ${contentDir}`);
  console.log(`- Asset files saved to: ${path.join(assetsDir, 'characters')}`);
  console.log(`- Manifest created: ${path.join(outputDir, 'manifest.json')}`);
  console.log(`- Zip file created: ${zipPath}`);
  console.log(`\nDirectory structure:`);
  console.log(`${outputDir}/`);
  console.log(`├── manifest.json`);
  console.log(`├── content/`);
  console.log(`│   └── characters/`);
  console.log(`│       ├── character-aragorn.json`);
  console.log(`│       ├── character-gandalf.json`);
  console.log(`│       └── ...`);
  console.log(`├── assets/`);
  console.log(`│   └── characters/`);
  console.log(`│       ├── aragorn-avatar.png`);
  console.log(`│       ├── aragorn-token.png`);
  console.log(`│       └── ...`);
  console.log(`└── all-characters.json (reference)`);
  console.log(`\nReady to upload zip file: ${zipPath}`);
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}