import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import type { ICompendium, ICompendiumEntry } from '@dungeon-lab/shared/types/index.mjs';
import type { SuperAgentTest } from 'supertest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const FIXTURES_DIR = path.join(__dirname, '../fixtures');
export const TEST_ZIP_PATH = path.join(__dirname, '../../../compendiums/dnd5e-spells24-test.zip');

/**
 * Create a minimal test compendium ZIP file
 */
export async function createTestCompendiumZip(): Promise<string> {
  const tempDir = path.join(FIXTURES_DIR, 'temp-compendium');
  const zipPath = path.join(FIXTURES_DIR, 'test-compendium.zip');

  // Create temporary directory structure
  await fs.mkdir(tempDir, { recursive: true });
  await fs.mkdir(path.join(tempDir, 'actors'), { recursive: true });
  await fs.mkdir(path.join(tempDir, 'items'), { recursive: true });
  await fs.mkdir(path.join(tempDir, 'documents'), { recursive: true });

  // Copy manifest
  const manifestPath = path.join(FIXTURES_DIR, 'sample-manifest.json');
  await fs.copyFile(manifestPath, path.join(tempDir, 'manifest.json'));

  // Create sample content files
  await fs.writeFile(
    path.join(tempDir, 'actors', 'test-actor.json'),
    JSON.stringify({
      id: 'test-actor-1',
      name: 'Test Actor',
      type: 'character',
      system: 'dnd5e',
      data: { attributes: { hp: { value: 25, max: 25 } } }
    }, null, 2)
  );

  await fs.writeFile(
    path.join(tempDir, 'items', 'test-item-1.json'),
    JSON.stringify({
      id: 'test-item-1',
      name: 'Test Sword',
      type: 'weapon',
      system: 'dnd5e',
      data: { damage: { parts: [['1d8', 'slashing']] } }
    }, null, 2)
  );

  await fs.writeFile(
    path.join(tempDir, 'items', 'test-item-2.json'),
    JSON.stringify({
      id: 'test-item-2',
      name: 'Test Potion',
      type: 'consumable',
      system: 'dnd5e',
      data: { uses: { value: 1, max: 1 } }
    }, null, 2)
  );

  await fs.writeFile(
    path.join(tempDir, 'documents', 'test-spell-1.json'),
    JSON.stringify({
      id: 'test-spell-1',
      name: 'Test Spell',
      type: 'spell',
      system: 'dnd5e',
      data: { level: 1, school: 'evocation' }
    }, null, 2)
  );

  // Create ZIP file (simplified approach - in real scenario would use proper ZIP library)
  // For testing purposes, we'll just create the directory structure
  return tempDir; // Return directory path instead of ZIP for testing
}

/**
 * Clean up test files
 */
export async function cleanupTestFiles(): Promise<void> {
  const tempDir = path.join(FIXTURES_DIR, 'temp-compendium');
  const zipPath = path.join(FIXTURES_DIR, 'test-compendium.zip');

  try {
    await fs.rm(tempDir, { recursive: true, force: true });
    await fs.rm(zipPath, { force: true });
  } catch (error) {
    // Ignore cleanup errors
  }
}

/**
 * Wait for import job to complete
 */
export async function waitForImportJob(
  agent: SuperAgentTest,
  jobId: string,
  maxWaitSeconds = 30
): Promise<any> {
  let attempts = 0;
  const maxAttempts = maxWaitSeconds;

  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const statusResponse = await agent
      .get(`/api/compendiums/import/${jobId}/status`);

    if (statusResponse.status !== 200) {
      throw new Error(`Failed to get job status: ${statusResponse.status}`);
    }

    const jobStatus = statusResponse.body.data;
    
    if (jobStatus.status === 'completed' || jobStatus.status === 'failed') {
      return jobStatus;
    }

    attempts++;
  }

  throw new Error(`Import job ${jobId} did not complete within ${maxWaitSeconds} seconds`);
}

/**
 * Verify compendium structure matches expected values
 */
export function verifyCompendiumStructure(
  compendium: ICompendium,
  expectedCounts: { actors?: number; items?: number; documents?: number; total?: number }
): void {
  if (expectedCounts.total !== undefined) {
    expect(compendium.totalEntries).toBe(expectedCounts.total);
  }

  if (expectedCounts.actors !== undefined || expectedCounts.items !== undefined || expectedCounts.documents !== undefined) {
    const entriesByType = compendium.entriesByType || {};
    
    if (expectedCounts.actors !== undefined) {
      expect(entriesByType['Actor'] || 0).toBe(expectedCounts.actors);
    }
    
    if (expectedCounts.items !== undefined) {
      expect(entriesByType['Item'] || 0).toBe(expectedCounts.items);
    }
    
    if (expectedCounts.documents !== undefined) {
      expect(entriesByType['VTTDocument'] || 0).toBe(expectedCounts.documents);
    }
  }
}

/**
 * Verify entry exists with expected properties
 */
export function verifyEntryExists(
  entries: ICompendiumEntry[],
  name: string,
  contentType: string
): ICompendiumEntry {
  const entry = entries.find(e => e.name === name);
  
  expect(entry).toBeDefined();
  expect(entry!.contentType).toBe(contentType);
  expect(entry!.isActive).toBe(true);
  
  return entry!;
}

/**
 * Verify import job completed successfully
 */
export function verifyImportJobSuccess(
  jobStatus: any,
  expectedCounts: { totalItems?: number; processedItems?: number; failedItems?: number; assetsCopied?: number }
): void {
  expect(jobStatus.status).toBe('completed');
  expect(jobStatus.compendiumId).toBeDefined();
  expect(jobStatus.error).toBeUndefined();

  if (expectedCounts.totalItems !== undefined) {
    expect(jobStatus.progress.totalItems).toBe(expectedCounts.totalItems);
  }
  
  if (expectedCounts.processedItems !== undefined) {
    expect(jobStatus.progress.processedItems).toBe(expectedCounts.processedItems);
  }
  
  if (expectedCounts.failedItems !== undefined) {
    expect(jobStatus.progress.failedItems).toBe(expectedCounts.failedItems);
  }
  
  if (expectedCounts.assetsCopied !== undefined) {
    expect(jobStatus.progress.assetsCopied).toBe(expectedCounts.assetsCopied);
  }
}