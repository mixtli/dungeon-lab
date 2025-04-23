import { UserService } from '../services/users.service.mjs';
import { Response } from 'express';
import { AuthenticatedRequest } from '../../../middleware/auth.middleware.mjs';

export class UserController {
  constructor(private userService: UserService) {}

  async getUsers(req: AuthenticatedRequest, res: Response): Promise<Response | void> {
    if (!req.session.user || !req.session.user.isAdmin) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    try {
      const users = await this.userService.getUsers();
      return res.json(users);
    } catch (error) {
      console.error('Error in getUsers controller:', error);
      return res.status(500).json({ message: 'Failed to get users' });
    }
  }
}
