/**
 * Compendium pack generator class
 * Converts 5etools data into compendium packs ready for import
 */
import { join } from 'path';
import { createWriteStream } from 'fs';
import { writeFile } from 'fs/promises';
import archiver from 'archiver';

import { MonsterWrapperConverter } from '../converters/monster-wrapper-converter.mjs';
import { SpellWrapperConverter } from '../converters/spell-wrapper-converter.mjs';
import { BackgroundWrapperConverter } from '../converters/background-wrapper-converter.mjs';
import { ItemWrapperConverter } from '../converters/item-wrapper-converter.mjs';
import { ClassWrapperConverter } from '../converters/class-wrapper-converter.mjs';
import { SpeciesWrapperConverter } from '../converters/species-wrapper-converter.mjs';
import { FeatWrapperConverter } from '../converters/feat-wrapper-converter.mjs';
import { ConversionOptions, WrapperContent } from '../base/wrapper-converter.mjs';
import { generateManifest, writeJsonFile, createCompendiumStructure } from '../utils/conversion-utils.mjs';
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
            console.log(`   Stats: ${result.stats.converted}/${result.stats.total} converted, ${result.stats.errors} errors`);
          }
        } else {
          console.error(`❌ Failed to convert ${contentType}:`, result.error?.message);
          contentCounts[contentType] = 0;
        }
      }

      // Write content files
      await this.writeContentFiles(allContent);

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
      console.log(`📦 Total content: ${allContent.length} items`);
      console.log(`📄 Manifest: ${this.options.outputDir}/manifest.json`);
      console.log(`🗜️  ZIP file: ${this.options.outputDir}.zip`);

    } catch (error) {
      console.error('❌ Generation failed:', error);
      process.exit(1);
    }
  }

  private async createDirectoryStructure(): Promise<void> {
    const contentTypes = ['npcs', 'items', 'documents', 'backgrounds', 'spells', 'classes', 'species', 'feats'];
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
        return new MonsterWrapperConverter(options);
      case 'spells':
        return new SpellWrapperConverter(options);
      case 'backgrounds':
        return new BackgroundWrapperConverter(options);
      case 'items':
        return new ItemWrapperConverter(options);
      case 'classes':
        return new ClassWrapperConverter(options);
      case 'species':
        return new SpeciesWrapperConverter(options);
      case 'feats':
        return new FeatWrapperConverter(options);
      default:
        throw new Error(`Unknown content type: ${contentType}`);
    }
  }

  private async writeContentFiles(content: WrapperContent[]): Promise<void> {
    console.log(`\n📝 Writing ${content.length} content files...`);
    
    const writeTasks = content.map(async (item) => {
      const directory = this.getContentDirectory(item.type, item.wrapper);
      const filename = this.generateFilename(item.wrapper.entry.name, item.type);
      const filepath = join(this.options.outputDir, 'content', directory, filename);
      
      // Write the wrapper format with entry and content fields
      await writeJsonFile(filepath, item.wrapper);
    });

    await Promise.all(writeTasks);
    console.log(`✅ All content files written`);
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
    const uniqueAssetPaths = assetPaths.filter((path, index, array) => array.indexOf(path) === index);

    console.log(`📂 Found ${uniqueAssetPaths.length} unique asset paths`);

    const copyTasks = uniqueAssetPaths.map(async (assetPath) => {
      try {
        const resolved = assetResolver.resolveImageWithFallback(assetPath);
        console.log(`resolved ${assetPath}`, resolved);
        
        if (resolved.exists && resolved.buffer) {
          const outputPath = join(this.options.outputDir, 'assets', assetPath);
          await this.ensureDirectoryExists(outputPath);
          await writeFile(outputPath, resolved.buffer);
          console.log(`✅ Copied asset: ${assetPath}`);
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
      case 'actor': return 'npcs';
      case 'item': return 'items';
      case 'vttdocument':
        // For VTT documents, use the documentType to determine directory
        if (wrapper && 'content' in wrapper && wrapper.content && 
            typeof wrapper.content === 'object' && 'documentType' in wrapper.content) {
          const documentType = wrapper.content.documentType;
          if (typeof documentType === 'string') {
            switch (documentType) {
              case 'background': return 'backgrounds';
              case 'spell': return 'spells';
              case 'characterClass': return 'classes';
              case 'species': return 'species';
              case 'feat': return 'feats';
              default: return 'documents';
            }
          }
        }
        return 'documents';
      default: 
        throw new Error(`Unknown content type: ${type}. Content should not go to misc directory.`);
    }
  }

  private generateFilename(name: string, type: string): string {
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