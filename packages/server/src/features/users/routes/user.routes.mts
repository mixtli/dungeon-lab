import { Router } from 'express';

import { authenticate } from '../../../middleware/auth.middleware.mjs';
import { UserController } from '../controllers/users.controller.mjs';
import { UserService } from '../services/users.service.mjs';
const router = Router();

router.get('/', authenticate, (req, res) => {
  const userController = new UserController(new UserService());
  userController.getUsers(req, res);
});

export default router;
