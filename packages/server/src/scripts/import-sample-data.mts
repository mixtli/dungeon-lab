import { readFileSync, readdirSync, statSync } from 'fs';
import { Client } from 'minio';
import mongoose, { Types } from 'mongoose';
import { dirname, join } from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/index.mjs';
import { ActorModel } from '../features/actors/models/actor.model.mjs';
import { CampaignModel } from '../features/campaigns/models/campaign.model.mjs';
import { MapModel } from '../features/maps/models/map.model.mjs';
import { UserModel } from '../models/user.model.mjs';
import { pluginRegistry } from '../services/plugin-registry.service.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Parse command line arguments
const args = process.argv.slice(2);
const shouldClean = args.includes('--clean');

await pluginRegistry.initialize();

// MinIO client setup
const minioClient = new Client({
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: parseInt(process.env.MINIO_PORT || '9000'),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin'
});

const BUCKET_NAME = 'dungeon-lab';

// UUID to ObjectId mapping
const uuidToObjectId = new Map<string, Types.ObjectId>();

// Store user IDs
let userIds: string[] = [];
let currentUserIndex = 0;

// Get alternating user ID
function getNextUserId(): string {
  const userId = userIds[currentUserIndex];
  currentUserIndex = (currentUserIndex + 1) % userIds.length;
  return userId;
}

// Initialize user IDs
async function initializeUsers() {
  const users = await UserModel.find({
    email: { 
      $in: ['ronaldmcclain75@gmail.com', 'ronmcclain1975@gmail.com']
    }
  }).lean();
  
  if (users.length !== 2) {
    throw new Error('Could not find both required users');
  }
  
  userIds = users.map(user => user._id.toString());
  console.log('Found users:', users.map(u => ({ id: u._id.toString(), email: u.email })));
}

// Clean existing data
async function cleanData() {
  if (!shouldClean) return;

  console.log('Cleaning existing data...');
  
  // Delete all documents from collections
  await Promise.all([
    ActorModel.deleteMany({}),
    CampaignModel.deleteMany({}),
    MapModel.deleteMany({})
  ]);

  // Delete all objects from MinIO bucket
  try {
    const stream = minioClient.listObjects(BUCKET_NAME, '', true);
    for await (const obj of stream) {
      await minioClient.removeObject(BUCKET_NAME, obj.name);
    }
  } catch (error) {
    console.warn('Error cleaning MinIO bucket:', error);
  }

  console.log('Data cleaned successfully');
}

// Ensure MinIO bucket exists
async function ensureBucket() {
  const exists = await minioClient.bucketExists(BUCKET_NAME);
  if (!exists) {
    await minioClient.makeBucket(BUCKET_NAME, 'us-east-1');
  }
}

// Upload file to MinIO
async function uploadToMinio(filePath: string, objectName: string, contentType: string): Promise<{ url: string, path: string, size: number, type: string }> {
  // Get accurate file size using Node's fs.statSync
  const fileSize = statSync(filePath).size;
  
  
  await minioClient.fPutObject(BUCKET_NAME, objectName, filePath, {
    'Content-Type': contentType
  });
  
  return {
    url: `${process.env.MINIO_PUBLIC_URL}/${BUCKET_NAME}/${objectName}`,
    path: objectName,
    size: fileSize,
    type: contentType
  };
}

// Convert UUID to ObjectId and maintain mapping
function getObjectId(uuid: string): Types.ObjectId {
  if (!uuidToObjectId.has(uuid)) {
    uuidToObjectId.set(uuid, new Types.ObjectId());
  }
  return uuidToObjectId.get(uuid)!;
}

