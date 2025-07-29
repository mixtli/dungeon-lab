/**
 * Compendium pack generator class
 * Converts 5etools data into compendium packs ready for import
 */
import { join } from 'path';
import { createWriteStream } from 'fs';
import { writeFile } from 'fs/promises';
import archiver from 'archiver';

import { TypedMonsterConverter } from '../pipeline/monster-converter.mjs';
import { TypedSpellConverter } from '../pipeline/spell-converter.mjs';
import { TypedBackgroundConverter } from '../pipeline/background-converter.mjs';
import { TypedItemConverter } from '../pipeline/item-converter.mjs';
import { TypedClassConverter } from '../pipeline/class-converter.mjs';
import { TypedSpeciesConverter } from '../pipeline/species-converter.mjs';
import { TypedFeatConverter } from '../pipeline/feat-converter.mjs';
import { TypedConditionConverter } from '../pipeline/condition-converter.mjs';
import { TypedActionConverter } from '../pipeline/action-converter.mjs';
import { TypedRuleConverter } from '../pipeline/rule-converter.mjs';
import { TypedLanguageConverter } from '../pipeline/language-converter.mjs';
import { TypedSenseConverter } from '../pipeline/sense-converter.mjs';
import { ConversionOptions } from '../pipeline/converter.mjs';
import type { IContentFileWrapper } from '@dungeon-lab/shared/types/index.mjs';
import {
  generateManifest,
  writeJsonFile,
  createCompendiumStructure,
  validateWrapperContent
} from '../utils/conversion-utils.mjs';
import { AssetResolver } from '../utils/asset-resolver.mjs';

type TypedConverter = 
  | TypedMonsterConverter
  | TypedSpellConverter
  | TypedBackgroundConverter
  | TypedItemConverter
  | TypedClassConverter
  | TypedSpeciesConverter
  | TypedFeatConverter
  | TypedConditionConverter
  | TypedActionConverter
  | TypedRuleConverter
  | TypedLanguageConverter
  | TypedSenseConverter;

interface DocumentLike {
  documentType: 'actor' | 'item' | 'vtt-document';
  pluginDocumentType: string;
  name: string;
  imageId?: string;
  pluginData?: unknown;
}

