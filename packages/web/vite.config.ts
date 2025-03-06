import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');
  
  // Use loaded env vars and provide defaults
  const apiUrl = env.VITE_API_URL || 'http://localhost:3000';
  const port = parseInt(env.VITE_DEV_PORT || '8080', 10);
  
  return {
    plugins: [
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
      },
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
        },
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: true,
      target: 'esnext',
      rollupOptions: {
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