#!/usr/bin/env tsx

/**
 * Migration Script: Add structured state fields to all documents
 * 
 * Updates documents from state: {} to structured state with standard lifecycle sections.
 * This ensures all documents have the standard turnState, sessionState, encounterState, 
 * and persistentState sections available (as undefined initially).
 * 
 * Safe to run multiple times - only updates documents that need it.
 * 
 * Usage:
 *   npx tsx packages/server/src/scripts/add-structured-document-state.mts
 */

import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dungeon-lab';

async function addStructuredDocumentState() {
  console.log('🔄 Starting structured document state migration...');
  console.log(`📡 Connecting to: ${MONGODB_URI}`);

  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db();
    const documentsCollection = db.collection('documents');

    // Find documents that have empty state object or are missing standard sections
    const documentsNeedingUpdate = await documentsCollection.countDocuments({
      $or: [
        // Documents with empty state object
        { state: {} },
        // Documents missing any standard lifecycle section properties
        { 'state.turnState': { $exists: false } },
        { 'state.sessionState': { $exists: false } },
        { 'state.encounterState': { $exists: false } },
        { 'state.persistentState': { $exists: false } }
      ]
    });

    console.log(`📊 Found ${documentsNeedingUpdate} documents needing structured state update`);

    if (documentsNeedingUpdate === 0) {
      console.log('✅ All documents already have structured state - migration not needed');
      return;
    }

    // Update documents to add missing standard state sections
    // Use $setOnInsert equivalent by only adding fields if they don't exist
    const updates = [
      {
        $set: {
          'state.turnState': {
            $cond: {
              if: { $not: { $ifNull: ['$state.turnState', false] } },
              then: null,
              else: '$state.turnState'
            }
          },
          'state.sessionState': {
            $cond: {
              if: { $not: { $ifNull: ['$state.sessionState', false] } },
              then: null,
              else: '$state.sessionState'
            }
          },
          'state.encounterState': {
            $cond: {
              if: { $not: { $ifNull: ['$state.encounterState', false] } },
              then: null,
              else: '$state.encounterState'
            }
          },
          'state.persistentState': {
            $cond: {
              if: { $not: { $ifNull: ['$state.persistentState', false] } },
              then: null,
              else: '$state.persistentState'
            }
          }
        }
      }
    ];

    const result = await documentsCollection.updateMany(
      {
        $or: [
          { state: {} },
          { 'state.turnState': { $exists: false } },
          { 'state.sessionState': { $exists: false } },
          { 'state.encounterState': { $exists: false } },
          { 'state.persistentState': { $exists: false } }
        ]
      },
      updates
    );

    console.log(`✅ Migration completed successfully:`);
    console.log(`   - Matched documents: ${result.matchedCount}`);
    console.log(`   - Modified documents: ${result.modifiedCount}`);

    // Verify the migration by checking document structure
    const sampleDocs = await documentsCollection.find({}).limit(3).toArray();
    console.log(`📋 Sample document state structures after migration:`);
    
    for (let i = 0; i < Math.min(3, sampleDocs.length); i++) {
      const doc = sampleDocs[i];
      console.log(`   Document ${i + 1}: state keys = [${Object.keys(doc.state || {}).join(', ')}]`);
    }

    // Final verification - count documents with complete structured state
    const documentsWithStructuredState = await documentsCollection.countDocuments({
      'state.turnState': { $exists: true },
      'state.sessionState': { $exists: true },
      'state.encounterState': { $exists: true },
      'state.persistentState': { $exists: true }
    });

    console.log(`✅ Verification: ${documentsWithStructuredState} documents now have complete structured state`);

    const totalDocuments = await documentsCollection.countDocuments({});
    if (documentsWithStructuredState === totalDocuments) {
      console.log('✅ Migration verification passed - all documents have structured state');
    } else {
      console.log(`⚠️  Warning: ${totalDocuments - documentsWithStructuredState} documents may not have complete structured state`);
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await client.close();
    console.log('📡 Disconnected from MongoDB');
  }
}

// Run migration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  addStructuredDocumentState()
    .then(() => {
      console.log('🎉 Structured document state migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Structured document state migration failed:', error);
      process.exit(1);
    });
}

export { addStructuredDocumentState };