import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

export interface RouteParent {
  name: string;
  params?: Record<string, string>;
  preserveParams?: string[];
}

export function useBackNavigation() {
  const route = useRoute();
  const router = useRouter();

  // Define route hierarchy and parent relationships
  const routeParents: Record<string, RouteParent> = {
    // Campaign hierarchy
    'campaign-detail': { name: 'campaigns' },
    'campaign-edit': { name: 'campaign-detail', preserveParams: ['id'] },
    'campaign-create': { name: 'campaigns' },
    
    // Character hierarchy
    'character-sheet': { name: 'character-list' },
    'character-create': { name: 'character-list' },
    'actor-create': { name: 'character-list' },
    'actor-edit': { name: 'character-list' },
    
    // Map hierarchy
    'map-detail': { name: 'maps' },
    'map-create': { name: 'maps' },
    'map-edit': { name: 'map-detail', preserveParams: ['id'] },
    'map-builder': { name: 'maps' },
    
    // Asset hierarchy
    'asset-detail': { name: 'asset-list' },
    
    // Encounter hierarchy
    'encounter-detail': { name: 'campaign-detail', preserveParams: ['campaignId'] },
    'encounter-create': { name: 'campaign-detail', preserveParams: ['campaignId'] },
    'encounter-run': { name: 'encounter-detail', preserveParams: ['id'] },
    
    // Game session hierarchy
    'game-session': { name: 'campaign-detail', preserveParams: ['campaignId'] },
    'game-table': { name: 'game-session', preserveParams: ['id'] },
    
    // Auth hierarchy
    'login': { name: 'home' },
    'register': { name: 'home' },
    'google-callback': { name: 'home' },
    
    // Admin hierarchy
    'plugin-manager': { name: 'settings' },
  };

  // Routes that should not show back button (considered "root" views)
  const rootRoutes = [
    'home',
    'campaigns', 
    'character-list',
    'maps',
    'asset-list',
    'settings',
    'chat',
    'game-sessions',
    'invites'
  ];

  // Determine if back button should be shown
  const canGoBack = computed(() => {
    const currentRoute = route.name as string;
    
    // Don't show back button on root routes
    if (rootRoutes.includes(currentRoute)) {
      return false;
    }
    
    // Don't show back button on auth routes when not authenticated
    if (['login', 'register', 'google-callback'].includes(currentRoute)) {
      return false;
    }
    
    // Show back button for all other routes
    return true;
  });

  // Get the logical parent route for current route
  function getParentRoute(): RouteParent | null {
    const currentRoute = route.name as string;
    return routeParents[currentRoute] || null;
  }

  // Navigate back to parent route
  function goBack() {
    const currentRoute = route.name as string;
    const parentRoute = getParentRoute();
    
    if (parentRoute) {
      // Build route object for parent
      const routeObject: any = { name: parentRoute.name };
      
      // Preserve specified params from current route
      if (parentRoute.preserveParams && route.params) {
        routeObject.params = {};
        parentRoute.preserveParams.forEach(paramName => {
          if (route.params[paramName]) {
            routeObject.params[paramName] = route.params[paramName];
          }
        });
      }
      
      // Add any additional params specified in parent definition
      if (parentRoute.params) {
        routeObject.params = { ...routeObject.params, ...parentRoute.params };
      }
      
      router.push(routeObject);
    } else {
      // Fallback to browser history or campaigns
      if (window.history.length > 1) {
        router.go(-1);
      } else {
        router.push({ name: 'campaigns' });
      }
    }
  }

  // Get back button title/text based on parent route
  const backButtonTitle = computed(() => {
    const parentRoute = getParentRoute();
    
    if (!parentRoute) {
      return 'Back';
    }
    
    // Map route names to user-friendly titles
    const routeTitles: Record<string, string> = {
      'campaigns': 'Campaigns',
      'campaign-detail': 'Campaign',
      'character-list': 'Characters',
      'maps': 'Maps',
      'map-detail': 'Map',
      'asset-list': 'Assets',
      'encounter-detail': 'Encounter',
      'game-session': 'Session',
      'game-sessions': 'Sessions',
      'settings': 'Settings',
      'home': 'Home'
    };
    
    return routeTitles[parentRoute.name] || 'Back';
  });

  // Check if current route is a detail/edit view of a specific item
  const isDetailView = computed(() => {
    const currentRoute = route.name as string;
    return currentRoute.includes('-detail') || 
           currentRoute.includes('-edit') || 
           currentRoute.includes('-create') ||
           currentRoute === 'character-sheet' ||
           currentRoute === 'encounter-run';
  });

  // Check if current route is an edit view
  const isEditView = computed(() => {
    const currentRoute = route.name as string;
    return currentRoute.includes('-edit') || currentRoute.includes('-create');
  });

  return {
    canGoBack,
    goBack,
    backButtonTitle,
    isDetailView,
    isEditView,
    getParentRoute
  };
}