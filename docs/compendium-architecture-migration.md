# Compendium Architecture Migration Plan

## Executive Summary

This document outlines the migration from the current linked/referenced compendium architecture to a clean hybrid approach with embedded content and template instantiation. This migration eliminates backward compatibility concerns and focuses on optimal design patterns.

## Current Architecture Analysis

### Existing Implementation

The current system uses a **linked/referenced approach**:

```typescript
// CompendiumEntry points to separate content
interface CompendiumEntry {
  contentType: 'Actor' | 'Item' | 'VTTDocument'
  contentId: ObjectId
  // ... metadata
}
```

**Data Flow**: `Compendium → CompendiumEntry → Referenced Content (Actor/Item/VTTDocument)`

### Problems with Current Approach

1. **Mutable Content Risk**: Referenced content can be modified, breaking compendium immutability
2. **Complex Dependencies**: Deleting content affects compendiums unexpectedly  
3. **Performance Overhead**: Requires joins for compendium browsing
4. **Versioning Difficulty**: No clear way to track compendium content changes
5. **Distribution Complexity**: Compendiums aren't self-contained

## Target Architecture: Hybrid Embedded + Template System

### Core Concept

**Compendiums store complete, immutable content** that serves as **templates for world instances**.

```typescript
// Define discriminated union for embedded content
type EmbeddedContent =
  | { type: 'actor'; data: ActorData }
  | { type: 'item'; data: ItemData }
  | { type: 'vttdocument'; data: VTTDocumentData }

// Note: CompendiumEntry is the Mongoose model instance
// CompendiumEntryData is the plain data interface
interface CompendiumEntry {
  // Metadata
  name: string
  sortOrder: number
  category?: string
  tags: string[]
  
  // Top-level image for browsing (NEW)
  imageId?: string  // Reference to Asset model
  
  // Embedded content with discriminated union (NEW)
  embeddedContent: EmbeddedContent
  
  // Version tracking
  contentVersion: string
  contentHash: string
  
  // Import metadata
  sourceId?: string
  sourceData?: any
}
```

### Template Instantiation Pattern

```typescript
// Service layer for template management
class TemplateService {
  // Create world instance from compendium template
  async createFromTemplate(
    compendiumEntry: CompendiumEntry, 
    overrides?: Partial<ContentData>
  ): Promise<Actor | Item | VTTDocument>
  
  // Update template with new content
  async updateTemplate(
    compendiumEntry: CompendiumEntry, 
    newData: ContentData
  ): Promise<CompendiumEntry>
  
  // Get immutable template content
  getTemplate(compendiumEntry: CompendiumEntry): ContentData
}
```

## Implementation Strategy

### Phase 1: Data Model Migration

#### 1.1 Update CompendiumEntry Schema

```typescript
// packages/shared/src/schemas/compendium-entry.schema.mts
// This is the plain data interface used for validation and type safety

// Define discriminated union for embedded content
export type EmbeddedContent =
  | { type: 'actor'; data: ActorData }
  | { type: 'item'; data: ItemData }
  | { type: 'vttdocument'; data: VTTDocumentData }

export interface CompendiumEntryData {
  name: string
  sortOrder: number
  category?: string
  tags: string[]
  isActive: boolean
  
  // NEW: Top-level image for browsing (Asset ID after processing)
  imageId?: string
  
  // NEW: Embedded content with discriminated union
  embeddedContent: EmbeddedContent
  
  // NEW: Version tracking
  contentVersion: string
  contentHash: string
  
  // Import metadata (existing)
  sourceId?: string
  sourceData?: any
  
  // Timestamps
  createdAt: Date
  updatedAt: Date
}

// Note: CompendiumEntry (Mongoose model) extends this interface
// with methods and MongoDB-specific fields like _id
```

#### 1.2 Remove Old Reference Fields

**Remove from CompendiumEntry**:
- `contentType` 
- `contentId`
- All `refPath` population logic

#### 1.3 Update Compendium Statistics

```typescript
// Compendium model still tracks entry statistics
interface CompendiumData {
  // ... existing fields
  
  // Updated statistics calculation
  totalEntries: number
  entriesByType: {
    actor: number
    item: number 
    vttdocument: number
  }
}
```

