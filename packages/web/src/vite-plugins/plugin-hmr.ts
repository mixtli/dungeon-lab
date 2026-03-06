import type { Plugin as VitePlugin } from 'vite';
import path from 'path';
import fs from 'fs';

/**
 * Vite plugin for enhanced plugin hot module reload
 */
export function pluginHMR(): VitePlugin {
  return {
    name: 'dungeon-lab-plugin-hmr',
    
    configureServer(server) {
      // Watch plugin directories for changes
      const pluginDirs = [
        path.resolve(__dirname, '../../../plugins'),
        path.resolve(__dirname, '../../../../plugins')
      ];
      
      for (const dir of pluginDirs) {
        if (fs.existsSync(dir)) {
          server.watcher.add(path.join(dir, '**/*.{vue,ts,mts,js,mjs}'));
          console.log(`[Plugin HMR] Watching plugin directory: ${dir}`);
        }
      }
      
      // Handle plugin file changes
      server.watcher.on('change', (file) => {
        if (file.includes('/plugins/')) {
          console.log(`[Plugin HMR] Plugin file changed: ${file}`);
          
          // Send custom HMR update
          server.ws.send({
            type: 'custom',
            event: 'plugin-changed',
            data: {
              file,
              timestamp: Date.now()
            }
          });
        }
      });
    },
    
    handleHotUpdate(ctx) {
      // Handle plugin file updates
      if (ctx.file.includes('/plugins/')) {
        console.log(`[Plugin HMR] Hot updating plugin file: ${ctx.file}`);
        
        // Send plugin-specific update
        ctx.server.ws.send({
          type: 'custom',
          event: 'plugin-hot-update',
          data: {
            file: ctx.file,
            timestamp: Date.now()
          }
        });
        
        // Return empty array to prevent default HMR
        return [];
      }
    },
    
    transformIndexHtml(html) {
      // Inject plugin HMR client code in development
      if (process.env.NODE_ENV === 'development') {
        return html.replace(
          '<head>',
          `<head>
          <script>
            // Plugin HMR client code
            if (import.meta.hot) {
              import.meta.hot.on('plugin-changed', (data) => {
                console.log('Plugin file changed:', data.file);
                // Trigger plugin reload if registry is available
                if (window.__PLUGIN_REGISTRY__) {
                  window.__PLUGIN_REGISTRY__.handleFileChange(data.file);
                }
              });
              
              import.meta.hot.on('plugin-hot-update', (data) => {
                console.log('Plugin hot update:', data.file);
                // Trigger plugin hot reload if registry is available
                if (window.__PLUGIN_REGISTRY__) {
                  window.__PLUGIN_REGISTRY__.handleHotUpdate(data.file);
                }
              });
            }
          </script>`
        );
      }
      return html;
    }
  };
}