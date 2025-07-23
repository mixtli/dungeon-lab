# 5etools Compendium Converter Implementation Plan

## Project Overview

Replace the current Foundry importer system with a direct 5etools data converter that generates compendium packs compatible with the existing compendium import API. This will streamline the data import process and eliminate dependency on Foundry VTT data formats.

## Current State Analysis

### Existing Assets
- **Old Plugin (dnd-5e-2024-old)**: Contains working 5etools converter scripts and type definitions
- **5etools Data Source**: Located at `/Users/mixtli/checkouts/5etools-src/data/` with comprehensive D&D 5e 2024 data
- **New Plugin (dnd-5e-2024)**: Current plugin with Foundry-compatible types
- **Compendium System**: Working ZIP-based import system expecting specific manifest format

### Data Sources Available
- Monsters: `bestiary/bestiary-xphb.json`, `bestiary-xmm.json`
- Spells: `spells/spells-xphb.json`
- Classes: `class/class-*.json` 
- Backgrounds: `backgrounds.json`
- Species/Races: `races.json`
- Feats: `feats.json`
- Items: `items.json`, `items-base.json`

### SRD Filtering
All content items have `"srd52": true` property when they're part of the System Resource Document.

## Implementation Phases

### Phase 1: Type System Migration ✅ COMPLETED
**Goal**: Replace new plugin types with proven types from old plugin

- [x] Copy type definitions from `dnd-5e-2024-old/src/shared/types/` to `dnd-5e-2024/src/types/`
  - [x] `actor.mts` - Monster and character types
  - [x] `character.mts` - Player character schema
  - [x] `item.mts` - Equipment, weapons, and consumables
  - [x] `spell.mts` - Spell data structure
  - [x] `character-class.mts` - Class definitions
  - [x] `common.mts` - Shared enums and interfaces
- [x] Update imports throughout new plugin
- [x] Remove old Foundry-style type definitions
- [x] Test new plugin builds successfully
- [x] Verify existing character sheet functionality still works

### Phase 2: Converter Infrastructure ✅ COMPLETED
**Goal**: Create reusable conversion utilities and SRD filtering

- [x] Port converter utilities from old plugin
  - [x] Copy `converter-utils.mts` from old plugin
  - [x] Adapt text cleaning functions for 5etools markup
  - [x] Add SRD filtering helper: `filterSrdContent(data: any[]): any[]`
- [x] Create base converter class
  - [x] `BaseConverter` abstract class with common functionality
  - [x] Asset path resolution
  - [x] Error handling and logging
  - [x] SRD filtering integration
- [x] Test converter utilities
  - [x] Created test script `test-conversion.mts`
  - [x] Test SRD filtering with sample data
  - [x] Validate 5etools data access

### Phase 3: Content Type Converters ✅ COMPLETED
**Goal**: Port and adapt individual content converters

#### Monster Converter ✅
- [x] Port `convert-5etools-monster.mts` from old plugin
- [x] Adapt for new type system
- [x] Update to output compendium format instead of API calls
- [x] Add token image asset mapping
- [x] Test with `bestiary-xphb.json` and `bestiary-xmm.json` - 332 monsters converted

#### Spell Converter ✅  
- [x] Port `convert-5etools-spell.mts` from old plugin
- [x] Handle spell component formatting
- [x] Process spell school and level data
- [x] Add spell icon asset mapping
- [x] Test with `spells-xphb.json` - 322 spells converted

#### Additional Content Converters ✅
- [x] Background converter (`convert-backgrounds.mts`) - 1 background converted
- [x] Item converter (`convert-items.mts`) - 475 items converted

### Phase 4: Compendium Pack Generator ✅ COMPLETED
**Goal**: Create main script that orchestrates the conversion process

- [x] Create main generator script: `src/scripts/generate-compendium-pack.mts`
- [x] Command line argument parsing
  - [x] `--srd-only` flag for SRD content filtering
  - [x] `--output-dir` for specifying output location
  - [x] `--content-types` for selecting specific content types
