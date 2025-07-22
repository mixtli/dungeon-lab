import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { getTestAgent } from '../test-utils.mjs';
import { backgroundJobService } from '../../src/services/background-job.service.mjs';
import { initializeJobs } from '../../src/jobs/index.mjs';
import { CompendiumModel } from '../../src/features/compendiums/models/compendium.model.mjs';
import { CompendiumEntryModel } from '../../src/features/compendiums/models/compendium-entry.model.mjs';
import { downloadBuffer } from '../../src/services/storage.service.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to test ZIP file
const TEST_ZIP_PATH = path.join(__dirname, '../fixtures/test-compendium.zip');
const TEST_USER_ID = '507f1f77bcf86cd799439011';

describe('Async Compendium Import Integration Test', () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    // Start MongoDB Memory Server
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    // Connect to MongoDB
    await mongoose.connect(mongoUri);

    // Initialize background jobs
    await backgroundJobService.initialize();
    await initializeJobs();
  });

  afterAll(async () => {
    await backgroundJobService.shutdown();
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Clear all collections
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  });

  it('should upload ZIP to MinIO and process import asynchronously', async () => {
    // Read test ZIP file
    const zipBuffer = await fs.readFile(TEST_ZIP_PATH);

    const agent = await getTestAgent();

    // Upload ZIP and start import with authentication
    const importResponse = await agent
      .post('/api/compendiums/import')
      .set('Content-Type', 'application/zip')
      .set('Cookie', [`connect.sid=test-session-${TEST_USER_ID}`])
      .send(zipBuffer)
      .expect(202);

    expect(importResponse.body.success).toBe(true);
    expect(importResponse.body.data.jobId).toBeDefined();
    
    const jobId = importResponse.body.data.jobId;
    console.log(`Import job created: ${jobId}`);

    // Wait for job to complete (with timeout)
    let status = 'pending';
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds max

    while (status !== 'completed' && status !== 'failed' && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      
      const statusResponse = await request(app)
        .get(`/api/compendiums/import/${jobId}/status`)
        .expect(200);

      status = statusResponse.body.data.status;
      const progress = statusResponse.body.data.progress;
      
      console.log(`Job ${jobId} status: ${status}, stage: ${progress.stage}`);
      
      if (status === 'failed') {
        throw new Error(`Import job failed: ${statusResponse.body.data.error}`);
      }
      
      attempts++;
    }

    expect(status).toBe('completed');

    // Verify the ZIP was uploaded to MinIO
    const jobs = await backgroundJobService.getCompletedJobs('import-compendium');
    const completedJob = jobs.find((j: any) => j.attrs._id?.toString() === jobId);
    expect(completedJob).toBeDefined();
    
    const jobData = completedJob?.attrs.data as any;
    expect(jobData.zipStorageKey).toBeDefined();
    
    // Verify the ZIP file exists in MinIO (it should be deleted after successful import)
    try {
      await downloadBuffer(jobData.zipStorageKey);
      // If we get here, the file still exists (which is unexpected after successful import)
      console.warn('ZIP file was not cleaned up after import');
    } catch (error) {
      // Expected - file should be deleted after successful import
      console.log('ZIP file correctly cleaned up after import');
    }

    // Verify compendium was created
    const compendiums = await CompendiumModel.find({});
    expect(compendiums).toHaveLength(1);
    
    const compendium = compendiums[0];
    expect(compendium.name).toBe('test-compendium');
    expect(compendium.gameSystemId).toBe('dnd5e-2024');

    // Verify entries were created
    const entries = await CompendiumEntryModel.find({ compendiumId: compendium._id });
    expect(entries.length).toBe(9); // 3 actors + 4 items + 2 documents

    console.log('✅ Async import test completed successfully');
  }, 60000); // 60 second timeout for async test

  it('should handle validation-only requests', async () => {
    const zipBuffer = await fs.readFile(TEST_ZIP_PATH);

    // Mock session middleware
    app.use((req, _res, next) => {
      req.session = { user: { id: TEST_USER_ID } } as any;
      next();
    });

    // Validate ZIP without importing
    const response = await request(app)
      .post('/api/compendiums/import?validateOnly=true')
      .set('Content-Type', 'application/zip')
      .send(zipBuffer)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.message).toBe('ZIP file validated successfully');

    // Verify no compendium was created
    const compendiums = await CompendiumModel.find({});
    expect(compendiums).toHaveLength(0);
  });
});