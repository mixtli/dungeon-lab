#!/usr/bin/env tsx
/**
 * CLI entry point for compendium pack generation
 * Thin wrapper around CompendiumPackGenerator
 */
import { parseArgs } from 'util';
import { CompendiumPackGenerator, GeneratorOptions } from '../5etools-converter/generator/compendium-pack-generator.mjs';

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
        default: 'monsters,spells,backgrounds,items,classes,species,feats'
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
  --content-types <types>      Comma-separated content types (default: monsters,spells,backgrounds,items,classes,species,feats)
  --include-assets             Include image assets (default: true)
  --skip-missing-assets        Skip missing assets instead of warning (default: false)
  -h, --help                   Show help

Available content types: monsters, spells, backgrounds, items, classes, species, feats

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
    contentTypes: (values['content-types'] ?? 'monsters,spells,backgrounds,items,classes,species,feats').split(',').map(s => s.trim()),
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