- [x] Manifest generation
  - [x] Generate proper `manifest.json` with metadata
  - [x] Calculate content counts dynamically
  - [x] Include author and license information
- [x] Directory structure creation
  - [x] Create `content/` subdirectories (actors, items, documents)
  - [x] Create `assets/` directory for images
  - [x] Generate individual JSON files per entity
- [x] Asset processing
  - [x] Asset path resolution framework in place
  - [x] Handle missing asset gracefully
- [x] ZIP file generation
  - [x] Create final compendium ZIP file using archiver
  - [x] Include manifest, content, and assets
  - [x] Validate ZIP structure

### Phase 5: Integration and Testing ✅ COMPLETED
**Goal**: Integrate with plugin and validate functionality

- [x] Add package.json scripts to new plugin
  ```json
  "generate:compendium": "tsx src/scripts/generate-compendium-pack.mts",
  "generate:compendium:srd": "tsx src/scripts/generate-compendium-pack.mts --srd-only",
  "generate:compendium:all": "tsx src/scripts/generate-compendium-pack.mts --no-srd-only",
  "create:minimal-pack": "tsx src/scripts/create-minimal-test-pack.mts",
  "test:conversion": "tsx src/scripts/test-conversion.mts"
  ```
- [x] Create example command documentation (help flag implemented)
- [x] End-to-end testing
  - [x] Generate test compendium with SRD-only content - SUCCESS (1130 items total)
  - [x] Verify content structure and format
  - [x] Test individual content type conversion
- [x] Performance optimization
  - [x] Efficient batch processing implemented
  - [x] Progress reporting with detailed stats
  - [x] Memory efficient JSON generation
- [x] Error handling improvements
  - [x] Comprehensive error messages in converters
  - [x] Graceful handling of malformed entries
  - [x] Detailed conversion statistics
- [x] Configuration
  - [x] 5etools data path configured in constants
  - [x] Plugin metadata centralized

## Technical Requirements

### Dependencies
- Node.js with TypeScript support
- Access to 5etools source data directory
- ZIP creation library (built-in Node.js or archiver)
- Existing plugin type validation

### Performance Constraints
- Must handle large datasets (1000+ monsters, 500+ spells)
- Memory efficient processing for batch operations
- Reasonable processing time (< 5 minutes for full SRD)

### Data Integrity
- Preserve all essential game data
- Handle cross-references between content types
- Maintain asset-content relationships
- Validate generated content against schemas

### Compatibility
- Generated compendiums must work with existing import API
- Types must be compatible with current plugin architecture
- Assets must follow existing asset management patterns

## Success Criteria

### Phase 1 Complete When: ✅ ACHIEVED
- [x] All type definitions successfully migrated
- [x] Plugin builds without errors
- [x] Existing functionality remains intact

### Phase 2 Complete When: ✅ ACHIEVED
- [x] Converter utilities ported and tested
- [x] SRD filtering working correctly
- [x] Base converter infrastructure ready

### Phase 3 Complete When: ✅ ACHIEVED
- [x] All content type converters implemented
- [x] Sample data conversions successful
- [x] Output format matches compendium expectations

### Phase 4 Complete When: ✅ ACHIEVED
- [x] Main generator script functional
- [x] Valid ZIP files generated (746KB SRD pack)
- [x] All command line options working

### Phase 5 Complete When: ✅ ACHIEVED
- [x] Full SRD compendium successfully generated (1130 items)
- [x] Data format validated against compendium schema
- [x] Documentation complete
- [x] Performance meets requirements (sub-minute generation)

## Risk Mitigation

### Data Format Changes
- **Risk**: 5etools data format changes
- **Mitigation**: Version pinning and format validation

### Asset Management
- **Risk**: Missing or invalid image assets
- **Mitigation**: Default fallback assets and graceful handling

### Performance Issues
- **Risk**: Memory/time constraints with large datasets
- **Mitigation**: Streaming processing and progress reporting

### Type Compatibility
- **Risk**: New types don't work with existing systems
- **Mitigation**: Comprehensive testing and gradual migration

