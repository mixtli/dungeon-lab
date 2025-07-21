import yauzl from 'yauzl';
import { promisify } from 'util';
import { logger } from '../utils/logger.mjs';
import { CompendiumManifest, ValidationResult, compendiumManifestSchema } from '@dungeon-lab/shared/schemas/import.schema.mjs';

export interface ZipEntry {
  name: string;
  isDirectory: boolean;
  buffer?: Buffer;
  size: number;
}

export interface ProcessedZip {
  manifest: CompendiumManifest;
  contentFiles: Map<string, Buffer>;
  assetFiles: Map<string, { buffer: Buffer; mimetype: string; originalPath: string }>;
  structure: {
    hasManifest: boolean;
    hasContentDirectory: boolean;
    hasAssetDirectory: boolean;
    totalFiles: number;
    totalSize: number;
  };
}

const openZip = promisify(yauzl.fromBuffer.bind(yauzl));

export class ZipProcessorService {
  private readonly MAX_ZIP_SIZE = 500 * 1024 * 1024; // 500MB
  private readonly MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB per file
  private readonly ALLOWED_ASSET_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml'];
  private readonly MANIFEST_FILENAME = 'manifest.json';

  async processZipFile(buffer: Buffer): Promise<ProcessedZip> {
    logger.info(`Processing ZIP file of size: ${buffer.length} bytes`);

    // Validate ZIP size
    if (buffer.length > this.MAX_ZIP_SIZE) {
      throw new Error(`ZIP file too large. Maximum size is ${this.MAX_ZIP_SIZE / 1024 / 1024}MB`);
    }

    try {
      // Extract all entries from ZIP
      const entries = await this.extractZipEntries(buffer);
      
      // Validate ZIP structure
      await this.validateZipStructure(entries);
      
      // Extract and validate manifest
      const manifest = await this.extractManifest(entries);
      
      // Categorize and process files
      const { contentFiles, assetFiles } = await this.categorizeFiles(entries, manifest);
      
      // Build structure info
      const structure = {
        hasManifest: true,
        hasContentDirectory: contentFiles.size > 0,
        hasAssetDirectory: assetFiles.size > 0,
        totalFiles: entries.filter(e => !e.isDirectory).length,
        totalSize: buffer.length
      };

      logger.info(`ZIP processing complete: ${contentFiles.size} content files, ${assetFiles.size} assets`);

      return {
        manifest,
        contentFiles,
        assetFiles,
        structure
      };
    } catch (error) {
      logger.error('ZIP processing failed:', error);
      throw error;
    }
  }

  private async extractZipEntries(buffer: Buffer): Promise<ZipEntry[]> {
    return new Promise((resolve, reject) => {
      const entries: ZipEntry[] = [];

      openZip(buffer)
        .then((zipfile) => {
          zipfile.readEntry();

          zipfile.on('entry', (entry) => {
            const isDirectory = entry.fileName.endsWith('/');
            
            if (isDirectory) {
              entries.push({
                name: entry.fileName,
                isDirectory: true,
                size: 0
              });
              zipfile.readEntry();
            } else {
              // Validate file size
              if (entry.uncompressedSize > this.MAX_FILE_SIZE) {
                reject(new Error(`File ${entry.fileName} is too large (${entry.uncompressedSize} bytes)`));
                return;
              }

              zipfile.openReadStream(entry, (err, readStream) => {
                if (err) {
                  reject(err);
                  return;
                }

                const chunks: Buffer[] = [];
                readStream.on('data', (chunk) => chunks.push(chunk));
                readStream.on('end', () => {
                  entries.push({
                    name: entry.fileName,
                    isDirectory: false,
                    buffer: Buffer.concat(chunks),
                    size: entry.uncompressedSize
                  });
                  zipfile.readEntry();
                });
                readStream.on('error', reject);
              });
            }
          });

          zipfile.on('end', () => {
            resolve(entries);
          });

          zipfile.on('error', reject);
        })
        .catch(reject);
    });
  }

