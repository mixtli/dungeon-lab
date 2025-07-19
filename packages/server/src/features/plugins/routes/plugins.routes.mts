import { Router } from 'express';
import { PluginsController } from '../controllers/plugins.controller.mjs';
import { authenticate } from '../../../middleware/auth.middleware.mjs';

const router = Router();
const pluginsController = new PluginsController();

// Apply authentication middleware to all plugin routes
router.use(authenticate);

// GET /api/plugins - Get all plugins
router.get('/', (req, res) => pluginsController.getPlugins(req, res));

// GET /api/plugins/:pluginId - Get a specific plugin
router.get('/:pluginId', (req, res) => pluginsController.getPlugin(req, res));

export default router;