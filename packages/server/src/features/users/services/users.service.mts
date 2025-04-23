import { UserModel } from '../../../models/user.model.mjs';
import { IUser } from '@dungeon-lab/shared/schemas/user.schema.mjs';

export class UserService {
  constructor() {}

  async getUsers(): Promise<IUser[]> {
    try {
      const users = await UserModel.find();
      return users;
    } catch (error) {
      console.error('Error getting users:', error);
      throw new Error('Failed to get users');
    }
  }
}