export interface WrapperContent {
  type: 'actor' | 'item' | 'vtt-document';
  wrapper: IContentFileWrapper;
  originalPath?: string;
}

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
        const result = await this.convertContentType(contentType, converter);

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
      outputDir: this.options.outputDir,
      textProcessing: {
        cleanText: true,
        extractReferences: true
      }
    };

    switch (contentType) {
      case 'monsters':
        return new TypedMonsterConverter(options);
      case 'spells':
        return new TypedSpellConverter(options);
      case 'backgrounds':
        return new TypedBackgroundConverter(options);
      case 'items':
        return new TypedItemConverter(options);
      case 'classes':
        return new TypedClassConverter(options);
      case 'species':
        return new TypedSpeciesConverter(options);
      case 'feats':
        return new TypedFeatConverter(options);
      case 'conditions':
        return new TypedConditionConverter(options);
      case 'actions':
        return new TypedActionConverter(options);
      case 'rules':
        return new TypedRuleConverter(options);
      case 'languages':
        return new TypedLanguageConverter(options);
      case 'senses':
        return new TypedSenseConverter(options);
      default:
        throw new Error(`Unknown content type: ${contentType}`);
    }
  }

  private async convertContentType(contentType: string, converter: TypedConverter): Promise<{
    success: boolean;
    content?: WrapperContent[];
    error?: Error;
    stats?: {
      total: number;
      converted: number; 
      skipped: number;
      errors: number;
    };
  }> {
    try {
      let typedResult;
      
      // Call the appropriate conversion method based on content type
      switch (contentType) {
        case 'monsters':
          typedResult = await (converter as TypedMonsterConverter).convertMonsters();
          break;
        case 'spells':
          typedResult = await (converter as TypedSpellConverter).convertSpells();
          break;
        case 'backgrounds':
          typedResult = await (converter as TypedBackgroundConverter).convertBackgrounds();
          break;
        case 'items':
          typedResult = await (converter as TypedItemConverter).convertItems();
          break;
        case 'classes':
          typedResult = await (converter as TypedClassConverter).convertClasses();
          break;
        case 'species':
          typedResult = await (converter as TypedSpeciesConverter).convertSpecies();
          break;
        case 'feats':
          typedResult = await (converter as TypedFeatConverter).convertFeats();
          break;
        case 'conditions':
          typedResult = await (converter as TypedConditionConverter).convertConditions();
          break;
        case 'actions':
          typedResult = await (converter as TypedActionConverter).convertActions();
          break;
        case 'rules':
          typedResult = await (converter as TypedRuleConverter).convertRules();
          break;
        case 'languages':
          typedResult = await (converter as TypedLanguageConverter).convertLanguages();
          break;
        case 'senses':
          typedResult = await (converter as TypedSenseConverter).convertSenses();
          break;
        default:
          throw new Error(`Unknown content type: ${contentType}`);
      }

      if (!typedResult.success) {
        return {
          success: false,
          error: new Error('Typed conversion failed'),
          stats: {
            total: typedResult.stats?.total || 0,
            converted: typedResult.stats?.converted || 0,
            skipped: 0,
            errors: typedResult.stats?.errors || 0
          }
        };
      }

      // Convert typed results to wrapper format
      const wrapperContent: WrapperContent[] = [];
      
      // Create wrappers from documents
      for (const document of typedResult.results) {
        const wrapper: IContentFileWrapper = {
          entry: {
            name: document.name,
            type: this.getContentTypeFromDocument(document),
            imageId: document.imageId,
            category: this.getCategoryFromDocument(document),
            tags: this.getTagsFromDocument(document),
            sortOrder: 0
          },
          content: document
        };
        
        wrapperContent.push({
          type: this.getContentTypeFromDocument(document),
          wrapper: wrapper
        });
      }

      return {
        success: true,
        content: wrapperContent,
        stats: {
          total: typedResult.stats?.total || 0,
          converted: typedResult.stats?.converted || 0,
          skipped: 0,
          errors: typedResult.stats?.errors || 0
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Unknown conversion error')
      };
    }
  }

  private getContentTypeFromDocument(document: DocumentLike): 'actor' | 'item' | 'vtt-document' {
    // Check the actual documentType field from the document
    if (document.documentType === 'actor') {
      return 'actor';
    }
    if (document.documentType === 'item') {
      return 'item';
    }
    if (document.documentType === 'vtt-document') {
      return 'vtt-document';
    }
    // Default fallback
    return 'vtt-document';
  }

  private getCategoryFromDocument(document: DocumentLike): string {
    // Determine category based on pluginDocumentType
    switch (document.pluginDocumentType) {
      case 'monster':
        return 'Monsters';
      case 'spell':
        return 'Spells';
      case 'background':
        return 'Backgrounds';
      case 'weapon':
      case 'armor':
      case 'shield':
      case 'tool':
      case 'gear':
        return 'Equipment';
      case 'character-class':
        return 'Classes';
      case 'species':
        return 'Species';
      case 'feat':
        return 'Feats';
      case 'condition':
        return 'Conditions';
      case 'action':
        return 'Actions';
      case 'rule':
        return 'Rules';
      case 'language':
        return 'Languages';
      case 'sense':
        return 'Senses';
      default:
        return 'Documents';
    }
  }

  private getTagsFromDocument(document: DocumentLike): string[] {
    const tags: string[] = [];
    
    // Add plugin document type as tag
    if (document.pluginDocumentType) {
      tags.push(document.pluginDocumentType);
    }
    
    // Add source if available
    if (document.pluginData && typeof document.pluginData === 'object' && 'source' in document.pluginData) {
      const source = (document.pluginData as Record<string, unknown>).source;
      if (typeof source === 'string') {
        tags.push(source.toLowerCase());
      }
    }
    
    return tags;
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
                return 'armor';
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
              case 'monster':
                return 'creatures';
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

