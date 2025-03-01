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
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition;
    } else {
      return { top: 0 };
    }
  },
});

// Navigation guard
router.beforeEach((to, from, next) => {
  // Set document title
  document.title = `${to.meta.title} | Dungeon Lab`;
  
  // Check if route requires authentication
  const requiresAuth = to.matched.some((record) => record.meta.requiresAuth);
  const isAuthenticated = localStorage.getItem('token') !== null;
  
  if (requiresAuth && !isAuthenticated) {
    next({ name: 'login', query: { redirect: to.fullPath } });
  } else {
    next();
  }
});

export default router; 