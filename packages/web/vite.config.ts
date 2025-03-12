import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';
// @ts-ignore - Vite will handle the .mts extension during build
import { pluginImportMap } from './src/plugins/vite-plugin-plugin-import-map.mts';

// https://vitejs.dev/config/
export default defineConfig(({ mode, command }) => {
  // Load env file based on `mode` in the current directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');
  
  // Use loaded env vars and provide defaults
  const apiUrl = env.VITE_API_URL || 'http://localhost:3000';
  const port = parseInt(env.VITE_DEV_PORT || '8080', 10);
  const isDev = command === 'serve';
  
  console.log(`[Vite Config] Running in ${isDev ? 'DEVELOPMENT' : 'PRODUCTION'} mode`);
  
  return {
    plugins: [
      // Plugin import map for dynamic plugin loading
      pluginImportMap(),
      // Vue plugin
      vue({
        template: {
          compilerOptions: {
            isCustomElement: (tag) => tag.startsWith('el-')
          }
        }
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@dungeon-lab/shared': path.resolve(__dirname, '../shared/src'),
        // Plugin alias - this allows us to import plugins via @plugins/* specifier
        '@plugins': path.resolve(__dirname, '../plugins'),
      },
      // Add support for .mjs and .mts files
      extensions: ['.mts', '.mjs', '.ts', '.js', '.jsx', '.tsx', '.json']
    },
    optimizeDeps: {
      // Mark plugin files as external to prevent optimization in dev
      exclude: ['@plugins/*'],
    },
    server: {
      port: port,
      proxy: {
        '/api': {
          target: apiUrl,
          changeOrigin: true,
        },
        '/socket.io': {
          target: apiUrl,
          changeOrigin: true,
          ws: true,
        }
      },
      fs: {
        // Allow serving files from plugin directories
        allow: [
          '..',
          '../plugins',
          '../plugins/*/src',
          '../plugins/*/client',
          '../plugins/*/dist',
          '../plugins/*/web'
        ],
      }
    },
    build: {
      outDir: 'dist',
      sourcemap: true,
      target: 'esnext',
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'index.html'),
          // Include plugin entry points in the build
          'plugin-dnd5e2024': path.resolve(__dirname, '../plugins/dnd-5e-2024/src/web/index.mts'),
          'plugin-test-dice-roller': path.resolve(__dirname, '../plugins/test-dice-roller/src/web/index.mts')
        },
        output: {
          manualChunks: {
            'vue-vendor': ['vue', 'vue-router', 'pinia'],
            'ui-vendor': ['@headlessui/vue'],
          },
          // Ensure plugin chunks are placed in the plugins directory with predictable names
          entryFileNames: (chunkInfo) => {
            if (chunkInfo.name.startsWith('plugin-')) {
              const pluginId = chunkInfo.name.replace('plugin-', '');
              return `plugins/${pluginId}/index.js`;
            }
            return 'assets/[name]-[hash].js';
          }
        },
      },
    },
    css: {
      devSourcemap: true,
      postcss: {
        plugins: [
          tailwindcss,
          autoprefixer,
        ],
      }
    }
  };
});