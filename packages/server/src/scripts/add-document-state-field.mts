#!/usr/bin/env tsx

/**
 * Migration Script: Add state field with standard sections to all documents
 * 
 * Adds a state object with standard lifecycle sections to all existing documents.
 * Sets up the standard fields (turnState, sessionState, encounterState, persistentState)
 * with undefined values to match the new schema structure.
 * 
 * This is safe to run multiple times - it only updates documents that need it.
 * 
 * Usage:
 *   npx tsx packages/server/src/scripts/add-document-state-field.mts
 */

import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dungeon-lab';

async function addDocumentStateField() {
  console.log('🔄 Starting document state field migration...');
  console.log(`📡 Connecting to: ${MONGODB_URI}`);

  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db();
    const documentsCollection = db.collection('documents');

    // Standard state structure with defined lifecycle sections
    const standardStateStructure = {
      turnState: undefined,
      sessionState: undefined,
      encounterState: undefined,
      persistentState: undefined
    };

    // Find documents that need state field updates
    const documentsNeedingUpdate = await documentsCollection.countDocuments({
      $or: [
        { state: { $exists: false } },
        { 'state.turnState': { $exists: false } },
        { 'state.sessionState': { $exists: false } },
        { 'state.encounterState': { $exists: false } },
        { 'state.persistentState': { $exists: false } }
      ]
    });

    console.log(`📊 Found ${documentsNeedingUpdate} documents needing state structure update`);

    if (documentsNeedingUpdate === 0) {
      console.log('✅ All documents already have proper state structure - migration not needed');
      return;
    }

    // Update documents to have standard state structure
    // This preserves existing state fields while adding missing standard ones
    const result = await documentsCollection.updateMany(
      {
        $or: [
          { state: { $exists: false } },
          { 'state.turnState': { $exists: false } },
          { 'state.sessionState': { $exists: false } },
          { 'state.encounterState': { $exists: false } },
          { 'state.persistentState': { $exists: false } }
        ]
      },
      { 
        $set: {
          'state.turnState': undefined,
          'state.sessionState': undefined,
          'state.encounterState': undefined,
          'state.persistentState': undefined
        }
      }
    );

    console.log(`✅ Migration completed successfully:`);
    console.log(`   - Matched documents: ${result.matchedCount}`);
    console.log(`   - Modified documents: ${result.modifiedCount}`);

    // Verify the migration
    const remainingDocumentsNeedingUpdate = await documentsCollection.countDocuments({
      $or: [
        { state: { $exists: false } },
        { 'state.turnState': { $exists: false } },
        { 'state.sessionState': { $exists: false } },
        { 'state.encounterState': { $exists: false } },
        { 'state.persistentState': { $exists: false } }
      ]
    });

    if (remainingDocumentsNeedingUpdate === 0) {
      console.log('✅ Verification passed - all documents now have proper state structure');
    } else {
      console.log(`⚠️  Warning: ${remainingDocumentsNeedingUpdate} documents still need state structure updates`);
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
  addDocumentStateField()
    .then(() => {
      console.log('🎉 Document state structure migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Document state structure migration failed:', error);
      process.exit(1);
    });
}

export { addDocumentStateField };