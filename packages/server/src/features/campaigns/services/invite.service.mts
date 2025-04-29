import { IInvite } from '@dungeon-lab/shared/types/index.mjs';
import { FilterQuery, Types } from 'mongoose';
import { UserModel } from '../../../models/user.model.mjs';
import { InviteModel } from '../models/invite.model.mjs';
import { CampaignService } from './campaign.service.mjs';
import type { InviteStatusType } from '@dungeon-lab/shared/types/index.mjs';

export class InviteService {
  constructor(private campaignService: CampaignService) {}

  async getInvites(campaignId?: string): Promise<IInvite[]> {
    const query: FilterQuery<IInvite> = {};
    if (campaignId) {
      query.campaignId = new Types.ObjectId(campaignId);
    }
    const invites = await InviteModel.find(query).lean();
    return invites as IInvite[];
  }

  async getInvite(id: string): Promise<IInvite> {
    const invite = await InviteModel.findById(id).lean();
    if (!invite) {
      throw new Error('Invite not found');
    }
    return invite as IInvite;
  }

  async getMyInvites(userId: string): Promise<IInvite[]> {
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    const invites = await InviteModel.find({ email: user.email, status: 'pending' })
      .populate({
        path: 'campaignId',
        select: 'name gameSystemId'
      })
      .populate({
        path: 'createdBy',
        select: 'email'
      });
    console.log('got invites', invites);
    return invites as IInvite[];
  }

  async createInvite(data: IInvite, campaignId: string, userId: string): Promise<IInvite> {
    // Check if campaign exists and user has permission
    const hasAccess = await this.campaignService.checkUserPermission(
      campaignId,
      userId,
      false // Only game master can create invites
    );

    if (!hasAccess) {
      throw new Error('Only the game master can create invites');
    }

    // Check if invited user exists
    const invitedUser = await UserModel.findOne({ email: data.email });
    if (!invitedUser) {
      throw new Error('Invited user not found');
    }

    // Check if user is already a member of the campaign
    const isAlreadyMember = await this.campaignService.isUserCampaignMember(
      campaignId,
      invitedUser.id
    );
    if (isAlreadyMember) {
      throw new Error('User is already a member of this campaign');
    }

    // Check if there's already a pending invite
    const existingInvite = await InviteModel.findOne({
      campaignId: new Types.ObjectId(campaignId),
      email: data.email,
      status: 'pending'
    });

    if (existingInvite) {
      throw new Error('User already has a pending invite for this campaign');
    }

    const invite = await InviteModel.create({
      ...data,
      campaignId: new Types.ObjectId(campaignId),
      createdBy: userId,
      updatedBy: userId
    });

    return invite.toObject() as IInvite;
  }

  async respondToInvite(
    id: string,
    status: InviteStatusType,
    userId: string,
    actorId?: string
  ): Promise<IInvite> {
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const invite = await InviteModel.findOne({
      _id: new Types.ObjectId(id),
      email: user.email,
      status: 'pending'
    });

    if (!invite) {
      throw new Error('Invite not found or already processed');
    }

    if (status === 'accepted') {
      if (!actorId) {
        throw new Error('Actor ID is required when accepting an invite');
      }

      // Add actor to campaign members (not the user)
      const campaign = await this.campaignService.getCampaign(invite.campaignId.toString());

      // Check if the actor already exists in members
      if (!campaign.members.includes(actorId)) {
        await this.campaignService.updateCampaign(
          invite.campaignId.toString(),
          {
            members: [...campaign.members, actorId] // Add actor, not user
          },
          userId
        );
      }
    }

    invite.status = status;
    invite.updatedBy = userId;
    await invite.save();

    return invite.toObject() as IInvite;
  }

  async checkUserPermission(inviteId: string, userId: string, isAdmin: boolean): Promise<boolean> {
    const invite = await InviteModel.findById(inviteId).populate('campaignId');

    if (!invite) {
      throw new Error('Invite not found');
    }

    // Admin can access all invites
    if (isAdmin) {
      return true;
    }

    // User can access their own invites
    const user = await UserModel.findById(userId);
    if (user && invite.email === user.email) {
      return true;
    }

    // Campaign game master can access campaign invites
    const campaign = await this.campaignService.getCampaign(invite.campaignId.toString());
    return campaign.gameMasterId === userId;
  }
}
