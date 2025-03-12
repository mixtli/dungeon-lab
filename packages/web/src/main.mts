import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router/index.mjs';
import './assets/styles/main.css';
import api from './plugins/axios.mjs';
import { useAuthStore } from './stores/auth.mjs';
import { usePluginStore } from './stores/plugin.mjs';
import { pluginRegistry } from './services/plugin-registry.service.mjs';

const app = createApp(App);
const pinia = createPinia();

// Make axios instance available globally
app.config.globalProperties.$axios = api;

app.use(pinia);
app.use(router);

// Initialize auth state and plugins
const authStore = useAuthStore();
const pluginStore = usePluginStore();

if (localStorage.getItem('isAuthenticated')) {
  authStore.fetchUser()
    .then(async () => {
      // Initialize plugin registry and store
      await pluginRegistry.initialize();
      await pluginStore.initializePlugins();
    })
    .catch(() => {
      localStorage.removeItem('isAuthenticated');
    });
}

app.mount('#app'); 