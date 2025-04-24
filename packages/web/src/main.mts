import { createApp } from 'vue';
import { createPinia } from 'pinia';
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate';

import App from './App.vue';
import router from './router/index.mjs';
import './assets/styles/main.css';
import api from './api/axios.mjs';
import { pluginRegistry } from './services/plugin-registry.service.mjs';
import { useAuthStore } from './stores/auth.store.mjs';

const app = createApp(App);
const pinia = createPinia();
pinia.use(piniaPluginPersistedstate);

// Make axios instance available globally
app.config.globalProperties.$axios = api;

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