### Phase 6: Image Asset Integration ✅ COMPLETED
**Goal**: Integrate image assets from 5etools-img repository into compendium packs

#### Enhanced Fluff Data Processing ✅
- [x] Update Monster Converter to extract image paths from fluff data
  - [x] Read and process `fluff-bestiary-*.json` files
  - [x] Extract `images[0].href.path` for each monster
  - [x] Map to `tokenImagePath` and `avatarImagePath` fields
- [x] Update Spell Converter for spell images (synthetic paths generated)
- [x] Update Item Converter for item images (synthetic paths generated)
- [x] Update Background Converter for background images (synthetic paths generated)

#### Asset Collection and Validation ✅
- [x] Create `asset-resolver.mts` utility
  - [x] Resolve image paths to actual files in 5etools-img
  - [x] Check file existence and handle missing images
  - [x] Support multiple formats (webp, png, jpg)
- [x] Implement image processing pipeline
  - [x] Read and validate image files
  - [x] Buffer-based asset copying for efficiency
  - [x] Graceful handling of missing assets

#### Compendium Pack Asset Integration ✅
- [x] Modify pack generator to include assets
  - [x] Copy resolved images to `assets/` directory in ZIP
  - [x] Maintain original relative paths
  - [x] Generate asset manifest with mappings
- [x] Update content to include asset paths
  - [x] Add relative paths to converted content
  - [x] Ensure paths match ZIP structure

#### Configuration and Testing ✅
- [x] Add CLI options
  - [x] `--include-assets` (default: true)
  - [x] `--skip-missing-assets` flag
  - [x] `--assets-path` to override 5etools-img location
- [x] Comprehensive testing
  - [x] Full pipeline with actual images (293 assets copied successfully)
  - [x] Asset references properly included in content
  - [x] Missing assets handled gracefully with warnings

## Implementation Results ✅ ALL PHASES COMPLETE

### Final Statistics (With Assets)
- **Total SRD Content Converted**: 1,130 items
  - 332 Monsters (from bestiary-xphb.json, bestiary-xmm.json)
  - 322 Spells (from spells-xphb.json)
  - 1 Background (from backgrounds.json)
  - 475 Items (from items.json)
- **Generated ZIP Size**: ~74 MB (with images), 746 KB (without images)
- **Assets Processed**: 1,097 unique asset paths found, 293 successfully copied
- **Generation Time**: Under 2 minutes (with assets), Under 30 seconds (without)
- **Error Rate**: 0% (all items converted successfully, missing assets handled gracefully)

### Usage Guide

The 5etools compendium converter is now fully functional and ready for use. 

#### Basic Usage
```bash
# Generate SRD-only compendium pack (recommended)
npm run generate:compendium:srd

# Generate all available content (not just SRD)
npm run generate:compendium:all

# Generate specific content types only
npm run generate:compendium -- --content-types spells,monsters

# Specify output directory
npm run generate:compendium -- --output-dir ./my-custom-pack

# Create minimal test pack for development (10 actors, 10 items, 10 documents with images)
npm run create:minimal-pack
```

#### Available Content Types
- `monsters` - Creatures from bestiary files
- `spells` - Spells from spell files
- `backgrounds` - Character backgrounds
- `items` - Equipment, weapons, and magic items

#### Command Line Options
- `--srd-only` (default: true) - Only include SRD content
- `--output-dir <path>` (default: ./dist/compendium-pack) - Output directory
- `--content-types <types>` (default: monsters,spells,backgrounds,items) - Comma-separated list
- `--name <name>` - Custom compendium name
- `--include-assets` (default: true) - Include images from 5etools-img repository
- `--skip-missing-assets` - Continue if images are missing instead of failing
- `--assets-path <path>` - Override 5etools-img repository location
- `--help` - Show detailed help

#### Output Format
The converter generates a standard compendium ZIP file containing:
- `manifest.json` - Compendium metadata
- `content/` directory with organized JSON files
- `assets/` directory for images (when `--include-assets` is enabled)

