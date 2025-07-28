/**
 * Compendium pack generator class
 * Converts 5etools data into compendium packs ready for import
 */
import { join } from 'path';
import { createWriteStream } from 'fs';
import { writeFile } from 'fs/promises';
import archiver from 'archiver';

import { TypedMonsterWrapperConverter } from '../converters/typed-monster-wrapper-converter.mjs';
import { TypedSpellWrapperConverter } from '../converters/typed-spell-wrapper-converter.mjs';
import { TypedBackgroundWrapperConverter } from '../converters/typed-background-wrapper-converter.mjs';
import { TypedItemWrapperConverter } from '../converters/typed-item-wrapper-converter.mjs';
import { TypedClassWrapperConverter } from '../converters/typed-class-wrapper-converter.mjs';
import { TypedSpeciesWrapperConverter } from '../converters/typed-species-wrapper-converter.mjs';
import { TypedFeatWrapperConverter } from '../converters/typed-feat-wrapper-converter.mjs';
import { TypedConditionWrapperConverter } from '../converters/typed-condition-wrapper-converter.mjs';
import { TypedActionWrapperConverter } from '../converters/typed-action-wrapper-converter.mjs';
import { TypedRuleWrapperConverter } from '../converters/typed-rule-wrapper-converter.mjs';
import { TypedLanguageWrapperConverter } from '../converters/typed-language-wrapper-converter.mjs';
import { TypedSenseWrapperConverter } from '../converters/typed-sense-wrapper-converter.mjs';
import { ConversionOptions, WrapperContent } from '../base/wrapper-converter.mjs';
import {
  generateManifest,
  writeJsonFile,
  createCompendiumStructure,
  validateWrapperContent
} from '../utils/conversion-utils.mjs';
import { AssetResolver } from '../utils/asset-resolver.mjs';

export interface GeneratorOptions extends ConversionOptions {
  outputDir: string;
  name: string;
  contentTypes: string[];
}

export class CompendiumPackGenerator {
  private options: GeneratorOptions;

  constructor(options: GeneratorOptions) {
    this.options = options;
  }

  async generate(): Promise<void> {
    console.log('🚀 Starting compendium pack generation...');
    console.log(`📁 Output directory: ${this.options.outputDir}`);
    console.log(`🎯 Content types: ${this.options.contentTypes.join(', ')}`);
    console.log(`📋 SRD only: ${this.options.srdOnly ? 'Yes' : 'No'}`);

    try {
      // Create output directory structure
      await this.createDirectoryStructure();

      // Convert each content type
      const allContent: WrapperContent[] = [];
      const contentCounts: Record<string, number> = {};

      for (const contentType of this.options.contentTypes) {
        console.log(`\n📦 Processing ${contentType}...`);

        const converter = this.createConverter(contentType);
        const result = await converter.convert();

        if (result.success && result.content) {
          allContent.push(...result.content);
          contentCounts[contentType] = result.content.length;

          console.log(`✅ ${contentType}: ${result.content.length} items converted`);
          if (result.stats) {
            console.log(
              `   Stats: ${result.stats.converted}/${result.stats.total} converted, ${result.stats.errors} errors`
            );
          }
        } else {
          console.error(`❌ Failed to convert ${contentType}:`, result.error?.message);
          contentCounts[contentType] = 0;
        }
      }

      // Write content files with validation
      const writeStats = await this.writeContentFiles(allContent);

      // Process assets if enabled
      if (this.options.includeAssets) {
        await this.processAssets(allContent);
      }

      // Generate manifest
      const manifest = this.generateManifest(contentCounts);
      await this.writeManifest(manifest);

      // Create ZIP file
      await this.createZipFile();

      console.log(`\n🎉 Compendium pack generation complete!`);
      console.log(`📦 Total content processed: ${allContent.length} items`);
      console.log(`✅ Files written: ${writeStats.filesWritten}`);
      if (writeStats.validationErrors > 0) {
        console.log(`❌ Validation failures: ${writeStats.validationErrors}`);
      }
      console.log(`📄 Manifest: ${this.options.outputDir}/manifest.json`);
      console.log(`🗜️  ZIP file: ${this.options.outputDir}.zip`);
    } catch (error) {
      console.error('❌ Generation failed:', error);
      process.exit(1);
    }
  }

