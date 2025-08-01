import { createRouter, createWebHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';

// Layouts
import DefaultLayout from '@/layouts/DefaultLayout.vue';

// Views - Lazy loaded
const HomeView = () => import('@/views/HomeView.vue');
const GameTableView = () => import('@/views/GameTableView.vue');
const CharacterSheetView = () => import('@/views/CharacterSheetView.vue');
const CharacterListView = () => import('@/views/CharacterListView.vue');
const CharacterCreateView = () => import('@/views/CharacterCreateView.vue');
const ActorCreateView = () => import('@/views/ActorCreateView.vue');
const ActorEditView = () => import('@/views/ActorEditView.vue');
const LoginView = () => import('@/views/auth/LoginView.vue');
const RegisterView = () => import('@/views/auth/RegisterView.vue');
const GoogleCallbackView = () => import('@/views/auth/GoogleCallbackView.vue');
const NotFoundView = () => import('@/views/NotFoundView.vue');
const PluginManagerView = () => import('@/views/plugin/PluginManagerView.vue');
const ChatView = () => import('@/views/ChatView.vue');
const SettingsView = () => import('@/views/SettingsView.vue');
const ProfileView = () => import('@/views/ProfileView.vue');

// Campaign views
const CampaignsView = () => import('@/views/CampaignsView.vue');
const CampaignDetailView = () => import('@/views/CampaignDetailView.vue');
const CampaignCreateView = () => import('@/views/CampaignCreateView.vue');
const CampaignEditView = () => import('@/views/CampaignEditView.vue');
const GameSessionView = () => import('@/views/GameSessionView.vue');
const GameSessionListView = () => import('@/views/GameSessionListView.vue');

// Map views
const MapListView = () => import('@/views/map/MapListView.vue');
const MapCreateView = () => import('@/views/map/MapCreateView.vue');
const MapDetailView = () => import('@/views/map/MapDetailView.vue');
const MapBuilderView = () => import('@/views/map/MapBuilderView.vue');
const MapEditorView = () => import('@/views/map/MapEditorView.vue');

// Asset views
const AssetListView = () => import('@/views/AssetListView.vue');
const AssetDetailView = () => import('@/views/AssetDetailView.vue');

// Compendium views
const CompendiumListView = () => import('@/views/CompendiumListView.vue');
const CompendiumDetailView = () => import('@/views/CompendiumDetailView.vue');
const CompendiumEntryDetailView = () => import('@/views/CompendiumEntryDetailView.vue');

const InvitesView = () => import('@/views/InvitesView.vue');

// Encounter views
const EncounterCreateView = () => import('@/views/encounter/EncounterCreateView.vue');
const EncounterDetailView = () => import('@/views/encounter/EncounterDetailView.vue');
const EncounterView = () => import('@/components/encounter/EncounterView.vue');
// Not actively used in navigation, but kept for potential programmatic access
// const EncountersView = () => import('@/views/encounter/EncountersView.vue');

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
          requiresAuth: false
        }
      },
      {
        path: 'game/:id',
        name: 'game-table',
        component: GameTableView,
        meta: {
          title: 'Game Table',
          requiresAuth: true
        }
      },
      {
        path: 'characters',
        name: 'character-list',
        component: CharacterListView,
        meta: {
          title: 'My Characters',
          requiresAuth: true
        }
      },
      {
        path: 'character/create',
        name: 'character-create',
        component: CharacterCreateView,
        meta: {
          title: 'Create Character',
          requiresAuth: true
        }
      },
      {
        path: 'actor/create',
        name: 'actor-create',
        component: ActorCreateView,
        meta: {
          title: 'Create Character (Plugin)',
          requiresAuth: true
        }
      },
      {
        path: 'character/:id',
        name: 'character-sheet',
        component: CharacterSheetView,
        meta: {
          title: 'Character Sheet',
          requiresAuth: true
        }
      },
      // Asset routes
      {
        path: 'assets',
        name: 'asset-list',
        component: AssetListView,
        meta: {
          title: 'Asset Library',
          requiresAuth: true
        }
      },
      {
        path: 'assets/:id',
        name: 'asset-detail',
        component: AssetDetailView,
        meta: {
          title: 'Asset Details',
          requiresAuth: true
        }
      },
      // Compendium routes
      {
        path: 'compendiums',
        name: 'compendiums',
        component: CompendiumListView,
        meta: {
          title: 'Compendium Library',
          requiresAuth: true
        }
      },
      {
        path: 'compendiums/:id',
        name: 'compendium-detail',
        component: CompendiumDetailView,
        meta: {
          title: 'Compendium Details',
          requiresAuth: true
        }
      },
      {
        path: 'compendiums/:compendiumId/entries/:entryId',
        name: 'compendium-entry-detail',
        component: CompendiumEntryDetailView,
        meta: {
          title: 'Compendium Entry',
          requiresAuth: true
        }
      },
      // Campaign routes
      {
        path: 'campaigns',
        name: 'campaigns',
        component: CampaignsView,
        meta: {
          title: 'My Campaigns',
          requiresAuth: true
        }
      },
      {
        path: 'campaigns/create',
        name: 'campaign-create',
        component: CampaignCreateView,
        meta: {
          title: 'Create Campaign',
          requiresAuth: true
        }
      },
      {
        path: 'campaigns/:id',
        name: 'campaign-detail',
        component: CampaignDetailView,
        meta: {
          title: 'Campaign Details',
          requiresAuth: true
        }
      },
      {
        path: 'campaigns/:id/edit',
        name: 'campaign-edit',
        component: CampaignEditView,
        meta: {
          title: 'Edit Campaign',
          requiresAuth: true
        }
      },
      {
        path: '/game-sessions',
        name: 'game-sessions',
        component: GameSessionListView,
        meta: {
          title: 'Game Sessions',
          requiresAuth: true
        }
      },
      {
        path: '/campaigns/:campaignId/sessions/:id',
        name: 'game-session',
        component: GameSessionView,
        meta: {
          title: 'Game Session',
          requiresAuth: true
        }
      },
      {
        path: '/chat',
        name: 'chat',
        component: ChatView,
        meta: {
          title: 'Game Chat',
          requiresAuth: true
        }
      },
      // Encounter routes - non-nested structure
      {
        path: 'encounters/create/:campaignId',
        name: 'encounter-create',
        component: EncounterCreateView,
        meta: {
          title: 'Create Encounter',
          requiresAuth: true
        }
      },
      {
        path: 'encounters/:id',
        name: 'encounter-detail',
        component: EncounterDetailView,
        meta: {
          title: 'Encounter Details',
          requiresAuth: true
        }
      },
      {
        path: 'encounters/:id/run',
        name: 'encounter-run',
        component: EncounterView,
        meta: {
          title: 'Run Encounter',
          requiresAuth: true
        }
      },
      // Map routes
      {
        path: 'maps',
        name: 'maps',
        component: MapListView,
        meta: {
          title: 'My Maps',
          requiresAuth: true
        }
      },
      {
        path: 'maps/create',
        name: 'map-create',
        component: MapCreateView,
        meta: {
          title: 'Create Map',
          requiresAuth: true
        }
      },
      {
        path: 'maps/builder',
        name: 'map-builder',
        component: MapBuilderView,
        meta: {
          title: 'AI Map Builder',
          requiresAuth: true
        }
      },
      {
        path: 'maps/:id/edit',
        name: 'map-edit',
        component: MapEditorView,
        meta: {
          title: 'Edit Map',
          requiresAuth: true
        }
      },
      {
        path: 'maps/:id',
        name: 'map-detail',
        component: MapDetailView,
        meta: {
          title: 'Map Details',
          requiresAuth: true
        }
      },
      // Invites route
      {
        path: 'invites',
        name: 'invites',
        component: InvitesView,
        meta: {
          title: 'Campaign Invites',
          requiresAuth: true
        }
      },
      {
        path: 'settings',
        name: 'settings',
        component: SettingsView,
        meta: {
          title: 'Settings',
          requiresAuth: true
        }
      },
      {
        path: 'actor/:id/edit',
        name: 'actor-edit',
        component: ActorEditView,
        meta: {
          title: 'Edit Actor',
          requiresAuth: true
        }
      },
      // Profile route
      {
        path: 'profile',
        name: 'profile',
        component: ProfileView,
        meta: {
          title: 'Profile',
          requiresAuth: true
        }
      }
    ]
  },
  {
    path: '/admin',
    component: DefaultLayout,
    meta: {
      requiresAuth: true,
      requiresAdmin: true
    },
    children: [
      {
        path: 'plugins',
        name: 'plugin-manager',
        component: PluginManagerView,
        meta: {
          title: 'Plugin Manager',
          requiresAuth: true,
          requiresAdmin: true
        }
      }
    ]
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
          requiresAuth: false
        }
      },
      {
        path: 'register',
        name: 'register',
        component: RegisterView,
        meta: {
          title: 'Register',
          requiresAuth: false
        }
      },
      {
        path: 'google/callback',
        name: 'google-callback',
        component: GoogleCallbackView,
        meta: {
          title: 'Google Authentication',
          requiresAuth: false
        }
      }
    ]
  },
  // Redirect old auth routes to new ones
  {
    path: '/login',
    redirect: '/auth/login'
  },
  {
    path: '/register',
    redirect: '/auth/register'
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: NotFoundView,
    meta: {
      title: 'Page Not Found',
      requiresAuth: false
    }
  }
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
  }
});