Generated compendiums are compatible with the existing compendium import API and can be uploaded directly through the web interface.

### Phase 7: Compendium Architecture Migration ✅ COMPLETED
**Goal**: Migrate from reference-based to embedded content architecture with wrapper format

#### Architecture Updates ✅
- [x] Update shared schemas for embedded content with discriminated unions
- [x] Replace CompendiumEntry model with embedded structure and content hash generation
- [x] Create new TemplateService for instantiation from embedded content
- [x] Replace import service with wrapper format processing
- [x] Update 5etools converters to generate wrapper format with entry metadata
- [x] Replace compendium controllers and routes for new structure
- [x] Update frontend components for new embedded content browsing

#### Wrapper Format Implementation ✅
- [x] Design wrapper format separating entry metadata from content data
- [x] Add type field to entry objects for discriminated unions
- [x] Simplify category to single string for UI usability
- [x] Simplify tags to flat string arrays
- [x] Update all converters to output correct wrapper format

#### Testing and Validation ✅
- [x] Generate test packs with new wrapper format
- [x] Verify content hash generation and version tracking
- [x] Test template instantiation creating world instances
- [x] Validate frontend displays new embedded structure correctly

### Phase 8: 5etools Converter Refactor ✅ COMPLETED
**Goal**: Reorganize converter codebase for better maintainability and structure

#### Directory Restructuring ✅
- [x] Create organized `src/5etools-converter/` library structure
  - [x] `base/` - Base classes and interfaces (wrapper-converter.mts, base-converter.mts)
  - [x] `converters/` - Specific converter implementations (monster, spell, background, item)
  - [x] `utils/` - Converter utilities (conversion-utils.mts, asset-resolver.mts)
  - [x] `generator/` - Pack generation logic (compendium-pack-generator.mts)
- [x] Clean scripts directory with only essential entry points
  - [x] `generate-compendium-pack.mts` - Thin CLI wrapper (reduced from 344 to 70 lines)
  - [x] `test-conversion.mts` - Test runner script
  - [x] `create-minimal-test-pack.mts` - Generates small test packs for development

#### Code Organization Improvements ✅
- [x] Create barrel exports (index.mts files) for clean imports
- [x] Extract CompendiumPackGenerator to separate library class
- [x] Update all import paths throughout codebase
- [x] Remove unused/duplicate files (6 files cleaned up)
- [x] Maintain full functionality with improved structure

#### Testing and Validation ✅
- [x] Verify all package.json scripts work identically
- [x] Test full pack generation with new structure
- [x] Create minimal test pack (30 items with images) for development testing
- [x] Confirm no functionality regressions from refactor

### Next Steps for Enhancement
1. Implement additional content types (classes, races, feats)
2. Add validation against compendium import API
3. Create automated CI/CD pipeline for regular SRD updates
4. Phase 8: Add comprehensive tests for new architecture

## Technical Implementation Notes

### Asset Path Resolution
The import service needs to handle special path fields during content processing:
- **Actors**: `tokenImagePath` → `defaultTokenImageId`, `avatarImagePath` → `avatarId`
- **Items**: `imagePath` → `imageId`
- **VTT Documents**: `imagePath` → `imageId`

### 5etools Image Repository Structure
```
/Users/mixtli/checkouts/5etools-img/
├── bestiary/
│   ├── XMM/
│   │   ├── Aboleth.webp
│   │   └── ...
│   └── ...
├── spells/
├── items/
└── ...
```

### Expected ZIP Structure with Assets
```
compendium-pack.zip
├── manifest.json
├── content/
│   ├── actors/
│   │   └── actor-aboleth.json
│   ├── documents/
│   │   └── document-fireball.json
│   └── items/
│       └── item-longsword.json
└── assets/
    ├── bestiary/
    │   └── XMM/
    │       └── Aboleth.webp
    ├── spells/
    │   └── PHB/
    │       └── Fireball.webp
    └── items/
        └── PHB/
            └── Longsword.webp
```