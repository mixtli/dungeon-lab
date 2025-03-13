import { Router } from 'express';
import { IServerPlugin, IPluginConfiguration } from '../types/plugin.mjs';
import { BasePlugin } from './plugin.mjs';

/**
 * Base class for server-side plugins
 * This class should only be used in Node.js environments
 */
export class ServerPlugin extends BasePlugin implements IServerPlugin {
  public router: Router;

  constructor(config: IPluginConfiguration) {
    super(config);
    this.router = Router();

    // Set up default info endpoint
    this.router.get('/info', (_, res) => {
      res.json({
        id: this.config.id,
        name: this.config.name,
        version: this.config.version,
        description: this.config.description,
        author: this.config.author,
        website: this.config.website,
        type: this.config.type,
        enabled: this.config.enabled
      });
    });
  }

  async onLoad(): Promise<void> {
    await super.onLoad();
    console.log(`[${this.config.name}] Server plugin loaded`);
  }
} 