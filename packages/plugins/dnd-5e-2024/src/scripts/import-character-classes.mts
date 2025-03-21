import { readFile, readdir } from 'fs/promises';
import { join } from 'path';
import mongoose from 'mongoose';
import { VTTDocument } from '@dungeon-lab/server/models/vtt-document.model.mjs';
import { convert5eToolsClass } from './convert-5etools-class.mjs';
import { type ICharacterClass } from '../shared/schemas/character-class.schema.mjs';
import config from '../../manifest.json' with { type: 'json' };

async function importCharacterClasses() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/dungeon-lab');
    console.log('Connected to MongoDB');

    // Get all class files from the directory
    const classDir = join(__dirname, '../../submodules/5etools-src/data/class');
    const files = await readdir(classDir);
    const classFiles = files.filter(f => f.endsWith('.json'));

    for (const file of classFiles) {
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
          existingDoc.updatedBy = 'system';
          await existingDoc.save();
          console.log(`Updated character class: ${normalizedClass.name}`);
        } else {
          // Create new VTTDocument
          const document = new VTTDocument({
            name: normalizedClass.name,
            pluginId: config.id,
            documentType: 'characterClass',
            data: normalizedClass,
            createdBy: 'system',
            updatedBy: 'system'
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
if (process.argv[1] === __filename) {
  importCharacterClasses().catch(console.error);
} 