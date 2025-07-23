#!/usr/bin/env tsx
/**
 * Main compendium pack generator script
 * Converts 5etools data into compendium packs ready for import
 */
import { join } from 'path';
import { createWriteStream } from 'fs';
import { writeFile } from 'fs/promises';
import archiver from 'archiver';
import { parseArgs } from 'util';

import { MonsterConverter } from './convert-monsters.mjs';
import { SpellConverter } from './convert-spells.mjs';
import { BackgroundConverter } from './convert-backgrounds.mjs';
import { ItemConverter } from './convert-items.mjs';
import { ConversionOptions, ConvertedContent } from './base-converter.mjs';
import { generateManifest, writeJsonFile, createCompendiumStructure } from './conversion-utils.mjs';
import { AssetResolver } from './asset-resolver.mjs';

interface GeneratorOptions extends ConversionOptions {
  outputDir: string;
  name: string;
  contentTypes: string[];
}

class CompendiumPackGenerator {
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
      const allContent: ConvertedContent[] = [];
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
    const contentTypes = ['actors', 'items', 'documents'];
    if (this.options.includeAssets) {
      contentTypes.push('assets');
    }
    await createCompendiumStructure(this.options.outputDir, contentTypes);
  }

  private createConverter(contentType: string) {
    const options: ConversionOptions = {
      srdOnly: this.options.srdOnly,
      includeAssets: this.options.includeAssets,
      outputDir: this.options.outputDir
    };

    switch (contentType) {
      case 'monsters':
        return new MonsterConverter(options);
      case 'spells':
        return new SpellConverter(options);
      case 'backgrounds':
        return new BackgroundConverter(options);
      case 'items':
        return new ItemConverter(options);
      default:
        throw new Error(`Unknown content type: ${contentType}`);
    }
  }

  private async writeContentFiles(content: ConvertedContent[]): Promise<void> {
    console.log(`\n📝 Writing ${content.length} content files...`);
    
    const writeTasks = content.map(async (item) => {
      const directory = this.getContentDirectory(item.type);
      const filename = this.generateFilename(item.name, item.type);
      const filepath = join(this.options.outputDir, 'content', directory, filename);
      
      const fileContent: any = {
        name: item.name,
        type: item.subtype,
        data: item.data
      };

      // Add specific fields based on content type
      if (item.type === 'document') {
        // VTT documents require additional fields
        fileContent.documentType = item.subtype;
        fileContent.slug = item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
        fileContent.description = item.data?.description || 'No description available';
        fileContent.pluginId = 'dnd-5e-2024';
      }

      // Add image fields at top level based on content type
      if (item.assetPath) {
        if (item.type === 'actor') {
          fileContent.avatarId = item.assetPath;
          fileContent.defaultTokenImageId = item.assetPath;
        } else if (item.type === 'item' || item.type === 'document') {
          fileContent.imageId = item.assetPath;
        }
      }
      
      await writeJsonFile(filepath, fileContent);
    });

    await Promise.all(writeTasks);
    console.log(`✅ All content files written`);
  }

  private async processAssets(content: ConvertedContent[]): Promise<void> {
    console.log(`\n🖼️  Processing assets...`);
    
    const assetResolver = new AssetResolver();
    const assetPaths = content
      .filter(item => item.assetPath)
      .map(item => item.assetPath!)
      .filter((path, index, array) => array.indexOf(path) === index); // Remove duplicates

    console.log(`📂 Found ${assetPaths.length} unique asset paths`);

    const copyTasks = assetPaths.map(async (assetPath) => {
      try {
        const resolved = assetResolver.resolveImageWithFallback(assetPath);
        
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

  private getContentDirectory(type: string): string {
    switch (type) {
      case 'actor': return 'actors';
      case 'item': return 'items';
      case 'document': return 'documents';
      default: return 'misc';
    }
  }

  private generateFilename(name: string, type: string): string {
    const cleanName = name
      .replace(/[^a-zA-Z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .toLowerCase();
    
    return `${type}-${cleanName}.json`;
  }

  private generateManifest(contentCounts: Record<string, number>): any {
    return generateManifest({
      name: this.options.name,
      description: `D&D 5e ${this.options.srdOnly ? 'SRD ' : ''}content pack generated from 5etools data`,
      contentTypes: this.options.contentTypes,
      contentCounts,
      srdOnly: this.options.srdOnly
    });
  }

  private async writeManifest(manifest: any): Promise<void> {
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

// CLI Interface
async function main() {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      'srd-only': {
        type: 'boolean',
        default: true,
        short: 's'
      },
      'output-dir': {
        type: 'string',
        default: './dist/compendium-pack',
        short: 'o'
      },
      'name': {
        type: 'string',
        default: 'D&D 5e SRD Content Pack'
      },
      'content-types': {
        type: 'string',
        default: 'monsters,spells,backgrounds,items'
      },
      'include-assets': {
        type: 'boolean',
        default: true
      },
      'skip-missing-assets': {
        type: 'boolean',
        default: false
      },
      'help': {
        type: 'boolean',
        short: 'h'
      }
    },
    allowPositionals: true
  });

  if (values.help) {
    console.log(`
5etools Compendium Pack Generator

Usage: tsx generate-compendium-pack.mts [options]

Options:
  -s, --srd-only               Generate only SRD content (default: true)
  -o, --output-dir <dir>       Output directory (default: ./dist/compendium-pack)
  --name <name>                Compendium pack name
  --content-types <types>      Comma-separated content types (default: monsters,spells,backgrounds,items)
  --include-assets             Include image assets (default: true)
  --skip-missing-assets        Skip missing assets instead of warning (default: false)
  -h, --help                   Show help

Available content types: monsters, spells, backgrounds, items

Examples:
  # Generate full SRD pack with assets
  tsx generate-compendium-pack.mts

  # Generate only monsters and spells
  tsx generate-compendium-pack.mts --content-types monsters,spells

  # Generate all content (not just SRD)
  tsx generate-compendium-pack.mts --no-srd-only

  # Generate without assets
  tsx generate-compendium-pack.mts --no-include-assets
`);
    process.exit(0);
  }

  const options: GeneratorOptions = {
    srdOnly: values['srd-only'] ?? true,
    outputDir: values['output-dir'] ?? './dist/compendium-pack',
    name: values.name ?? 'D&D 5e SRD Content Pack',
    contentTypes: (values['content-types'] ?? 'monsters,spells,backgrounds,items').split(',').map(s => s.trim()),
    includeAssets: values['include-assets'] ?? true
  };

  const generator = new CompendiumPackGenerator(options);
  await generator.generate();
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('❌ Generation failed:', error);
    process.exit(1);
  });
}