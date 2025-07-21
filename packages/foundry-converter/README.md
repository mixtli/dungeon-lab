# Foundry Converter

A standalone CLI tool for converting Foundry VTT packs to Dungeon Lab format.

## Installation

```bash
npm install -g @dungeon-lab/foundry-converter
```

Or run directly with npx:

```bash
npx @dungeon-lab/foundry-converter --help
```

## Usage

### Convert a single pack

```bash
foundry-converter \
  --input ~/Library/Application\ Support/FoundryVTT/Data/systems/dnd5e/packs/actors24 \
  --output ~/dungeon-lab-packs/actors24 \
  --system dnd-5e-2024
```

### Convert all packs in a directory

```bash
foundry-converter \
  --input ~/Library/Application\ Support/FoundryVTT/Data/systems/dnd5e/packs \
  --output ~/dungeon-lab-packs \
  --system dnd-5e-2024 \
  --all
```

## Options

- `-i, --input <path>` - Input directory (Foundry pack or packs directory) **[required]**
- `-o, --output <path>` - Output directory for converted pack **[required]**
- `-s, --system <id>` - Game system plugin ID (e.g., dnd-5e-2024) **[required]**
- `-a, --all` - Convert all packs in input directory
- `--no-assets` - Skip asset processing
- `--no-validate` - Skip validation against schemas
- `-v, --verbose` - Enable verbose logging
- `--dry-run` - Preview without writing files

## Output Format

The converter outputs packs in the following structure:

```
output-directory/
├── manifest.json          # Pack metadata
├── actors/                # Actor JSON files
│   ├── {id}-{name}.json
│   └── ...
├── items/                 # Item JSON files
│   ├── {id}-{name}.json
│   └── ...
├── documents/             # VTT Document JSON files
│   ├── {id}-{name}.json
│   └── ...
└── assets/                # Asset references
    └── mapping.json       # Original to new path mapping
```

## Supported Systems

Currently supported game systems:
- `dnd-5e-2024` - D&D 5th Edition (2024)

## Development

### Building

```bash
npm run build
```

### Running in development

```bash
npm run dev -- --input /path/to/pack --output /path/to/output --system dnd-5e-2024
```