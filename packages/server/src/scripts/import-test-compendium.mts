#!/usr/bin/env tsx

/**
 * Manual script to import the real Foundry compendium data
 * This bypasses the OpenAPI validation issues in tests and allows us to
 * actually import the 587 spells and verify the data is in the database.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { createApp } from '../src/app.mjs';
import { UserModel } from '../src/models/user.model.mjs';
import { ImportService } from '../src/features/compendiums/services/import.service.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the test ZIP file
const TEST_ZIP_PATH = path.join(__dirname, '../../../compendiums/dnd5e-spells24-test.zip');

async function main() {
  try {
    console.log('🚀 Starting manual compendium import test...');

    // Initialize the app (this loads all models and services)
    console.log('📦 Initializing application...');
    await createApp();

    // Verify ZIP file exists
    console.log('📁 Checking ZIP file...');
    const zipStats = await fs.stat(TEST_ZIP_PATH);
    console.log(`   ✅ ZIP file found: ${(zipStats.size / 1024 / 1024).toFixed(2)} MB`);

    // Create or find a test user
    console.log('👤 Setting up test user...');
    let user = await UserModel.findOne({ email: 'admin@dungeonlab.com' });
    if (!user) {
      user = await UserModel.create({
        email: 'admin@dungeonlab.com',
        username: 'admin',
        password: 'password',
        name: 'Admin User',
        role: 'admin'
      });
      console.log('   ✅ Test user created');
    } else {
      console.log('   ✅ Test user found');
    }

    // Read the ZIP file
    console.log('📖 Reading ZIP file...');
    const zipBuffer = await fs.readFile(TEST_ZIP_PATH);
    console.log(`   ✅ ZIP file loaded: ${zipBuffer.length} bytes`);

    // Import the compendium
    console.log('⚡ Starting import process...');
    const importService = new ImportService();
    
    // Start import (this will create a background job)
    const result = await importService.importFromZip(zipBuffer, {
      overwriteExisting: false,
      validateOnly: false
    }, user.id.toString());

    console.log(`   ✅ Import job created: ${result.jobId}`);
    console.log('   ⏳ Waiting for job to complete...');

    // Poll for completion
    let attempts = 0;
    const maxAttempts = 60; // 60 seconds
    let jobStatus;

    do {
      await new Promise(resolve => setTimeout(resolve, 1000));
      jobStatus = await importService.getImportStatus(result.jobId, user.id.toString());
      
      if (jobStatus.status !== 'pending') {
        break;
      }
      
      attempts++;
      if (attempts % 10 === 0) {
        console.log(`   ⏳ Still processing... (${attempts}s)`);
      }
    } while (attempts < maxAttempts);

    // Check final status
    if (jobStatus.status === 'completed') {
      console.log('🎉 Import completed successfully!');
      console.log(`   📊 Compendium ID: ${jobStatus.compendiumId}`);
      console.log(`   📈 Progress: ${jobStatus.progress.processedItems}/${jobStatus.progress.totalItems} items`);
      console.log(`   🖼️  Assets: ${jobStatus.progress.assetsCopied} uploaded`);
      console.log(`   ❌ Failures: ${jobStatus.progress.failedItems}`);
      
      // Now verify the data is actually in the database
      console.log('🔍 Verifying database content...');
      
      const { CompendiumModel } = await import('../src/features/compendiums/models/compendium.model.mjs');
      const { CompendiumEntryModel } = await import('../src/features/compendiums/models/compendium-entry.model.mjs');
      
      const compendium = await CompendiumModel.findById(jobStatus.compendiumId);
      if (compendium) {
        console.log(`   ✅ Compendium found: "${compendium.name}"`);
        console.log(`   📝 Description: ${compendium.description}`);
        console.log(`   📊 Total entries: ${compendium.totalEntries}`);
        console.log(`   🎯 Entries by type:`, compendium.entriesByType);
        
        const entryCount = await CompendiumEntryModel.countDocuments({ compendiumId: compendium.id });
        console.log(`   📋 Entry count in database: ${entryCount}`);
        
        // Show some sample entries
        const sampleEntries = await CompendiumEntryModel.find({ compendiumId: compendium.id }).limit(5);
        console.log(`   📄 Sample entries:`);
        for (const entry of sampleEntries) {
          console.log(`      - ${entry.name} (${entry.contentType})`);
        }
        
      } else {
        console.error('   ❌ Compendium not found in database!');
      }
      
    } else if (jobStatus.status === 'failed') {
      console.error('❌ Import failed!');
      console.error(`   Error: ${jobStatus.error}`);
    } else {
      console.error('⏰ Import timed out');
      console.error(`   Status: ${jobStatus.status}`);
    }

  } catch (error) {
    console.error('💥 Error during import:', error);
    if (error instanceof Error) {
      console.error('Stack:', error.stack);
    }
  } finally {
    console.log('🔌 Closing database connection...');
    await mongoose.disconnect();
    console.log('✅ Done!');
  }
}

// Run the script
main().catch(console.error);