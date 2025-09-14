/**
 * HUD Layout Composable
 *
 * Handles responsive behavior, device detection, and layout logic
 * for both desktop and mobile HUD interfaces.
 */

import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useHUDStore } from '../stores/hudStore.mjs';

export type DeviceType = 'desktop' | 'tablet' | 'mobile';
export type LayoutMode = 'desktop' | 'mobile';

export interface BreakpointConfig {
  mobile: number;
  tablet: number;
  desktop: number;
}

export interface HudLayoutState {
  /** Current device type */
  deviceType: DeviceType;
  /** Current layout mode (simplified to mobile/desktop) */
  layoutMode: LayoutMode;
  /** Current viewport dimensions */
  viewport: { width: number; height: number };
  /** Whether the device is in mobile layout */
  isMobile: boolean;
  /** Whether the device is in desktop layout */
  isDesktop: boolean;
  /** Whether the device supports touch */
  isTouch: boolean;
}

/**
 * Default breakpoint configuration
 */
const DEFAULT_BREAKPOINTS: BreakpointConfig = {
  mobile: 768,   // Below this is mobile
  tablet: 1024,  // Between mobile and desktop is tablet
  desktop: 1024  // Above this is desktop
};

/**
 * Composable for HUD layout and responsive behavior
 */
export function useHudLayout(breakpoints: BreakpointConfig = DEFAULT_BREAKPOINTS) {
  const hudStore = useHUDStore();

  // Reactive state
  const viewport = ref({
    width: typeof window !== 'undefined' ? window.innerWidth : 1920,
    height: typeof window !== 'undefined' ? window.innerHeight : 1080
  });

  const deviceType = ref<DeviceType>('desktop');
  const isTouch = ref(false);

  // Computed properties
  const layoutMode = computed<LayoutMode>(() => {
    return deviceType.value === 'desktop' ? 'desktop' : 'mobile';
  });

  const isMobile = computed(() => {
    return layoutMode.value === 'mobile';
  });

  const isDesktop = computed(() => {
    return layoutMode.value === 'desktop';
  });

  const isTabletOrMobile = computed(() => {
    return deviceType.value === 'tablet' || deviceType.value === 'mobile';
  });

  /**
   * Detect device type based on viewport width
   */
  function detectDeviceType(): DeviceType {
    const width = viewport.value.width;

    if (width < breakpoints.mobile) {
      return 'mobile';
    } else if (width < breakpoints.desktop) {
      return 'tablet';
    } else {
      return 'desktop';
    }
  }

  /**
   * Detect touch capability
   */
  function detectTouchCapability(): boolean {
    if (typeof window === 'undefined') return false;

    return (
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      // @ts-expect-error - for IE compatibility
      navigator.msMaxTouchPoints > 0
    );
  }

  /**
   * Update viewport dimensions and device type
   */
  function updateViewport(): void {
    if (typeof window === 'undefined') return;

    const newViewport = {
      width: window.innerWidth,
      height: window.innerHeight
    };

    const oldDeviceType = deviceType.value;
    const newDeviceType = detectDeviceType();

    // Update reactive state
    viewport.value = newViewport;
    deviceType.value = newDeviceType;

    // Update HUD store if device type changed
    if (oldDeviceType !== newDeviceType) {
      hudStore.updateViewport();
    }

    // Emit custom event for device type changes
    if (oldDeviceType !== newDeviceType && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('deviceTypeChanged', {
        detail: { oldType: oldDeviceType, newType: newDeviceType }
      }));
    }
  }

  /**
   * Check if current breakpoint matches
   */
  function matchesBreakpoint(breakpoint: keyof BreakpointConfig): boolean {
    const width = viewport.value.width;
    switch (breakpoint) {
      case 'mobile':
        return width < breakpoints.mobile;
      case 'tablet':
        return width >= breakpoints.mobile && width < breakpoints.desktop;
      case 'desktop':
        return width >= breakpoints.desktop;
      default:
        return false;
    }
  }

  /**
   * Get appropriate touch target size based on device
   */
  function getTouchTargetSize(): number {
    // Apple HIG recommends 44pt minimum
    // Material Design recommends 48dp minimum
    // We'll use 44px as our base
    return isMobile.value ? 44 : 32;
  }

  /**
   * Get appropriate spacing based on device
   */
  function getSpacing(size: 'xs' | 'sm' | 'md' | 'lg' | 'xl' = 'md'): number {
    const baseSpacing = isMobile.value ? 16 : 12;
    const multipliers = {
      xs: 0.25,
      sm: 0.5,
      md: 1,
      lg: 1.5,
      xl: 2
    };
    return baseSpacing * multipliers[size];
  }

  /**
   * Check if element should use mobile interactions
   */
  function shouldUseMobileInteractions(): boolean {
    return isMobile.value || isTouch.value;
  }

  /**
   * Get CSS media query for current breakpoint
   */
  function getMediaQuery(type: 'min' | 'max' = 'min', breakpoint: keyof BreakpointConfig = 'mobile'): string {
    const px = breakpoints[breakpoint];
    return `(${type}-width: ${px}px)`;
  }

  /**
   * Initialize layout detection
   */
  function initialize(): void {
    if (typeof window === 'undefined') return;

    // Initial detection
    isTouch.value = detectTouchCapability();
    updateViewport();

    // Setup resize listener
    window.addEventListener('resize', updateViewport);

    // Setup orientation change listener (mobile)
    if ('onorientationchange' in window) {
      window.addEventListener('orientationchange', () => {
        // Delay to allow for orientation change to complete
        setTimeout(updateViewport, 100);
      });
    }
  }

  /**
   * Cleanup event listeners
   */
  function cleanup(): void {
    if (typeof window === 'undefined') return;

    window.removeEventListener('resize', updateViewport);
    if ('onorientationchange' in window) {
      window.removeEventListener('orientationchange', updateViewport);
    }
  }

  // Auto-initialize and cleanup
  onMounted(() => {
    initialize();
  });

  onUnmounted(() => {
    cleanup();
  });

  // Create state object for easy destructuring
  const state: HudLayoutState = {
    deviceType: deviceType.value,
    layoutMode: layoutMode.value,
    viewport: viewport.value,
    isMobile: isMobile.value,
    isDesktop: isDesktop.value,
    isTouch: isTouch.value
  };

  return {
    // Reactive state
    viewport,
    deviceType,
    isTouch,

    // Computed
    layoutMode,
    isMobile,
    isDesktop,
    isTabletOrMobile,

    // Methods
    detectDeviceType,
    detectTouchCapability,
    updateViewport,
    matchesBreakpoint,
    getTouchTargetSize,
    getSpacing,
    shouldUseMobileInteractions,
    getMediaQuery,
    initialize,
    cleanup,

    // State object for destructuring
    state,

    // Configuration
    breakpoints
  };
}