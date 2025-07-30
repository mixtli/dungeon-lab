import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { ImportService } from '../../src/features/compendiums/services/import.service.mjs';
import { CompendiumModel } from '../../src/features/compendiums/models/compendium.model.mjs';
import { CompendiumEntryModel } from '../../src/features/compendiums/models/compendium-entry.model.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to test ZIP file
const TEST_ZIP_PATH = path.join(__dirname, '../fixtures/test-compendium.zip');
const TEST_USER_ID = '507f1f77bcf86cd799439011';

describe('ImportService Direct Integration Test', () => {
  let mongoServer: MongoMemoryServer;
  let importService: ImportService;

  beforeAll(async () => {
    // Setup in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
    
    // Initialize ImportService
    importService = new ImportService();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Clear collections between tests
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  });

  it('should import compendium from ZIP file and create database records', async () => {
    // Verify ZIP file exists
    const zipStats = await fs.stat(TEST_ZIP_PATH);
    expect(zipStats.isFile()).toBe(true);
    expect(zipStats.size).toBeGreaterThan(0);

    // Read ZIP file as buffer
    const zipBuffer = await fs.readFile(TEST_ZIP_PATH);

    // Import the compendium
    const result = await importService.importFromZip(zipBuffer, TEST_USER_ID);

    // Verify import result
    expect(result).toBeDefined();
    expect(result.name).toBe('test-compendium');

    // Check that compendium was created in database
    const compendiums = await CompendiumModel.find({});
    expect(compendiums).toHaveLength(1);

    const compendium = compendiums[0];
    expect(compendium.name).toBe('test-compendium');
    expect(compendium.description).toBe('Comprehensive test compendium with diverse D&D 5e content types from real converted Foundry data');
    expect(compendium.pluginId).toBe('dnd-5e-2024');
    expect(compendium.status).toBe('active');

    // Check that compendium entries were created
    const entries = await CompendiumEntryModel.find({ compendiumId: compendium._id });
    expect(entries.length).toBeGreaterThan(0);

    // Verify actors were imported
    const actorEntries = entries.filter(e => e.contentType === 'Actor');
    expect(actorEntries).toHaveLength(3);

    const actorNames = actorEntries.map(e => e.name).sort();
    expect(actorNames).toEqual(['Animated Rug of Smothering', 'Apparatus of the Crab', 'Goblin Warrior']);

    // Verify items were imported
    const itemEntries = entries.filter(e => e.contentType === 'Item');
    expect(itemEntries).toHaveLength(4);

    const itemNames = itemEntries.map(e => e.name).sort();
    expect(itemNames).toEqual(['Blanket', 'Dancing Sword', 'Magic Weapon +2', 'Plate Armor']);

    // Verify VTT documents were imported
    const documentEntries = entries.filter(e => e.contentType === 'VTTDocument');
    expect(documentEntries).toHaveLength(2);

    const documentNames = documentEntries.map(e => e.name).sort();
    expect(documentNames).toEqual(['Acolyte', 'Resist Thunder']);

    console.log('✅ Import test completed successfully');
    console.log(`📊 Imported ${entries.length} total entries:`);
    console.log(`   - ${actorEntries.length} actors`);
    console.log(`   - ${itemEntries.length} items`);
    console.log(`   - ${documentEntries.length} documents`);
  }, 30000); // 30 second timeout for import operation

});