import { readFileSync, readdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import fs from 'fs';
import { nextUser } from './import-utils.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// API configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const API_AUTH_TOKEN = process.env.API_AUTH_TOKEN;
const API_TIMEOUT = 30000; // 30 seconds

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Set auth token from environment variable
if (API_AUTH_TOKEN) {
  api.defaults.headers.common['Authorization'] = `Bearer ${API_AUTH_TOKEN}`;
  console.log('Using API token from environment');
} else {
  console.warn('Warning: API_AUTH_TOKEN not provided. API calls may fail with 401 Unauthorized');
}

// Define proper types for character data
interface AbilityScores {
  str?: number;
  dex?: number;
  con?: number;
  int?: number;
  wis?: number;
  cha?: number;
  [key: string]: number | undefined;
}

interface SavingThrows {
  str?: number;
  dex?: number;
  con?: number;
  int?: number;
  wis?: number;
  cha?: number;
  [key: string]: number | undefined;
}

interface Skills {
  acrobatics?: number;
  animal_handling?: number;
  arcana?: number;
  athletics?: number;
  deception?: number;
  history?: number;
  insight?: number;
  intimidation?: number;
  investigation?: number;
  medicine?: number;
  nature?: number;
  perception?: number;
  performance?: number;
  persuasion?: number;
  religion?: number;
  sleight_of_hand?: number;
  stealth?: number;
  survival?: number;
  [key: string]: number | undefined;
}

interface HitPoints {
  max?: number;
  current?: number;
  temporary?: number;
  [key: string]: number | undefined;
}

interface ArmorClass {
  value?: number;
  [key: string]: number | undefined;
}

interface Biography {
  appearance?: string;
  backstory?: string;
  personalityTraits?: string;
  ideals?: string;
  bonds?: string;
  flaws?: string;
  [key: string]: string | undefined;
}

interface CharData {
  id: string;
  name?: string;
  species?: string;
  classes?: Array<{ name: string; level: number }>;
  background?: string;
  alignment?: string;
  xp?: number;
  ability_scores?: AbilityScores;
  saving_throws?: SavingThrows;
  skills?: Skills;
  hit_points?: HitPoints;
  armor_class?: ArmorClass;
  biography?: Biography;
  speed?: number | { Walk?: number; [key: string]: number | undefined };
  equipment?: unknown[];
  features?: unknown[];
  description?: string;
  avatar?: {
    url: string;
    type: string;
    size: number;
    name: string;
    data?: Buffer | null;
  };
  token?: {
    url: string;
    type: string;
    size: number;
    name: string;
    data?: Buffer | null;
  };
  [key: string]: unknown;
}

// Transform character data to match schema
function transformCharacterData(charData: CharData): Record<string, unknown> {
  // Calculate ability score modifiers
  function getModifier(score: number): number {
    return Math.floor((score - 10) / 2);
  }

  // Default proficiency bonus based on common D&D rules
  const proficiencyBonus = 2;

  // Ability scores with modifiers and saving throws
  const abilityScores: Record<
    string,
    {
      score: number;
      modifier: number;
      savingThrow: {
        proficient: boolean;
        bonus: number;
      };
    }
  > = {
    strength: {
      score: charData.ability_scores?.str ?? 10,
      modifier: getModifier(charData.ability_scores?.str ?? 10),
      savingThrow: {
        proficient: Boolean(charData.saving_throws?.str),
        bonus: charData.saving_throws?.str ? proficiencyBonus : 0
      }
    },
    dexterity: {
      score: charData.ability_scores?.dex ?? 10,
      modifier: getModifier(charData.ability_scores?.dex ?? 10),
      savingThrow: {
        proficient: Boolean(charData.saving_throws?.dex),
        bonus: charData.saving_throws?.dex ? proficiencyBonus : 0
      }
    },
    constitution: {
      score: charData.ability_scores?.con ?? 10,
      modifier: getModifier(charData.ability_scores?.con ?? 10),
      savingThrow: {
        proficient: Boolean(charData.saving_throws?.con),
        bonus: charData.saving_throws?.con ? proficiencyBonus : 0
      }
    },
    intelligence: {
      score: charData.ability_scores?.int ?? 10,
      modifier: getModifier(charData.ability_scores?.int ?? 10),
      savingThrow: {
        proficient: Boolean(charData.saving_throws?.int),
        bonus: charData.saving_throws?.int ? proficiencyBonus : 0
      }
    },
    wisdom: {
      score: charData.ability_scores?.wis ?? 10,
      modifier: getModifier(charData.ability_scores?.wis ?? 10),
      savingThrow: {
        proficient: Boolean(charData.saving_throws?.wis),
        bonus: charData.saving_throws?.wis ? proficiencyBonus : 0
      }
    },
    charisma: {
      score: charData.ability_scores?.cha ?? 10,
      modifier: getModifier(charData.ability_scores?.cha ?? 10),
      savingThrow: {
        proficient: Boolean(charData.saving_throws?.cha),
        bonus: charData.saving_throws?.cha ? proficiencyBonus : 0
      }
    }
  };

  // Create skills
  const skills = {
    acrobatics: {
      ability: 'dexterity',
      proficient: Boolean(charData.skills?.acrobatics),
      bonus: charData.skills?.acrobatics ? proficiencyBonus : 0
    },
    animalHandling: {
      ability: 'wisdom',
      proficient: Boolean(charData.skills?.animal_handling),
      bonus: charData.skills?.animal_handling ? proficiencyBonus : 0
    },
    arcana: {
      ability: 'intelligence',
      proficient: Boolean(charData.skills?.arcana),
      bonus: charData.skills?.arcana ? proficiencyBonus : 0
    },
    athletics: {
      ability: 'strength',
      proficient: Boolean(charData.skills?.athletics),
      bonus: charData.skills?.athletics ? proficiencyBonus : 0
    },
    deception: {
      ability: 'charisma',
      proficient: Boolean(charData.skills?.deception),
      bonus: charData.skills?.deception ? proficiencyBonus : 0
    },
    history: {
      ability: 'intelligence',
      proficient: Boolean(charData.skills?.history),
      bonus: charData.skills?.history ? proficiencyBonus : 0
    },
    insight: {
      ability: 'wisdom',
      proficient: Boolean(charData.skills?.insight),
      bonus: charData.skills?.insight ? proficiencyBonus : 0
    },
    intimidation: {
      ability: 'charisma',
      proficient: Boolean(charData.skills?.intimidation),
      bonus: charData.skills?.intimidation ? proficiencyBonus : 0
    },
    investigation: {
      ability: 'intelligence',
      proficient: Boolean(charData.skills?.investigation),
      bonus: charData.skills?.investigation ? proficiencyBonus : 0
    },
    medicine: {
      ability: 'wisdom',
      proficient: Boolean(charData.skills?.medicine),
      bonus: charData.skills?.medicine ? proficiencyBonus : 0
    },
    nature: {
      ability: 'intelligence',
      proficient: Boolean(charData.skills?.nature),
      bonus: charData.skills?.nature ? proficiencyBonus : 0
    },
    perception: {
      ability: 'wisdom',
      proficient: Boolean(charData.skills?.perception),
      bonus: charData.skills?.perception ? proficiencyBonus : 0
    },
    performance: {
      ability: 'charisma',
      proficient: Boolean(charData.skills?.performance),
      bonus: charData.skills?.performance ? proficiencyBonus : 0
    },
    persuasion: {
      ability: 'charisma',
      proficient: Boolean(charData.skills?.persuasion),
      bonus: charData.skills?.persuasion ? proficiencyBonus : 0
    },
    religion: {
      ability: 'intelligence',
      proficient: Boolean(charData.skills?.religion),
      bonus: charData.skills?.religion ? proficiencyBonus : 0
    },
    sleightOfHand: {
      ability: 'dexterity',
      proficient: Boolean(charData.skills?.sleight_of_hand),
      bonus: charData.skills?.sleight_of_hand ? proficiencyBonus : 0
    },
    stealth: {
      ability: 'dexterity',
      proficient: Boolean(charData.skills?.stealth),
      bonus: charData.skills?.stealth ? proficiencyBonus : 0
    },
    survival: {
      ability: 'wisdom',
      proficient: Boolean(charData.skills?.survival),
      bonus: charData.skills?.survival ? proficiencyBonus : 0
    }
  };

  // Handle speed value with proper null checking and type assertion
  let speedValue = 30;
  if (charData.speed !== undefined && charData.speed !== null) {
    if (typeof charData.speed === 'object') {
      const speedObj = charData.speed as { Walk?: number };
      speedValue = speedObj.Walk || 30;
    } else {
      speedValue = charData.speed as number;
    }
  }

  // Create result with proper type assertions
  const data: Record<string, unknown> = {
    name: charData.name,
    species: charData.species,
    classes:
      (charData.classes as Array<{ name: string; level: number }>)?.map((c) => ({
        name: c.name,
        level: c.level,
        hitDiceType: `d8`
      })) || [],
    background: charData.background || 'Custom',
    alignment: charData.alignment || 'true neutral',
    experiencePoints: charData.xp || 0,
    proficiencyBonus,
    armorClass: charData.armor_class?.value || 10,
    initiative: getModifier(charData.ability_scores?.dex ?? 10),
    speed: speedValue,
    hitPoints: {
      maximum: charData.hit_points?.max || 10,
      current: charData.hit_points?.current || 10,
      temporary: charData.hit_points?.temporary || 0
    },
    hitDice: {
      total:
        (charData.classes as Array<{ level: number }>)?.reduce(
          (max: number, c: { level: number }) => Math.max(max, c.level),
          0
        ) || 1,
      current:
        (charData.classes as Array<{ level: number }>)?.reduce(
          (max: number, c: { level: number }) => Math.max(max, c.level),
          0
        ) || 1,
      type: `d8`
    },
    abilities: abilityScores,
    skills,
    equipment: charData.equipment || [],
    features: charData.features || [],
    biography: {
      appearance: charData.biography?.appearance || '',
      backstory: charData.biography?.backstory || '',
      personalityTraits: charData.biography?.personalityTraits || '',
      ideals: charData.biography?.ideals || '',
      bonds: charData.biography?.bonds || '',
      flaws: charData.biography?.flaws || ''
    }
  };

  return data;
}

// Import characters via API
async function importCharactersViaAPI() {
  const charactersDir = join(__dirname, '../../data/characters');
  const characterFiles = readdirSync(charactersDir).filter((f) => f.endsWith('.json'));

  console.log(`Found ${characterFiles.length} character files to import`);

  for (const charFile of characterFiles) {
    const charData: CharData = JSON.parse(readFileSync(join(charactersDir, charFile), 'utf-8'));
    console.log(`Processing character: ${charData.name}`);

    try {
      // Transform character data for API
      const characterData = transformCharacterData(charData);

      // Check if character exists by name
      let actorId: string | null = null;

      try {
        const response = await api.get('/api/actors', {
          params: {
            name: charData.name,
            type: 'character',
            gameSystemId: 'dnd-5e-2024'
          }
        });

        const existingActors = response.data;

        if (existingActors.length > 0) {
          actorId = existingActors[0].id;
          console.log(`Found existing character with ID: ${actorId}`);
        }
      } catch (error) {
        console.warn(`Could not check for existing character: ${charData.name}`, error);
      }

      // Create or update character via API
      if (actorId) {
        // Update existing character
        console.log(`Updating character: ${charData.name}`);
        await api.put(`/api/actors/${actorId}`, {
          name: charData.name,
          description: charData.description,
          type: 'character',
          gameSystemId: 'dnd-5e-2024',
          data: characterData,
          userData: { uuid: charData.id },
          createdBy: nextUser.next()
        });
      } else {
        // Create new character
        console.log(`Creating new character: ${charData.name}`);
        const createResponse = await api.post('/api/actors', {
          name: charData.name,
          description: charData.description,
          type: 'character',
          gameSystemId: 'dnd-5e-2024',
          data: characterData,
          userData: { uuid: charData.id },
          createdBy: nextUser.next()
        });

        actorId = createResponse.data.id;
        console.log(`Created new character with ID: ${actorId}`);
      }

      // Upload avatar and token images if available
      if (actorId) {
        // Function to safely get file paths
        const getFilePath = (basePath: string, relativePath: unknown): string => {
          if (!relativePath) return '';
          const safePath = typeof relativePath === 'string' ? relativePath : String(relativePath);
          return join(__dirname, basePath, safePath);
        };

        // Get avatar and token image paths
        const avatarFilePath = charData.avatar
          ? getFilePath('../../data', charData.avatar.url)
          : '';

        const tokenFilePath = charData.token ? getFilePath('../../data', charData.token.url) : '';

        // Upload avatar if available
        if (avatarFilePath && fs.existsSync(avatarFilePath)) {
          console.log(`Uploading avatar for ${charData.name}`);

          try {
            // Read image file as binary data
            const avatarData = fs.readFileSync(avatarFilePath);

            // Determine content type based on file extension
            let contentType = 'image/jpeg'; // Default
            if (avatarFilePath.toLowerCase().endsWith('.png')) {
              contentType = 'image/png';
            } else if (avatarFilePath.toLowerCase().endsWith('.webp')) {
              contentType = 'image/webp';
            }

            // Upload raw image data
            await api.put(`/api/actors/${actorId}/avatar`, avatarData, {
              headers: {
                'Content-Type': contentType
              }
            });

            console.log(`Avatar uploaded for ${charData.name}`);
          } catch (error) {
            console.error(`Failed to upload avatar for ${charData.name}:`, error);
          }
        }

        // Upload token if available
        if (tokenFilePath && fs.existsSync(tokenFilePath)) {
          console.log(`Uploading token for ${charData.name}`);

          try {
            // Read image file as binary data
            const tokenData = fs.readFileSync(tokenFilePath);

            // Determine content type based on file extension
            let contentType = 'image/png'; // Default for tokens
            if (
              tokenFilePath.toLowerCase().endsWith('.jpg') ||
              tokenFilePath.toLowerCase().endsWith('.jpeg')
            ) {
              contentType = 'image/jpeg';
            } else if (tokenFilePath.toLowerCase().endsWith('.webp')) {
              contentType = 'image/webp';
            }

            // Upload raw image data
            await api.put(`/api/actors/${actorId}/token`, tokenData, {
              headers: {
                'Content-Type': contentType
              }
            });

            console.log(`Token uploaded for ${charData.name}`);
          } catch (error) {
            console.error(`Failed to upload token for ${charData.name}:`, error);
          }
        }
      }

      console.log(`Successfully processed character: ${charData.name}`);
    } catch (error) {
      console.error(`Error processing character data for ${charFile}:`, (error as Error).message);
    }
  }
}

async function main() {
  try {
    // Import characters via API
    await importCharactersViaAPI();

    console.log('Character import completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Import failed:', error);
    process.exit(1);
  }
}

main();
