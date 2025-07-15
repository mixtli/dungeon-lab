/**
 * HUD Composable
 * 
 * Vue composable for working with the sidebar + toolbar HUD system.
 * Provides keyboard shortcuts, device detection, and utility functions.
 */

import { computed } from 'vue';
import { useHUDStore } from '../stores/hudStore.mjs';
import type { 
  SidebarTabType, 
  ToolType
} from '../types/hud.mjs';

export function useHUD() {
  const hudStore = useHUDStore();

  /**
   * Initialize HUD system
   */
  function initialize(): void {
    hudStore.initialize();
    setupWindowListeners();
    setupKeyboardShortcuts();
  }

  /**
   * Cleanup HUD system
   */
  function cleanup(): void {
    removeWindowListeners();
  }

  /**
   * Setup window event listeners
   */
  function setupWindowListeners(): void {
    window.addEventListener('resize', handleResize);
    window.addEventListener('keydown', handleKeydown);
  }

  /**
   * Remove window event listeners
   */
  function removeWindowListeners(): void {
    window.removeEventListener('resize', handleResize);
    window.removeEventListener('keydown', handleKeydown);
  }

  /**
   * Handle window resize
   */
  function handleResize(): void {
    hudStore.updateViewport();
  }

  /**
   * Handle keyboard shortcuts
   */
  function handleKeydown(event: KeyboardEvent): void {
    // Only handle shortcuts if not typing in input fields
    if (event.target instanceof HTMLInputElement || 
        event.target instanceof HTMLTextAreaElement) {
      return;
    }

    const key = event.key.toLowerCase();
    const ctrl = event.ctrlKey || event.metaKey;
    const alt = event.altKey;
    const shift = event.shiftKey;

    // Tool shortcuts (single keys)
    if (!ctrl && !alt && !shift) {
      const toolShortcuts: Record<string, ToolType> = {
        'v': 'token-control',
        'm': 'measurement', 
        'w': 'walls',
        'l': 'lighting'
      };

      if (toolShortcuts[key]) {
        event.preventDefault();
        hudStore.toggleTool(toolShortcuts[key]);
        return;
      }
    }

    // Sidebar shortcuts (Ctrl + number)
    if (ctrl && !alt && !shift) {
      const tabShortcuts: Record<string, SidebarTabType> = {
        '1': 'chat',
        '2': 'combat',
        '3': 'actors',
        '4': 'items'
      };

      if (tabShortcuts[key]) {
        event.preventDefault();
        hudStore.setActiveTab(tabShortcuts[key]);
        return;
      }

      // Other Ctrl shortcuts
      switch (key) {
        case 'h':
          event.preventDefault();
          hudStore.toggleSidebar();
          break;
        case 't':
          event.preventDefault();
          hudStore.toggleToolbar();
          break;
        case '`':
        case '~':
          event.preventDefault();
          hudStore.toggleSidebarCollapsed();
          break;
      }
    }

    // Escape key - deselect active tool
    if (key === 'escape') {
      if (hudStore.toolbar.activeTool) {
        event.preventDefault();
        hudStore.setActiveTool(null);
      }
    }
  }

  /**
   * Setup keyboard shortcuts info for help display
   */
  function setupKeyboardShortcuts(): void {
    // This could populate a help system with available shortcuts
  }

  /**
   * Get keyboard shortcuts for display in help
   */
  function getKeyboardShortcuts() {
    return [
      { category: 'Tools', shortcuts: [
        { key: 'V', description: 'Token Control' },
        { key: 'M', description: 'Measurement' },
        { key: 'W', description: 'Walls' },
        { key: 'L', description: 'Lighting' },
        { key: 'Esc', description: 'Deselect Tool' }
      ]},
      { category: 'Sidebar', shortcuts: [
        { key: 'Ctrl+1', description: 'Chat Tab' },
        { key: 'Ctrl+2', description: 'Combat Tab' },
        { key: 'Ctrl+3', description: 'Actors Tab' },
        { key: 'Ctrl+4', description: 'Items Tab' },
        { key: 'Ctrl+H', description: 'Toggle Sidebar' },
        { key: 'Ctrl+`', description: 'Collapse Sidebar' }
      ]},
      { category: 'Interface', shortcuts: [
        { key: 'Ctrl+T', description: 'Toggle Toolbar' }
      ]}
    ];
  }

  // Computed properties for convenience
  const isDesktop = computed(() => hudStore.deviceType === 'desktop');
  const isTablet = computed(() => hudStore.deviceType === 'tablet');
  const isMobile = computed(() => hudStore.deviceType === 'mobile');
  const showHUD = computed(() => !isMobile.value);

  const sidebarWidth = computed(() => 
    hudStore.sidebarVisible ? hudStore.sidebar.width : 0
  );

  const contentMargin = computed(() => {
    if (!hudStore.sidebarVisible) return { left: 0, right: 0 };
    
    return hudStore.sidebar.position === 'left' 
      ? { left: hudStore.sidebar.width, right: 0 }
      : { left: 0, right: hudStore.sidebar.width };
  });

  return {
    // Store reference
    store: hudStore,

    // Computed
    isDesktop,
    isTablet,
    isMobile,
    showHUD,
    sidebarWidth,
    contentMargin,

    // Methods
    initialize,
    cleanup,
    getKeyboardShortcuts,

    // Store methods (re-exported for convenience)
    setActiveTab: hudStore.setActiveTab,
    toggleSidebar: hudStore.toggleSidebar,
    toggleSidebarCollapsed: hudStore.toggleSidebarCollapsed,
    setSidebarWidth: hudStore.setSidebarWidth,
    setSidebarPosition: hudStore.setSidebarPosition,
    setActiveTool: hudStore.setActiveTool,
    toggleTool: hudStore.toggleTool,
    toggleToolbar: hudStore.toggleToolbar,
    popOutTab: hudStore.popOutTab,
    dockWindow: hudStore.dockWindow,
    resetToDefaults: hudStore.resetToDefaults
  };
}