  private async createDirectoryStructure(): Promise<void> {
    const contentTypes = [
      'creatures', // Updated from 'npcs' to consolidate monsters and NPCs
      'items',  // fallback for uncategorized items
      'weapons',
      'armor',
      'shields',
      'tools',
      'gear',
      'documents',
      'backgrounds',
      'spells',
      'classes',
      'species',
      'feats',
      'conditions',
      'actions',
      'rules',
      'languages',
      'senses'
    ];
    await createCompendiumStructure(this.options.outputDir, contentTypes);

    // Create assets directory at root level if needed
    if (this.options.includeAssets) {
      const { mkdir } = await import('fs/promises');
      const { join } = await import('path');
      await mkdir(join(this.options.outputDir, 'assets'), { recursive: true });
    }
  }

  private createConverter(contentType: string) {
    const options: ConversionOptions = {
      srdOnly: this.options.srdOnly,
      includeAssets: this.options.includeAssets,
      outputDir: this.options.outputDir
    };

    switch (contentType) {
      case 'monsters':
        return new TypedMonsterWrapperConverter(options);
      case 'spells':
        return new TypedSpellWrapperConverter(options);
      case 'backgrounds':
        return new TypedBackgroundWrapperConverter(options);
      case 'items':
        return new TypedItemWrapperConverter(options);
      case 'classes':
        return new TypedClassWrapperConverter(options);
      case 'species':
        return new TypedSpeciesWrapperConverter(options);
      case 'feats':
        return new TypedFeatWrapperConverter(options);
      case 'conditions':
        return new TypedConditionWrapperConverter(options);
      case 'actions':
        return new TypedActionWrapperConverter(options);
      case 'rules':
        return new TypedRuleWrapperConverter(options);
      case 'languages':
        return new TypedLanguageWrapperConverter(options);
      case 'senses':
        return new TypedSenseWrapperConverter(options);
      default:
        throw new Error(`Unknown content type: ${contentType}`);
    }
  }

  private async writeContentFiles(
    content: WrapperContent[]
  ): Promise<{ filesWritten: number; validationErrors: number }> {
    console.log(`\n📝 Validating and writing ${content.length} content files...`);

    let validationErrors = 0;
    let filesWritten = 0;

    const writeTasks = content.map(async (item) => {
      const directory = this.getContentDirectory(item.type, item.wrapper);
      const filename = this.generateFilename(item.wrapper.entry.name, item.type);
      const filepath = join(this.options.outputDir, 'content', directory, filename);

      // Determine document type for validation
      let documentType: string | undefined;
      let pluginDocumentType: string | undefined;
      if (
        item.type === 'vtt-document' &&
        item.wrapper.content &&
        typeof item.wrapper.content === 'object'
      ) {
        if ('documentType' in item.wrapper.content) {
          documentType = String(item.wrapper.content.documentType);
        }
        if ('pluginDocumentType' in item.wrapper.content) {
          pluginDocumentType = String(item.wrapper.content.pluginDocumentType);
        }
      }

      // Validate wrapper before writing - use pluginDocumentType for specific validation
      const validationResult = await validateWrapperContent(item.wrapper, item.type, pluginDocumentType || documentType);

      if (!validationResult.success) {
        console.error(`❌ Validation failed for ${item.wrapper.entry.name}:`);
        if (validationResult.entryErrors) {
          console.error(`   Entry errors: ${validationResult.entryErrors.join(', ')}`);
        }
        if (validationResult.contentErrors) {
          console.error(`   Content errors: ${validationResult.contentErrors.join(', ')}`);
        }
        if (validationResult.errors) {
          console.error(`   General errors: ${validationResult.errors.join(', ')}`);
        }
        validationErrors++;
        return; // Skip writing this file
      }

      // Write the wrapper format with entry and content fields
      await writeJsonFile(filepath, item.wrapper);
      filesWritten++;
    });

    await Promise.all(writeTasks);

    if (validationErrors > 0) {
      console.log(`⚠️  ${validationErrors} files failed validation and were skipped`);
    }
    console.log(`✅ ${filesWritten} content files validated and written successfully`);

    return { filesWritten, validationErrors };
  }

