import { readFile, readdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { VTTDocument } from '@dungeon-lab/server/src/models/vtt-document.model.mjs';
import { convert5eToolsClass } from './convert-5etools-class.mjs';
import { type ICharacterClass } from '../shared/types/character-class.mjs';
import { pluginRegistry } from '@dungeon-lab/server/src/services/plugin-registry.service.mjs';
pluginRegistry.initialize();
import config from '../../manifest.json' with { type: 'json' };

// Get the current file's directory in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function importCharacterClasses() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/dungeon-lab');
    console.log('Connected to MongoDB');

    // Find the first user in the system to use as creator/updater
    const User = mongoose.connection.collection('users');
    const firstUser = await User.findOne({});
    const userId = firstUser ? firstUser._id.toString() : 'system';
    console.log(`Using user ID: ${userId} for import operations`);

    // Get all class files from the directory
    const classDir = join(__dirname, '../../submodules/5etools-src/data/class');
    const files = await readdir(classDir);
    const classFiles = files.filter(f => f.endsWith('.json') && f.startsWith('class-'));

    for (const file of classFiles) {
      console.log(`Importing class: ${file}`);
      try {
        // Read the class data file
        const classFilePath = join(classDir, file);
        const classData = JSON.parse(await readFile(classFilePath, 'utf-8'));

        // Convert class data
        const normalizedClass = convert5eToolsClass(classData) as ICharacterClass;
        
        // Skip if no valid class data
        if (!normalizedClass || Object.keys(normalizedClass).length === 0) {
          console.log(`No valid class data found in ${file}`);
          continue;
        }

        // Check if document already exists
        const existingDoc = await VTTDocument.findOne({
          pluginId: config.id,
          documentType: 'characterClass',
          'data.name': normalizedClass.name
        });

        if (existingDoc) {
          // Update existing document
          existingDoc.data = normalizedClass;
          existingDoc.updatedBy = userId;
          await existingDoc.save();
          console.log(`Updated character class: ${normalizedClass.name}`);
        } else {
          // Create new VTTDocument
          const document = new VTTDocument({
            name: normalizedClass.name,
            pluginId: config.id,
            documentType: 'characterClass',
            data: normalizedClass,
            createdBy: userId,
            updatedBy: userId
          });

          // Save to database
          await document.save();
          console.log(`Imported character class: ${normalizedClass.name}`);
        }
      } catch (error) {
        console.error(`Error processing ${file}:`, error);
      }
    }

  } catch (error) {
    console.error('Error importing character classes:', error);
  } finally {
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the import if this script is run directly
if (import.meta.url === (typeof document === 'undefined' ? new URL('file:' + process.argv[1]).href : undefined)) {
  importCharacterClasses().catch(console.error);
} 