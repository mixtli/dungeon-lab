/**
 * Token Status Bar Service
 * 
 * Service for calculating and caching token status bar data based on document state
 * and plugin configurations. This service bridges the gap between plugin-defined
 * status bar configs and the visual rendering system.
 */

import type { TokenStatusBarConfig, TokenStatusBarData } from '@dungeon-lab/shared/types/token-status-bars.mjs';
import type { IVTTDocument } from '@dungeon-lab/shared/types/index.mjs';
import type { GameSystemPlugin } from '@dungeon-lab/shared-ui/types/plugin.mjs';

// Local cache interface (not stored in game state)
interface TokenStatusBarCache {
  bars: { [barId: string]: TokenStatusBarData };
  lastUpdated: number;
}

/**
 * Service for managing token status bars
 */
export class TokenStatusBarService {
  /**
   * Calculate status bar data for a document using plugin configuration
   * 
   * @param document The document to calculate status bars for
   * @param plugin The game system plugin providing status bar configuration
   * @returns Array of calculated status bar data
   */
  static calculateStatusBars(
    document: IVTTDocument,
    plugin: GameSystemPlugin
  ): TokenStatusBarData[] {
    // Get status bar configurations from plugin
    const configs = plugin.getTokenStatusBarConfig(document.documentType);
    
    if (!configs.length) {
      return [];
    }
    
    const statusBars: TokenStatusBarData[] = [];
    
    for (const config of configs) {
      const statusBarData = this.calculateStatusBarData(document, config);
      if (statusBarData) {
        statusBars.push(statusBarData);
      }
    }
    
    return statusBars;
  }
  
  /**
   * Calculate status bar data for a single configuration
   * 
   * @param document The document to extract data from
   * @param config The status bar configuration
   * @returns Calculated status bar data or null if data cannot be extracted
   */
  private static calculateStatusBarData(
    document: IVTTDocument,
    config: TokenStatusBarConfig
  ): TokenStatusBarData | null {
    // Try to get values from document state first (runtime values)
    let current = this.getValueFromPath(document.state, config.dataPath.current);
    let maximum = this.getValueFromPath(document.state, config.dataPath.maximum);
    
    // If not found in state, try plugin data (base values)
    if (typeof current !== 'number') {
      current = this.getValueFromPath(document.pluginData, config.dataPath.current);
    }
    if (typeof maximum !== 'number') {
      maximum = this.getValueFromPath(document.pluginData, config.dataPath.maximum);
    }
    
    // Validate we have numeric maximum value
    if (typeof maximum !== 'number') {
      console.warn(`[TokenStatusBar] Could not extract maximum value for ${config.id} from document ${document.id}`, {
        current,
        maximum,
        currentPath: config.dataPath.current,
        maximumPath: config.dataPath.maximum,
        documentState: document.state,
        documentPluginData: document.pluginData
      });
      return null;
    }
    
    // If current is not defined, default to maximum (full health for new tokens)
    let currentValue: number;
    if (typeof current !== 'number') {
      currentValue = maximum;
    } else {
      currentValue = current;
    }
    
    // Calculate percentage and display color
    const percentage = maximum > 0 ? Math.max(0, Math.min(1, currentValue / maximum)) : 0;
    const displayColor = this.calculateDisplayColor(percentage, config);
    
    return {
      config,
      current: currentValue,
      maximum,
      percentage,
      displayColor,
      visible: config.visible !== false // Default to visible unless explicitly false
    };
  }
  
  /**
   * Extract a value from an object using a dot-notation path
   * 
   * @param obj The object to extract from
   * @param path Dot-notation path (e.g., 'attributes.hitPoints.current')
   * @returns The extracted value or undefined
   */
  private static getValueFromPath(obj: unknown, path: string): unknown {
    if (!obj || typeof obj !== 'object') {
      return undefined;
    }
    
    const parts = path.split('.');
    let current: unknown = obj;
    
    for (const part of parts) {
      if (current && typeof current === 'object' && current !== null) {
        const obj = current as Record<string, unknown>;
        if (part in obj) {
          current = obj[part];
        } else {
          return undefined;
        }
      } else {
        return undefined;
      }
    }
    
    return current;
  }
  
