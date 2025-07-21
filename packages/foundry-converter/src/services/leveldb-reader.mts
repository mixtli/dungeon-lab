import { ClassicLevel } from 'classic-level';
import { logger } from '../utils/logger.mjs';
import path from 'path';
import fs from 'fs/promises';

export interface FoundryDocument {
  _id: string;
  name: string;
  type: string;
  data?: any;
  system?: any;
  flags?: Record<string, any>;
  folder?: string | null;
  sort?: number;
  ownership?: Record<string, number>;
  img?: string;
  [key: string]: any;
}

export interface ActorItemEntry {
  actorId: string;
  itemId: string;
  item: any;
}

export interface PackMetadata {
  name: string;
  label: string;
  path: string;
  type: string;
  system: string;
  ownership?: any;
  flags?: Record<string, any>;
}

/**
 * Service for reading Foundry VTT LevelDB pack files
 */
export class LevelDBReaderService {
  private openDatabases = new Map<string, ClassicLevel<string, any>>();

  /**
   * Read all documents from a Foundry pack
   */
  async readPack(packPath: string): Promise<FoundryDocument[]> {
    const db = await this.openDatabase(packPath);
    const documents: FoundryDocument[] = [];

    try {
      // Iterate through all entries in the database
      for await (const [key, value] of db.iterator()) {
        try {
          // Parse the JSON value
          const document = typeof value === 'string' ? JSON.parse(value) : value;
          
          // Skip actor item entries - they'll be handled separately
          if (key.startsWith('!actors.items!')) {
            continue;
          }
          
          // Ensure we have required fields
          if (document && typeof document === 'object' && document._id) {
            documents.push(document as FoundryDocument);
          } else {
            logger.warn(`Skipping invalid document with key ${key} in pack ${packPath}`);
          }
        } catch (parseError) {
          logger.error(`Failed to parse document with key ${key} in pack ${packPath}:`, parseError);
        }
      }

      logger.info(`Read ${documents.length} documents from pack: ${packPath}`);
      return documents;

    } catch (error) {
      logger.error(`Failed to read pack ${packPath}:`, error);
      throw new Error(`Failed to read Foundry pack: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Read all actor inventory items from a Foundry pack
   */
  async readActorItems(packPath: string): Promise<ActorItemEntry[]> {
    const db = await this.openDatabase(packPath);
    const items: ActorItemEntry[] = [];

    try {
      // Iterate through all entries in the database
      for await (const [key, value] of db.iterator()) {
        // Only process actor item entries
        if (!key.startsWith('!actors.items!')) {
          continue;
        }

        try {
          // Parse key format: !actors.items!{actorId}.{itemId}
          const keyParts = key.split('!actors.items!')[1];
          if (!keyParts) continue;
          
          const [actorId, itemId] = keyParts.split('.');
          if (!actorId || !itemId) {
            logger.warn(`Invalid actor item key format: ${key}`);
            continue;
          }

          // Parse the JSON value
          const item = typeof value === 'string' ? JSON.parse(value) : value;
          
          if (item && typeof item === 'object') {
            items.push({
              actorId,
              itemId,
              item
            });
          } else {
            logger.warn(`Invalid actor item data for key ${key}`);
          }
        } catch (parseError) {
          logger.error(`Failed to parse actor item with key ${key}:`, parseError);
        }
      }

      logger.info(`Read ${items.length} actor inventory items from pack: ${packPath}`);
      return items;

    } catch (error) {
      logger.error(`Failed to read actor items from pack ${packPath}:`, error);
      throw new Error(`Failed to read actor items: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Read pack metadata from the pack's directory
   */
  async readPackMetadata(packPath: string): Promise<PackMetadata | null> {
    try {
      const packDir = path.dirname(packPath);
      const manifestPath = path.join(packDir, 'system.json');
      
      // Try to read system.json first
      try {
        const manifestContent = await fs.readFile(manifestPath, 'utf-8');
        const manifest = JSON.parse(manifestContent);
        
        // Extract pack info from manifest
        const packName = path.basename(packPath, '.db');
        const packInfo = manifest.packs?.find((p: any) => p.name === packName);
        
        if (packInfo) {
          return {
            name: packInfo.name,
            label: packInfo.label || packInfo.name,
            path: packPath,
            type: packInfo.type || 'unknown',
            system: manifest.id || manifest.name || 'unknown',
            ownership: packInfo.ownership,
            flags: packInfo.flags
          };
        }
      } catch (manifestError) {
        logger.debug(`Could not read system manifest for pack ${packPath}:`, manifestError);
      }

      // Fallback to basic metadata from path
      const packName = path.basename(packPath, '.db');
      return {
        name: packName,
        label: packName,
        path: packPath,
        type: this.guessPackType(packName),
        system: 'dnd5e' // Default assumption
      };

    } catch (error) {
      logger.error(`Failed to read metadata for pack ${packPath}:`, error);
      return null;
    }
  }

  /**
   * Get a specific document by ID from a pack
   */
  async getDocument(packPath: string, documentId: string): Promise<FoundryDocument | null> {
    const db = await this.openDatabase(packPath);

    try {
      const value = await db.get(documentId);
      const document = typeof value === 'string' ? JSON.parse(value) : value;
      return document as FoundryDocument;
    } catch (error) {
      if ((error as any).code === 'LEVEL_NOT_FOUND') {
        return null;
      }
      logger.error(`Failed to get document ${documentId} from pack ${packPath}:`, error);
      throw error;
    }
  }

  /**
   * Get document count for a pack
   */
  async getDocumentCount(packPath: string): Promise<number> {
    const db = await this.openDatabase(packPath);
    let count = 0;

    try {
      for await (const [_key] of db.iterator({ keys: true, values: false })) {
        count++;
      }
      return count;
    } catch (error) {
      logger.error(`Failed to count documents in pack ${packPath}:`, error);
      throw error;
    }
  }

  /**
   * List all available packs in a directory
   */
  async listPacks(packDirectory: string): Promise<string[]> {
    try {
      const files = await fs.readdir(packDirectory);
      const packFiles = files
        .filter(file => file.endsWith('.db'))
        .map(file => path.join(packDirectory, file));

      logger.info(`Found ${packFiles.length} pack files in ${packDirectory}`);
      return packFiles;
    } catch (error) {
      logger.error(`Failed to list packs in directory ${packDirectory}:`, error);
      throw new Error(`Failed to list packs: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Validate that a path is a valid Foundry pack
   */
  async validatePack(packPath: string): Promise<boolean> {
    try {
      // Check if file exists and has .db extension
      const stats = await fs.stat(packPath);
      if (!stats.isFile() || !packPath.endsWith('.db')) {
        return false;
      }

      // Try to open the database
      const db = await this.openDatabase(packPath);
      
      // Try to read at least one entry to verify it's a valid LevelDB
      let hasValidEntry = false;
      for await (const [_key, value] of db.iterator({ limit: 1 })) {
        try {
          const document = typeof value === 'string' ? JSON.parse(value) : value;
          if (document && typeof document === 'object') {
            hasValidEntry = true;
          }
        } catch {
          // Invalid JSON, not a Foundry pack
        }
        break;
      }

      return hasValidEntry;
    } catch (error) {
      logger.debug(`Pack validation failed for ${packPath}:`, error);
      return false;
    }
  }

  /**
   * Close a specific database connection
   */
  async closeDatabase(packPath: string): Promise<void> {
    const db = this.openDatabases.get(packPath);
    if (db) {
      await db.close();
      this.openDatabases.delete(packPath);
      logger.debug(`Closed database connection for ${packPath}`);
    }
  }

  /**
   * Close all database connections
   */
  async closeAllDatabases(): Promise<void> {
    const closePromises = Array.from(this.openDatabases.entries()).map(
      async ([path, db]) => {
        try {
          await db.close();
          logger.debug(`Closed database connection for ${path}`);
        } catch (error) {
          logger.error(`Failed to close database ${path}:`, error);
        }
      }
    );

    await Promise.all(closePromises);
    this.openDatabases.clear();
  }

  /**
   * Open or get existing database connection
   */
  private async openDatabase(packPath: string): Promise<ClassicLevel<string, any>> {
    // Return existing connection if available
    if (this.openDatabases.has(packPath)) {
      return this.openDatabases.get(packPath)!;
    }

    try {
      // Create new database connection
      const db = new ClassicLevel(packPath, {
        keyEncoding: 'utf8',
        valueEncoding: 'json'
      });

      // Open the database
      await db.open();

      // Store the connection
      this.openDatabases.set(packPath, db);
      logger.debug(`Opened database connection for ${packPath}`);

      return db;
    } catch (error) {
      logger.error(`Failed to open database ${packPath}:`, error);
      throw new Error(`Failed to open Foundry pack database: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Guess pack type from pack name
   */
  private guessPackType(packName: string): string {
    const name = packName.toLowerCase();
    
    if (name.includes('actor') || name.includes('monster') || name.includes('npc')) {
      return 'Actor';
    }
    if (name.includes('item') || name.includes('equipment') || name.includes('weapon') || name.includes('armor')) {
      return 'Item';
    }
    if (name.includes('spell')) {
      return 'Item'; // Spells are items in Foundry but documents in our system
    }
    if (name.includes('class') || name.includes('background') || name.includes('race') || name.includes('feat')) {
      return 'Item'; // Character options are items in Foundry but documents in our system
    }
    if (name.includes('table') || name.includes('roll')) {
      return 'RollTable';
    }
    if (name.includes('scene') || name.includes('map')) {
      return 'Scene';
    }
    if (name.includes('journal') || name.includes('rule')) {
      return 'JournalEntry';
    }
    
    return 'unknown';
  }
}

// Export singleton instance
export const leveldbReaderService = new LevelDBReaderService();

// Cleanup on process exit
process.on('exit', () => {
  leveldbReaderService.closeAllDatabases().catch(error => {
    logger.error('Failed to close databases on exit:', error);
  });
});

process.on('SIGINT', async () => {
  await leveldbReaderService.closeAllDatabases();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await leveldbReaderService.closeAllDatabases();
  process.exit(0);
});