  private async processAssets(content: WrapperContent[]): Promise<void> {
    console.log(`\n🖼️  Processing assets...`);

    const assetResolver = new AssetResolver();
    const assetPaths: string[] = [];

    // Extract asset paths from wrapper content
    for (const item of content) {
      // Add entry-level imageId
      if (item.wrapper.entry.imageId) {
        assetPaths.push(item.wrapper.entry.imageId);
      }

      // Add content-level asset references
      const contentData = item.wrapper.content;
      if (contentData.avatarId) {
        assetPaths.push(contentData.avatarId);
      }
      if (contentData.defaultTokenImageId) {
        assetPaths.push(contentData.defaultTokenImageId);
      }
      if (contentData.imageId) {
        assetPaths.push(contentData.imageId);
      }
    }

    // Remove duplicates
    const uniqueAssetPaths = assetPaths.filter(
      (path, index, array) => array.indexOf(path) === index
    );

    console.log(`📂 Found ${uniqueAssetPaths.length} unique asset paths`);

    const copyTasks = uniqueAssetPaths.map(async (assetPath) => {
      try {
        const resolved = assetResolver.resolveImageWithFallback(assetPath);
        //console.log(`resolved ${assetPath}`, resolved);

        if (resolved.exists && resolved.buffer) {
          const outputPath = join(this.options.outputDir, 'assets', assetPath);
          await this.ensureDirectoryExists(outputPath);
          await writeFile(outputPath, resolved.buffer);
          // Asset copied silently
        } else {
          console.warn(`⚠️  Asset not found: ${assetPath}`);
        }
      } catch (error) {
        console.error(`❌ Failed to copy asset ${assetPath}:`, error);
      }
    });

    await Promise.all(copyTasks);
    console.log(`✅ Asset processing complete`);
  }

  private async ensureDirectoryExists(filePath: string): Promise<void> {
    const { mkdir } = await import('fs/promises');
    const { dirname } = await import('path');

    const dir = dirname(filePath);
    await mkdir(dir, { recursive: true });
  }

  private getContentDirectory(type: string, wrapper?: Record<string, unknown>): string {
    switch (type) {
      case 'actor':
        return 'creatures'; // Updated to use creatures directory
      case 'item':
        // For items, use the pluginDocumentType to determine directory
        if (
          wrapper &&
          'content' in wrapper &&
          wrapper.content &&
          typeof wrapper.content === 'object' &&
          'pluginDocumentType' in wrapper.content
        ) {
          const pluginDocumentType = wrapper.content.pluginDocumentType;
          if (typeof pluginDocumentType === 'string') {
            switch (pluginDocumentType) {
              case 'weapon':
                return 'weapons';
              case 'armor':
                return 'armor';
              case 'shield':
                return 'shields';
              case 'tool':
                return 'tools';
              case 'gear':
                return 'gear';
              default:
                return 'items'; // fallback
            }
          }
        }
        return 'items'; // fallback
      case 'vtt-document':
        // For VTT documents, use the pluginDocumentType to determine directory
        if (
          wrapper &&
          'content' in wrapper &&
          wrapper.content &&
          typeof wrapper.content === 'object' &&
          'pluginDocumentType' in wrapper.content
        ) {
          const pluginDocumentType = wrapper.content.pluginDocumentType;
          if (typeof pluginDocumentType === 'string') {
            switch (pluginDocumentType) {
              case 'background':
                return 'backgrounds';
              case 'spell':
                return 'spells';
              case 'character-class':
                return 'classes';
              case 'species':
                return 'species';
              case 'feat':
                return 'feats';
              case 'condition':
                return 'conditions';
              case 'action':
                return 'actions';
              case 'rule':
                return 'rules';
              case 'language':
                return 'languages';
              case 'sense':
                return 'senses';
              default:
                return 'documents';
            }
          }
        }
        return 'documents';
      default:
        throw new Error(`Unknown content type: ${type}. Content should not go to misc directory.`);
    }
  }

  private generateFilename(name: string, _type: string): string {
    const cleanName = name
      .replace(/[^a-zA-Z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .toLowerCase();

    return `${cleanName}.json`;
  }

  private generateManifest(contentCounts: Record<string, number>): Record<string, unknown> {
    return generateManifest({
      name: this.options.name,
      description: `D&D 5e ${this.options.srdOnly ? 'SRD ' : ''}content pack generated from 5etools data`,
      contentTypes: this.options.contentTypes,
      contentCounts,
      srdOnly: this.options.srdOnly
    }) as Record<string, unknown>;
  }

  private async writeManifest(manifest: Record<string, unknown>): Promise<void> {
    const manifestPath = join(this.options.outputDir, 'manifest.json');
    await writeJsonFile(manifestPath, manifest);
    console.log(`✅ Manifest written to ${manifestPath}`);
  }

  private async createZipFile(): Promise<void> {
    return new Promise((resolve, reject) => {
      const outputZip = `${this.options.outputDir}.zip`;
      const output = createWriteStream(outputZip);
      const archive = archiver('zip', { zlib: { level: 9 } });

      output.on('close', () => {
        console.log(`✅ ZIP file created: ${outputZip} (${archive.pointer()} total bytes)`);
        resolve();
      });

      archive.on('error', reject);
      archive.pipe(output);

      // Add all files from the output directory
      archive.directory(this.options.outputDir, false);
      archive.finalize();
    });
  }
}

