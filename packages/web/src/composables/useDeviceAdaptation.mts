import { ref, computed, onMounted, onUnmounted, readonly } from 'vue';
import { useWindowSize } from '@vueuse/core';

export type DeviceType = 'desktop' | 'tablet' | 'phone';

export interface DeviceConfig {
  type: DeviceType;
  isTouchDevice: boolean;
  hasHover: boolean;
  screenSize: {
    width: number;
    height: number;
  };
  breakpoints: {
    isSmall: boolean;
    isMedium: boolean;
    isLarge: boolean;
    isXLarge: boolean;
  };
  performance: {
    preferReducedMotion: boolean;
    canUseHighDPI: boolean;
    maxTokens: number;
    enableParticles: boolean;
  };
  interaction: {
    touchTargetSize: number;
    dragThreshold: number;
    hoverDelay: number;
  };
}

export function useDeviceAdaptation() {
  const { width, height } = useWindowSize();
  const deviceType = ref<DeviceType>('desktop');
  const isTouchDevice = ref(false);
  const hasHover = ref(true);
  const preferReducedMotion = ref(false);

  // Device detection logic
  const detectDevice = () => {
    // Check for touch capability
    isTouchDevice.value = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    // Check for hover capability
    hasHover.value = window.matchMedia('(hover: hover)').matches;
    
    // Check for reduced motion preference
    preferReducedMotion.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    // Determine device type based on screen size and capabilities
    if (width.value >= 1024) {
      deviceType.value = 'desktop';
    } else if (width.value >= 768) {
      deviceType.value = 'tablet';
    } else {
      deviceType.value = 'phone';
    }
    
    // Override device type if touch-only device (likely mobile/tablet)
    if (isTouchDevice.value && !hasHover.value) {
      if (width.value >= 768) {
        deviceType.value = 'tablet';
      } else {
        deviceType.value = 'phone';
      }
    }
  };

  // Computed device configuration
  const deviceConfig = computed<DeviceConfig>(() => {
    const type = deviceType.value;
    const isTouch = isTouchDevice.value;
    const canHover = hasHover.value;
    
    return {
      type,
      isTouchDevice: isTouch,
      hasHover: canHover,
      screenSize: {
        width: width.value,
        height: height.value,
      },
      breakpoints: {
        isSmall: width.value < 640,
        isMedium: width.value >= 640 && width.value < 1024,
        isLarge: width.value >= 1024 && width.value < 1280,
        isXLarge: width.value >= 1280,
      },
      performance: {
        preferReducedMotion: preferReducedMotion.value,
        canUseHighDPI: window.devicePixelRatio > 1,
        maxTokens: type === 'phone' ? 50 : type === 'tablet' ? 100 : 200,
        enableParticles: type === 'desktop' && !preferReducedMotion.value,
      },
      interaction: {
        touchTargetSize: isTouch ? 44 : 32, // 44px minimum for touch accessibility
        dragThreshold: isTouch ? 10 : 5,
        hoverDelay: canHover ? 300 : 0,
      },
    };
  });

  // CSS classes for device-specific styling
  const deviceClass = computed(() => {
    const config = deviceConfig.value;
    const classes = [
      `device-${config.type}`,
      config.isTouchDevice ? 'touch-device' : 'no-touch',
      config.hasHover ? 'has-hover' : 'no-hover',
      config.performance.preferReducedMotion ? 'reduced-motion' : 'full-motion',
    ];
    
    if (config.breakpoints.isSmall) classes.push('screen-sm');
    if (config.breakpoints.isMedium) classes.push('screen-md');
    if (config.breakpoints.isLarge) classes.push('screen-lg');
    if (config.breakpoints.isXLarge) classes.push('screen-xl');
    
    return classes.join(' ');
  });

  // Platform-specific rendering configurations
  const renderConfig = computed(() => {
    const config = deviceConfig.value;
    
    return {
      // Pixi.js application settings
      pixi: {
        antialias: config.type === 'desktop',
        resolution: config.performance.canUseHighDPI ? window.devicePixelRatio : 1,
        powerPreference: config.type === 'phone' ? 'low-power' : 'high-performance',
        backgroundAlpha: 1,
        clearBeforeRender: true,
        preserveDrawingBuffer: false,
        failIfMajorPerformanceCaveat: config.type === 'phone',
      },
      
      // Performance settings
      performance: {
        enableCulling: true,
        cullPadding: config.type === 'phone' ? 100 : 200,
        maxFPS: config.type === 'phone' ? 30 : 60,
        enableLOD: config.type !== 'desktop',
        particleCount: config.performance.enableParticles ? 100 : 0,
      },
      
      // Interaction settings
      interaction: {
        enableDrag: true,
        enableZoom: true,
        enablePan: true,
        zoomSpeed: config.isTouchDevice ? 0.1 : 0.2,
        panSpeed: config.isTouchDevice ? 1.5 : 1.0,
        minZoom: 0.1,
        maxZoom: config.type === 'phone' ? 3 : 5,
      },
    };
  });

  // Orientation handling for mobile devices
  const orientation = ref<'portrait' | 'landscape'>('landscape');
  
  const updateOrientation = () => {
    orientation.value = height.value > width.value ? 'portrait' : 'landscape';
  };

  // Media query listeners
  let mediaQueries: MediaQueryList[] = [];
  
  const setupMediaQueries = () => {
    // Clean up existing listeners
    mediaQueries.forEach(mq => {
      mq.removeEventListener('change', detectDevice);
    });
    
    // Set up new listeners
    const queries = [
      '(hover: hover)',
      '(prefers-reduced-motion: reduce)',
      '(min-width: 768px)',
      '(min-width: 1024px)',
    ];
    
    mediaQueries = queries.map(query => {
      const mq = window.matchMedia(query);
      mq.addEventListener('change', detectDevice);
      return mq;
    });
  };

  // Lifecycle
  onMounted(() => {
    detectDevice();
    updateOrientation();
    setupMediaQueries();
    
    // Listen for orientation changes
    window.addEventListener('orientationchange', updateOrientation);
    window.addEventListener('resize', updateOrientation);
  });

  onUnmounted(() => {
    // Clean up media query listeners
    mediaQueries.forEach(mq => {
      mq.removeEventListener('change', detectDevice);
    });
    
    // Clean up orientation listeners
    window.removeEventListener('orientationchange', updateOrientation);
    window.removeEventListener('resize', updateOrientation);
  });

  return {
    // Reactive properties
    deviceType: readonly(deviceType),
    isTouchDevice: readonly(isTouchDevice),
    hasHover: readonly(hasHover),
    orientation: readonly(orientation),
    
    // Computed configurations
    deviceConfig: readonly(deviceConfig),
    deviceClass: readonly(deviceClass),
    renderConfig: readonly(renderConfig),
    
    // Utility methods
    detectDevice,
    updateOrientation,
    
    // Convenience getters
    isDesktop: computed(() => deviceType.value === 'desktop'),
    isTablet: computed(() => deviceType.value === 'tablet'),
    isPhone: computed(() => deviceType.value === 'phone'),
    isMobile: computed(() => deviceType.value === 'phone' || deviceType.value === 'tablet'),
  };
} 