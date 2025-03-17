import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router/index.mjs';
import './assets/styles/main.css';
import api from './network/axios.mjs';
import { pluginRegistry } from './services/plugin-registry.service.mjs';
import { useAuthStore } from './stores/auth.mjs';

await pluginRegistry.initialize();

const app = createApp(App);
const pinia = createPinia();

// Make axios instance available globally
app.config.globalProperties.$axios = api;

app.use(pinia);
app.use(router);

// Initialize auth state
const authStore = useAuthStore();

if (localStorage.getItem('isAuthenticated')) {
  authStore.fetchUser()
    .catch(() => {
      localStorage.removeItem('isAuthenticated');
    });
}

app.mount('#app'); 