// Navigation guard
router.beforeEach(async (to, from, next) => {
  console.log('Route navigation:', { from: from.path, to: to.path });

  // Set document title
  document.title = `${to.meta.title} | Dungeon Lab`;

  // Dynamically import the auth store to avoid circular dependencies
  const { useAuthStore } = await import('../stores/auth.store.mjs');
  const authStore = useAuthStore();

  // Convenience variables
  const isAuthRoute = to.path.startsWith('/auth') || to.path === '/';

  // If localStorage has isAuthenticated but user is not loaded, try to fetch user data
  if (localStorage.getItem('isAuthenticated') && !authStore.user) {
    try {
      const success = await authStore.fetchUser();
      if (!success) {
        // If fetching user fails, clear localStorage
        localStorage.removeItem('isAuthenticated');
      }
    } catch (error) {
      console.error('Failed to fetch user data:', error);
      localStorage.removeItem('isAuthenticated');
    }
  }

  // Check authentication status from store
  const isAuthenticated = authStore.isAuthenticated;

  console.log('Auth status:', { isAuthRoute, isAuthenticated });

  // Check if the user is authenticated
  if (to.meta.requiresAuth && !isAuthenticated) {
    console.log('Redirecting to login - auth required');
    next({ name: 'login', query: { redirect: to.fullPath } });
    return;
  }

  // Handle auth routes when already authenticated
  if (isAuthenticated && isAuthRoute && to.name !== 'home') {
    console.log('Redirecting to home - already authenticated');
    next({ name: 'home' });
    return;
  }

  console.log('Proceeding with navigation to:', to.path);
  next();
});

export default router;