### Phase 2: Import System Refactoring

#### 2.1 New Import Bundle Format

The import system now expects content files with an outer wrapper containing entry metadata:

```json
{
  "entry": {
    "name": "Ancient Red Dragon",
    "type": "actor",
    "imageId": "assets/tokens/ancient-red-dragon.png",
    "category": "Monsters", 
    "tags": ["dragon", "cr24"],
    "sortOrder": 100
  },
  "content": {
    // Original actor/item/document data with embedded assets
    "type": "npc",
    "name": "Ancient Red Dragon",
    "avatarId": "assets/avatars/ancient-red-dragon.png",
    "defaultTokenImageId": "assets/tokens/ancient-red-dragon-token.png",
    "data": {
      // plugin specific data
    }
    // ... rest of the content data
  }
}
```

#### 2.2 New Import Flow

```typescript
// packages/server/src/features/compendiums/services/import.service.mts

// Interface for wrapper format
interface ContentFileWrapper {
  entry: {
    name: string
    imageId?: string
    category?: string
    tags?: string[]
    sortOrder?: number
  }
  content: any
}

class ImportService {
  async processContent(
    contentFiles: ContentFile[],
    assets: AssetFile[],
    pluginId: string
  ): Promise<CompendiumEntry[]> {
    
    const entries: CompendiumEntry[] = []
    
    for (const contentFile of contentFiles) {
      // 1. Parse wrapper format
      const wrapper: ContentFileWrapper = JSON.parse(contentFile.content)
      const { entry: entryMetadata, content: contentData } = wrapper
      
      // 2. Validate content using plugin
      const validatedData = await this.validateContent(contentData, contentFile.type, pluginId)
      
      // 3. Process entry-level image asset
      const entryImageId = await this.processImageAsset(
        entryMetadata.imageId,
        assets
      )
      
      // 4. Process embedded content assets
      const processedContentData = await this.processEmbeddedContentAssets(
        validatedData,
        assets
      )
      
      // 5. Create embedded entry (single operation)
      const entry = await this.createEmbeddedEntry({
        name: entryMetadata.name,
        category: entryMetadata.category,
        tags: entryMetadata.tags || [],
        sortOrder: entryMetadata.sortOrder || 0,
        imageId: entryImageId,
        embeddedContent: {
          type: contentFile.type,
          data: processedContentData
        },
        contentVersion: '1.0.0',
        contentHash: this.generateContentHash(processedContentData)
      })
      
      entries.push(entry)
    }
    
    return entries
  }
  
  private async processImageAsset(
    imagePath: string | undefined,
    availableAssets: AssetFile[]
  ): Promise<string | undefined> {
    if (!imagePath) return undefined
    
    const assetFile = availableAssets.find(a => 
      a.originalPath === imagePath
    )
    
    if (assetFile) {
      const uploadedAsset = await this.uploadAsset(assetFile)
      return uploadedAsset.id
    }
    
    return undefined
  }
  
  private async processEmbeddedContentAssets(
    contentData: any,
    availableAssets: AssetFile[]
  ): Promise<any> {
    const processedContentData = { ...contentData }
    
    // Extract asset references from content
    const assetFields = ['avatarId', 'imageId', 'defaultTokenImageId']
    
    for (const field of assetFields) {
      if (processedContentData[field]) {
        const assetFile = availableAssets.find(a => 
          a.originalPath === processedContentData[field]
        )
        
        if (assetFile) {
          // Upload asset and update content to reference uploaded asset ID
          const uploadedAsset = await this.uploadAsset(assetFile)
          processedContentData[field] = uploadedAsset.id
        }
      }
    }
    
    return processedContentData
  }
}
```

#### 2.3 Bundle Converter Updates ✅ COMPLETED

**Status**: The 5etools bundle converter has been successfully implemented and generates the wrapper format correctly.

