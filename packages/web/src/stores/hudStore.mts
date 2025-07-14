/**
 * HUD Store
 * 
 * Pinia store for managing the sidebar + toolbar HUD system.
 * Handles sidebar tabs, floating toolbar, and pop-out windows.
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { 
  SidebarState,
  SidebarTabType,
  ToolbarState,
  ToolType,
  FloatingWindow,
  Position,
  Size,
  HUDPreferences,
  HUDConfiguration
} from '../types/hud.mjs';

export const useHUDStore = defineStore('hud', () => {
  // State
  const sidebar = ref<SidebarState>({
    visible: true,
    activeTab: 'chat',
    width: 320,
    position: 'right',
    collapsed: false,
    tabs: {
      chat: {
        id: 'chat',
        title: 'Chat',
        icon: 'mdi-message-text',
        component: 'ChatTab',
        visible: true
      },
      combat: {
        id: 'combat',
        title: 'Combat',
        icon: 'mdi-sword-cross',
        component: 'CombatTab',
        visible: true
      },
      actors: {
        id: 'actors',
        title: 'Actors',
        icon: 'mdi-account-multiple',
        component: 'ActorsTab',
        visible: true
      },
      items: {
        id: 'items',
        title: 'Items',
        icon: 'mdi-bag-personal',
        component: 'ItemsTab',
        visible: true
      }
    }
  });

  const toolbar = ref<ToolbarState>({
    visible: true,
    position: { x: 20, y: 100 },
    orientation: 'vertical',
    activeTool: null,
    tools: {
      'token-control': {
        id: 'token-control',
        title: 'Token Control',
        icon: 'mdi-cursor-move',
        active: false,
        shortcut: 'v',
        tooltip: 'Select and move tokens'
      },
      'measurement': {
        id: 'measurement',
        title: 'Measurement',
        icon: 'mdi-ruler',
        active: false,
        shortcut: 'm',
        tooltip: 'Measure distances'
      },
      'walls': {
        id: 'walls',
        title: 'Walls',
        icon: 'mdi-wall',
        active: false,
        shortcut: 'w',
        tooltip: 'Draw walls and barriers'
      },
      'lighting': {
        id: 'lighting',
        title: 'Lighting',
        icon: 'mdi-lightbulb-on',
        active: false,
        shortcut: 'l',
        tooltip: 'Place light sources'
      }
    }
  });

  const floatingWindows = ref<Record<string, FloatingWindow>>({});
  const nextZIndex = ref(1000);
  const viewport = ref<Size>({ width: 1920, height: 1080 });
  const deviceType = ref<'desktop' | 'tablet' | 'mobile'>('desktop');

  const preferences = ref<HUDPreferences>({
    sidebarWidth: 320,
    sidebarPosition: 'right',
    sidebarCollapsed: false,
    toolbarPosition: { x: 20, y: 100 },
    lastActiveTab: 'chat',
    hiddenTabs: [],
    theme: 'dark',
    opacity: 0.9
  });

  const configuration = ref<HUDConfiguration>({
    sidebar: {
      defaultWidth: 320,
      minWidth: 250,
      maxWidth: 500,
      defaultPosition: 'right',
      allowCollapse: true,
      allowPopOut: true
    },
    toolbar: {
      defaultPosition: { x: 20, y: 100 },
      orientation: 'vertical',
      iconSize: 40
    },
    theme: {
      sidebarBackground: 'rgba(26, 26, 26, 0.9)',
      toolbarBackground: 'rgba(26, 26, 26, 0.8)',
      opacity: 0.9,
      borderRadius: 8
    }
  });

  // Getters
  const visibleTabs = computed(() => 
    Object.values(sidebar.value.tabs).filter(tab => 
      tab.visible && !preferences.value.hiddenTabs.includes(tab.id)
    )
  );

  const activeTabData = computed(() => 
    sidebar.value.tabs[sidebar.value.activeTab]
  );

  const activeToolData = computed(() => 
    toolbar.value.activeTool ? toolbar.value.tools[toolbar.value.activeTool] : null
  );

  const sidebarVisible = computed(() => 
    sidebar.value.visible && !sidebar.value.collapsed && deviceType.value !== 'mobile'
  );

  const toolbarVisible = computed(() => 
    toolbar.value.visible && deviceType.value !== 'mobile'
  );

  const hasFloatingWindows = computed(() => 
    Object.keys(floatingWindows.value).length > 0
  );

  // Actions

  /**
   * Initialize the HUD system
   */
  function initialize(): void {
    detectDeviceType();
    loadPreferences();
    updateViewport();
    setupKeyboardShortcuts();
  }

  /**
   * Detect device type based on viewport
   */
  function detectDeviceType(): void {
    const width = window.innerWidth;
    if (width >= 1024) {
      deviceType.value = 'desktop';
    } else if (width >= 768) {
      deviceType.value = 'tablet';
    } else {
      deviceType.value = 'mobile';
    }
  }

  /**
   * Update viewport size
   */
  function updateViewport(): void {
    viewport.value = {
      width: window.innerWidth,
      height: window.innerHeight
    };
    detectDeviceType();
  }

  // Sidebar Actions

  /**
   * Switch to a different tab
   */
  function setActiveTab(tabType: SidebarTabType): void {
    if (sidebar.value.tabs[tabType]?.visible) {
      sidebar.value.activeTab = tabType;
      preferences.value.lastActiveTab = tabType;
      savePreferences();
    }
  }

  /**
   * Toggle sidebar visibility
   */
  function toggleSidebar(): void {
    sidebar.value.visible = !sidebar.value.visible;
    savePreferences();
  }

  /**
   * Toggle sidebar collapsed state
   */
  function toggleSidebarCollapsed(): void {
    sidebar.value.collapsed = !sidebar.value.collapsed;
    preferences.value.sidebarCollapsed = sidebar.value.collapsed;
    savePreferences();
  }

  /**
   * Set sidebar width
   */
  function setSidebarWidth(width: number): void {
    const minWidth = configuration.value.sidebar.minWidth;
    const maxWidth = configuration.value.sidebar.maxWidth;
    sidebar.value.width = Math.max(minWidth, Math.min(width, maxWidth));
    preferences.value.sidebarWidth = sidebar.value.width;
    savePreferences();
  }

  /**
   * Set sidebar position
   */
  function setSidebarPosition(position: 'left' | 'right'): void {
    sidebar.value.position = position;
    preferences.value.sidebarPosition = position;
    savePreferences();
  }

  /**
   * Show/hide a tab
   */
  function setTabVisibility(tabType: SidebarTabType, visible: boolean): void {
    if (sidebar.value.tabs[tabType]) {
      sidebar.value.tabs[tabType].visible = visible;
      
      // Update hidden tabs preference
      if (visible) {
        preferences.value.hiddenTabs = preferences.value.hiddenTabs.filter(t => t !== tabType);
      } else {
        if (!preferences.value.hiddenTabs.includes(tabType)) {
          preferences.value.hiddenTabs.push(tabType);
        }
        
        // Switch to another tab if this was active
        if (sidebar.value.activeTab === tabType) {
          const nextTab = visibleTabs.value.find(t => t.id !== tabType);
          if (nextTab) {
            setActiveTab(nextTab.id);
          }
        }
      }
      
      savePreferences();
    }
  }

  /**
   * Set tab badge count
   */
  function setTabBadge(tabType: SidebarTabType, count?: number): void {
    if (sidebar.value.tabs[tabType]) {
      sidebar.value.tabs[tabType].badge = count;
    }
  }

  // Toolbar Actions

  /**
   * Set active tool
   */
  function setActiveTool(toolType: ToolType | null): void {
    // Deactivate current tool
    if (toolbar.value.activeTool) {
      toolbar.value.tools[toolbar.value.activeTool].active = false;
    }

    // Activate new tool
    toolbar.value.activeTool = toolType;
    if (toolType) {
      toolbar.value.tools[toolType].active = true;
    }
  }

  /**
   * Toggle tool active state
   */
  function toggleTool(toolType: ToolType): void {
    if (toolbar.value.activeTool === toolType) {
      setActiveTool(null);
    } else {
      setActiveTool(toolType);
    }
  }

  /**
   * Set toolbar position
   */
  function setToolbarPosition(position: Position): void {
    toolbar.value.position = position;
    preferences.value.toolbarPosition = position;
    savePreferences();
  }

  /**
   * Toggle toolbar visibility
   */
  function toggleToolbar(): void {
    toolbar.value.visible = !toolbar.value.visible;
  }

  /**
   * Set tool disabled state
   */
  function setToolDisabled(toolType: ToolType, disabled: boolean): void {
    if (toolbar.value.tools[toolType]) {
      toolbar.value.tools[toolType].disabled = disabled;
      
      // Deactivate if currently active and being disabled
      if (disabled && toolbar.value.activeTool === toolType) {
        setActiveTool(null);
      }
    }
  }

  // Floating Window Actions

  /**
   * Pop out a tab as a floating window
   */
  function popOutTab(tabType: SidebarTabType): string {
    const tab = sidebar.value.tabs[tabType];
    if (!tab || !configuration.value.sidebar.allowPopOut) {
      throw new Error(`Cannot pop out tab: ${tabType}`);
    }

    const windowId = `${tabType}-${Date.now()}`;
    const window: FloatingWindow = {
      id: windowId,
      tabType,
      title: tab.title,
      position: { x: 100, y: 100 },
      size: { width: 400, height: 500 },
      visible: true,
      minimized: false,
      zIndex: getNextZIndex(),
      resizable: true,
      draggable: true
    };

    floatingWindows.value[windowId] = window;
    
    // Hide the tab from sidebar
    setTabVisibility(tabType, false);

    return windowId;
  }

  /**
   * Dock a floating window back to sidebar
   */
  function dockWindow(windowId: string): void {
    const window = floatingWindows.value[windowId];
    if (!window) return;

    // Show the tab in sidebar
    setTabVisibility(window.tabType, true);
    setActiveTab(window.tabType);

    // Remove floating window
    delete floatingWindows.value[windowId];
  }

  /**
   * Close a floating window
   */
  function closeFloatingWindow(windowId: string): void {
    const window = floatingWindows.value[windowId];
    if (!window) return;

    // Show the tab in sidebar
    setTabVisibility(window.tabType, true);

    // Remove floating window
    delete floatingWindows.value[windowId];
  }

  /**
   * Update floating window position
   */
  function updateFloatingWindowPosition(windowId: string, position: Position): void {
    const window = floatingWindows.value[windowId];
    if (window) {
      window.position = position;
    }
  }

  /**
   * Update floating window size
   */
  function updateFloatingWindowSize(windowId: string, size: Size): void {
    const window = floatingWindows.value[windowId];
    if (window) {
      window.size = size;
    }
  }

  /**
   * Bring floating window to front
   */
  function bringWindowToFront(windowId: string): void {
    const window = floatingWindows.value[windowId];
    if (window) {
      window.zIndex = getNextZIndex();
    }
  }

  // Utility Functions

  /**
   * Get next available z-index
   */
  function getNextZIndex(): number {
    return nextZIndex.value++;
  }

  /**
   * Setup keyboard shortcuts
   */
  function setupKeyboardShortcuts(): void {
    // Tool shortcuts are handled by the toolbar component
    // Tab shortcuts could be added here
  }

  /**
   * Load preferences from localStorage
   */
  function loadPreferences(): void {
    try {
      const stored = localStorage.getItem('dungeon-lab-hud-preferences');
      if (stored) {
        const parsed = JSON.parse(stored);
        preferences.value = { ...preferences.value, ...parsed };
        
        // Apply preferences to state
        sidebar.value.width = preferences.value.sidebarWidth;
        sidebar.value.position = preferences.value.sidebarPosition;
        sidebar.value.collapsed = preferences.value.sidebarCollapsed;
        sidebar.value.activeTab = preferences.value.lastActiveTab;
        toolbar.value.position = preferences.value.toolbarPosition;
        
        // Hide tabs that were hidden
        preferences.value.hiddenTabs.forEach(tabType => {
          if (sidebar.value.tabs[tabType]) {
            sidebar.value.tabs[tabType].visible = false;
          }
        });
      }
    } catch (error) {
      console.warn('Failed to load HUD preferences:', error);
    }
  }

  /**
   * Save preferences to localStorage
   */
  function savePreferences(): void {
    try {
      localStorage.setItem('dungeon-lab-hud-preferences', JSON.stringify(preferences.value));
    } catch (error) {
      console.warn('Failed to save HUD preferences:', error);
    }
  }

  /**
   * Reset to default configuration
   */
  function resetToDefaults(): void {
    sidebar.value.width = configuration.value.sidebar.defaultWidth;
    sidebar.value.position = configuration.value.sidebar.defaultPosition;
    sidebar.value.collapsed = false;
    sidebar.value.activeTab = 'chat';
    toolbar.value.position = configuration.value.toolbar.defaultPosition;
    toolbar.value.activeTool = null;
    
    // Show all tabs
    Object.keys(sidebar.value.tabs).forEach(tabType => {
      setTabVisibility(tabType as SidebarTabType, true);
    });

    // Close all floating windows
    Object.keys(floatingWindows.value).forEach(windowId => {
      dockWindow(windowId);
    });

    savePreferences();
  }

  return {
    // State
    sidebar,
    toolbar,
    floatingWindows,
    nextZIndex,
    viewport,
    deviceType,
    preferences,
    configuration,

    // Getters
    visibleTabs,
    activeTabData,
    activeToolData,
    sidebarVisible,
    toolbarVisible,
    hasFloatingWindows,

    // Actions
    initialize,
    updateViewport,

    // Sidebar
    setActiveTab,
    toggleSidebar,
    toggleSidebarCollapsed,
    setSidebarWidth,
    setSidebarPosition,
    setTabVisibility,
    setTabBadge,

    // Toolbar
    setActiveTool,
    toggleTool,
    setToolbarPosition,
    toggleToolbar,
    setToolDisabled,

    // Floating Windows
    popOutTab,
    dockWindow,
    closeFloatingWindow,
    updateFloatingWindowPosition,
    updateFloatingWindowSize,
    bringWindowToFront,

    // Utilities
    resetToDefaults,
    loadPreferences,
    savePreferences
  };
});