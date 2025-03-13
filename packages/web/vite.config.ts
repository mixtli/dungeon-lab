import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';
// @ts-ignore - Vite will handle the .mts extension during build
// import { pluginImportMap } from './src/plugins/vite-plugin-plugin-import-map.mts';

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
      // Vue plugin
      vue()
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@dungeon-lab/shared': path.resolve(__dirname, '../shared/src'),
        // Set up more specific aliases for plugin imports
        '@plugins/dnd-5e-2024': path.resolve(__dirname, '../plugins/dnd-5e-2024/src'),
      },
      // Add support for .mjs and .mts files
      extensions: ['.mts', '.mjs', '.ts', '.js', '.jsx', '.tsx', '.json']
    },
    optimizeDeps: {
      include: [
        '@dungeon-lab/shared',
      ],
      // Mark plugin files as external to prevent optimization in dev
      exclude: ['@plugins/dnd-5e-2024'],
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
      }
    },
    build: {
      outDir: 'dist',
      sourcemap: true,
      target: 'esnext',
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'index.html'),
        },
        output: {
          manualChunks: {
            'vue-vendor': ['vue', 'vue-router', 'pinia'],
            'ui-vendor': ['@headlessui/vue'],
          },
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