import './assets/styles/main.css';
import '@mdi/font/css/materialdesignicons.css';
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate';
import App from './App.vue';
import router from './router/index.mjs';
import { configureApiClient, ApiClient } from '@dungeon-lab/client/index.mjs';
import { getApiBaseUrl } from './utils/getApiBaseUrl.mts';
import { useAuthStore } from './stores/auth.store.mjs';
import clickOutside from './directives/clickOutside.mjs';
import { registerVueKonva } from './plugins/vue-konva.mjs';

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

// Initialize auth state
const authStore = useAuthStore();

if (localStorage.getItem('isAuthenticated')) {
  authStore.fetchUser().catch(() => {
    localStorage.removeItem('isAuthenticated');
  });
}

app.mount('#app');
