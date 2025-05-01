import { UserService } from '../services/users.service.mjs';
import { Request, Response } from 'express';
import { BaseAPIResponse } from '@dungeon-lab/shared/types/api/index.mjs';
import type { IUser } from '@dungeon-lab/shared/types/index.mjs';

export class UserController {
  constructor(private userService: UserService) {}

  async getUsers(req: Request, res: Response<BaseAPIResponse<IUser[]>>): Promise<Response | void> {
    if (!req.session.user || !req.session.user.isAdmin) {
      return res.status(403).json({ success: false, error: 'Forbidden', data: null });
    }
    try {
      const users = await this.userService.getUsers();
      return res.json({ success: true, data: users });
    } catch (error) {
      console.error('Error in getUsers controller:', error);
      return res.status(500).json({ success: false, error: 'Failed to get users', data: null });
    }
  }
}
