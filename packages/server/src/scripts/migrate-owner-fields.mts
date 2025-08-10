#!/usr/bin/env tsx

/**
 * Owner Fields Migration Script
 * 
 * Populates the ownerId field for all existing documents by copying the value from createdBy.
 * This ensures backwards compatibility and proper ownership for all existing data.
 * 
 * Collections migrated:
 * - Documents (characters, actors, items, vtt-documents)
 * - Campaigns
 * - Maps  
 * - Encounters
 * - Tokens (embedded in encounters)
 */

import mongoose from 'mongoose';
import { DocumentModel } from '../features/documents/models/document.model.mjs';
import { CampaignModel } from '../features/campaigns/models/campaign.model.mjs';
import { MapModel } from '../features/maps/models/map.model.mjs';
import { EncounterModel } from '../features/encounters/models/encounter.model.mjs';
import { logger } from '../utils/logger.mjs';
import { config } from '../config/index.mjs';

// Import all models to ensure they're registered
import '../models/user.model.mjs';
import '../features/assets/models/asset.model.mjs';

interface MigrationStats {
  documents: {
    total: number;
    migrated: number;
    skipped: number;
    failed: number;
  };
  campaigns: {
    total: number;
    migrated: number;
    skipped: number;
    failed: number;
  };
  maps: {
    total: number;
    migrated: number;
    skipped: number;
    failed: number;
  };
  encounters: {
    total: number;
    migrated: number;
    skipped: number;
    failed: number;
  };
  tokens: {
    total: number;
    migrated: number;
    skipped: number;
    failed: number;
  };
  errors: Array<{ collection: string; id: string; error: string }>;
}

async function migrateOwnerFields(dryRun = false, verbose = false) {
  const stats: MigrationStats = {
    documents: { total: 0, migrated: 0, skipped: 0, failed: 0 },
    campaigns: { total: 0, migrated: 0, skipped: 0, failed: 0 },
    maps: { total: 0, migrated: 0, skipped: 0, failed: 0 },
    encounters: { total: 0, migrated: 0, skipped: 0, failed: 0 },
    tokens: { total: 0, migrated: 0, skipped: 0, failed: 0 },
    errors: []
  };

  try {
    await mongoose.connect(config.mongoUri);
    logger.info('Connected to database for owner fields migration');

    if (dryRun) {
      logger.info('🔍 DRY RUN MODE - No changes will be made');
    }

    // 1. Migrate Documents collection
    await migrateDocuments(stats, dryRun, verbose);

    // 2. Migrate Campaigns collection
    await migrateCampaigns(stats, dryRun, verbose);

    // 3. Migrate Maps collection
    await migrateMaps(stats, dryRun, verbose);

    // 4. Migrate Encounters collection
    await migrateEncounters(stats, dryRun, verbose);

    // 5. Migrate Tokens (embedded in encounters)
    await migrateTokens(stats, dryRun, verbose);

    // Print final statistics
    printFinalStats(stats, dryRun);

    process.exit(getTotalErrors(stats) > 0 ? 1 : 0);

  } catch (error) {
    logger.error('💥 Fatal error during migration:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

async function migrateDocuments(stats: MigrationStats, dryRun: boolean, verbose: boolean) {
  logger.info('\n📄 Migrating Documents collection...');
  
  try {
    // Find documents with createdBy but without ownerId
    const query = {
      createdBy: { $exists: true, $ne: null },
      $or: [
        { ownerId: { $exists: false } },
        { ownerId: null }
      ]
    };

    const documents = await DocumentModel.find(query).exec();
    stats.documents.total = documents.length;

    logger.info(`Found ${documents.length} documents to migrate`);

    for (const doc of documents) {
      try {
        if (verbose) {
          logger.info(`  Processing ${doc.documentType}: ${doc.name} (${doc.id})`);
        }

        if (!dryRun) {
          await DocumentModel.updateOne(
            { _id: doc._id },
            { $set: { ownerId: doc.createdBy } }
          );
        }

        stats.documents.migrated++;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`  ❌ Failed to migrate document ${doc.id}: ${errorMsg}`);
        stats.documents.failed++;
        stats.errors.push({
          collection: 'documents',
          id: doc.id,
          error: errorMsg
        });
      }
    }

    logger.info(`✅ Documents migration complete: ${stats.documents.migrated} migrated, ${stats.documents.failed} failed`);
  } catch (error) {
    logger.error('❌ Error migrating documents:', error);
  }
}

async function migrateCampaigns(stats: MigrationStats, dryRun: boolean, verbose: boolean) {
  logger.info('\n🎯 Migrating Campaigns collection...');
  
  try {
    const query = {
      createdBy: { $exists: true, $ne: null },
      $or: [
        { ownerId: { $exists: false } },
        { ownerId: null }
      ]
    };

    const campaigns = await CampaignModel.find(query).exec();
    stats.campaigns.total = campaigns.length;

    logger.info(`Found ${campaigns.length} campaigns to migrate`);

    for (const campaign of campaigns) {
      try {
        if (verbose) {
          logger.info(`  Processing campaign: ${campaign.name} (${campaign.id})`);
        }

        if (!dryRun) {
          await CampaignModel.updateOne(
            { _id: campaign._id },
            { $set: { ownerId: campaign.createdBy } }
          );
        }

        stats.campaigns.migrated++;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`  ❌ Failed to migrate campaign ${campaign.id}: ${errorMsg}`);
        stats.campaigns.failed++;
        stats.errors.push({
          collection: 'campaigns',
          id: campaign.id,
          error: errorMsg
        });
      }
    }

    logger.info(`✅ Campaigns migration complete: ${stats.campaigns.migrated} migrated, ${stats.campaigns.failed} failed`);
  } catch (error) {
    logger.error('❌ Error migrating campaigns:', error);
  }
}

async function migrateMaps(stats: MigrationStats, dryRun: boolean, verbose: boolean) {
  logger.info('\n🗺️  Migrating Maps collection...');
  
  try {
    const query = {
      createdBy: { $exists: true, $ne: null },
      $or: [
        { ownerId: { $exists: false } },
        { ownerId: null }
      ]
    };

    const maps = await MapModel.find(query).exec();
    stats.maps.total = maps.length;

    logger.info(`Found ${maps.length} maps to migrate`);

    for (const map of maps) {
      try {
        if (verbose) {
          logger.info(`  Processing map: ${map.name} (${map.id})`);
        }

        if (!dryRun) {
          await MapModel.updateOne(
            { _id: map._id },
            { $set: { ownerId: map.createdBy } }
          );
        }

        stats.maps.migrated++;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`  ❌ Failed to migrate map ${map.id}: ${errorMsg}`);
        stats.maps.failed++;
        stats.errors.push({
          collection: 'maps',
          id: map.id,
          error: errorMsg
        });
      }
    }

    logger.info(`✅ Maps migration complete: ${stats.maps.migrated} migrated, ${stats.maps.failed} failed`);
  } catch (error) {
    logger.error('❌ Error migrating maps:', error);
  }
}