**Current State**: The converter system now properly handles all D&D 5e content types:
- ✅ Classes (12 items) → `classes/` directory  
- ✅ Species/Races (6 items) → `species/` directory
- ✅ Feats (19 items) → `feats/` directory
- ✅ Backgrounds (1 item) → `backgrounds/` directory
- ✅ Spells (322 items) → `spells/` directory
- ✅ Items → `items/` directory
- ✅ Monsters → `actors/` directory

**Output Format**: The converter generates the exact wrapper format needed:

**Key Benefits Achieved**:
- ❌ **No misc directory**: All content goes to proper content-specific directories
- ✅ **Stable format**: The wrapper format with entry/content separation is working well
- ✅ **Asset handling**: Images are properly extracted from fluff data and linked
- ✅ **Type safety**: VTT documents use discriminated unions with documentType field
- ✅ **Directory mapping**: Generator correctly routes content based on type/documentType

The implementation follows this pattern:

```typescript
// Current working implementation pattern:

class FiveEToolsConverter {
  convertContent(sourceData: any, contentType: string): ContentFileWrapper {
    const processedContent = this.processContentData(sourceData, contentType)
    
    return {
      entry: {
        name: sourceData.name,
        imageId: this.extractEntryImagePath(sourceData, contentType),
        category: this.determineCategory(sourceData, contentType),
        tags: this.extractTags(sourceData, contentType),
        sortOrder: this.calculateSortOrder(sourceData, contentType)
      },
      content: processedContent
    }
  }
  
  private extractEntryImagePath(sourceData: any, contentType: string): string | undefined {
    switch (contentType) {
      case 'actor':
        // For actors: prefer token images for browsing
        return sourceData.tokenUrl || sourceData.imageUrl
      case 'item':
      case 'vttdocument':
        // For items and documents: use primary image
        return sourceData.imageUrl
      default:
        return undefined
    }
  }
  
  private determineCategory(sourceData: any, contentType: string): string | undefined {
    switch (contentType) {
      case 'actor':
        return sourceData.type || 'NPCs'
      case 'item':
        return sourceData.type || 'Equipment'
      case 'vttdocument':
        return sourceData.source || 'Core Rules'
      default:
        return undefined
    }
  }
  
  private extractTags(sourceData: any, contentType: string): string[] {
    const tags: string[] = []
    
    // Add common tags based on content type
    if (sourceData.source) tags.push(sourceData.source)
    if (sourceData.level) tags.push(`Level ${sourceData.level}`)
    if (sourceData.rarity) tags.push(sourceData.rarity)
    
    return tags
  }
}
```

#### 2.4 Simplified Transaction Pattern

```typescript
// Single transaction creates compendium + embedded entries
async createCompendiumWithEntries(
  compendiumData: CompendiumData,
  entries: CompendiumEntry[]
): Promise<Compendium> {
  
  const session = await mongoose.startSession()
  
  try {
    await session.withTransaction(async () => {
      // 1. Create compendium
      const compendium = await Compendium.create([compendiumData], { session })
      
      // 2. Create all entries with embedded content
      const entriesWithCompendium = entries.map(entry => ({
        ...entry,
        compendiumId: compendium[0]._id
      }))
      
      await CompendiumEntry.create(entriesWithCompendium, { session })
      
      // 3. Update statistics
      await this.updateCompendiumStatistics(compendium[0]._id, session)
    })
  } finally {
    await session.endSession()
  }
}
```

### Phase 3: Template Service Implementation

#### 3.1 Template Service

