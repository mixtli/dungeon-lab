import { createRouter, createWebHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';

// Layouts
import DefaultLayout from '@/layouts/DefaultLayout.vue';

// Views - Lazy loaded
const HomeView = () => import('@/views/HomeView.vue');
const GameTableView = () => import('@/views/GameTableView.vue');
const CharacterSheetView = () => import('@/views/CharacterSheetView.vue');
const LoginView = () => import('@/views/auth/LoginView.vue');
const RegisterView = () => import('@/views/auth/RegisterView.vue');
const GoogleCallbackView = () => import('@/views/auth/GoogleCallbackView.vue');
const FileUploadDemoView = () => import('@/views/FileUploadDemo.vue');
const NotFoundView = () => import('@/views/NotFoundView.vue');
const PluginManagerView = () => import('@/views/plugin/PluginManagerView.vue');

// Campaign views
const CampaignsView = () => import('@/views/CampaignsView.vue');
const CampaignDetailView = () => import('@/views/CampaignDetailView.vue');
const CampaignCreateView = () => import('@/views/CampaignCreateView.vue');
const CampaignEditView = () => import('@/views/CampaignEditView.vue');

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: DefaultLayout,
    children: [
      {
        path: '',
        name: 'home',
        component: HomeView,
        meta: {
          title: 'Home',
          requiresAuth: false,
        },
      },
      {
        path: 'game/:id',
        name: 'game-table',
        component: GameTableView,
        meta: {
          title: 'Game Table',
          requiresAuth: true,
        },
      },
      {
        path: 'character/:id',
        name: 'character-sheet',
        component: CharacterSheetView,
        meta: {
          title: 'Character Sheet',
          requiresAuth: true,
        },
      },
      {
        path: 'file-upload-demo',
        name: 'file-upload-demo',
        component: FileUploadDemoView,
        meta: {
          title: 'File Upload Demo',
          requiresAuth: true,
        },
      },
      // Campaign routes
      {
        path: 'campaigns',
        name: 'campaigns',
        component: CampaignsView,
        meta: {
          title: 'My Campaigns',
          requiresAuth: true,
        },
      },
      {
        path: 'campaigns/create',
        name: 'campaign-create',
        component: CampaignCreateView,
        meta: {
          title: 'Create Campaign',
          requiresAuth: true,
        },
      },
      {
        path: 'campaigns/:id',
        name: 'campaign-detail',
        component: CampaignDetailView,
        meta: {
          title: 'Campaign Details',
          requiresAuth: true,
        },
      },
      {
        path: 'campaigns/:id/edit',
        name: 'campaign-edit',
        component: CampaignEditView,
        meta: {
          title: 'Edit Campaign',
          requiresAuth: true,
        },
      },
    ],
  },
  {
    path: '/admin',
    component: DefaultLayout,
    meta: {
      requiresAuth: true,
      requiresAdmin: true,
    },
    children: [
      {
        path: 'plugins',
        name: 'plugin-manager',
        component: PluginManagerView,
        meta: {
          title: 'Plugin Manager',
          requiresAuth: true,
          requiresAdmin: true,
        },
      },
    ],
  },
  {
    path: '/auth',
    component: DefaultLayout,
    children: [
      {
        path: 'login',
        name: 'login',
        component: LoginView,
        meta: {
          title: 'Login',
          requiresAuth: false,
        },
      },
      {
        path: 'register',
        name: 'register',
        component: RegisterView,
        meta: {
          title: 'Register',
          requiresAuth: false,
        },
      },
      {
        path: 'google/callback',
        name: 'google-callback',
        component: GoogleCallbackView,
        meta: {
          title: 'Google Authentication',
          requiresAuth: false,
        },
      },
    ],
  },
  // Redirect old auth routes to new ones
  {
    path: '/login',
    redirect: '/auth/login',
  },
  {
    path: '/register',
    redirect: '/auth/register',
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: NotFoundView,
    meta: {
      title: 'Page Not Found',
      requiresAuth: false,
    },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(_to, _from, savedPosition) {
    if (savedPosition) {
      return savedPosition;
    } else {
      return { top: 0 };
    }
  },
});

// Navigation guard
router.beforeEach(async (to, _from, next) => {
  // Import auth store
  const { useAuthStore } = await import('@/stores/auth');
  const authStore = useAuthStore();
  
  // Set document title
  document.title = `${to.meta.title} | Dungeon Lab`;
  
  // Check if route requires authentication
  const requiresAuth = to.matched.some((record) => record.meta.requiresAuth);
  const requiresAdmin = to.matched.some((record) => record.meta.requiresAdmin);
  
  // Skip authentication check for login, register and callback routes
  const isAuthRoute = to.path.startsWith('/auth/');
  
  // If user is not loaded yet and we're not on an auth route, try to fetch user data
  if (!authStore.user && !isAuthRoute) {
    try {
      await authStore.fetchUser();
    } catch (error) {
      // Silent catch - we'll handle authentication check below
      console.log('Failed to fetch user data:', error);
    }
  }
  
  const isAuthenticated = authStore.isAuthenticated;
  const isAdmin = authStore.user?.isAdmin || false;
  
  if (requiresAuth && !isAuthenticated) {
    next({ name: 'login', query: { redirect: to.fullPath } });
  } else if (requiresAdmin && !isAdmin) {
    next({ name: 'home' });
  } else {
    next();
  }
});

export default router; 