#!/usr/bin/env tsx

/**
 * Debug script to investigate ownerId population issue
 */

import mongoose from 'mongoose';
import { config } from '../config/index.mjs';
import { DocumentModel } from '../features/documents/models/document.model.mjs';
import '../features/assets/models/asset.model.mjs'; // Import to register Asset model for population

// Import all the same dependencies as GameStateService to reproduce the same environment
import { CampaignModel } from '../features/campaigns/models/campaign.model.mjs';
import { UserModel } from '../models/user.model.mjs';
import '../features/campaigns/models/game-session.model.mjs';
import '../features/compendiums/models/compendium.model.mjs';

async function debugOwnerId() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(config.mongoUri);
    console.log('✅ Connected to MongoDB');

    // Get a campaign ID from the logs
    const campaignId = '6893140ca9931296918b0442';
    const campaignObjectId = new mongoose.Types.ObjectId(campaignId);

    console.log(`\n=== TESTING EXACT LOADCAMPAIGNDATA QUERY FOR CAMPAIGN ${campaignId} ===`);

    // Test the exact query used in loadCampaignData
    const characters = await DocumentModel.find({ 
      campaignId: campaignObjectId, 
      documentType: 'character' 
    }).populate(['avatar', 'tokenImage']).exec();

    console.log(`Found ${characters.length} characters`);

    characters.slice(0, 3).forEach((char, index) => {
      console.log(`\n[${index + 1}] Character: ${char.name}`);
      console.log('After populate - ownerId:', char.ownerId);
      console.log('After populate - ownerId type:', typeof char.ownerId);
      console.log('After populate - ownerId constructor:', char.ownerId?.constructor.name);
      
      // Test toObject
      const obj = char.toObject();
      console.log('toObject ownerId:', obj.ownerId);
      console.log('toObject ownerId type:', typeof obj.ownerId);
      
      // Test JSON serialization (the exact process used in loadCampaignData)
      const jsonObj = JSON.parse(JSON.stringify(char.toObject()));
      console.log('JSON.parse(JSON.stringify) ownerId:', jsonObj.ownerId);
      console.log('JSON.parse(JSON.stringify) ownerId type:', typeof jsonObj.ownerId);
      if (typeof jsonObj.ownerId === 'object') {
        console.log('JSON.parse(JSON.stringify) ownerId full object:', JSON.stringify(jsonObj.ownerId, null, 2));
      }
    });

    // Test actors too
    console.log(`\n=== TESTING ACTOR QUERY ===`);
    const actors = await DocumentModel.find({ 
      campaignId: campaignObjectId, 
      documentType: 'actor' 
    }).populate(['tokenImage']).exec();

    console.log(`Found ${actors.length} actors`);

    actors.slice(0, 3).forEach((actor, index) => {
      console.log(`\n[${index + 1}] Actor: ${actor.name}`);
      const jsonObj = JSON.parse(JSON.stringify(actor.toObject()));
      console.log('JSON.parse(JSON.stringify) ownerId:', jsonObj.ownerId);
      console.log('JSON.parse(JSON.stringify) ownerId type:', typeof jsonObj.ownerId);
      if (typeof jsonObj.ownerId === 'object') {
        console.log('JSON.parse(JSON.stringify) ownerId full object:', JSON.stringify(jsonObj.ownerId, null, 2));
      }
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

debugOwnerId();