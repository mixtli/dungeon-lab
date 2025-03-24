/// <reference types="vite" />
import vue from "@vitejs/plugin-vue";
import path from "path";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [tsconfigPaths(), vue()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@dungeon-lab/shared": path.resolve(__dirname, "packages/shared/src"),
    },
    extensions: [".mjs", ".js", ".mts", ".ts", ".jsx", ".tsx", ".json", ".vue"],
  },
  server: {
    port: parseInt(process.env.VITE_DEV_PORT || "8080", 10),
    proxy: {
      "/api": {
        target: process.env.VITE_API_URL || "http://localhost:3000",
        changeOrigin: true,
      },
      "/socket.io": {
        target: process.env.VITE_API_URL || "http://localhost:3000",
        changeOrigin: true,
        ws: true,
      },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: true,
    target: "esnext",
    rollupOptions: {
      output: {
        manualChunks: {
          "vue-vendor": ["vue", "vue-router", "pinia"],
          "ui-vendor": ["@headlessui/vue"],
        },
      },
    },
  },
  css: {
    devSourcemap: true,
  },
});

