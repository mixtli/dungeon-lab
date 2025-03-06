import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router/index.mjs';
import './assets/styles/main.css';
import api from './plugins/axios.mjs';
import { useAuthStore } from './stores/auth.mjs';
import { pluginRegistry } from './services/plugin-registry.service.mjs';

const app = createApp(App);
const pinia = createPinia();

// Make axios instance available globally
app.config.globalProperties.$axios = api;

app.use(pinia);
app.use(router);

// Initialize the auth store and fetch the current user
const authStore = useAuthStore();
authStore.fetchUser().catch(error => {
  console.error('Failed to fetch user:', error);
});

// Initialize the plugin system
try {
  await pluginRegistry.initialize();
  console.info('Plugin registry initialized successfully');
} catch (error) {
  console.error('Failed to initialize plugins:', error);
}

app.mount('#app'); 