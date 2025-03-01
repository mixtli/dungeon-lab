import { Router } from 'express';
import { PluginController } from '../controllers/plugin.controller.js';
// Create the plugin controller instance
const pluginController = new PluginController();
// Create the router
const pluginRouter = Router();
// Define plugin routes
pluginRouter.get('/', pluginController.getAllPlugins);
pluginRouter.get('/:id', pluginController.getPlugin);
pluginRouter.post('/', pluginController.registerPlugin);
pluginRouter.put('/:id', pluginController.updatePlugin);
pluginRouter.put('/:id/enable', pluginController.enablePlugin);
pluginRouter.put('/:id/disable', pluginController.disablePlugin);
pluginRouter.delete('/:id', pluginController.unregisterPlugin);
// Export the router
export default pluginRouter;
//# sourceMappingURL=plugin.routes.js.map