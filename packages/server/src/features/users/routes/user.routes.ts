import { Router } from 'express';

import { authenticate } from '../../../middleware/auth.middleware.js';
import { UserController } from '../controllers/users.controller.js';
import { UserService } from '../services/users.service.js';
const router = Router();

router.get('/', authenticate, (req, res) => {
  const userController = new UserController(new UserService());
  userController.getUsers(req, res);
});

export default router;