/**
 * Sidebar Tab Composable
 * 
 * Composable for individual sidebar tabs
 */
export function useSidebarTab(tabType: SidebarTabType) {
  const hudStore = useHUDStore();

  const tab = computed(() => hudStore.sidebar.tabs[tabType]);
  const isActive = computed(() => hudStore.sidebar.activeTab === tabType);
  const isVisible = computed(() => tab.value?.visible);

  function activate(): void {
    hudStore.setActiveTab(tabType);
  }

  function setBadge(count?: number): void {
    hudStore.setTabBadge(tabType, count);
  }

  function popOut(): string {
    return hudStore.popOutTab(tabType);
  }

  function hide(): void {
    hudStore.setTabVisibility(tabType, false);
  }

  function show(): void {
    hudStore.setTabVisibility(tabType, true);
  }

  return {
    tab,
    isActive,
    isVisible,
    activate,
    setBadge,
    popOut,
    hide,
    show
  };
}

/**
 * Toolbar Tool Composable
 * 
 * Composable for individual toolbar tools
 */
export function useToolbarTool(toolType: ToolType) {
  const hudStore = useHUDStore();

  const tool = computed(() => hudStore.toolbar.tools[toolType]);
  const isActive = computed(() => hudStore.toolbar.activeTool === toolType);
  const isDisabled = computed(() => tool.value?.disabled);

  function activate(): void {
    hudStore.setActiveTool(toolType);
  }

  function deactivate(): void {
    if (isActive.value) {
      hudStore.setActiveTool(null);
    }
  }

  function toggle(): void {
    hudStore.toggleTool(toolType);
  }

  function setDisabled(disabled: boolean): void {
    hudStore.setToolDisabled(toolType, disabled);
  }

  return {
    tool,
    isActive,
    isDisabled,
    activate,
    deactivate,
    toggle,
    setDisabled
  };
}

/**
 * Floating Window Composable
 * 
 * Composable for managing floating windows
 */
export function useFloatingWindow(windowId: string) {
  const hudStore = useHUDStore();

  const window = computed(() => hudStore.floatingWindows[windowId]);
  const isVisible = computed(() => window.value?.visible);
  const isMinimized = computed(() => window.value?.minimized);

  function dock(): void {
    hudStore.dockWindow(windowId);
  }

  function close(): void {
    hudStore.closeFloatingWindow(windowId);
  }

  function bringToFront(): void {
    hudStore.bringWindowToFront(windowId);
  }

  function updatePosition(x: number, y: number): void {
    hudStore.updateFloatingWindowPosition(windowId, { x, y });
  }

  function updateSize(width: number, height: number): void {
    hudStore.updateFloatingWindowSize(windowId, { width, height });
  }

  function toggleMinimized(): void {
    hudStore.toggleFloatingWindowMinimized(windowId);
  }

  return {
    window,
    isVisible,
    isMinimized,
    dock,
    close,
    bringToFront,
    updatePosition,
    updateSize,
    toggleMinimized
  };
}