```typescript
// packages/server/src/features/compendiums/services/template.service.mts

export class TemplateService {
  async createFromTemplate(
    compendiumEntry: CompendiumEntry,
    overrides: Partial<any> = {},
    userId: string
  ): Promise<Actor | Item | VTTDocument> {
    
    const { embeddedContent } = compendiumEntry
    
    // Deep clone template data
    const instanceData = {
      ...JSON.parse(JSON.stringify(embeddedContent.data)),
      ...overrides,
      
      // Instance metadata
      createdBy: userId,
      createdAt: new Date(),
      sourceCompendiumId: compendiumEntry.compendiumId,
      sourceEntryId: compendiumEntry._id,
      sourceVersion: compendiumEntry.contentVersion
    }
    
    // Create appropriate instance type with type safety
    switch (embeddedContent.type) {
      case 'actor':
        // TypeScript knows embeddedContent.data is ActorData
        return await Actor.create({
          ...embeddedContent.data,
          ...overrides,
          // Instance metadata
          createdBy: userId,
          createdAt: new Date(),
          sourceCompendiumId: compendiumEntry.compendiumId,
          sourceEntryId: compendiumEntry._id,
          sourceVersion: compendiumEntry.contentVersion
        })
      case 'item':
        // TypeScript knows embeddedContent.data is ItemData
        return await Item.create({
          ...embeddedContent.data,
          ...overrides,
          createdBy: userId,
          createdAt: new Date(),
          sourceCompendiumId: compendiumEntry.compendiumId,
          sourceEntryId: compendiumEntry._id,
          sourceVersion: compendiumEntry.contentVersion
        })
      case 'vttdocument':
        // TypeScript knows embeddedContent.data is VTTDocumentData
        return await VTTDocument.create({
          ...embeddedContent.data,
          ...overrides,
          createdBy: userId,
          createdAt: new Date(),
          sourceCompendiumId: compendiumEntry.compendiumId,
          sourceEntryId: compendiumEntry._id,  
          sourceVersion: compendiumEntry.contentVersion
        })
      default:
        // TypeScript ensures this is unreachable
        const _exhaustive: never = embeddedContent
        throw new Error(`Unknown content type: ${_exhaustive}`)
    }
  }
  
  async updateTemplate(
    compendiumEntry: CompendiumEntry,
    newData: any
  ): Promise<CompendiumEntry> {
    
    // Create new version
    const newVersion = this.incrementVersion(compendiumEntry.contentVersion)
    const newHash = this.generateContentHash(newData)
    
    return await CompendiumEntry.findByIdAndUpdate(
      compendiumEntry._id,
      {
        'embeddedContent.data': newData,
        contentVersion: newVersion,
        contentHash: newHash,
        updatedAt: new Date()
      },
      { new: true }
    )
  }
  
  getTemplate(compendiumEntry: CompendiumEntry): any {
    // Return deep clone to prevent mutation
    return JSON.parse(JSON.stringify(compendiumEntry.embeddedContent.data))
  }
  
  private incrementVersion(currentVersion: string): string {
    const [major, minor, patch] = currentVersion.split('.').map(Number)
    return `${major}.${minor}.${patch + 1}`
  }
  
  private generateContentHash(data: any): string {
    return createHash('sha256')
      .update(JSON.stringify(data))
      .digest('hex')
      .substring(0, 16)
  }
}
```

#### 3.2 Template Controller Endpoints

```typescript
// packages/server/src/features/compendiums/controllers/template.controller.mts

export class TemplateController {
  
  // POST /compendiums/:compendiumId/entries/:entryId/instantiate
  async instantiateTemplate(req: Request, res: Response) {
    const { compendiumId, entryId } = req.params
    const overrides = req.body.overrides || {}
    
    const entry = await CompendiumEntry.findOne({
      _id: entryId,
      compendiumId
    })
    
    if (!entry) {
      return res.status(404).json({ error: 'Entry not found' })
    }
    
    const instance = await this.templateService.createFromTemplate(
      entry,
      overrides,
      req.session.user.id
    )
    
    res.json(instance)
  }
  
  // PUT /compendiums/:compendiumId/entries/:entryId/template
  async updateTemplate(req: Request, res: Response) {
    const { compendiumId, entryId } = req.params
    const newData = req.body
    
    const entry = await CompendiumEntry.findOne({
      _id: entryId,
      compendiumId
    })
    
    if (!entry) {
      return res.status(404).json({ error: 'Entry not found' })
    }
    
    // Validate new data using plugin
    const plugin = await this.pluginRegistry.getPlugin(entry.pluginId)
    await plugin.validateContent(newData, entry.embeddedContent.type)
    
    const updatedEntry = await this.templateService.updateTemplate(entry, newData)
    
    res.json(updatedEntry)
  }
}
```

### Phase 4: Frontend & API Updates

