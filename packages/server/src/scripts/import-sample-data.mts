import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Types } from 'mongoose';
import { Client } from 'minio';
import mongoose from 'mongoose';
import { config } from '../config/index.mjs';
import { ActorModel } from '../models/actor.model.mjs';
import { CampaignModel } from '../models/campaign.model.mjs';
import { MapModel } from '../models/map.model.mjs';
import { UserModel } from '../models/user.model.mjs';
import { pluginRegistry } from '../services/plugin-registry.service.mjs';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Parse command line arguments
const args = process.argv.slice(2);
const shouldClean = args.includes('--clean');

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
async function uploadToMinio(filePath: string, objectName: string, contentType: string): Promise<string> {
  await minioClient.fPutObject(BUCKET_NAME, objectName, filePath, {
    'Content-Type': contentType
  });
  return `${process.env.MINIO_PUBLIC_URL}/${BUCKET_NAME}/${objectName}`;
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
    const objectId = getObjectId(mapData.id);
    const mapId = uuidv4();

    // Read and process the image
    const imageBuffer = readFileSync(join(mapsImagesDir, mapData.image.name));
    const imageMetadata = await sharp(imageBuffer).metadata();
    const format = imageMetadata.format || 'jpeg';

    // Create thumbnail
    const thumbnail = await sharp(imageBuffer)
      .resize(300, 300, { fit: 'inside' })
      .toBuffer();

    // Upload original and thumbnail to MinIO
    const imageKey = `maps/${mapId}/original.${format}`;
    const thumbnailKey = `maps/${mapId}/thumbnail.${format}`;

    await minioClient.putObject(
      BUCKET_NAME,
      imageKey,
      imageBuffer,
      imageBuffer.length,
      { 'Content-Type': `image/${format}` }
    );

    await minioClient.putObject(
      BUCKET_NAME,
      thumbnailKey,
      thumbnail,
      thumbnail.length,
      { 'Content-Type': `image/${format}` }
    );

    await MapModel.findOneAndUpdate(
      { _id: objectId },
      {
        _id: objectId,
        name: mapData.name,
        gridColumns: mapData.columns,
        gridRows: mapData.rows,
        aspectRatio: mapData.rows / mapData.columns,
        imageUrl: imageKey,
        thumbnailUrl: thumbnailKey,
        createdBy: getNextUserId()
      },
      { upsert: true }
    );
  }
}

