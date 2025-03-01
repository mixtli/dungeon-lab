import { PluginModel } from '../models/plugin.model.js';
import { GameSystemModel } from '../models/game-system.model.js';
import { logger } from '../utils/logger.js';
/**
 * Plugin controller class
 */
export class PluginController {
    /**
     * Get all plugins
     */
    async getAllPlugins(req, res) {
        try {
            const plugins = await PluginModel.find()
                .populate('gameSystemId')
                .sort({ name: 1 });
            res.json(plugins);
        }
        catch (error) {
            logger.error('Error getting plugins:', error);
            res.status(500).json({
                message: 'Error retrieving plugins',
                error: error instanceof Error ? error.message : String(error)
            });
        }
    }
    /**
     * Get plugin by ID
     */
    async getPlugin(req, res) {
        try {
            const plugin = await PluginModel.findById(req.params.id)
                .populate('gameSystemId');
            if (!plugin) {
                res.status(404).json({ message: 'Plugin not found' });
                return;
            }
            res.json(plugin);
        }
        catch (error) {
            logger.error(`Error getting plugin ${req.params.id}:`, error);
            res.status(500).json({
                message: 'Error retrieving plugin',
                error: error instanceof Error ? error.message : String(error)
            });
        }
    }
    /**
     * Register a new plugin
     */
    async registerPlugin(req, res) {
        try {
            const pluginData = req.body;
            // If the plugin is a game system plugin, create a game system
            if (pluginData.type === 'gameSystem' && pluginData.gameSystem) {
                // Create the game system first
                const gameSystem = await GameSystemModel.create({
                    name: pluginData.gameSystem.name,
                    version: pluginData.gameSystem.version,
                    description: pluginData.gameSystem.description,
                    author: pluginData.author,
                    actorTypes: pluginData.gameSystem.actorTypes || [],
                    itemTypes: pluginData.gameSystem.itemTypes || [],
                    createdBy: req.user?.id,
                    updatedBy: req.user?.id,
                });
                // Add the game system ID to the plugin data
                pluginData.gameSystemId = gameSystem.id;
            }
            // Add user info
            if (req.user) {
                pluginData.createdBy = req.user.id;
                pluginData.updatedBy = req.user.id;
            }
            // Create the plugin
            const plugin = await PluginModel.create(pluginData);
            // Return the new plugin with populated game system
            const populatedPlugin = await PluginModel.findById(plugin.id)
                .populate('gameSystemId');
            res.status(201).json(populatedPlugin);
        }
        catch (error) {
            logger.error('Error registering plugin:', error);
            res.status(500).json({
                message: 'Error registering plugin',
                error: error instanceof Error ? error.message : String(error)
            });
        }
    }
    /**
     * Update plugin
     */
    async updatePlugin(req, res) {
        try {
            const pluginData = req.body;
            // Add user info
            if (req.user) {
                pluginData.updatedBy = req.user.id;
            }
            const plugin = await PluginModel.findByIdAndUpdate(req.params.id, { $set: pluginData }, { new: true, runValidators: true }).populate('gameSystemId');
            if (!plugin) {
                res.status(404).json({ message: 'Plugin not found' });
                return;
            }
            res.json(plugin);
        }
        catch (error) {
            logger.error(`Error updating plugin ${req.params.id}:`, error);
            res.status(500).json({
                message: 'Error updating plugin',
                error: error instanceof Error ? error.message : String(error)
            });
        }
    }
    /**
     * Enable plugin
     */
    async enablePlugin(req, res) {
        try {
            const plugin = await PluginModel.findByIdAndUpdate(req.params.id, {
                $set: {
                    enabled: true,
                    updatedBy: req.user?.id
                }
            }, { new: true }).populate('gameSystemId');
            if (!plugin) {
                res.status(404).json({ message: 'Plugin not found' });
                return;
            }
            res.json(plugin);
        }
        catch (error) {
            logger.error(`Error enabling plugin ${req.params.id}:`, error);
            res.status(500).json({
                message: 'Error enabling plugin',
                error: error instanceof Error ? error.message : String(error)
            });
        }
    }
    /**
     * Disable plugin
     */
    async disablePlugin(req, res) {
        try {
            const plugin = await PluginModel.findByIdAndUpdate(req.params.id, {
                $set: {
                    enabled: false,
                    updatedBy: req.user?.id
                }
            }, { new: true }).populate('gameSystemId');
            if (!plugin) {
                res.status(404).json({ message: 'Plugin not found' });
                return;
            }
            res.json(plugin);
        }
        catch (error) {
            logger.error(`Error disabling plugin ${req.params.id}:`, error);
            res.status(500).json({
                message: 'Error disabling plugin',
                error: error instanceof Error ? error.message : String(error)
            });
        }
    }
    /**
     * Unregister (delete) plugin
     */
    async unregisterPlugin(req, res) {
        try {
            const plugin = await PluginModel.findById(req.params.id);
            if (!plugin) {
                res.status(404).json({ message: 'Plugin not found' });
                return;
            }
            // If this is a game system plugin, delete the game system too
            if (plugin.type === 'gameSystem' && plugin.gameSystemId) {
                await GameSystemModel.findByIdAndDelete(plugin.gameSystemId);
            }
            await PluginModel.findByIdAndDelete(req.params.id);
            res.status(204).send();
        }
        catch (error) {
            logger.error(`Error unregistering plugin ${req.params.id}:`, error);
            res.status(500).json({
                message: 'Error unregistering plugin',
                error: error instanceof Error ? error.message : String(error)
            });
        }
    }
}
//# sourceMappingURL=plugin.controller.js.map