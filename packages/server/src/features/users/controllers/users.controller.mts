import { UserService } from '../services/users.service.mjs';
import { Request, Response } from 'express';

export class UserController {
  constructor(private userService: UserService) {}

  async getUsers(req: Request, res: Response): Promise<Response | void> {
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