// Transform character data to match schema
function transformCharacterData(charData: any): any {
  // Calculate ability score modifiers
  function getModifier(score: number): number {
    return Math.floor((score - 10) / 2);
  }

  // Calculate proficiency bonus based on level
  function getProficiencyBonus(level: number): number {
    return Math.floor((level - 1) / 4) + 2;
  }

  // Get the highest class level
  const level = charData.classes.reduce((max: number, c: any) => Math.max(max, c.level), 0);
  const proficiencyBonus = getProficiencyBonus(level);

  // Create ability scores with modifiers and saving throws
  const abilities = {
    strength: {
      score: charData.ability_scores?.str ?? 10,
      modifier: getModifier(charData.ability_scores?.str ?? 10),
      savingThrow: {
        proficient: Boolean(charData.saving_throws?.str),
        bonus: Boolean(charData.saving_throws?.str) ? proficiencyBonus : 0
      }
    },
    dexterity: {
      score: charData.ability_scores?.dex ?? 10,
      modifier: getModifier(charData.ability_scores?.dex ?? 10),
      savingThrow: {
        proficient: Boolean(charData.saving_throws?.dex),
        bonus: Boolean(charData.saving_throws?.dex) ? proficiencyBonus : 0
      }
    },
    constitution: {
      score: charData.ability_scores?.con ?? 10,
      modifier: getModifier(charData.ability_scores?.con ?? 10),
      savingThrow: {
        proficient: Boolean(charData.saving_throws?.con),
        bonus: Boolean(charData.saving_throws?.con) ? proficiencyBonus : 0
      }
    },
    intelligence: {
      score: charData.ability_scores?.int ?? 10,
      modifier: getModifier(charData.ability_scores?.int ?? 10),
      savingThrow: {
        proficient: Boolean(charData.saving_throws?.int),
        bonus: Boolean(charData.saving_throws?.int) ? proficiencyBonus : 0
      }
    },
    wisdom: {
      score: charData.ability_scores?.wis ?? 10,
      modifier: getModifier(charData.ability_scores?.wis ?? 10),
      savingThrow: {
        proficient: Boolean(charData.saving_throws?.wis),
        bonus: Boolean(charData.saving_throws?.wis) ? proficiencyBonus : 0
      }
    },
    charisma: {
      score: charData.ability_scores?.cha ?? 10,
      modifier: getModifier(charData.ability_scores?.cha ?? 10),
      savingThrow: {
        proficient: Boolean(charData.saving_throws?.cha),
        bonus: Boolean(charData.saving_throws?.cha) ? proficiencyBonus : 0
      }
    }
  };

  // Create skills
  const skills = {
    acrobatics: {
      ability: 'dexterity',
      proficient: Boolean(charData.skills?.acrobatics),
      bonus: Boolean(charData.skills?.acrobatics) ? proficiencyBonus : 0
    },
    animalHandling: {
      ability: 'wisdom',
      proficient: Boolean(charData.skills?.animal_handling),
      bonus: Boolean(charData.skills?.animal_handling) ? proficiencyBonus : 0
    },
    arcana: {
      ability: 'intelligence',
      proficient: Boolean(charData.skills?.arcana),
      bonus: Boolean(charData.skills?.arcana) ? proficiencyBonus : 0
    },
    athletics: {
      ability: 'strength',
      proficient: Boolean(charData.skills?.athletics),
      bonus: Boolean(charData.skills?.athletics) ? proficiencyBonus : 0
    },
    deception: {
      ability: 'charisma',
      proficient: Boolean(charData.skills?.deception),
      bonus: Boolean(charData.skills?.deception) ? proficiencyBonus : 0
    },
    history: {
      ability: 'intelligence',
      proficient: Boolean(charData.skills?.history),
      bonus: Boolean(charData.skills?.history) ? proficiencyBonus : 0
    },
    insight: {
      ability: 'wisdom',
      proficient: Boolean(charData.skills?.insight),
      bonus: Boolean(charData.skills?.insight) ? proficiencyBonus : 0
    },
    intimidation: {
      ability: 'charisma',
      proficient: Boolean(charData.skills?.intimidation),
      bonus: Boolean(charData.skills?.intimidation) ? proficiencyBonus : 0
    },
    investigation: {
      ability: 'intelligence',
      proficient: Boolean(charData.skills?.investigation),
      bonus: Boolean(charData.skills?.investigation) ? proficiencyBonus : 0
    },
    medicine: {
      ability: 'wisdom',
      proficient: Boolean(charData.skills?.medicine),
      bonus: Boolean(charData.skills?.medicine) ? proficiencyBonus : 0
    },
    nature: {
      ability: 'intelligence',
      proficient: Boolean(charData.skills?.nature),
      bonus: Boolean(charData.skills?.nature) ? proficiencyBonus : 0
    },
    perception: {
      ability: 'wisdom',
      proficient: Boolean(charData.skills?.perception),
      bonus: Boolean(charData.skills?.perception) ? proficiencyBonus : 0
    },
    performance: {
      ability: 'charisma',
      proficient: Boolean(charData.skills?.performance),
      bonus: Boolean(charData.skills?.performance) ? proficiencyBonus : 0
    },
    persuasion: {
      ability: 'charisma',
      proficient: Boolean(charData.skills?.persuasion),
      bonus: Boolean(charData.skills?.persuasion) ? proficiencyBonus : 0
    },
    religion: {
      ability: 'intelligence',
      proficient: Boolean(charData.skills?.religion),
      bonus: Boolean(charData.skills?.religion) ? proficiencyBonus : 0
    },
    sleightOfHand: {
      ability: 'dexterity',
      proficient: Boolean(charData.skills?.sleight_of_hand),
      bonus: Boolean(charData.skills?.sleight_of_hand) ? proficiencyBonus : 0
    },
    stealth: {
      ability: 'dexterity',
      proficient: Boolean(charData.skills?.stealth),
      bonus: Boolean(charData.skills?.stealth) ? proficiencyBonus : 0
    },
    survival: {
      ability: 'wisdom',
      proficient: Boolean(charData.skills?.survival),
      bonus: Boolean(charData.skills?.survival) ? proficiencyBonus : 0
    }
  };

  // Transform the character data
  return {
    name: charData.name,
    species: charData.species,
    classes: charData.classes.map((c: any) => ({
      name: c.name,
      level: c.level,
      hitDiceType: `d${c.hit_die || 8}`
    })),
    background: charData.background || 'Custom',
    alignment: charData.alignment || 'true neutral',
    experiencePoints: charData.xp || 0,
    proficiencyBonus,
    armorClass: charData.armor_class?.value || 10,
    initiative: getModifier(charData.ability_scores?.dex ?? 10),
    speed: typeof charData.speed === 'object' ? charData.speed.Walk || 30 : charData.speed || 30,
    hitPoints: {
      maximum: charData.hit_points?.max || 10,
      current: charData.hit_points?.current || 10,
      temporary: charData.hit_points?.temporary || 0
    },
    hitDice: {
      total: level,
      current: level,
      type: `d${charData.classes[0]?.hit_die || 8}`
    },
    abilities,
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
}

// Import characters
async function importCharacters() {
  const charactersDir = join(__dirname, '../../data/characters');
  const characterFiles = readdirSync(charactersDir).filter(f => f.endsWith('.json'));

  // Get the D&D 5E plugin
  const dnd5e2024Plugin = pluginRegistry.getGameSystemPlugin('dnd5e2024');
  if (!dnd5e2024Plugin) {
    throw new Error('D&D 5E 2024 plugin not found');
  }

  for (const charFile of characterFiles) {
    const charData = JSON.parse(readFileSync(join(charactersDir, charFile), 'utf-8'));
    const objectId = getObjectId(charData.id);

    // Transform and validate character data
    const characterData = transformCharacterData(charData);

    try {
      console.log(`Validating character data for ${charFile}:`, JSON.stringify(characterData, null, 2));
      if (!dnd5e2024Plugin.validateActorData('character', characterData)) {
        console.warn(`Invalid character data in ${charFile}, skipping`);
      } else {
        // Get file extensions from original paths
        const avatarExt = charData.avatar.url.split('.').pop() || 'jpg';
        const tokenExt = charData.token.url.split('.').pop() || 'jpg';

        // Create new paths following the pattern actors/<actorId>/images/<filename>
        const avatarPath = `actors/${objectId}/images/avatar.${avatarExt}`;
        const tokenPath = `actors/${objectId}/images/token.${tokenExt}`;

        // Upload avatar and token images to MinIO with proper content type
        const avatarUrl = await uploadToMinio(
          join(__dirname, '../../data', charData.avatar.url),
          avatarPath,
          `image/${avatarExt}`
        );

        const tokenUrl = await uploadToMinio(
          join(__dirname, '../../data', charData.token.url),
          tokenPath,
          `image/${tokenExt}`
        );

        await ActorModel.findOneAndUpdate(
          { _id: objectId },
          {
            _id: objectId,
            name: charData.name,
            type: 'character',
            gameSystemId: dnd5e2024Plugin.config.id,
            avatar: avatarUrl,
            token: tokenUrl,
            data: characterData,
            createdBy: getNextUserId()
          },
          { upsert: true }
        );
      }
    } catch (error) {
      console.error(`Error validating character data for ${charFile}:`, error);
    }
  }
}

// Import campaigns
async function importCampaigns() {
  const campaignsDir = join(__dirname, '../../data/campaigns');
  const campaignFiles = readdirSync(campaignsDir).filter(f => f.endsWith('.json'));

  // Get the D&D 5E plugin
  const dnd5e2024Plugin = pluginRegistry.getGameSystemPlugin('dnd5e2024');
  if (!dnd5e2024Plugin) {
    throw new Error('D&D 5E 2024 plugin not found');
  }

  for (const campaignFile of campaignFiles) {
    const campaignData = JSON.parse(readFileSync(join(campaignsDir, campaignFile), 'utf-8'));
    const objectId = getObjectId(campaignData.id);
    const userId = getNextUserId();

    await CampaignModel.findOneAndUpdate(
      { _id: objectId },
      {
        _id: objectId,
        name: campaignData.name,
        description: campaignData.description,
        gameSystemId: dnd5e2024Plugin.config.id,
        members: campaignData.characters.map(getObjectId),
        status: 'active',
        settings: {
          setting: campaignData.setting,
          startDate: campaignData.start_date
        },
        createdBy: userId,
        gameMasterId: userId
      },
      { upsert: true }
    );
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