  async validateZipStructure(entries: ZipEntry[]): Promise<ValidationResult> {
    const errors: Array<{ path: string; message: string; code: string }> = [];
    const warnings: Array<{ path: string; message: string }> = [];

    // Check for manifest file
    const hasManifest = entries.some(e => e.name === this.MANIFEST_FILENAME);
    if (!hasManifest) {
      errors.push({
        path: this.MANIFEST_FILENAME,
        message: 'Required manifest.json file not found',
        code: 'MISSING_MANIFEST'
      });
    }

    // Check for suspicious files
    const suspiciousExtensions = ['.exe', '.dll', '.bat', '.sh', '.ps1'];
    entries.forEach(entry => {
      const ext = entry.name.toLowerCase().split('.').pop();
      if (ext && suspiciousExtensions.includes(`.${ext}`)) {
        errors.push({
          path: entry.name,
          message: `Potentially dangerous file type: ${ext}`,
          code: 'DANGEROUS_FILE_TYPE'
        });
      }
    });

    // Check for hidden system files
    entries.forEach(entry => {
      if (entry.name.includes('__MACOSX') || entry.name.startsWith('.DS_Store')) {
        warnings.push({
          path: entry.name,
          message: 'System file detected and will be ignored'
        });
      }
    });

    if (errors.length > 0) {
      throw new Error(`ZIP validation failed: ${errors.map(e => e.message).join(', ')}`);
    }

    return {
      success: true,
      errors: [],
      warnings
    };
  }

  async extractManifest(entries: ZipEntry[]): Promise<CompendiumManifest> {
    const manifestEntry = entries.find(e => e.name === this.MANIFEST_FILENAME);
    
    if (!manifestEntry || !manifestEntry.buffer) {
      throw new Error('Manifest file not found or empty');
    }

    try {
      const manifestText = manifestEntry.buffer.toString('utf-8');
      const manifestData = JSON.parse(manifestText);
      
      // Validate manifest against schema
      const validatedManifest = compendiumManifestSchema.parse(manifestData);
      
      logger.info(`Extracted manifest for compendium: ${validatedManifest.name}`);
      return validatedManifest;
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error('Invalid JSON in manifest file');
      }
      throw new Error(`Manifest validation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async categorizeFiles(entries: ZipEntry[], manifest: CompendiumManifest): Promise<{
    contentFiles: Map<string, Buffer>;
    assetFiles: Map<string, { buffer: Buffer; mimetype: string; originalPath: string }>;
  }> {
    const contentFiles = new Map<string, Buffer>();
    const assetFiles = new Map<string, { buffer: Buffer; mimetype: string; originalPath: string }>();

    const contentDir = manifest.contentDirectory || 'content';
    const assetDir = manifest.assetDirectory || 'assets';

    for (const entry of entries) {
      if (entry.isDirectory || !entry.buffer) continue;

      // Skip system files
      if (entry.name.includes('__MACOSX') || entry.name.includes('.DS_Store')) {
        continue;
      }

      // Skip manifest file
      if (entry.name === this.MANIFEST_FILENAME) {
        continue;
      }

      // Categorize based on directory
      if (entry.name.startsWith(`${contentDir}/`)) {
        // Content file - should be JSON
        if (entry.name.endsWith('.json')) {
          const relativePath = entry.name.substring(contentDir.length + 1);
          contentFiles.set(relativePath, entry.buffer);
          logger.debug(`Added content file: ${relativePath}`);
        } else {
          logger.warn(`Skipping non-JSON content file: ${entry.name}`);
        }
      } else if (entry.name.startsWith(`${assetDir}/`)) {
        // Asset file - validate type
        const mimetype = this.getMimeType(entry.name);
        if (this.ALLOWED_ASSET_TYPES.includes(mimetype)) {
          const relativePath = entry.name.substring(assetDir.length + 1);
          assetFiles.set(relativePath, {
            buffer: entry.buffer,
            mimetype,
            originalPath: entry.name
          });
          logger.debug(`Added asset file: ${relativePath} (${mimetype})`);
        } else {
          logger.warn(`Skipping unsupported asset type: ${entry.name} (${mimetype})`);
        }
      } else {
        logger.warn(`Skipping file outside content/asset directories: ${entry.name}`);
      }
    }

    return { contentFiles, assetFiles };
  }

  private getMimeType(filename: string): string {
    const ext = filename.toLowerCase().split('.').pop();
    switch (ext) {
      case 'png': return 'image/png';
      case 'jpg':
      case 'jpeg': return 'image/jpeg';
      case 'webp': return 'image/webp';
      case 'gif': return 'image/gif';
      case 'svg': return 'image/svg+xml';
      default: return 'application/octet-stream';
    }
  }

  validateManifestOnly(buffer: Buffer): Promise<{ manifest: CompendiumManifest; validation: ValidationResult }> {
    return this.extractZipEntries(buffer)
      .then(entries => this.validateZipStructure(entries)
        .then(validation => this.extractManifest(entries)
          .then(manifest => ({ manifest, validation }))
        )
      );
  }
}