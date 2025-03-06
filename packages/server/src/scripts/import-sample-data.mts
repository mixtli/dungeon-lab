import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { Types } from 'mongoose';
import { Client } from 'minio';
import mongoose from 'mongoose';
import { config } from '../config/index.mjs';
import { ActorModel } from '../models/actor.model.mjs';
import { CampaignModel } from '../models/campaign.model.mjs';
import { MapModel } from '../models/map.model.mjs';
import { pluginRegistry } from '../services/plugin-registry.service.mjs';

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

// Ensure MinIO bucket exists
async function ensureBucket() {
  const exists = await minioClient.bucketExists(BUCKET_NAME);
  if (!exists) {
    await minioClient.makeBucket(BUCKET_NAME, 'us-east-1');
  }
}

// Upload file to MinIO
async function uploadToMinio(filePath: string, objectName: string): Promise<string> {
  await minioClient.fPutObject(BUCKET_NAME, objectName, filePath, {});
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

    // Upload map image to MinIO
    const imageUrl = await uploadToMinio(
      join(mapsImagesDir, mapData.image.name),
      `maps/${mapData.image.name}`
    );

    await MapModel.findOneAndUpdate(
      { _id: objectId },
      {
        _id: objectId,
        name: mapData.name,
        gridColumns: mapData.columns,
        gridRows: mapData.rows,
        aspectRatio: mapData.rows / mapData.columns,
        imageUrl,
        thumbnailUrl: imageUrl // For now, using same image as thumbnail
      },
      { upsert: true }
    );
  }
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
    const charData = JSON.parse(readFileSync(join(charactersDir, charFile), 'utf-8'));
    const objectId = getObjectId(charData.id);

    // Validate character data
    const characterData = {
      species: charData.species,
      classes: charData.classes,
      alignment: charData.alignment,
      speed: charData.speed,
      hitPoints: charData.hit_points,
      abilityScores: charData.ability_scores,
      skills: charData.skills,
      armorClass: charData.armor_class,
      savingThrows: charData.saving_throws,
      languages: charData.languages,
      background: charData.background,
      details: charData.details,
      weapons: charData.weapons,
      spells: charData.spells
    };

    if (!dnd5e2024Plugin.validateActorData('character', characterData)) {
      console.warn(`Invalid character data in ${charFile}, skipping`);
      continue;
    }

    // Upload avatar and token images to MinIO
    const avatarUrl = await uploadToMinio(
      join(__dirname, '../../data', charData.avatar.url),
      charData.avatar.url
    );

    const tokenUrl = await uploadToMinio(
      join(__dirname, '../../data', charData.token.url),
      charData.token.url
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
        data: characterData
      },
      { upsert: true }
    );
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
    const objectId = getObjectId(campaignData.id);

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
        }
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

    // Initialize plugin registry
    await pluginRegistry.initialize();

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