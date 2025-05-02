import './assets/styles/main.css';
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate';
import App from './App.vue';
import router from './router/index.mjs';
import { configureApiClient, ApiClient } from '@dungeon-lab/client/index.mjs';
import { pluginRegistry } from './services/plugin-registry.service.mjs';
import { useAuthStore } from './stores/auth.store.mjs';

// Configure ApiClient with base URL
configureApiClient(import.meta.env.VITE_API_URL || 'http://localhost:3000');

const apiClient = new ApiClient();
const app = createApp(App);
const pinia = createPinia();
pinia.use(piniaPluginPersistedstate);

// Make API client available globally
app.config.globalProperties.$api = apiClient;

app.use(pinia);

app.use(router);

// Initialize plugins after Pinia setup
await pluginRegistry.initialize();

// Initialize auth state
const authStore = useAuthStore();

if (localStorage.getItem('isAuthenticated')) {
  authStore.fetchUser().catch(() => {
    localStorage.removeItem('isAuthenticated');
  });
}

app.mount('#app');
