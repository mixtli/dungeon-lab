/**
 * Unified HUD Navigation Composable
 *
 * Handles tab switching, sheet navigation, and URL management
 * for both desktop and mobile HUD interfaces.
 */

import { ref, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useHUDStore } from '../stores/hudStore.mjs';
import { useGameStateStore } from '../stores/game-state.store.mjs';
import { useDocumentSheetStore } from '../stores/document-sheet.store.mjs';
import type { SidebarTabType } from '../types/hud.mjs';
import type { BaseDocument } from '@dungeon-lab/shared/types/index.mjs';

export interface NavigationContext {
  /** Whether this is a mobile context (affects sheet opening behavior) */
  isMobile: boolean;
  /** Optional route path for URL management (defaults to current route) */
  basePath?: string;
}

export interface HudNavigationState {
  /** Currently active tab */
  activeTab: SidebarTabType;
  /** Currently open sheet (mobile only) */
  currentSheet: BaseDocument | null;
  /** Previous tab (for mobile back navigation) */
  previousTab: SidebarTabType;
}

export interface HudNavigationActions {
  /** Switch to a different tab */
  setActiveTab: (tabId: SidebarTabType) => void;
  /** Open a document sheet */
  openSheet: (document: BaseDocument) => void;
  /** Close the current sheet (mobile only) */
  closeSheet: () => void;
  /** Initialize navigation state from URL parameters */
  initializeFromUrl: () => void;
  /** Update URL with current navigation state */
  updateUrl: () => void;
}

/**
 * Composable for unified HUD navigation logic
 */
export function useHudNavigation(context: NavigationContext = { isMobile: false }) {
  const hudStore = useHUDStore();
  const gameStateStore = useGameStateStore();
  const documentSheetStore = useDocumentSheetStore();
  const route = useRoute();
  const router = useRouter();

  // Navigation state
  const activeTab = ref<SidebarTabType>(
    context.isMobile ? 'characters' : hudStore.sidebar.activeTab
  );
  const currentSheet = ref<BaseDocument | null>(null);
  const previousTab = ref<SidebarTabType>('characters');

  // Available tabs (filtered by visibility and mobile context)
  const availableTabs = computed(() => {
    return Object.values(hudStore.sidebar.tabs).filter(tab => {
      if (!tab.visible) return false;

      // Exclude chat tab on mobile
      if (context.isMobile && tab.id === 'chat') return false;

      return true;
    });
  });

  // Current tab data
  const activeTabData = computed(() => {
    return hudStore.sidebar.tabs[activeTab.value];
  });

  // Whether we're currently in a sheet view (mobile only)
  const isInSheetView = computed(() => {
    return context.isMobile && currentSheet.value !== null;
  });

  /**
   * Switch to a different tab
   */
  function setActiveTab(tabId: SidebarTabType): void {
    if (!hudStore.sidebar.tabs[tabId]?.visible) {
      console.warn(`Cannot switch to tab '${tabId}': tab is not visible`);
      return;
    }

    activeTab.value = tabId;

    // For desktop, also update the HUD store
    if (!context.isMobile) {
      hudStore.setActiveTab(tabId);
    }

    // Close any open sheet when switching tabs on mobile
    if (context.isMobile && currentSheet.value) {
      currentSheet.value = null;
    }

    updateUrl();
  }

  /**
   * Open a document sheet
   */
  function openSheet(document: BaseDocument): void {
    if (context.isMobile) {
      // Mobile: Full-screen sheet navigation
      previousTab.value = activeTab.value;
      currentSheet.value = document;
      updateUrl();
    } else {
      // Desktop: Floating document sheet
      documentSheetStore.openDocumentSheet(document);
    }
  }

  /**
   * Close the current sheet (mobile only)
   */
  function closeSheet(): void {
    if (!context.isMobile) {
      console.warn('closeSheet() called in desktop context - use documentSheetStore instead');
      return;
    }

    currentSheet.value = null;
    activeTab.value = previousTab.value;
    updateUrl();
  }

  /**
   * Find a document by ID in the game state
   */
  function findDocumentById(documentId: string): BaseDocument | null {
    // Look in characters first
    let document: BaseDocument | null = gameStateStore.characters.find(c => c.id === documentId) || null;

    // If not found in characters, look in actors
    if (!document) {
      document = gameStateStore.actors.find(a => a.id === documentId) || null;
    }

    // If not found in actors, look in items
    if (!document && gameStateStore.items) {
      document = gameStateStore.items.find((i: BaseDocument) => i.id === documentId) || null;
    }

    return document;
  }

  /**
   * Update URL with current navigation state
   */
  function updateUrl(): void {
    const query: Record<string, string> = {};
    const basePath = context.basePath || route.path;

    if (context.isMobile && currentSheet.value) {
      // Mobile sheet navigation
      query.sheet = currentSheet.value.id;
    } else {
      // Tab navigation
      query.tab = activeTab.value;
    }

    router.replace({
      path: basePath,
      query
    });
  }

  /**
   * Initialize navigation state from URL parameters
   */
  function initializeFromUrl(): void {
    const urlSheet = route.query.sheet as string;
    const urlTab = route.query.tab as SidebarTabType;

    if (urlSheet && context.isMobile) {
      // Try to find and open the document
      const document = findDocumentById(urlSheet);

      if (document) {
        // Document found, open it
        currentSheet.value = document;
        previousTab.value = activeTab.value;
      } else {
        // Document not found, clear the sheet parameter
        console.warn('Document not found for sheet ID:', urlSheet);
        router.replace({
          path: context.basePath || route.path,
          query: { tab: activeTab.value }
        });
      }
    } else if (urlTab && availableTabs.value.some(tab => tab.id === urlTab)) {
      // Set active tab from URL
      activeTab.value = urlTab;

      // For desktop, also update the HUD store
      if (!context.isMobile) {
        hudStore.setActiveTab(urlTab);
      }
    }
  }

  // Watch for URL changes (back/forward navigation)
  watch(
    () => route.query,
    () => {
      // Only reinitialize if we're not currently in a sheet view
      // This prevents conflicts when the user is navigating within sheets
      if (!isInSheetView.value) {
        initializeFromUrl();
      }
    }
  );

  // Return navigation state and actions
  const state: HudNavigationState = {
    activeTab: activeTab.value,
    currentSheet: currentSheet.value,
    previousTab: previousTab.value
  };

  const actions: HudNavigationActions = {
    setActiveTab,
    openSheet,
    closeSheet,
    initializeFromUrl,
    updateUrl
  };

  return {
    // State (reactive refs)
    activeTab,
    currentSheet,
    previousTab,

    // Computed
    availableTabs,
    activeTabData,
    isInSheetView,

    // Actions
    setActiveTab,
    openSheet,
    closeSheet,
    initializeFromUrl,
    updateUrl,

    // Utility
    findDocumentById,

    // Grouped exports (for destructuring convenience)
    state,
    actions
  };
}