#### 4.1 Compendium Browser Updates

```vue
<!-- packages/web/src/components/compendium/CompendiumEntriesList.vue -->
<template>
  <div class="compendium-entries">
    <div 
      v-for="entry in entries" 
      :key="entry._id"
      class="entry-card"
    >
      <!-- Entry metadata -->
      <div class="entry-header">
        <h3>{{ entry.name }}</h3>
        <ContentTypeIcon :type="entry.embeddedContent.type" />
      </div>
      
      <!-- Asset preview using top-level imageId -->
      <div class="entry-preview">
        <img 
          v-if="entry.imageId"
          :src="getAssetUrl(entry.imageId)"
          alt="Preview"
          class="entry-image"
        />
      </div>
      
      <!-- Actions -->
      <div class="entry-actions">
        <button @click="instantiateTemplate(entry)">
          Create Instance
        </button>
        <button @click="editTemplate(entry)">
          Edit Template
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { CompendiumEntry } from '@/types'

interface Props {
  entries: CompendiumEntry[]
}

const props = defineProps<Props>()

const getAssetUrl = (assetId: string) => {
  return `/api/assets/${assetId}`
}

const instantiateTemplate = async (entry: CompendiumEntry) => {
  try {
    const response = await fetch(
      `/api/compendiums/${entry.compendiumId}/entries/${entry._id}/instantiate`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ overrides: {} })
      }
    )
    
    const instance = await response.json()
    
    // Handle successful instantiation
    emit('instance-created', instance)
  } catch (error) {
    console.error('Failed to instantiate template:', error)
  }
}
</script>
```

#### 4.2 Performance Optimizations

```typescript
// Optimized queries for embedded content browsing
class CompendiumEntryService {
  
  async findEntriesWithProjection(
    compendiumId: string,
    options: PaginationOptions = {}
  ): Promise<PaginatedResult<CompendiumEntry>> {
    
    const query = CompendiumEntry.find({ compendiumId })
    
    // Project only necessary fields for browsing
    query.select({
      name: 1,
      category: 1,
      tags: 1,
      'embeddedContent.type': 1,
      'embeddedContent.assets': 1,
      // Exclude large embedded data for list view
      'embeddedContent.data': 0
    })
    
    const { page = 1, limit = 20 } = options
    const skip = (page - 1) * limit
    
    const [entries, total] = await Promise.all([
      query.skip(skip).limit(limit).lean(),
      CompendiumEntry.countDocuments({ compendiumId })
    ])
    
    return {
      data: entries,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }
  }
  
  async findFullEntry(entryId: string): Promise<CompendiumEntry | null> {
    // Get complete entry with embedded content for detailed view
    return await CompendiumEntry.findById(entryId).lean()
  }
}
```

### Phase 5: Plugin Integration Updates

#### 5.1 D&D 5e Plugin Updates

```typescript
// packages/plugins/dnd-5e-2024/src/validation.mts

export class DnD5eValidator {
  
  // Updated to work with discriminated union embedded content
  async validateEmbeddedContent(
    embeddedContent: EmbeddedContent
  ): Promise<ValidationResult> {
    
    switch (embeddedContent.type) {
      case 'actor':
        // TypeScript knows data is ActorData
        return this.validateActorData(embeddedContent.data)
      case 'item':
        // TypeScript knows data is ItemData
        return this.validateItemData(embeddedContent.data)  
      case 'vttdocument':
        // TypeScript knows data is VTTDocumentData
        return this.validateVTTDocumentData(embeddedContent.data)
      default:
        // TypeScript ensures this is unreachable
        const _exhaustive: never = embeddedContent
        throw new Error(`Unknown content type: ${_exhaustive}`)
    }
  }
  
  // Asset validation for embedded assets
  async validateEmbeddedAssets(
    assets: AssetReference[]
  ): Promise<ValidationResult> {
    
    const errors: string[] = []
    
    for (const asset of assets) {
      if (!asset.id || !asset.filename) {
        errors.push(`Invalid asset reference: ${JSON.stringify(asset)}`)
      }
      
      // Check asset exists in storage
      const exists = await this.assetService.exists(asset.id)
      if (!exists) {
        errors.push(`Asset not found: ${asset.id}`)
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  }
}
```

