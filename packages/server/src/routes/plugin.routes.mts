import { Router } from 'express';
import { PluginController } from '../controllers/plugin.controller.mjs';

// Create the plugin controller instance
const pluginController = new PluginController();

// Create the router
const pluginRouter = Router();

// Define plugin routes - read only operations
pluginRouter.get('/', pluginController.getAllPlugins);
pluginRouter.get('/:id', pluginController.getPlugin);
pluginRouter.get('/:id/code/:file', pluginController.getPluginCode);

// Export the router
export default pluginRouter;
