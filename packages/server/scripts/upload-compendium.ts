#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get command line arguments
const args = process.argv.slice(2);

if (args.length === 0) {
  console.error('Usage: npm run upload-compendium <zip-file-path>');
  console.error('Environment variable API_AUTH_TOKEN must be set');
  process.exit(1);
}

const zipFilePath = args[0];
const apiAuthToken = process.env.API_AUTH_TOKEN;
const apiUrl = process.env.API_URL || 'http://localhost:3000';

if (!apiAuthToken) {
  console.error('Error: API_AUTH_TOKEN environment variable is not set');
  process.exit(1);
}

// Validate the ZIP file exists
try {
  const stats = await fs.stat(zipFilePath);
  if (!stats.isFile()) {
    console.error(`Error: ${zipFilePath} is not a file`);
    process.exit(1);
  }
} catch (error) {
  console.error(`Error: Could not access file ${zipFilePath}`);
  console.error(error);
  process.exit(1);
}

console.log(`📦 Uploading compendium: ${path.basename(zipFilePath)}`);
console.log(`🌐 API URL: ${apiUrl}`);

try {
  // Read the ZIP file
  const zipBuffer = await fs.readFile(zipFilePath);
  console.log(`📏 File size: ${(zipBuffer.length / 1024 / 1024).toFixed(2)} MB`);

  // Upload to the API
  console.log('⬆️  Uploading to API...');
  const response = await fetch(`${apiUrl}/api/compendiums/import?overwriteExisting=true`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiAuthToken}`,
      'Content-Type': 'application/zip'
    },
    body: zipBuffer
  });

  const responseData = await response.json();

  if (!response.ok) {
    console.error(`❌ Upload failed: ${response.status} ${response.statusText}`);
    console.error(responseData);
    process.exit(1);
  }

  console.log('✅ Upload successful!');
  console.log(JSON.stringify(responseData, null, 2));

  if (responseData.data?.jobId) {
    console.log(`\n📋 Import job ID: ${responseData.data.jobId}`);
    console.log('⏳ Import is being processed in the background');
    
    // Optionally poll for status
    if (process.argv.includes('--watch')) {
      console.log('\n👀 Watching import progress...');
      await watchImportProgress(apiUrl, responseData.data.jobId, apiAuthToken);
    } else {
      console.log('\nUse --watch flag to monitor import progress');
    }
  }

} catch (error) {
  console.error('❌ Error uploading compendium:');
  console.error(error);
  process.exit(1);
}

async function watchImportProgress(apiUrl: string, jobId: string, apiToken: string) {
  let completed = false;
  let lastStage = '';

  while (!completed) {
    try {
      const response = await fetch(`${apiUrl}/api/compendiums/import/${jobId}/status`, {
        headers: {
          'Authorization': `Bearer ${apiToken}`
        }
      });

      if (!response.ok) {
        console.error(`Failed to get status: ${response.status}`);
        break;
      }

      const data = await response.json();
      const job = data.data;

      if (job.progress?.stage && job.progress.stage !== lastStage) {
        lastStage = job.progress.stage;
        console.log(`📊 Stage: ${job.progress.stage}`);
      }

      if (job.status === 'completed') {
        console.log('\n✅ Import completed successfully!');
        if (job.progress?.totalItems) {
          console.log(`📦 Imported ${job.progress.totalItems} items`);
        }
        if (job.result?.compendiumId) {
          console.log(`🆔 Compendium ID: ${job.result.compendiumId}`);
        }
        completed = true;
      } else if (job.status === 'failed') {
        console.error('\n❌ Import failed!');
        console.error(job.error || 'Unknown error');
        process.exit(1);
      }

      if (!completed) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
      }
    } catch (error) {
      console.error('Error checking status:', error);
      break;
    }
  }
}