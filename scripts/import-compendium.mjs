#!/usr/bin/env node

/**
 * Real Compendium Import Script
 * 
 * This script demonstrates the complete end-to-end compendium import process:
 * 1. Authenticates with the API
 * 2. Validates the ZIP file
 * 3. Imports the compendium
 * 4. Monitors progress
 * 5. Verifies the imported data
 * 
 * Usage: node scripts/import-compendium.mjs [zip-file-path]
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const API_BASE_URL = 'http://localhost:3001/api';
const DEFAULT_ZIP_PATH = path.join(__dirname, '../compendiums/dnd5e-spells24-test-new.zip');

// User credentials (in production, these would come from environment variables)
const USER_CREDENTIALS = {
  email: 'admin@dungeonlab.com',
  password: 'admin123'
};

class CompendiumImporter {
  constructor() {
    this.cookie = null;
    this.baseUrl = API_BASE_URL;
  }

  /**
   * Make an authenticated API request
   */
  async apiRequest(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (this.cookie) {
      headers.Cookie = this.cookie;
    }

    const response = await fetch(url, {
      ...options,
      headers
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API request failed (${response.status}): ${error}`);
    }

    return response.json();
  }

  /**
   * Authenticate with the API
   */
  async authenticate() {
    console.log('🔐 Authenticating...');
    
    const response = await fetch(`${this.baseUrl}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(USER_CREDENTIALS)
    });

    if (!response.ok) {
      throw new Error(`Authentication failed: ${response.status} ${response.statusText}`);
    }

    // Extract session cookie
    const setCookieHeader = response.headers.get('set-cookie');
    if (setCookieHeader) {
      this.cookie = setCookieHeader.split(';')[0];
      console.log('✅ Authentication successful');
    } else {
      throw new Error('No session cookie received');
    }
  }

  /**
   * Validate the ZIP file
   */
  async validateZip(zipBuffer) {
    console.log('🔍 Validating ZIP file...');
    
    const response = await fetch(`${this.baseUrl}/compendiums/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/zip',
        Cookie: this.cookie
      },
      body: zipBuffer
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`ZIP validation failed: ${error}`);
    }

    const result = await response.json();
    
    if (!result.success || !result.data.valid) {
      throw new Error(`ZIP validation failed: ${result.data.error || 'Unknown error'}`);
    }

    console.log('✅ ZIP file validation successful');
    console.log(`📦 Compendium: ${result.data.manifest.name}`);
    console.log(`🎮 Game System: ${result.data.manifest.gameSystemId}`);
    console.log(`🔧 Plugin: ${result.data.manifest.pluginId}`);
    console.log(`📊 Content Types: ${result.data.manifest.contentTypes.join(', ')}`);
    
    return result.data.manifest;
  }

  /**
   * Start the import process
   */
  async startImport(zipBuffer) {
    console.log('🚀 Starting import...');
    
    const response = await fetch(`${this.baseUrl}/compendiums/import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/zip',
        Cookie: this.cookie
      },
      body: zipBuffer
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Import failed to start: ${error}`);
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(`Import failed: ${result.error}`);
    }

    console.log('✅ Import job started');
    console.log(`📋 Job ID: ${result.data.jobId}`);
    
    return result.data.jobId;
  }

  /**
   * Monitor import progress
   */
  async monitorProgress(jobId) {
    console.log('⏳ Monitoring import progress...');
    
    let attempts = 0;
    const maxAttempts = 120; // 2 minutes max wait time
    
    while (attempts < maxAttempts) {
      try {
        const result = await this.apiRequest(`/compendiums/import/${jobId}/status`);
        const status = result.data;
        
        // Log progress
        console.log(`📊 Progress: ${status.status} - ${status.progress.stage}`);
        if (status.progress.totalItems > 0) {
          const percentage = Math.round((status.progress.processedItems / status.progress.totalItems) * 100);
          console.log(`   ${status.progress.processedItems}/${status.progress.totalItems} items (${percentage}%)`);
        }
        if (status.progress.currentItem) {
          console.log(`   Current: ${status.progress.currentItem}`);
        }
        
        // Check if completed
        if (status.status === 'completed') {
          console.log('✅ Import completed successfully!');
          console.log(`🗂️ Compendium ID: ${status.compendiumId}`);
          return status.compendiumId;
        }
        
        // Check if failed
        if (status.status === 'failed') {
          const errors = status.progress.errors?.join(', ') || status.error || 'Unknown error';
          throw new Error(`Import failed: ${errors}`);
        }
        
        // Wait before next check
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
        
      } catch (error) {
        console.error(`Error checking status: ${error.message}`);
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    throw new Error('Import timed out after 2 minutes');
  }

  /**
   * Verify the imported compendium
   */
  async verifyImport(compendiumId) {
    console.log('🔍 Verifying imported compendium...');
    
    // Get compendium details
    const compendium = await this.apiRequest(`/compendiums/${compendiumId}`);
    
    console.log('📋 Compendium Details:');
    console.log(`   Name: ${compendium.data.name}`);
    console.log(`   Description: ${compendium.data.description}`);
    console.log(`   Status: ${compendium.data.status}`);
    console.log(`   Total Entries: ${compendium.data.totalEntries}`);
    console.log(`   Public: ${compendium.data.isPublic ? 'Yes' : 'No'}`);
    
    if (compendium.data.entriesByType) {
      console.log('   Entries by Type:');
      Object.entries(compendium.data.entriesByType).forEach(([type, count]) => {
        console.log(`     ${type}: ${count}`);
      });
    }
    
    // Get first few entries as examples
    const entries = await this.apiRequest(`/compendiums/${compendiumId}/entries?limit=5`);
    
    console.log(`📝 First ${Math.min(5, entries.data.length)} entries:`);
    entries.data.forEach((entry, index) => {
      console.log(`   ${index + 1}. ${entry.name} (${entry.contentType})`);
    });
    
    console.log('✅ Import verification complete!');
    return compendium.data;
  }

  /**
   * Run the complete import process
   */
  async run(zipFilePath) {
    try {
      // Check if ZIP file exists
      console.log(`📁 Loading ZIP file: ${zipFilePath}`);
      const zipBuffer = await fs.readFile(zipFilePath);
      console.log(`📊 ZIP file size: ${(zipBuffer.length / 1024 / 1024).toFixed(2)} MB`);
      
      // Step 1: Authenticate
      await this.authenticate();
      
      // Step 2: Validate ZIP
      const manifest = await this.validateZip(zipBuffer);
      
      // Step 3: Start import
      const jobId = await this.startImport(zipBuffer);
      
      // Step 4: Monitor progress
      const compendiumId = await this.monitorProgress(jobId);
      
      // Step 5: Verify import
      const compendium = await this.verifyImport(compendiumId);
      
      console.log('\n🎉 SUCCESS! Compendium import completed successfully!');
      console.log(`🔗 You can view the compendium at: http://localhost:3000/compendiums/${compendiumId}`);
      
      return {
        compendiumId,
        compendium,
        manifest
      };
      
    } catch (error) {
      console.error('\n❌ FAILED! Import process failed:');
      console.error(error.message);
      
      if (error.stack) {
        console.error('\nStack trace:');
        console.error(error.stack);
      }
      
      process.exit(1);
    }
  }
}

// Main execution
async function main() {
  const zipFilePath = process.argv[2] || DEFAULT_ZIP_PATH;
  
  console.log('🚀 Dungeon Lab Compendium Import Script');
  console.log('==========================================\n');
  
  const importer = new CompendiumImporter();
  await importer.run(zipFilePath);
}

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { CompendiumImporter };