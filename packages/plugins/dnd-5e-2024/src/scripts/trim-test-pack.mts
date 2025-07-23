#!/usr/bin/env tsx
/**
 * Script to trim a full compendium pack down to a minimal test pack
 * Keeps only 10 actors, 10 items, and 10 documents that all have images
 */
import { readdir, readFile, writeFile, unlink, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { existsSync } from 'fs';

interface ContentItem {
  name: string;
  type: string;
  data: any;
  imageId?: string;
  avatarId?: string;
  defaultTokenImageId?: string;
  documentType?: string;
  filePath: string;
}

interface TrimOptions {
  inputDir: string;
  outputDir: string;
  actorCount: number;
  itemCount: number;
  documentCount: number;
}

class PackTrimmer {
  private options: TrimOptions;

  constructor(options: TrimOptions) {
    this.options = options;
  }

  async trim(): Promise<void> {
    console.log('🚀 Starting pack trimming...');
    console.log(`📁 Input: ${this.options.inputDir}`);
    console.log(`📁 Output: ${this.options.outputDir}`);
    console.log(`🎯 Target: ${this.options.actorCount} actors, ${this.options.itemCount} items, ${this.options.documentCount} documents`);

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

    console.log('🎉 Pack trimming complete!');
  }

  private async createOutputStructure(): Promise<void> {
    const dirs = ['content/actors', 'content/items', 'content/documents', 'assets'];
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
        const data = JSON.parse(await readFile(filePath, 'utf-8'));
        content.push({ ...data, filePath });
      }
    }

    // Read items
    const itemsDir = join(contentDir, 'items');
    if (existsSync(itemsDir)) {
      const itemFiles = await readdir(itemsDir);
      for (const file of itemFiles.filter(f => f.endsWith('.json'))) {
        const filePath = join(itemsDir, file);
        const data = JSON.parse(await readFile(filePath, 'utf-8'));
        content.push({ ...data, filePath });
      }
    }

    // Read documents
    const documentsDir = join(contentDir, 'documents');
    if (existsSync(documentsDir)) {
      const documentFiles = await readdir(documentsDir);
      for (const file of documentFiles.filter(f => f.endsWith('.json'))) {
        const filePath = join(documentsDir, file);
        const data = JSON.parse(await readFile(filePath, 'utf-8'));
        content.push({ ...data, filePath });
      }
    }

    return content;
  }

  private filterContentWithImages(content: ContentItem[]): ContentItem[] {
    return content.filter(item => {
      return item.imageId || item.avatarId || item.defaultTokenImageId;
    });
  }

  private selectContentForMinimalPack(contentWithImages: ContentItem[]): ContentItem[] {
    const selected: ContentItem[] = [];

    // Group by type
    const actors = contentWithImages.filter(item => item.type === 'npc' || item.filePath.includes('/actors/'));
    const items = contentWithImages.filter(item => item.type !== 'npc' && item.filePath.includes('/items/'));
    const documents = contentWithImages.filter(item => item.documentType || item.filePath.includes('/documents/'));

    console.log(`📊 Available with images: ${actors.length} actors, ${items.length} items, ${documents.length} documents`);

    // Select best items (prioritize variety)
    selected.push(...this.selectBest(actors, this.options.actorCount, 'actors'));
    selected.push(...this.selectBest(items, this.options.itemCount, 'items'));
    selected.push(...this.selectBest(documents, this.options.documentCount, 'documents'));

    return selected;
  }

  private selectBest(items: ContentItem[], count: number, type: string): ContentItem[] {
    console.log(`🎯 Selecting ${count} best ${type} from ${items.length} available`);
    
    // Sort by name for consistent selection
    const sorted = items.sort((a, b) => a.name.localeCompare(b.name));
    
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

    console.log(`✅ Selected ${type}:`, selected.map(item => item.name).slice(0, 5).join(', ') + (selected.length > 5 ? '...' : ''));
    return selected.slice(0, count);
  }

  private async copySelectedContent(selectedContent: ContentItem[]): Promise<void> {
    for (const item of selectedContent) {
      const relativePath = item.filePath.split('/content/')[1];
      const outputPath = join(this.options.outputDir, 'content', relativePath);
      
      // Ensure directory exists
      await mkdir(dirname(outputPath), { recursive: true });
      
      // Copy file
      await writeFile(outputPath, JSON.stringify(item, null, 2));
    }
  }

  private async copyRequiredAssets(selectedContent: ContentItem[]): Promise<Set<string>> {
    const usedAssets = new Set<string>();
    const assetsDir = join(this.options.inputDir, 'assets');
    const outputAssetsDir = join(this.options.outputDir, 'assets');

    for (const item of selectedContent) {
      const imageFields = [item.imageId, item.avatarId, item.defaultTokenImageId].filter(Boolean);
      
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
    
    // Count by type
    const actors = selectedContent.filter(item => item.type === 'npc' || item.filePath.includes('/actors/'));
    const items = selectedContent.filter(item => item.type !== 'npc' && item.filePath.includes('/items/'));
    const documents = selectedContent.filter(item => item.documentType || item.filePath.includes('/documents/'));

    const updatedManifest = {
      ...inputManifest,
      name: 'Minimal Test Pack for Image Debugging',
      description: 'Minimal pack with 10 actors, 10 items, and 10 documents that all have images for testing image import',
      totalEntries: selectedContent.length,
      entriesByType: {
        actors: actors.length,
        items: items.length,
        'vtt-documents': documents.length
      }
    };

    await writeFile(
      join(this.options.outputDir, 'manifest.json'),
      JSON.stringify(updatedManifest, null, 2)
    );
  }

  private async createZipFile(): Promise<void> {
    const { createWriteStream } = await import('fs');
    const archiver = await import('archiver');

    return new Promise((resolve, reject) => {
      const output = createWriteStream(`${this.options.outputDir}.zip`);
      const archive = archiver.default('zip', { zlib: { level: 9 } });

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
  const trimmer = new PackTrimmer({
    inputDir: 'test-pack-full',
    outputDir: 'minimal-test-pack',
    actorCount: 10,
    itemCount: 10,
    documentCount: 10
  });

  await trimmer.trim();
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}