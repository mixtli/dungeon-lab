import mongoose from 'mongoose';
import { logger } from '../utils/logger.mjs';
import { config } from '../config/index.mjs';

// Import all models to ensure they're registered
import '../models/user.model.mjs';
import '../features/assets/models/asset.model.mjs';
import '../features/documents/models/document.model.mjs';

interface FieldMigrationStats {
  documentsChecked: number;
  documentsUpdated: number;
  documentsFailed: number;
  errors: Array<{ documentId: string; error: string }>;
}

/**
 * Migrate field names in the documents collection:
 * - defaultTokenImageId → tokenImageId
 */
async function migrateFieldNames(dryRun = false) {
  const stats: FieldMigrationStats = {
    documentsChecked: 0,
    documentsUpdated: 0,
    documentsFailed: 0,
    errors: []
  };

  try {
    await mongoose.connect(config.mongoUri);
    logger.info('Connected to database for field name migration');

    if (dryRun) {
      logger.info('🔍 DRY RUN MODE - No changes will be made');
    }

    // Get documents collection directly for field updates
    const documentsCollection = mongoose.connection.db?.collection('documents');
    if (!documentsCollection) {
      throw new Error('Could not access documents collection');
    }

    // Find all documents that have the old field name
    const documentsWithOldField = await documentsCollection.find({
      'defaultTokenImageId': { $exists: true }
    }).toArray();

    stats.documentsChecked = documentsWithOldField.length;
    
    logger.info(`Found ${documentsWithOldField.length} documents with 'defaultTokenImageId' field`);

    if (documentsWithOldField.length === 0) {
      logger.info('No documents found with old field names - migration complete');
      return stats;
    }

    // Process each document
    for (const doc of documentsWithOldField) {
      try {
        const documentId = doc._id.toString();
        logger.info(`Processing document: ${documentId} (${doc.name || 'Unnamed'}) - ${doc.documentType}`);

        if (dryRun) {
          logger.info(`  🔍 Would rename defaultTokenImageId (${doc.defaultTokenImageId}) to tokenImageId`);
          stats.documentsUpdated++;
          continue;
        }

        // Update the document: rename the field and remove the old one
        const updateResult = await documentsCollection.updateOne(
          { _id: doc._id },
          {
            $set: {
              tokenImageId: doc.defaultTokenImageId
            },
            $unset: {
              defaultTokenImageId: ""
            }
          }
        );

        if (updateResult.modifiedCount > 0) {
          logger.info(`  ✅ Updated document ${documentId}: defaultTokenImageId → tokenImageId`);
          stats.documentsUpdated++;
        } else {
          logger.warn(`  ⚠️  No changes made to document ${documentId}`);
        }

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`  ❌ Failed to update document ${doc._id}: ${errorMsg}`);
        stats.documentsFailed++;
        stats.errors.push({
          documentId: doc._id.toString(),
          error: errorMsg
        });
      }
    }

    // Print final statistics
    logger.info('🎉 Field name migration completed!');
    logger.info('📊 Migration Statistics:');
    logger.info(`  Documents checked: ${stats.documentsChecked}`);
    logger.info(`  Documents updated: ${stats.documentsUpdated}`);
    logger.info(`  Documents failed: ${stats.documentsFailed}`);

    if (stats.errors.length > 0) {
      logger.warn('⚠️  Errors encountered:');
      for (const error of stats.errors) {
        logger.warn(`  - ${error.documentId}: ${error.error}`);
      }
    }

    if (dryRun) {
      logger.info('🔍 DRY RUN COMPLETE - No actual changes were made');
    }

    process.exit(stats.documentsFailed > 0 ? 1 : 0);

  } catch (error) {
    logger.error('💥 Fatal error during field name migration:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run') || args.includes('-d');

// Run the migration
migrateFieldNames(dryRun);