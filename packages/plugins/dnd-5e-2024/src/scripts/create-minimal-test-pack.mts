#!/usr/bin/env tsx
/**
 * Script to create a minimal test pack with 10 objects of each type (actor, item, vttdocument)
 * Ensures all selected entries have images
 */
import { readdir, readFile, writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { existsSync } from 'fs';
import { createWriteStream } from 'fs';
import archiver from 'archiver';
import { IContentFileWrapper } from '@dungeon-lab/shared/types/index.mjs';

interface TrimmerOptions {
  inputDir: string;
  outputDir: string;
  actorCount: number;
  itemCount: number;
  documentCount: number;
}

interface ContentItem extends IContentFileWrapper {
  filePath: string;
  originalFileName: string;
}

class MinimalPackCreator {
  private options: TrimmerOptions;

  constructor(options: TrimmerOptions) {
    this.options = options;
  }

  async create(): Promise<void> {
    console.log('🚀 Creating minimal test pack...');
    console.log(`📁 Input: ${this.options.inputDir}`);
    console.log(`📁 Output: ${this.options.outputDir}`);
    console.log(`🎯 Target: ${this.options.actorCount} actors, ${this.options.itemCount} items, ${this.options.documentCount} documents`);

    try {
      // Create output directory structure
      await this.createOutputStructure();

      // Read all content files
      const allContent = await this.readAllContent();
      console.log(`📦 Found ${allContent.length} total content items`);

      // Filter content with images
      const contentWithImages = this.filterContentWithImages(allContent);
      console.log(`🖼️  Found ${contentWithImages.length} items with images`);

      // Select items for minimal pack
      const selectedContent = this.selectContentForMinimalPack(contentWithImages);
      console.log(`✅ Selected ${selectedContent.length} items for minimal pack`);

      // Copy selected content files
      await this.copySelectedContent(selectedContent);

      // Copy required assets
      const usedAssets = await this.copyRequiredAssets(selectedContent);
      console.log(`🖼️  Copied ${usedAssets.size} required assets`);

      // Update manifest
      await this.updateManifest(selectedContent);

      // Create ZIP file
      await this.createZipFile();

      console.log('🎉 Minimal test pack creation complete!');
      console.log(`📦 Output: ${this.options.outputDir}`);
      console.log(`🗜️  ZIP: ${this.options.outputDir}.zip`);

    } catch (error) {
      console.error('❌ Pack creation failed:', error);
      process.exit(1);
    }
  }

  private async createOutputStructure(): Promise<void> {
    const dirs = ['content/actors', 'content/items', 'content/misc', 'assets'];
    for (const dir of dirs) {
      await mkdir(join(this.options.outputDir, dir), { recursive: true });
    }
  }

  private async readAllContent(): Promise<ContentItem[]> {
    const content: ContentItem[] = [];
    const contentDir = join(this.options.inputDir, 'content');

    // Read actors
    const actorsDir = join(contentDir, 'actors');
    if (existsSync(actorsDir)) {
      const actorFiles = await readdir(actorsDir);
      for (const file of actorFiles.filter(f => f.endsWith('.json'))) {
        const filePath = join(actorsDir, file);
        const data = JSON.parse(await readFile(filePath, 'utf-8')) as IContentFileWrapper;
        content.push({ 
          ...data, 
          filePath, 
          originalFileName: file 
        });
      }
    }

    // Read items
    const itemsDir = join(contentDir, 'items');
    if (existsSync(itemsDir)) {
      const itemFiles = await readdir(itemsDir);
      for (const file of itemFiles.filter(f => f.endsWith('.json'))) {
        const filePath = join(itemsDir, file);
        const data = JSON.parse(await readFile(filePath, 'utf-8')) as IContentFileWrapper;
        content.push({ 
          ...data, 
          filePath, 
          originalFileName: file 
        });
      }
    }

    // Read documents (vttdocuments are in misc directory)
    const miscDir = join(contentDir, 'misc');
    if (existsSync(miscDir)) {
      const miscFiles = await readdir(miscDir);
      for (const file of miscFiles.filter(f => f.endsWith('.json'))) {
        const filePath = join(miscDir, file);
        const data = JSON.parse(await readFile(filePath, 'utf-8')) as IContentFileWrapper;
        content.push({ 
          ...data, 
          filePath, 
          originalFileName: file 
        });
      }
    }

    return content;
  }

  private filterContentWithImages(content: ContentItem[]): ContentItem[] {
    return content.filter(item => {
      // Check entry-level imageId
      if (item.entry.imageId) return true;
      
      // Check content-level image fields
      const contentData = item.content;
      return contentData.avatarId || contentData.defaultTokenImageId || contentData.imageId;
    });
  }

  private selectContentForMinimalPack(contentWithImages: ContentItem[]): ContentItem[] {
    const selected: ContentItem[] = [];

    // Group by type using entry.type field from wrapper format
    const actors = contentWithImages.filter(item => item.entry.type === 'actor');
    const items = contentWithImages.filter(item => item.entry.type === 'item');
    const documents = contentWithImages.filter(item => item.entry.type === 'vttdocument');

    console.log(`📊 Available with images: ${actors.length} actors, ${items.length} items, ${documents.length} documents`);

    // Select best items (prioritize variety)
    selected.push(...this.selectBest(actors, this.options.actorCount, 'actors'));
    selected.push(...this.selectBest(items, this.options.itemCount, 'items'));
    selected.push(...this.selectBest(documents, this.options.documentCount, 'documents'));

    return selected;
  }

  private selectBest(items: ContentItem[], count: number, type: string): ContentItem[] {
    console.log(`🎯 Selecting ${count} best ${type} from ${items.length} available`);
    
    if (items.length === 0) {
      console.warn(`⚠️  No ${type} available with images`);
      return [];
    }

    // Sort by name for consistent selection
    const sorted = items.sort((a, b) => a.entry.name.localeCompare(b.entry.name));
    
    // Take every nth item to get variety
    const selected: ContentItem[] = [];
    const step = Math.max(1, Math.floor(sorted.length / count));
    
    for (let i = 0; i < sorted.length && selected.length < count; i += step) {
      selected.push(sorted[i]);
    }
    
    // If we need more, fill from the beginning
    let index = 0;
    while (selected.length < count && index < sorted.length) {
      if (!selected.includes(sorted[index])) {
        selected.push(sorted[index]);
      }
      index++;
    }

    console.log(`✅ Selected ${type}:`, selected.map(item => item.entry.name).slice(0, 5).join(', ') + (selected.length > 5 ? '...' : ''));
    return selected.slice(0, count);
  }

  private async copySelectedContent(selectedContent: ContentItem[]): Promise<void> {
    for (const item of selectedContent) {
      // Determine output path based on entry type
      let outputSubDir: string;
      switch (item.entry.type) {
        case 'actor':
          outputSubDir = 'actors';
          break;
        case 'item':
          outputSubDir = 'items';
          break;
        case 'vttdocument':
          outputSubDir = 'misc';
          break;
        default:
          outputSubDir = 'misc';
      }

      const outputPath = join(this.options.outputDir, 'content', outputSubDir, item.originalFileName);
      
      // Ensure directory exists
      await mkdir(dirname(outputPath), { recursive: true });
      
      // Copy file (remove our temporary fields)
      const cleanItem: IContentFileWrapper = {
        entry: item.entry,
        content: item.content
      };
      await writeFile(outputPath, JSON.stringify(cleanItem, null, 2));
    }
  }

  private async copyRequiredAssets(selectedContent: ContentItem[]): Promise<Set<string>> {
    const usedAssets = new Set<string>();
    const assetsDir = join(this.options.inputDir, 'assets');
    const outputAssetsDir = join(this.options.outputDir, 'assets');

    for (const item of selectedContent) {
      const imageFields: (string | undefined)[] = [
        item.entry.imageId,
        item.content.avatarId,
        item.content.defaultTokenImageId,
        item.content.imageId
      ].filter(Boolean);

      for (const imagePath of imageFields) {
        if (imagePath) {
          const inputAssetPath = join(assetsDir, imagePath);
          const outputAssetPath = join(outputAssetsDir, imagePath);

          if (existsSync(inputAssetPath)) {
            // Ensure directory exists
            await mkdir(dirname(outputAssetPath), { recursive: true });
            
            // Copy asset file
            const assetBuffer = await readFile(inputAssetPath);
            await writeFile(outputAssetPath, assetBuffer);
            usedAssets.add(imagePath);
          } else {
            console.warn(`⚠️  Asset not found: ${imagePath}`);
          }
        }
      }
    }

    return usedAssets;
  }

  private async updateManifest(selectedContent: ContentItem[]): Promise<void> {
    const inputManifest = JSON.parse(await readFile(join(this.options.inputDir, 'manifest.json'), 'utf-8'));

    // Count by type using entry.type field
    const actors = selectedContent.filter(item => item.entry.type === 'actor');
    const items = selectedContent.filter(item => item.entry.type === 'item');
    const documents = selectedContent.filter(item => item.entry.type === 'vttdocument');

    const updatedManifest = {
      ...inputManifest,
      name: 'Minimal Test Pack with Images',
      slug: 'minimal-test-pack-images',
      description: `Minimal pack with ${actors.length} actors, ${items.length} items, and ${documents.length} documents that all have images for testing`,
      contents: {
        actors: actors.length,
        items: items.length,
        vttdocuments: documents.length
      }
    };

    await writeFile(join(this.options.outputDir, 'manifest.json'), JSON.stringify(updatedManifest, null, 2));
  }

  private async createZipFile(): Promise<void> {
    return new Promise((resolve, reject) => {
      const output = createWriteStream(`${this.options.outputDir}.zip`);
      const archive = archiver('zip', { zlib: { level: 9 } });

      output.on('close', () => {
        console.log(`🗜️  ZIP file created: ${this.options.outputDir}.zip (${archive.pointer()} bytes)`);
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
  const trimmer = new MinimalPackCreator({
    inputDir: './dist/compendium-pack',
    outputDir: './dist/minimal-test-pack',
    actorCount: 10,
    itemCount: 10,
    documentCount: 10
  });

  await trimmer.create();
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('❌ Creation failed:', error);
    process.exit(1);
  });
}