  /**
   * Calculate the display color for a status bar based on percentage and thresholds
   * 
   * @param percentage The current percentage (0-1)
   * @param config The status bar configuration
   * @returns The hex color to display
   */
  private static calculateDisplayColor(percentage: number, config: TokenStatusBarConfig): string {
    // Check for warning threshold
    if (config.warningThreshold && config.color.warning && percentage <= config.warningThreshold) {
      return config.color.warning;
    }
    
    // Interpolate between empty and full colors based on percentage
    if (percentage <= 0) {
      return config.color.empty;
    } else if (percentage >= 1) {
      return config.color.full;
    } else {
      // Linear interpolation between empty and full colors
      return this.interpolateColor(config.color.empty, config.color.full, percentage);
    }
  }
  
  /**
   * Interpolate between two hex colors
   * 
   * @param startColor Starting hex color (e.g., '#ff0000')
   * @param endColor Ending hex color (e.g., '#00ff00')
   * @param factor Interpolation factor (0-1)
   * @returns Interpolated hex color
   */
  private static interpolateColor(startColor: string, endColor: string, factor: number): string {
    // Parse hex colors
    const start = this.parseHexColor(startColor);
    const end = this.parseHexColor(endColor);
    
    if (!start || !end) {
      // Fallback to start color if parsing fails
      return startColor;
    }
    
    // Interpolate each channel
    const r = Math.round(start.r + (end.r - start.r) * factor);
    const g = Math.round(start.g + (end.g - start.g) * factor);
    const b = Math.round(start.b + (end.b - start.b) * factor);
    
    // Convert back to hex
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }
  
  /**
   * Parse a hex color string to RGB components
   * 
   * @param hexColor Hex color string (e.g., '#ff0000' or 'ff0000')
   * @returns RGB components or null if parsing fails
   */
  private static parseHexColor(hexColor: string): { r: number; g: number; b: number } | null {
    // Remove # prefix if present
    const hex = hexColor.replace('#', '');
    
    // Validate hex format
    if (!/^[0-9a-fA-F]{6}$/.test(hex)) {
      return null;
    }
    
    return {
      r: parseInt(hex.substring(0, 2), 16),
      g: parseInt(hex.substring(2, 4), 16),
      b: parseInt(hex.substring(4, 6), 16)
    };
  }
  
  /**
   * Create a status bar cache for a document
   * 
   * @param document The document to create cache for
   * @param plugin The game system plugin
   * @returns Status bar cache object
   */
  static createStatusBarCache(
    document: IVTTDocument,
    plugin: GameSystemPlugin
  ): TokenStatusBarCache {
    const statusBars = this.calculateStatusBars(document, plugin);
    
    // Convert array to keyed object
    const bars: { [barId: string]: TokenStatusBarData } = {};
    for (const statusBar of statusBars) {
      bars[statusBar.config.id] = statusBar;
    }
    
    return {
      bars,
      lastUpdated: Date.now()
    };
  }
  
  /**
   * Check if a status bar cache is still valid
   * 
   * @param cache The status bar cache to check
   * @param document The current document state (unused for now, kept for future use)
   * @param maxAge Maximum cache age in milliseconds (default: 5 seconds)
   * @returns True if cache is still valid
   */
  static isCacheValid(
    cache: TokenStatusBarCache | undefined,
    _document: IVTTDocument,
    maxAge = 5000
  ): boolean {
    if (!cache) {
      return false;
    }
    
    // Check age
    const age = Date.now() - cache.lastUpdated;
    if (age > maxAge) {
      return false;
    }
    
    return true;
  }
}