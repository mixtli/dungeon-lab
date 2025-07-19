import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';
import { pluginHMR } from './src/vite-plugins/plugin-hmr.mjs';

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
      vue(),
      
      // Plugin hot module reload support
      ...(isDev ? [pluginHMR()] : [])
    ],
    resolve: {
      alias: {
        '@dungeon-lab/shared': path.resolve(__dirname, '../shared/src'),
        '@dungeon-lab/client': path.resolve(__dirname, '../client/src'),
        '@': path.resolve(__dirname, './src')
      },
      // Add support for TypeScript files
      extensions: ['.mts', '.mjs', '.ts', '.js', '.jsx', '.tsx', '.json']
    },
    optimizeDeps: {
      include: ['@dungeon-lab/shared', '@dungeon-lab/client'],
      // This helps with dynamic imports in dev mode
      esbuildOptions: {
        resolveExtensions: ['.mts', '.mjs', '.ts', '.js'],
        plugins: []
      }
    },
    // Enable plugin hot reload
    define: {
      __PLUGIN_HMR__: isDev
    },
    server: {
      port: port,
      host: true, // Allow external connections
      proxy: {
        '/api': {
          target: apiUrl,
          changeOrigin: true
        },
        '/socket.io': {
          target: apiUrl,
          changeOrigin: true,
          ws: true
        }
      },
      fs: {
        // Allow serving files from one level up, where our plugins are
        allow: ['..', '../..', '../../..', '../../../plugins'],
        // Explicitly allow files in the web directory
        strict: false
      }
    },
    build: {
      outDir: 'dist',
      sourcemap: true,
      target: 'esnext',
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'index.html')
        },
        output: {
          manualChunks: {
            'vue-vendor': ['vue', 'vue-router', 'pinia'],
            'ui-vendor': ['@headlessui/vue']
          }
        }
      }
    },
    css: {
      devSourcemap: true,
      postcss: {
        plugins: [tailwindcss, autoprefixer]
      }
    }
  };
});
