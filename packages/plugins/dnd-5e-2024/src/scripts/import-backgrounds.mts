import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { VTTDocument } from '@dungeon-lab/server/src/models/vtt-document.model.mjs';
import { convert5eToolsBackground } from './convert-5etools-background.mjs';
import { type IBackground } from '../shared/types/vttdocument.mjs';
import { pluginRegistry } from '@dungeon-lab/server/src/services/plugin-registry.service.mjs';
pluginRegistry.initialize();
import config from '../../manifest.json' with { type: 'json' };

// Get the current file's directory in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function importBackgrounds() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/dungeon-lab');
    console.log('Connected to MongoDB');

    // Find the first user in the system to use as creator/updater
    const User = mongoose.connection.collection('users');
    const firstUser = await User.findOne({});
    const userId = firstUser ? firstUser._id.toString() : 'system';
    console.log(`Using user ID: ${userId} for import operations`);

    // Read the backgrounds data file
    const backgroundsFilePath = join(__dirname, '../../submodules/5etools-src/data/backgrounds.json');
    const backgroundsData = JSON.parse(await readFile(backgroundsFilePath, 'utf-8'));
    
    // Get only XPHB backgrounds
    const backgrounds = backgroundsData.background || [];
    console.log(`Found ${backgrounds.length} backgrounds in source file`);
    
    let importCount = 0;
    let updateCount = 0;
    let skipCount = 0;

    for (const background of backgrounds) {
      try {
        // Skip if not from XPHB
        if (background.source !== 'XPHB') {
          skipCount++;
          continue;
        }
        
        // Convert background data
        console.log(background);
        const normalizedBackground = convert5eToolsBackground(background) as IBackground;
        console.log(normalizedBackground);
        
        // Skip if no valid background data
        if (!normalizedBackground || Object.keys(normalizedBackground).length === 0) {
          console.log(`No valid data for background: ${background.name || 'unknown'}`);
          skipCount++;
          continue;
        }

        console.log(`Processing background: ${normalizedBackground.name}`);

        // Check if document already exists
        const existingDoc = await VTTDocument.findOne({
          pluginId: config.id,
          documentType: 'background',
          'data.name': normalizedBackground.name
        });

        if (existingDoc) {
          // Update existing document
          existingDoc.data = normalizedBackground;
          existingDoc.updatedBy = userId;
          await existingDoc.save();
          console.log(`Updated background: ${normalizedBackground.name}`);
          updateCount++;
        } else {
          // Create new VTTDocument
          const document = new VTTDocument({
            name: normalizedBackground.name,
            pluginId: config.id,
            documentType: 'background',
            data: normalizedBackground,
            createdBy: userId,
            updatedBy: userId
          });

          // Save to database
          await document.save();
          console.log(`Imported background: ${normalizedBackground.name}`);
          importCount++;
        }
      } catch (error) {
        console.error(`Error processing background:`, error);
      }
    }

    console.log(`Import summary:`);
    console.log(`- Imported: ${importCount} new backgrounds`);
    console.log(`- Updated: ${updateCount} existing backgrounds`);
    console.log(`- Skipped: ${skipCount} backgrounds (non-XPHB or invalid)`);

  } catch (error) {
    console.error('Error importing backgrounds:', error);
  } finally {
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the import if this script is run directly
if (import.meta.url === (typeof document === 'undefined' ? new URL('file:' + process.argv[1]).href : undefined)) {
  importBackgrounds().catch(console.error);
} 