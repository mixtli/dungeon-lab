/**
 * Vite Plugin: Plugin TypeScript Server
 * 
 * This plugin ensures that TypeScript files from the plugins directory are correctly
 * served during development, handling the transformation of .mts files to ensure they
 * can be properly loaded by the browser.
 */
import { Plugin } from 'vite';
import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

// Set up paths for plugin discovery
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PLUGINS_DIR = join(__dirname, '../../../plugins');

export function pluginTsServer(): Plugin {
  return {
    name: 'vite-plugin-plugin-ts-server',
    
    configureServer(server) {
      // Add middleware to serve plugin TypeScript files
      server.middlewares.use(async (req, res, next) => {
        // Check if this is a request for a plugin file
        const pluginsPrefix = '/plugins/';
        if (!req.url || !req.url.startsWith(pluginsPrefix)) {
          return next();
        }
        
        // Extract the plugin path from the URL
        const pluginPath = req.url.substring(pluginsPrefix.length);
        const [pluginId, ...pathParts] = pluginPath.split('/');
        const relativePath = pathParts.join('/');
        
        // Skip if the file isn't a TypeScript file
        if (!relativePath.endsWith('.mts') && !relativePath.endsWith('.ts')) {
          return next();
        }
        
        const fullPath = join(PLUGINS_DIR, pluginId, relativePath);
        console.log(`[Plugin TS Server] 📝 Serving: ${fullPath}`);
        
        try {
          if (!existsSync(fullPath)) {
            console.error(`[Plugin TS Server] ❌ File not found: ${fullPath}`);
            return next();
          }
          
          // Read the TypeScript file
          const content = await readFile(fullPath, 'utf-8');
          
          // Transform the file using Vite's built-in transformers
          const result = await server.transformRequest(
            req.url.startsWith('/') ? req.url : `/${req.url}`,
            { html: false, ssr: false }
          );
          
          if (result) {
            // Set appropriate headers
            res.setHeader('Content-Type', 'application/javascript');
            res.statusCode = 200;
            res.end(result.code);
            return;
          }
          
          // Fallback: just send the TypeScript file as JavaScript
          res.setHeader('Content-Type', 'application/javascript');
          res.statusCode = 200;
          res.end(content);
        } catch (error) {
          console.error(`[Plugin TS Server] ❌ Error serving ${fullPath}:`, error);
          next(error);
        }
      });
    }
  };
} 