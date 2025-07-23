#!/usr/bin/env node

import { readFileSync } from 'fs';

const API_BASE = 'http://localhost:3000';
const API_AUTH_TOKEN = process.env.API_AUTH_TOKEN;

if (!API_AUTH_TOKEN) {
  console.error('API_AUTH_TOKEN environment variable is required');
  process.exit(1);
}

async function testMinimalImport() {
  try {
    console.log('Testing minimal pack import...');
    
    // Read the minimal test pack
    const zipBuffer = readFileSync('./packages/plugins/dnd-5e-2024/minimal-test-pack.zip');
    console.log(`ZIP size: ${(zipBuffer.length / 1024 / 1024).toFixed(2)} MB`);

    // Upload compendium pack - send raw ZIP data
    console.log('Uploading minimal pack...');
    const response = await fetch(`${API_BASE}/api/compendiums/import`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_AUTH_TOKEN}`,
        'Content-Type': 'application/zip'
      },
      body: zipBuffer
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HTTP ${response.status}: ${error}`);
    }

    const result = await response.json();
    console.log('Upload response:', result);

    if (result.jobId) {
      console.log(`Import job started: ${result.jobId}`);
      
      // Monitor job progress
      await monitorJob(result.jobId);
    }

  } catch (error) {
    console.error('Import failed:', error);
    process.exit(1);
  }
}

async function monitorJob(jobId) {
  console.log(`Monitoring job: ${jobId}`);
  
  const maxAttempts = 30;
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    try {
      const response = await fetch(`${API_BASE}/api/compendiums/import/status/${jobId}`, {
        headers: {
          'Authorization': `Bearer ${API_AUTH_TOKEN}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }
      
      const status = await response.json();
      console.log(`Status: ${status.status}, Progress: ${status.progress?.stage || 'unknown'}, Errors: ${status.progress?.errors?.length || 0}`);
      
      if (status.progress?.currentItem) {
        console.log(`Current: ${status.progress.currentItem}`);
      }
      
      if (status.progress?.errors?.length > 0) {
        console.log('Errors:', status.progress.errors);
      }
      
      if (status.status === 'completed') {
        console.log('✅ Import completed successfully!');
        console.log('Result:', status.result);
        return;
      }
      
      if (status.status === 'failed' || status.status === 'aborted') {
        console.log(`❌ Import ${status.status}:`, status.error || 'Unknown error');
        return;
      }
      
      // Wait before checking again
      await new Promise(resolve => setTimeout(resolve, 2000));
      attempts++;
      
    } catch (error) {
      console.error('Error checking job status:', error);
      attempts++;
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  console.log('⏰ Timeout waiting for job completion');
}

testMinimalImport();