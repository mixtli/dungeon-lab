/**
 * HUD (Heads-Up Display) Types
 * 
 * Type definitions for the desktop HUD system with sidebar tabs and floating toolbar.
 */

export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

// Sidebar Types
export type SidebarTabType = 
  | 'chat'
  | 'combat'
  | 'actors'
  | 'items';

export interface SidebarTab {
  id: SidebarTabType;
  title: string;
  icon: string;
  component: string;
  visible: boolean;
  badge?: number; // For notifications/counts
  disabled?: boolean;
}

export interface SidebarState {
  visible: boolean;
  activeTab: SidebarTabType;
  width: number;
  position: 'left' | 'right';
  collapsed: boolean;
  tabs: Record<SidebarTabType, SidebarTab>;
}

// Floating Window Types (for popped-out tabs)
export interface FloatingWindow {
  id: string;
  tabType: SidebarTabType;
  title: string;
  position: Position;
  size: Size;
  visible: boolean;
  minimized: boolean;
  zIndex: number;
  resizable: boolean;
  draggable: boolean;
}

// Toolbar Types
export type ToolType = 
  | 'token-control'
  | 'measurement'
  | 'walls'
  | 'lighting';

export interface Tool {
  id: ToolType;
  title: string;
  icon: string;
  active: boolean;
  disabled?: boolean;
  shortcut?: string;
  tooltip?: string;
}

export interface ToolbarState {
  visible: boolean;
  position: Position;
  orientation: 'horizontal' | 'vertical';
  activeTool: ToolType | null;
  tools: Record<ToolType, Tool>;
}

// Main HUD State
export interface HUDState {
  sidebar: SidebarState;
  toolbar: ToolbarState;
  floatingWindows: Record<string, FloatingWindow>;
  nextZIndex: number;
  viewport: Size;
  deviceType: 'desktop' | 'tablet' | 'mobile';
}

// Events
export interface TabSwitchEvent {
  previousTab: SidebarTabType;
  newTab: SidebarTabType;
}

export interface TabPopOutEvent {
  tabType: SidebarTabType;
  windowId: string;
}

export interface ToolSelectEvent {
  previousTool: ToolType | null;
  newTool: ToolType;
}

// Configuration
export interface HUDConfiguration {
  sidebar: {
    defaultWidth: number;
    minWidth: number;
    maxWidth: number;
    defaultPosition: 'left' | 'right';
    allowCollapse: boolean;
    allowPopOut: boolean;
  };
  toolbar: {
    defaultPosition: Position;
    orientation: 'horizontal' | 'vertical';
    iconSize: number;
  };
  theme: {
    sidebarBackground: string;
    toolbarBackground: string;
    opacity: number;
    borderRadius: number;
  };
}

// Preferences
export interface HUDPreferences {
  sidebarWidth: number;
  sidebarPosition: 'left' | 'right';
  sidebarCollapsed: boolean;
  toolbarPosition: Position;
  lastActiveTab: SidebarTabType;
  hiddenTabs: SidebarTabType[];
  theme: 'light' | 'dark' | 'auto';
  opacity: number;
}