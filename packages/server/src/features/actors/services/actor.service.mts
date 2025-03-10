import { Types } from 'mongoose';
import { IActor, IActorCreateData, IActorUpdateData } from '@dungeon-lab/shared/index.mjs';
import { ActorModel } from '../models/actor.model.mjs';
import { logger } from '../../../utils/logger.mjs';

export class ActorService {
  async getAllActors(): Promise<IActor[]> {
    try {
      const actors = await ActorModel.find();
      return actors;
    } catch (error) {
      logger.error('Error fetching actors:', error);
      throw new Error('Failed to get actors');
    }
  }

  async getActorById(id: string): Promise<IActor> {
    try {
      const actor = await ActorModel.findById(id);
      if (!actor) {
        throw new Error('Actor not found');
      }
      return actor;
    } catch (error) {
      logger.error('Error fetching actor:', error);
      throw new Error('Failed to get actor');
    }
  }

  async getActors(campaignId: string): Promise<IActor[]> {
    try {
      const actors = await ActorModel.find({ campaignId });
      return actors;
    } catch (error) {
      logger.error('Error getting actors:', error);
      throw new Error('Failed to get actors');
    }
  }

  async createActor(data: IActorCreateData, userId: string): Promise<IActor> {
    try {
      const userObjectId = new Types.ObjectId(userId);
      const actorData = {
        ...data,
        createdBy: userObjectId,
        updatedBy: userObjectId
      };

      const actor = await ActorModel.create(actorData);
      return actor;
    } catch (error) {
      logger.error('Error creating actor:', error);
      throw new Error('Failed to create actor');
    }
  }

  async updateActor(id: string, data: IActorUpdateData, userId: string): Promise<IActor> {
    try {
      const actor = await ActorModel.findById(id);
      if (!actor) {
        throw new Error('Actor not found');
      }

      const userObjectId = new Types.ObjectId(userId);
      const updateData = {
        ...data,
        updatedBy: userObjectId
      };

      const updatedActor = await ActorModel.findByIdAndUpdate(
        id,
        updateData,
        { new: true }
      );

      if (!updatedActor) {
        throw new Error('Failed to update actor');
      }

      return updatedActor;
    } catch (error) {
      logger.error('Error updating actor:', error);
      throw new Error('Failed to update actor');
    }
  }

  async deleteActor(id: string): Promise<void> {
    try {
      const actor = await ActorModel.findByIdAndDelete(id);
      if (!actor) {
        throw new Error('Actor not found');
      }
    } catch (error) {
      logger.error('Error deleting actor:', error);
      throw new Error('Failed to delete actor');
    }
  }

  async checkUserPermission(actorId: string, userId: string, isAdmin: boolean): Promise<boolean> {
    try {
      const actor = await ActorModel.findById(actorId);
      if (!actor) {
        throw new Error('Actor not found');
      }

      return actor.createdBy.toString() === userId || isAdmin;
    } catch (error) {
      logger.error('Error checking user permission:', error);
      throw new Error('Failed to check user permission');
    }
  }
} 