async function migrateEncounters(stats: MigrationStats, dryRun: boolean, verbose: boolean) {
  logger.info('\n⚔️  Migrating Encounters collection...');
  
  try {
    const query = {
      createdBy: { $exists: true, $ne: null },
      $or: [
        { ownerId: { $exists: false } },
        { ownerId: null }
      ]
    };

    const encounters = await EncounterModel.find(query).exec();
    stats.encounters.total = encounters.length;

    logger.info(`Found ${encounters.length} encounters to migrate`);

    for (const encounter of encounters) {
      try {
        if (verbose) {
          logger.info(`  Processing encounter: ${encounter.name} (${encounter.id})`);
        }

        if (!dryRun) {
          await EncounterModel.updateOne(
            { _id: encounter._id },
            { $set: { ownerId: encounter.createdBy } }
          );
        }

        stats.encounters.migrated++;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`  ❌ Failed to migrate encounter ${encounter.id}: ${errorMsg}`);
        stats.encounters.failed++;
        stats.errors.push({
          collection: 'encounters',
          id: encounter.id,
          error: errorMsg
        });
      }
    }

    logger.info(`✅ Encounters migration complete: ${stats.encounters.migrated} migrated, ${stats.encounters.failed} failed`);
  } catch (error) {
    logger.error('❌ Error migrating encounters:', error);
  }
}

