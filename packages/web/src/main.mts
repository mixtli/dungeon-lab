import './assets/styles/main.css';
import '@mdi/font/css/materialdesignicons.css';
import { createApp } from 'vue';

// Extend Window interface to include the plugin registry
declare global {
  interface Window {
    __DUNGEON_LAB_PLUGIN_REGISTRY__?: {
      getGameSystemPlugin(id: string): { getContext(): unknown } | null;
      [key: string]: unknown;
    };
  }
}
import { createPinia } from 'pinia';
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate';
import App from './App.vue';
import router from './router/index.mjs';
import { configureApiClient, ApiClient } from '@dungeon-lab/client/index.mjs';
import { getApiBaseUrl } from './utils/getApiBaseUrl.mts';
import { useAuthStore } from './stores/auth.store.mjs';
import clickOutside from './directives/clickOutside.mjs';
import { registerVueKonva } from './plugins/vue-konva.mjs';
import { pluginRegistry } from './services/plugin-registry.mjs';
import { initializeCoreActionHandlers } from './services/core-action-handlers.mjs';

import { setAutoFreeze } from "immer";

// Disable auto-freezing for production
  setAutoFreeze(false);

// Your application's 
// Configure ApiClient with base URL
configureApiClient(getApiBaseUrl());

const apiClient = new ApiClient();
const app = createApp(App);
const pinia = createPinia();
pinia.use(piniaPluginPersistedstate);

// Make API client available globally
app.config.globalProperties.$api = apiClient;

app.use(pinia);

app.use(router);

// Register the click-outside directive
app.directive('click-outside', clickOutside);

// Register Vue Konva
registerVueKonva(app);

// Initialize app with new plugin system
async function initializeApp() {
  try {
    console.log('🚀 Initializing Dungeon Lab with new plugin architecture...');
    
    // Initialize core action handlers first (before plugins)
    initializeCoreActionHandlers();
    console.log('✅ Core action handlers initialized');
    
    // Initialize plugin registry
    await pluginRegistry.initialize();
    console.log('✅ Plugin registry initialized');
    
    // Make plugin registry available globally for shared utilities
    window.__DUNGEON_LAB_PLUGIN_REGISTRY__ = {
      getGameSystemPlugin: (id: string) => {
        const plugin = pluginRegistry.getGameSystemPlugin(id);
        // Check if plugin has getContext method (plugins extend BasePlugin)
        if (plugin && typeof (plugin as unknown as { getContext?: () => unknown }).getContext === 'function') {
          return { getContext: () => (plugin as unknown as { getContext: () => unknown }).getContext() };
        }
        return null;
      }
    };
    
    // Load development tools in dev mode
    if (import.meta.env.DEV) {
      await import('./utils/plugin-dev-tools.mjs');
      console.log('🔧 Plugin development tools loaded');
    }
    
    // Auto-load plugins from environment variable if specified
    // Note: Plugin loading is now handled by client-side manifest discovery
    const autoLoadPlugins = import.meta.env.VITE_AUTO_LOAD_PLUGINS;
    if (autoLoadPlugins) {
      console.log('⚠️ VITE_AUTO_LOAD_PLUGINS is deprecated - plugins are now loaded via manifest-based discovery');
    }
    
    console.log('🎉 Application initialization complete');
    
  } catch (error) {
    console.error('❌ Failed to initialize plugin system:', error);
    // Continue with app startup even if plugins fail
  }
}

// Initialize auth state
const authStore = useAuthStore();

if (localStorage.getItem('isAuthenticated')) {
  authStore.fetchUser().catch(() => {
    localStorage.removeItem('isAuthenticated');
  });
}

// Initialize app with plugins
initializeApp().then(() => {
  app.mount('#app');
}).catch(error => {
  console.error('Failed to initialize app:', error);
  // Mount app anyway
  app.mount('#app');
});
