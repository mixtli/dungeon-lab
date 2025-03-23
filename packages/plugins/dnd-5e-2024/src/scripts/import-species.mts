import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { VTTDocument } from '@dungeon-lab/server/src/models/vtt-document.model.mjs';
import { convert5eToolsSpecies } from './convert-5etools-species.mjs';
import { type ISpecies } from '../shared/types/vttdocument.mjs';
import { pluginRegistry } from '@dungeon-lab/server/src/services/plugin-registry.service.mjs';
pluginRegistry.initialize();
import config from '../../manifest.json' with { type: 'json' };

// Get the current file's directory in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function importSpecies() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/dungeon-lab');
    console.log('Connected to MongoDB');

    // Find the first user in the system to use as creator/updater
    const User = mongoose.connection.collection('users');
    const firstUser = await User.findOne({});
    const userId = firstUser ? firstUser._id.toString() : 'system';
    console.log(`Using user ID: ${userId} for import operations`);

    // Read the 5etools races data
    const racesFilePath = join(__dirname, '../../submodules/5etools-src/data/races.json');
    const racesData = JSON.parse(await readFile(racesFilePath, 'utf-8'));
    
    if (!racesData.race || !Array.isArray(racesData.race)) {
      throw new Error('Invalid races data format');
    }

    console.log(`Found ${racesData.race.length} races in 5etools data`);
    
    // Filter to only XPHB species
    const xphbSpecies = racesData.race.filter((race: any) => race.source === 'XPHB');
    console.log(`Found ${xphbSpecies.length} XPHB species to import`);

    // Stats for reporting
    let imported = 0;
    let updated = 0;
    let skipped = 0;
    let errors = 0;

    // Process each species
    for (const species of xphbSpecies) {
      try {
        const normalizedSpecies = convert5eToolsSpecies(species) as ISpecies;
        
        // Skip if conversion returned an empty object
        if (!normalizedSpecies.name) {
          skipped++;
          continue;
        }

        // Check if this species already exists
        const existingDoc = await VTTDocument.findOne({
          documentType: 'species',
          pluginId: config.id,
          'data.name': normalizedSpecies.name
        });

        if (existingDoc) {
          // Update existing document
          existingDoc.data = normalizedSpecies;
          existingDoc.updatedBy = userId;
          await existingDoc.save();
          updated++;
          console.log(`Updated species: ${normalizedSpecies.name}`);
        } else {
          // Create new document
          await VTTDocument.create({
            documentType: 'species',
            pluginId: config.id,
            name: normalizedSpecies.name,
            data: normalizedSpecies,
            createdBy: userId,
            updatedBy: userId
          });
          imported++;
          console.log(`Imported species: ${normalizedSpecies.name}`);
        }
      } catch (err) {
        console.error(`Error processing species ${species.name}:`, err);
        errors++;
      }
    }

    // Report results
    console.log('\nImport Summary:');
    console.log(`- Imported: ${imported} new species`);
    console.log(`- Updated: ${updated} existing species`);
    console.log(`- Skipped: ${skipped} species`);
    console.log(`- Errors: ${errors} species`);

  } catch (err) {
    console.error('Error importing species:', err);
  } finally {
    // Close the database connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
}

// Run the import
importSpecies(); 