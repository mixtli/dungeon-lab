import mongoose from 'mongoose';
import { ActorModel } from '../features/actors/models/actor.model.mjs';
import { generateCharacterImages } from '../utils/character-image-generator.mjs';
import { logger } from '../utils/logger.mjs';
import { config } from '../config/index.mjs';

async function main(actorId: string) {
  try {
    // Connect to MongoDB
    await mongoose.connect(config.mongoUri);
    logger.info('Connected to database');

    // Find the actor
    const actor = await ActorModel.findById(actorId);
    if (!actor) {
      throw new Error(`Actor not found with ID: ${actorId}`);
    }

    // Generate images
    const { avatar, token } = await generateCharacterImages(actor);

    // Update actor with new images
    await ActorModel.findByIdAndUpdate(actorId, {
      avatar,
      token,
      updatedBy: actor.createdBy // Use the original creator as the updater
    });

    logger.info('Successfully generated and saved character images');
    process.exit(0);
  } catch (error) {
    logger.error('Error generating character images:', error);
    process.exit(1);
  }
}

// Get actor ID from command line arguments
const actorId = process.argv[2];
if (!actorId) {
  logger.error('Please provide an actor ID as a command line argument');
  process.exit(1);
}

// Run the script
main(actorId); 