async function migrateTokens(stats: MigrationStats, dryRun: boolean, verbose: boolean) {
  logger.info('\n🎭 Migrating Tokens (embedded in encounters)...');
  
  try {
    // Find encounters that have tokens
    const encountersWithTokens = await EncounterModel.find({
      'tokens.0': { $exists: true }
    }).exec();

    logger.info(`Found ${encountersWithTokens.length} encounters with tokens to check`);

    for (const encounter of encountersWithTokens) {
      let encounterModified = false;
      
      if (verbose) {
        logger.info(`  Checking encounter: ${encounter.name} (${encounter.tokens.length} tokens)`);
      }

      for (let i = 0; i < encounter.tokens.length; i++) {
        const token = encounter.tokens[i];
        stats.tokens.total++;

        try {
          // Skip if token already has ownerId
          if (token.ownerId) {
            stats.tokens.skipped++;
            continue;
          }

          // Skip if token has no associated document
          if (!token.documentId) {
            if (verbose) {
              logger.warn(`    Token ${token.name} has no documentId, skipping`);
            }
            stats.tokens.skipped++;
            continue;
          }

          // Look up the associated document
          const document = await DocumentModel.findById(token.documentId).exec();
          if (!document) {
            if (verbose) {
              logger.warn(`    Document ${token.documentId} not found for token ${token.name}`);
            }
            stats.tokens.skipped++;
            continue;
          }

          // Determine ownership: prefer document's ownerId, fallback to createdBy
          const ownerIdToSet = document.ownerId || document.createdBy;
          if (!ownerIdToSet) {
            if (verbose) {
              logger.warn(`    Document ${document.id} has no ownership info for token ${token.name}`);
            }
            stats.tokens.skipped++;
            continue;
          }

          if (verbose) {
            logger.info(`    Setting token ${token.name} ownerId to ${ownerIdToSet}`);
          }

          // Update the token in the array
          encounter.tokens[i].ownerId = ownerIdToSet;
          encounterModified = true;
          stats.tokens.migrated++;

        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          logger.error(`    ❌ Failed to migrate token ${token.name}: ${errorMsg}`);
          stats.tokens.failed++;
          stats.errors.push({
            collection: 'tokens',
            id: `${encounter.id}:${token.id}`,
            error: errorMsg
          });
        }
      }

      // Save the encounter if any tokens were modified
      if (encounterModified && !dryRun) {
        try {
          await encounter.save();
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          logger.error(`  ❌ Failed to save encounter ${encounter.id}: ${errorMsg}`);
          stats.errors.push({
            collection: 'encounters',
            id: encounter.id,
            error: `Failed to save token changes: ${errorMsg}`
          });
        }
      }
    }

    logger.info(`✅ Tokens migration complete: ${stats.tokens.migrated} migrated, ${stats.tokens.skipped} skipped, ${stats.tokens.failed} failed`);
  } catch (error) {
    logger.error('❌ Error migrating tokens:', error);
  }
}

function getTotalErrors(stats: MigrationStats): number {
  return stats.documents.failed + 
         stats.campaigns.failed + 
         stats.maps.failed + 
         stats.encounters.failed + 
         stats.tokens.failed;
}

function getTotalMigrated(stats: MigrationStats): number {
  return stats.documents.migrated + 
         stats.campaigns.migrated + 
         stats.maps.migrated + 
         stats.encounters.migrated + 
         stats.tokens.migrated;
}

function printFinalStats(stats: MigrationStats, dryRun: boolean) {
  logger.info('\n🎉 Migration completed!');
  logger.info('📊 Final Statistics:');
  logger.info('═'.repeat(50));
  
  logger.info(`Documents:  ${stats.documents.migrated.toString().padStart(3)} migrated, ${stats.documents.failed.toString().padStart(3)} failed`);
  logger.info(`Campaigns:  ${stats.campaigns.migrated.toString().padStart(3)} migrated, ${stats.campaigns.failed.toString().padStart(3)} failed`);
  logger.info(`Maps:       ${stats.maps.migrated.toString().padStart(3)} migrated, ${stats.maps.failed.toString().padStart(3)} failed`);
  logger.info(`Encounters: ${stats.encounters.migrated.toString().padStart(3)} migrated, ${stats.encounters.failed.toString().padStart(3)} failed`);
  logger.info(`Tokens:     ${stats.tokens.migrated.toString().padStart(3)} migrated, ${stats.tokens.failed.toString().padStart(3)} failed`);
  logger.info('─'.repeat(50));
  logger.info(`Total:      ${getTotalMigrated(stats).toString().padStart(3)} migrated, ${getTotalErrors(stats).toString().padStart(3)} failed`);

  if (stats.errors.length > 0) {
    logger.warn('\n⚠️  Errors encountered:');
    stats.errors.forEach((error, index) => {
      logger.warn(`${(index + 1).toString().padStart(3)}. [${error.collection}] ${error.id}: ${error.error}`);
    });
  }

  if (dryRun) {
    logger.info('\n🔍 DRY RUN COMPLETE - No actual changes were made');
  } else if (getTotalErrors(stats) === 0) {
    logger.info('\n✅ All records migrated successfully!');
  } else {
    logger.warn(`\n⚠️  Migration completed with ${getTotalErrors(stats)} errors`);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run') || args.includes('-d');
const verbose = args.includes('--verbose') || args.includes('-v');

if (verbose) {
  logger.info('📝 Verbose mode enabled');
}

// Run the migration
migrateOwnerFields(dryRun, verbose);