// Import maps
async function importMaps() {
  const mapsDir = join(__dirname, '../../data/maps');
  const mapsImagesDir = join(__dirname, '../../data/images/maps');
  const mapFiles = readdirSync(mapsDir).filter(f => f.endsWith('.json'));

  for (const mapFile of mapFiles) {
    const mapData = JSON.parse(readFileSync(join(mapsDir, mapFile), 'utf-8'));
    const userId = getNextUserId();
    
    // Check if map already exists by name
    const existingMap = await MapModel.findOne({ name: mapData.name }).lean();
    const objectId = existingMap ? existingMap._id : getObjectId(mapData.id);
    
    // Generate a consistent mapId either from existing record or create new one
    const mapId = existingMap ? objectId.toString() : uuidv4();
    
    console.log(`${existingMap ? 'Updating' : 'Creating'} map: ${mapData.name}`);

    // Read and process the image
    const imagePath = join(mapsImagesDir, mapData.image.name);
    const imageBuffer = readFileSync(imagePath);
    // Get accurate file size using fs.statSync
    const size = statSync(imagePath).size;
    
    let format = 'jpeg';
    try {
      const imageMetadata = await sharp(imageBuffer).metadata();
      format = imageMetadata.format || 'jpeg';
    } catch (error) {
      console.warn(`Could not extract format metadata for ${mapData.image.name}:`, error);
    }
    
    const contentType = `image/${format}`;

    // Create thumbnail
    let thumbnail;
    let thumbnailSize = 0;
    
    try {
      thumbnail = await sharp(imageBuffer)
        .resize(300, 300, { fit: 'inside' })
        .toBuffer();
      
      // For thumbnails, we'll use the buffer length since we don't have a file on disk
      thumbnailSize = thumbnail.length;
    } catch (error) {
      console.warn(`Could not create thumbnail for ${mapData.image.name}:`, error);
      thumbnail = imageBuffer;
      thumbnailSize = size;
    }

    // Upload original and thumbnail to MinIO
    const imageKey = `maps/${mapId}/original.${format}`;
    const thumbnailKey = `maps/${mapId}/thumbnail.${format}`;

    await minioClient.putObject(
      BUCKET_NAME,
      imageKey,
      imageBuffer,
      imageBuffer.length,
      { 'Content-Type': contentType }
    );

    await minioClient.putObject(
      BUCKET_NAME,
      thumbnailKey,
      thumbnail,
      thumbnail.length,
      { 'Content-Type': contentType }
    );

    await MapModel.findOneAndUpdate(
      { _id: objectId },
      {
        _id: objectId,
        name: mapData.name,
        gridColumns: mapData.columns,
        gridRows: mapData.rows,
        aspectRatio: mapData.rows / mapData.columns,
        image: {
          url: `${process.env.MINIO_PUBLIC_URL}/${BUCKET_NAME}/${imageKey}`,
          path: imageKey,
          size: size,
          type: contentType
        },
        thumbnail: {
          url: `${process.env.MINIO_PUBLIC_URL}/${BUCKET_NAME}/${thumbnailKey}`,
          path: thumbnailKey,
          size: thumbnailSize,
          type: contentType
        },
        createdBy: userId,
        updatedBy: userId
      },
      { upsert: true, new: true }
    );
  }
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
  ability_scores?: AbilityScores;
  saving_throws?: SavingThrows;
  skills?: Skills;
  hit_points?: HitPoints;
  armor_class?: ArmorClass;
  biography?: Biography;
  speed?: number | { Walk?: number; [key: string]: number | undefined };
  avatar?: {
    url: string;
    type: string;
    size: number;
    name: string;
    data: Buffer | null;
  };
  token?: {
    url: string;
    type: string;
    size: number;
    name: string;
    data: Buffer | null;
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
  const abilityScores: Record<string, {
    score: number;
    modifier: number;
    savingThrow: {
      proficient: boolean;
      bonus: number;
    }
  }> = {
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
    classes: (charData.classes as Array<{name: string; level: number}>).map((c) => ({
      name: c.name,
      level: c.level,
      hitDiceType: `d8`
    })),
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
      total: (charData.classes as Array<{level: number}>).reduce((max: number, c: {level: number}) => Math.max(max, c.level), 0),
      current: (charData.classes as Array<{level: number}>).reduce((max: number, c: {level: number}) => Math.max(max, c.level), 0),
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

  // Handle avatar and token conversions correctly
  if (charData.avatar && typeof charData.avatar === 'string') {
    data.avatar = charData.avatar;
  }
  if (charData.token && typeof charData.token === 'string') {
    data.token = charData.token;
  }

  return data;
}

// Import characters
async function importCharacters() {
  const charactersDir = join(__dirname, '../../data/characters');
  const characterFiles = readdirSync(charactersDir).filter(f => f.endsWith('.json'));

  // Get the D&D 5E plugin
  const dnd5e2024Plugin = pluginRegistry.getGameSystemPlugin('dnd-5e-2024');
  if (!dnd5e2024Plugin) {
    throw new Error('D&D 5E 2024 plugin not found');
  }

  for (const charFile of characterFiles) {
    const charData: CharData = JSON.parse(readFileSync(join(charactersDir, charFile), 'utf-8'));
    const userId = getNextUserId();
    
    // Check if character already exists by name
    const existingCharacter = await ActorModel.findOne({ 
      name: charData.name,
      type: 'character'
    }).lean();
    
    // Use type assertion for objectId since it's assigned but may not be used in this section
    const objectId = existingCharacter ? existingCharacter._id : getObjectId(charData.id);
    console.log(`${existingCharacter ? 'Updating' : 'Creating'} character: ${charData.name}`);

    // Transform and validate character data
    const characterData = transformCharacterData(charData);

    try {
      if (!dnd5e2024Plugin.validateActorData('character', characterData)) {
        console.warn(`Invalid character data in ${charFile}, skipping`);
        continue;
      }
      
      let actor = await ActorModel.findOne({ name: charData.name, type: 'character' });
      if(!actor) {
        actor = await ActorModel.create({
          name: charData.name,
          type: 'character',
          createdBy: userId,
          updatedBy: userId,
          gameSystemId: dnd5e2024Plugin.config.id,
          _id: objectId,
        });
        console.log("actor",actor.id)
      }

      actor.set({
        name: charData.name,
        description: charData.description,
        data: characterData,
      });

      console.log(actor.name, actor.id)
      uuidToObjectId.set(charData.id, actor.id);

      // Get file extensions from original paths
      const avatarExt = charData.avatar?.url?.split('.').pop() || 'jpg';
      const tokenExt = charData.token?.url?.split('.').pop() || 'jpg';

      // Create new paths following the pattern actors/<actorId>/images/<filename>
      const avatarPath = `actors/${actor.id}/images/avatar.${avatarExt}`;
      const tokenPath = `actors/${actor.id}/images/token.${tokenExt}`;

      // Function to safely get file paths
      const getFilePath = (basePath: string, relativePath: unknown): string => {
        if (!relativePath) return '';
        const safePath = typeof relativePath === 'string' ? relativePath : String(relativePath);
        return join(__dirname, basePath, safePath);
      };

      // Get full paths to the source files
      const avatarFilePath = charData.avatar 
        ? getFilePath('../../data', charData.avatar.url)
        : '';
      const tokenFilePath = charData.token 
        ? getFilePath('../../data', charData.token.url)
        : '';

      // Only upload if the file paths are valid
      if (avatarFilePath) {
        const avatarAsset = await uploadToMinio(
          avatarFilePath,
          avatarPath,
          `image/${avatarExt}`
        );
        actor.set({ avatar: avatarAsset });
      }

      if (tokenFilePath) {
        const tokenAsset = await uploadToMinio(
          tokenFilePath,
          tokenPath,
          `image/${tokenExt}`
        );
        await actor.set({ token: tokenAsset });
      }

      await actor.save();

    } catch (error) {
      console.error(`Error processing character data for ${charFile}:`, error);
    }
  }
}

// Import campaigns
async function importCampaigns() {
  const campaignsDir = join(__dirname, '../../data/campaigns');
  const campaignFiles = readdirSync(campaignsDir).filter(f => f.endsWith('.json'));

  // Get the D&D 5E plugin
  const dnd5e2024Plugin = pluginRegistry.getGameSystemPlugin('dnd-5e-2024');
  if (!dnd5e2024Plugin) {
    throw new Error('D&D 5E 2024 plugin not found');
  }

  for (const campaignFile of campaignFiles) {
    const campaignData = JSON.parse(readFileSync(join(campaignsDir, campaignFile), 'utf-8'));
    const userId = getNextUserId();
    
    // Check if campaign already exists by name
    let campaign = await CampaignModel.findOne({ name: campaignData.name });
    if(!campaign  ) {
      campaign = await CampaignModel.create({
        name: campaignData.name,
        description: campaignData.description,
        gameSystemId: dnd5e2024Plugin.config.id,
        members: []
      });
    }
    console.log(uuidToObjectId)
    campaign.set({
      name: campaignData.name,
      description: campaignData.description,
      gameSystemId: dnd5e2024Plugin.config.id,
      members: campaignData.characters.map((id: string) => {
        console.log("id", id, uuidToObjectId.get(id as string)?.toString())
        return uuidToObjectId.get(id as string)?.toString();
      }),
      status: 'active',
      settings: {
        setting: campaignData.setting,
        startDate: campaignData.start_date
      },
      createdBy: userId,
      updatedBy: userId,
    });
    await campaign.save()

    
  //   console.log(`${existingCampaign ? 'Updating' : 'Creating'} campaign: ${campaignData.name}`);

  //   await CampaignModel.findOneAndUpdate(
  //     { _id: objectId },
  //     {
  //       _id: objectId,
  //       name: campaignData.name,
  //       description: campaignData.description,
  //       gameSystemId: dnd5e2024Plugin.config.id,
  //       members: campaignData.characters.map((id: string) => {
  //         // Find existing character by ID in the JSON
  //         const existingId = uuidToObjectId.get(id);
  //         return existingId || new Types.ObjectId();
  //       }),
  //       status: 'active',
  //       settings: {
  //         setting: campaignData.setting,
  //         startDate: campaignData.start_date
  //       },
  //       createdBy: userId,
  //       updatedBy: userId,
  //       gameMasterId: userId
  //     },
  //     { upsert: true, new: true }
  //   );
  }
}

async function main() {
  try {
    // Connect to MongoDB
    await mongoose.connect(config.mongoUri);
    console.log('Connected to MongoDB');

    // Initialize users
    await initializeUsers();

    // Initialize plugin registry
    await pluginRegistry.initialize();

    // Clean existing data if --clean flag is set
    await cleanData();

    // Ensure MinIO bucket exists
    await ensureBucket();

    // Import data
    console.log('Importing maps...');
    await importMaps();

    console.log('Importing characters...');
    await importCharacters();

    console.log('Importing campaigns...');
    await importCampaigns();

    console.log('Import completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Import failed:', error);
    process.exit(1);
  }
}

main(); 