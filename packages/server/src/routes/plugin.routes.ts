import { Router } from 'express';
import { PluginController } from '../controllers/plugin.controller.js';

// Create the plugin controller instance
const pluginController = new PluginController();

// Create the router
const pluginRouter = Router();

// Define plugin routes - read only operations
pluginRouter.get('/', pluginController.getAllPlugins);
pluginRouter.get('/:id', pluginController.getPlugin);

// Export the router
export default pluginRouter; 