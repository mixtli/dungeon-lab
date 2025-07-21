#!/usr/bin/env node
import { Command } from 'commander';
import ora from 'ora';
import path from 'path';
import fs from 'fs/promises';
import { FoundryConverter } from './index.mjs';
import { logger } from './utils/logger.mjs';

const program = new Command();

program
  .name('foundry-converter')
  .description('Convert Foundry VTT packs to Dungeon Lab format')
  .version('1.0.0')
  .requiredOption('-i, --input <path>', 'Input directory (Foundry pack or packs directory)')
  .requiredOption('-o, --output <path>', 'Output directory for converted pack')
  .requiredOption('-s, --system <id>', 'Game system plugin ID (e.g., dnd-5e-2024)')
  .option('-a, --all', 'Convert all packs in input directory', false)
  .option('--no-assets', 'Skip asset processing')
  .option('--validate', 'Enable validation against schemas', false)
  .option('--no-validate', 'Skip validation against schemas')
  .option('-v, --verbose', 'Enable verbose logging', false)
  .option('--dry-run', 'Preview without writing files', false)
  .action(async (options) => {
    if (options.verbose) {
      (logger as { setVerbose: (verbose: boolean) => void }).setVerbose(true);
    }

    const spinner = ora();

    try {
      // Validate input path exists
      const inputPath = path.resolve(options.input);
      try {
        await fs.access(inputPath);
      } catch {
        logger.error(`Input path does not exist: ${inputPath}`);
        process.exit(1);
      }

      // Create output directory if it doesn't exist
      const outputPath = path.resolve(options.output);
      if (!options.dryRun) {
        await fs.mkdir(outputPath, { recursive: true });
      }

      // Initialize converter
      spinner.start('Initializing converter...');
      const converter = new FoundryConverter({
        systemId: options.system,
        processAssets: options.assets,
        validate: options.validate && !options.noValidate,
        dryRun: options.dryRun,
        verbose: options.verbose
      });

      // Load plugin
      await converter.loadPlugin();
      spinner.succeed('Plugin loaded successfully');

      // Determine packs to convert
      const packsToConvert: string[] = [];
      const stats = await fs.stat(inputPath);

      if (stats.isDirectory()) {
        if (options.all) {
          // Convert all subdirectories
          const entries = await fs.readdir(inputPath, { withFileTypes: true });
          for (const entry of entries) {
            if (entry.isDirectory()) {
              packsToConvert.push(path.join(inputPath, entry.name));
            }
          }
        } else {
          // Check if this is a pack directory (contains .ldb files)
          const files = await fs.readdir(inputPath);
          const hasLdbFiles = files.some(f => f.endsWith('.ldb'));
          if (hasLdbFiles) {
            packsToConvert.push(inputPath);
          } else {
            logger.error('Input directory does not contain .ldb files. Use --all to convert all subdirectories.');
            process.exit(1);
          }
        }
      } else {
        logger.error('Input must be a directory');
        process.exit(1);
      }

      if (packsToConvert.length === 0) {
        logger.error('No packs found to convert');
        process.exit(1);
      }

      logger.info(`Found ${packsToConvert.length} pack(s) to convert`);

      // Convert each pack
      for (const packPath of packsToConvert) {
        const packName = path.basename(packPath);
        const packOutputPath = options.all 
          ? path.join(outputPath, packName)
          : outputPath;

        spinner.start(`Converting pack: ${packName}`);

        try {
          const result = await converter.convertPack(packPath, packOutputPath);
          
          spinner.succeed(`Converted ${packName}: ${result.stats.total} documents`);
          
          logger.info(`  - Actors: ${result.stats.actors}`);
          logger.info(`  - Items: ${result.stats.items}`);
          logger.info(`  - Documents: ${result.stats.documents}`);
          if (options.assets) {
            logger.info(`  - Assets: ${result.stats.assets}`);
          }
          if (result.stats.skipped > 0) {
            logger.warn(`  - Skipped: ${result.stats.skipped}`);
          }
          if (result.stats.errors > 0) {
            logger.error(`  - Errors: ${result.stats.errors}`);
          }
        } catch (error) {
          spinner.fail(`Failed to convert ${packName}`);
          logger.error(error instanceof Error ? error.message : String(error));
          if (options.verbose && error instanceof Error) {
            console.error(error.stack);
          }
        }
      }

      logger.success('\\nConversion complete!');
      if (options.dryRun) {
        logger.info('(Dry run - no files were written)');
      }

    } catch (error) {
      spinner.fail('Conversion failed');
      logger.error(error instanceof Error ? error.message : String(error));
      if (options.verbose && error instanceof Error) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  });

program.parse();