#!/usr/bin/env node

import fs from 'fs/promises';

const API_BASE_URL = 'http://localhost:3000/api';
const API_TOKEN = process.env.API_AUTH_TOKEN;
const ZIP_PATH = process.argv[2] || './packages/plugins/dnd-5e-2024/full-compendium-pack-fixed.zip';

async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = {
    'Authorization': `Bearer ${API_TOKEN}`,
    ...options.headers
  };

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

async function testImport() {
  try {
    console.log('🚀 Testing Compendium Import...');
    console.log(`📁 ZIP file: ${ZIP_PATH}`);
    
    // Load ZIP file
    const zipBuffer = await fs.readFile(ZIP_PATH);
    console.log(`📊 ZIP size: ${(zipBuffer.length / 1024 / 1024).toFixed(2)} MB`);
    
    // Test validation endpoint
    console.log('🔍 Validating ZIP...');
    const validateResponse = await fetch(`${API_BASE_URL}/compendiums/validate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/zip'
      },
      body: zipBuffer
    });
    
    if (!validateResponse.ok) {
      const error = await validateResponse.text();
      console.error(`❌ Validation failed: ${error}`);
      return;
    }
    
    const validation = await validateResponse.json();
    console.log('✅ Validation successful!');
    console.log(`📦 Compendium: ${validation.data.manifest.name}`);
    console.log(`🎮 Game System: ${validation.data.manifest.gameSystemId}`);
    console.log(`📊 Content Types: ${validation.data.manifest.contentTypes.join(', ')}`);
    
    // Test import endpoint
    console.log('🚀 Starting import...');
    const importResponse = await fetch(`${API_BASE_URL}/compendiums/import`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/zip'
      },
      body: zipBuffer
    });
    
    if (!importResponse.ok) {
      const error = await importResponse.text();
      console.error(`❌ Import failed: ${error}`);
      return;
    }
    
    const importResult = await importResponse.json();
    console.log('✅ Import started!');
    console.log(`📋 Job ID: ${importResult.data.jobId}`);
    
    // Monitor progress
    const jobId = importResult.data.jobId;
    let attempts = 0;
    const maxAttempts = 60;
    
    while (attempts < maxAttempts) {
      try {
        const status = await apiRequest(`/compendiums/import/${jobId}/status`);
        
        console.log(`📊 Status: ${status.data.status} - ${status.data.progress.stage}`);
        if (status.data.progress.totalItems > 0) {
          const percentage = Math.round((status.data.progress.processedItems / status.data.progress.totalItems) * 100);
          console.log(`   Progress: ${status.data.progress.processedItems}/${status.data.progress.totalItems} (${percentage}%)`);
        }
        
        if (status.data.status === 'completed') {
          console.log('🎉 Import completed successfully!');
          console.log(`🗂️ Compendium ID: ${status.data.compendiumId}`);
          
          // Verify the import
          const compendium = await apiRequest(`/compendiums/${status.data.compendiumId}`);
          console.log('📋 Compendium Details:');
          console.log(`   Name: ${compendium.data.name}`);
          console.log(`   Total Entries: ${compendium.data.totalEntries}`);
          console.log(`   Entries by Type:`, compendium.data.entriesByType);
          
          return;
        }
        
        if (status.data.status === 'failed') {
          const errors = status.data.progress.errors?.join(', ') || 'Unknown error';
          console.error(`❌ Import failed: ${errors}`);
          return;
        }
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        attempts++;
        
      } catch (error) {
        console.error(`Error checking status: ${error.message}`);
        break;
      }
    }
    
    console.warn('⚠️ Import monitoring timed out');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testImport();