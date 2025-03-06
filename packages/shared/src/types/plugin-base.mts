import fs from 'fs';
import path from 'path';
import { Router } from 'express';
import { IPlugin, IPluginConfiguration, IServerPlugin, IWebPlugin } from './plugin.mjs';

/**
 * Base Plugin class that implements IPlugin interface
 * Provides default implementations for plugin lifecycle hooks
 */
export abstract class BasePlugin implements IPlugin {
  public config: IPluginConfiguration;

  constructor(pluginDir: string) {
    const configPath = path.join(pluginDir, 'config.json');
    const configContent = fs.readFileSync(configPath, 'utf8');
    this.config = JSON.parse(configContent) as IPluginConfiguration;
  }

  async onLoad(): Promise<void> {
    console.log(`[${this.config.name}] Plugin loaded`);
  }

  async onUnload(): Promise<void> {
    console.log(`[${this.config.name}] Plugin unloaded`);
  }

  async onRegister(): Promise<void> {
    console.log(`[${this.config.name}] Plugin registered`);
  }
}

/**
 * Base class for server-side plugins
 */
export class ServerPlugin extends BasePlugin implements IServerPlugin {
  public router: Router;

  constructor(pluginDir: string) {
    super(pluginDir);
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

/**
 * Base class for web-side plugins
 */
export class WebPlugin extends BasePlugin implements IWebPlugin {
  constructor(pluginDir: string) {
    super(pluginDir);
  }

  async onLoad(): Promise<void> {
    await super.onLoad();
    console.log(`[${this.config.name}] Web plugin loaded`);
  }
} 