### Phase 6: Migration & Data Cleanup

#### 6.1 Data Migration Script

```typescript
// scripts/migrate-compendium-architecture.mjs

import mongoose from 'mongoose'
import { CompendiumEntry } from '../packages/server/src/features/compendiums/models/compendium-entry.model.mjs'
import { Actor } from '../packages/server/src/features/actors/models/actor.model.mjs'
import { Item } from '../packages/server/src/features/items/models/item.model.mjs'  
import { VTTDocument } from '../packages/server/src/features/documents/models/vtt-document.model.mjs'

async function migrateCompendiumEntries() {
  
  console.log('Starting compendium architecture migration...')
  
  // Get all entries with old reference structure
  const oldEntries = await CompendiumEntry.find({
    contentType: { $exists: true },
    contentId: { $exists: true },
    embeddedContent: { $exists: false }
  })
  
  console.log(`Found ${oldEntries.length} entries to migrate`)
  
  for (const entry of oldEntries) {
    try {
      // Fetch referenced content
      let content
      switch (entry.contentType) {
        case 'Actor':
          content = await Actor.findById(entry.contentId).lean()
          break
        case 'Item': 
          content = await Item.findById(entry.contentId).lean()
          break
        case 'VTTDocument':
          content = await VTTDocument.findById(entry.contentId).lean()
          break
      }
      
      if (!content) {
        console.warn(`Referenced content not found for entry: ${entry._id}`)
        continue
      }
      
      // Extract assets
      const assets = await extractAssetReferences(content)
      
      // Create embedded content structure
      const embeddedContent = {
        type: entry.contentType.toLowerCase(),
        data: content,
        assets
      }
      
      // Update entry with embedded content
      await CompendiumEntry.findByIdAndUpdate(entry._id, {
        embeddedContent,
        contentVersion: '1.0.0',
        contentHash: generateContentHash(content),
        
        // Remove old fields
        $unset: {
          contentType: 1,
          contentId: 1
        }
      })
      
      console.log(`Migrated entry: ${entry.name}`)
      
    } catch (error) {
      console.error(`Failed to migrate entry ${entry._id}:`, error)
    }
  }
  
  console.log('Migration completed!')
}

async function extractAssetReferences(content: any): Promise<AssetReference[]> {
  const assets: AssetReference[] = []
  const assetFields = ['avatarId', 'imageId', 'defaultTokenImageId']
  
  for (const field of assetFields) {
    if (content[field]) {
      // Assume assets are already uploaded and have proper IDs
      assets.push({
        id: content[field],
        type: getAssetType(field),
        filename: '', // Will be populated from asset service if needed
      })
    }
  }
  
  return assets
}

function getAssetType(field: string): string {
  const mapping = {
    avatarId: 'avatar',
    imageId: 'image', 
    defaultTokenImageId: 'token'
  }
  return mapping[field] || 'image'
}

function generateContentHash(data: any): string {
  return createHash('sha256')
    .update(JSON.stringify(data))
    .digest('hex')
    .substring(0, 16)
}

// Run migration
if (import.meta.url === `file://${process.argv[1]}`) {
  await mongoose.connect(process.env.MONGODB_URI)
  await migrateCompendiumEntries()
  await mongoose.disconnect()
}
```

#### 6.2 Cleanup Old Collections

```typescript
// After successful migration, remove orphaned content
async function cleanupOrphanedContent() {
  
  // Find content that was only used by compendiums
  const orphanedActors = await Actor.find({
    compendiumId: { $exists: true },
    // Add other criteria to identify compendium-only content
  })
  
  const orphanedItems = await Item.find({
    compendiumId: { $exists: true }
  })
  
  const orphanedVTTDocuments = await VTTDocument.find({
    compendiumId: { $exists: true }
  })
  
  // Remove orphaned content (be very careful here!)
  console.log(`Would remove:`)
  console.log(`- ${orphanedActors.length} orphaned actors`)
  console.log(`- ${orphanedItems.length} orphaned items`) 
  console.log(`- ${orphanedVTTDocuments.length} orphaned VTT documents`)
  
  // Uncomment when ready to actually delete
  // await Actor.deleteMany({ _id: { $in: orphanedActors.map(a => a._id) } })
  // await Item.deleteMany({ _id: { $in: orphanedItems.map(i => i._id) } })
  // await VTTDocument.deleteMany({ _id: { $in: orphanedVTTDocuments.map(d => d._id) } })
}
```

## Benefits of New Architecture

### 1. True Immutability
- Compendium content cannot be accidentally modified
- Templates provide stable foundation for instances
- Version tracking enables change management

### 2. Performance Improvements
- Single collection queries for compendium browsing
- No complex joins required
- Optimized projections for list vs detail views

### 3. Self-Contained Distribution
- Compendiums become portable packages
- All content and assets embedded
- Simplified backup and restore

### 4. Simplified Development
- Clear separation between templates and instances
- Reduced transaction complexity  
- Easier testing and validation

### 5. Versioning & Auditing
- Content hash tracking for change detection
- Version increments for template updates
- Clear lineage from templates to instances

## Technical Considerations

### Storage Impact
- **Estimated increase**: 20-30% due to embedded content duplication
- **Mitigation**: Compression at database level, asset deduplication
- **Justification**: Performance and architecture benefits outweigh storage cost

### Query Performance
- **List views**: Significantly faster (no joins)
- **Detail views**: Minimal impact (single document fetch)
- **Search**: May require aggregation pipelines for cross-compendium search

### Asset Management
- **Embedded references**: Assets linked within content data
- **Deduplication**: Same asset can be referenced by multiple entries
- **Cleanup**: Orphaned asset detection and removal strategies

## Implementation Timeline

### Phase 1: Data Models (Week 1)
- Update CompendiumEntry schema
- Remove reference fields
- Add embedded content structure

### Phase 2: Import System (Week 2)
- Refactor import service for embedded content
- Update asset processing pipeline
- Test with existing compendium ZIPs

### Phase 3: Template Service (Week 3)
- Implement template service layer
- Add instantiation endpoints
- Create template management UI

### Phase 4: Frontend Updates (Week 4)
- Update compendium browser
- Add template instantiation flows
- Optimize query projections

### Phase 5: Migration & Cleanup (Week 5)
- Run data migration script
- Validate migrated data
- Clean up orphaned content
- Performance testing

## Testing Strategy

### Unit Tests
- Template service instantiation
- Content validation with embedded data
- Asset reference handling

### Integration Tests  
- End-to-end import flow
- Template to instance creation
- Compendium browsing performance

### Migration Tests
- Test migration script on sample data
- Validate data integrity post-migration
- Performance comparison before/after

### Load Tests
- Compendium browsing under load
- Template instantiation performance
- Database query optimization validation

## Conclusion

This migration to a hybrid embedded + template architecture with discriminated unions and wrapper format provides:

1. **True compendium immutability** without accidental content modification
2. **Better performance** through optimized single-collection queries  
3. **Self-contained distribution** for portable compendium packages
4. **Clean separation** between templates and world instances
5. **Type safety** with discriminated unions for embedded content
6. **Flexible entry metadata** through the wrapper format
7. **Explicit image handling** with entry-level imageId fields
8. **Industry alignment** with patterns used by successful VTTs like FoundryVTT

## Key Architectural Improvements

### Discriminated Union Benefits
- **Type Safety**: TypeScript knows exact data types at compile time
- **Exhaustive Checking**: Prevents missing cases in switch statements
- **Better IntelliSense**: IDE provides accurate autocompletion
- **Runtime Safety**: Ensures only valid combinations exist

### Wrapper Format Benefits  
- **Explicit Metadata**: Bundle creators control entry presentation
- **Flexible Image Selection**: Custom imageId independent of embedded content
- **Clean Separation**: Entry metadata separated from content data
- **Extensible**: Easy to add new entry-level fields in the future

The implementation removes all backward compatibility constraints, focusing on optimal design for future development and maintenance while providing superior type safety and flexibility.