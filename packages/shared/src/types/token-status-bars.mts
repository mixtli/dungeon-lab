/**
 * Token Status Bar System
 * 
 * This module defines the types and interfaces for the plugin-configurable
 * token status bar system. Status bars allow game systems to display
 * visual indicators (like HP bars) on tokens based on document data.
 */

/**
 * Configuration for a single status bar that can appear on a token
 */
export interface TokenStatusBarConfig {
  /** Unique identifier for this status bar type */
  id: string;
  
  /** Human-readable label for this status bar */
  label: string;
  
  /** Position relative to the token sprite */
  position: 'top' | 'bottom';
  
  /** Color configuration for the status bar */
  color: {
    /** Color when bar is full/healthy (e.g., green) */
    full: string;
    /** Color when bar is empty/critical (e.g., red) */
    empty: string;
    /** Optional warning color for low values (e.g., yellow) */
    warning?: string;
  };
  
  /** Data paths to extract current and maximum values from document.pluginData */
  dataPath: {
    /** Path to current value (e.g., 'attributes.hitPoints.current') */
    current: string;
    /** Path to maximum value (e.g., 'attributes.hitPoints.maximum') */
    maximum: string;
  };
  
  /** 
   * Optional threshold (0-1) below which warning color is used
   * e.g., 0.3 means show warning color when below 30%
   */
  warningThreshold?: number;
  
  /** Whether this status bar should be visible by default */
  visible?: boolean;
}

/**
 * Computed status bar data with actual values
 */
export interface TokenStatusBarData {
  /** Configuration this data is based on */
  config: TokenStatusBarConfig;
  
  /** Current value */
  current: number;
  
  /** Maximum value */
  maximum: number;
  
  /** Computed percentage (0-1) */
  percentage: number;
  
  /** Computed display color based on percentage and thresholds */
  displayColor: string;
  
  /** Whether this bar should be displayed */
  visible: boolean;
}

/**
 * Cached status bar values stored on the token
 * This avoids recalculating values on every render
 */
export interface TokenStatusBarCache {
  /** Cached status bar data by bar ID */
  bars: { [barId: string]: TokenStatusBarData };
  
  /** Timestamp when cache was last updated */
  lastUpdated: number;
  
  /** Document version this cache is based on */
  documentVersion?: number;
}