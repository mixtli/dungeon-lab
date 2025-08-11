#!/usr/bin/env tsx

/**
 * Debug script to investigate ownerId storage issue in Actor documents
 * Tests how ownerId field is handled with different input types during document creation
 */

import mongoose from 'mongoose';
import { ActorDocumentModel } from '../features/documents/models/actor-document.model.mjs';
import { config } from '../config/index.mjs';

async function logObjectDetails(label: string, obj: any, field = 'ownerId') {
  console.log(`\n=== ${label} ===`);
  if (!obj) {
    console.log('Object is null/undefined');
    return;
  }
  
  const value = obj[field];
  console.log(`${field} value:`, value);
  console.log(`${field} type:`, typeof value);
  console.log(`${field} instanceof ObjectId:`, value instanceof mongoose.Types.ObjectId);
  if (value) {
    console.log(`${field} constructor:`, value.constructor.name);
    console.log(`${field} toString():`, value.toString());
  }
}

async function rawMongoQuery(id: mongoose.Types.ObjectId) {
  const db = mongoose.connection.db;
  const collection = db.collection('documents'); // The actual collection name
  const doc = await collection.findOne({ _id: id });
  console.log('\n=== Raw MongoDB Query Result ===');
  console.log('Full document:', JSON.stringify(doc, null, 2));
  if (doc?.ownerId) {
    console.log(`Raw ownerId value:`, doc.ownerId);
    console.log(`Raw ownerId type:`, typeof doc.ownerId);
    console.log(`Raw ownerId instanceof ObjectId:`, doc.ownerId instanceof mongoose.Types.ObjectId);
  }
}

async function testScenario(scenarioName: string, actorData: any) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`TESTING: ${scenarioName}`);
  console.log(`${'='.repeat(60)}`);
  
  try {
    // Create the document
    console.log('\n--- INPUT DATA ---');
    console.log('Actor data:', JSON.stringify(actorData, null, 2));
    logObjectDetails('Input ownerId', actorData);
    
    const actor = new ActorDocumentModel(actorData);
    
    // Log before save
    logObjectDetails('Before save (Mongoose doc)', actor);
    
    // Save to database
    const savedActor = await actor.save();
    
    // Log after save
    logObjectDetails('After save (returned doc)', savedActor);
    
    // Query raw MongoDB data
    await rawMongoQuery(savedActor._id);
    
    // Fresh query from database
    const queriedActor = await ActorDocumentModel.findById(savedActor._id);
    logObjectDetails('Fresh query from DB', queriedActor);
    
    // Test JSON serialization
    const jsonResult = savedActor.toJSON();
    console.log('\n=== JSON Serialization ===');
    console.log(`JSON ownerId:`, jsonResult.ownerId);
    console.log(`JSON ownerId type:`, typeof jsonResult.ownerId);
    
    // Test toObject
    const objResult = savedActor.toObject();
    console.log('\n=== toObject Result ===');
    console.log(`Object ownerId:`, objResult.ownerId);
    console.log(`Object ownerId type:`, typeof objResult.ownerId);
    
    return savedActor._id;
    
  } catch (error) {
    console.error(`Error in scenario "${scenarioName}":`, error);
    return null;
  }
}

async function cleanupTestData(ids: mongoose.Types.ObjectId[]) {
  if (ids.length > 0) {
    console.log('\n--- Cleaning up test data ---');
    await ActorDocumentModel.deleteMany({ _id: { $in: ids } });
    console.log(`Deleted ${ids.length} test documents`);
  }
}

async function debugOwnerIdStorage() {
  try {
    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(config.mongoUri);
    console.log('✅ Connected successfully');
    
    const testIds: mongoose.Types.ObjectId[] = [];
    
    // Test Scenario 1: Valid ObjectId string
    const validObjectIdString = new mongoose.Types.ObjectId().toString();
    console.log(`Using valid ObjectId string: ${validObjectIdString}`);
    const id1 = await testScenario('Valid ObjectId String', {
      name: 'Test Actor 1',
      slug: 'test-actor-1',
      documentType: 'actor',
      pluginId: 'test-plugin',
      pluginDocumentType: 'npc',
      campaignId: new mongoose.Types.ObjectId().toString(),
      ownerId: validObjectIdString
    });
    if (id1) testIds.push(id1);
    
    // Test Scenario 2: ObjectId instance
    const objectIdInstance = new mongoose.Types.ObjectId();
    console.log(`Using ObjectId instance: ${objectIdInstance.toString()}`);
    const id2 = await testScenario('ObjectId Instance', {
      name: 'Test Actor 2',
      slug: 'test-actor-2',
      documentType: 'actor', 
      pluginId: 'test-plugin',
      pluginDocumentType: 'npc',
      campaignId: new mongoose.Types.ObjectId().toString(),
      ownerId: objectIdInstance
    });
    if (id2) testIds.push(id2);
    
    // Test Scenario 3: No ownerId (optional field)
    const id3 = await testScenario('No ownerId (undefined)', {
      name: 'Test Actor 3',
      slug: 'test-actor-3',
      documentType: 'actor',
      pluginId: 'test-plugin', 
      pluginDocumentType: 'npc',
      campaignId: new mongoose.Types.ObjectId().toString()
      // ownerId deliberately omitted
    });
    if (id3) testIds.push(id3);
    
    // Test Scenario 4: Invalid string (should this fail or convert?)
    const id4 = await testScenario('Invalid String', {
      name: 'Test Actor 4',
      slug: 'test-actor-4',
      documentType: 'actor',
      pluginId: 'test-plugin',
      pluginDocumentType: 'npc', 
      campaignId: new mongoose.Types.ObjectId().toString(),
      ownerId: 'not-a-valid-objectid'
    });
    if (id4) testIds.push(id4);
    
    // Clean up
    await cleanupTestData(testIds);
    
  } catch (error) {
    console.error('❌ Error in debug script:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

// Run the debug script
debugOwnerIdStorage().catch(console.error);