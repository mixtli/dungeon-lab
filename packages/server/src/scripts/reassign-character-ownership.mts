#!/usr/bin/env tsx

/**
 * Character Ownership Reassignment Script
 * 
 * Reassigns character ownership to alternating between two test users:
 * - test1@dungeonlab.com
 * - test2@dungeonlab.com
 */

import mongoose from 'mongoose';
import { DocumentModel } from '../features/documents/models/document.model.mjs';
import { UserModel } from '../models/user.model.mjs';

interface ReassignmentResult {
  charactersProcessed: number;
  user1Characters: number;
  user2Characters: number;
  errors: string[];
}

class CharacterOwnershipReassigner {
  private dryRun: boolean = false;
  
  constructor(dryRun = false) {
    this.dryRun = dryRun;
  }

  async connectToDatabase(): Promise<void> {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is required');
    }

    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async findUsers(): Promise<{ user1: any, user2: any }> {
    console.log('👥 Looking for test users...');
    
    const user1 = await UserModel.findOne({ email: 'test1@dungeonlab.com' });
    const user2 = await UserModel.findOne({ email: 'test2@dungeonlab.com' });
    
    if (!user1) {
      throw new Error('User test1@dungeonlab.com not found');
    }
    
    if (!user2) {
      throw new Error('User test2@dungeonlab.com not found');
    }
    
    console.log(`✅ Found user1: ${user1.username || user1.email} (ID: ${user1._id})`);
    console.log(`✅ Found user2: ${user2.username || user2.email} (ID: ${user2._id})`);
    
    return { user1, user2 };
  }

  async reassignCharacters(): Promise<ReassignmentResult> {
    const result: ReassignmentResult = {
      charactersProcessed: 0,
      user1Characters: 0,
      user2Characters: 0,
      errors: []
    };

    try {
      // Find users
      const { user1, user2 } = await this.findUsers();
      
      // Find all character documents
      console.log('🔍 Finding all character documents...');
      const characters = await DocumentModel.find({
        documentType: 'character'
      }).sort({ name: 1 }); // Sort by name for consistent ordering
      
      console.log(`📋 Found ${characters.length} character documents`);
      
      if (characters.length === 0) {
        console.log('⚠️  No characters found to reassign');
        return result;
      }

      console.log('\n🔄 Starting character reassignment...');
      console.log('=' .repeat(60));
      
      // Reassign characters alternating between users
      for (let i = 0; i < characters.length; i++) {
        const character = characters[i];
        const isEven = i % 2 === 0;
        const targetUser = isEven ? user1 : user2;
        const userLabel = isEven ? 'test1@dungeonlab.com' : 'test2@dungeonlab.com';
        
        try {
          console.log(`${(i + 1).toString().padStart(2)}. ${character.name.padEnd(20)} → ${userLabel}`);
          
          if (!this.dryRun) {
            await DocumentModel.updateOne(
              { _id: character._id },
              {
                $set: {
                  createdBy: targetUser._id.toString(),
                  updatedBy: targetUser._id.toString()
                }
              }
            );
          } else {
            console.log(`   🔍 [DRY RUN] Would assign to ${userLabel}`);
          }
          
          if (isEven) {
            result.user1Characters++;
          } else {
            result.user2Characters++;
          }
          
          result.charactersProcessed++;
          
        } catch (error) {
          const errorMsg = `Failed to reassign character ${character.name}: ${error}`;
          result.errors.push(errorMsg);
          console.error(`   ❌ ${errorMsg}`);
        }
      }
      
    } catch (error) {
      const errorMsg = `Failed during character reassignment: ${error}`;
      result.errors.push(errorMsg);
      console.error(`❌ ${errorMsg}`);
    }

    return result;
  }

  async run(): Promise<ReassignmentResult> {
    let result: ReassignmentResult = {
      charactersProcessed: 0,
      user1Characters: 0,
      user2Characters: 0,
      errors: []
    };

    try {
      // Connect to database
      await this.connectToDatabase();

      // Perform reassignment
      result = await this.reassignCharacters();

      // Summary
      console.log('\n📊 Reassignment Summary:');
      console.log('=' .repeat(50));
      console.log(`Characters processed: ${result.charactersProcessed}`);
      console.log(`test1@dungeonlab.com: ${result.user1Characters} characters`);
      console.log(`test2@dungeonlab.com: ${result.user2Characters} characters`);
      console.log(`Errors: ${result.errors.length}`);
      
      if (result.errors.length > 0) {
        console.log('\n❌ Errors encountered:');
        result.errors.forEach((error, index) => {
          console.log(`${index + 1}. ${error}`);
        });
      }

      if (result.errors.length === 0) {
        console.log(`\n✅ ${this.dryRun ? 'Dry run completed' : 'Character reassignment completed'} successfully!`);
      } else {
        console.log(`\n⚠️  Reassignment completed with ${result.errors.length} errors`);
      }

    } catch (error) {
      console.error(`💥 Fatal error during reassignment: ${error}`);
      throw error;
    } finally {
      await mongoose.disconnect();
      console.log('🔌 Disconnected from MongoDB');
    }

    return result;
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run') || args.includes('-d');
  
  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made to the database');
  }

  const reassigner = new CharacterOwnershipReassigner(dryRun);
  
  try {
    await reassigner.run();
    process.exit(0);
  } catch (error) {
    console.error('\n💥 Character reassignment failed:', error);
    process.exit(1);
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}