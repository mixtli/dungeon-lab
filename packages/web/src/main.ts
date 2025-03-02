import { createApp } from 'vue';
import { createPinia } from 'pinia';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import App from './App.vue';
import router from './router';
import './assets/styles/main.css';
import api from './plugins/axios';
import { usePluginStore } from './stores/plugin';
import { useAuthStore } from './stores/auth';

const app = createApp(App);
const pinia = createPinia();

// Make axios instance available globally
app.config.globalProperties.$axios = api;

app.use(pinia);
app.use(router);
app.use(ElementPlus);

// Initialize the auth store and fetch the current user
const authStore = useAuthStore();
authStore.fetchUser().catch(error => {
  console.error('Failed to fetch user:', error);
});

// Initialize the plugin system
const pluginStore = usePluginStore();
pluginStore.initializePlugins().catch(error => {
  console.error('Failed to initialize plugins:', error);
});

app.mount('#app'); 