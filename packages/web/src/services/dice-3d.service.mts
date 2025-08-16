// No imports needed - we'll work directly with notation strings

/**
 * Service for managing 3D dice rolling visualization
 */
export class Dice3DService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private diceBox: any = null;
  private container: HTMLElement | null = null;
  private isRolling = false;
  private cleanupTimer: ReturnType<typeof setTimeout> | null = null;
  private isInitialized = false;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  private eventListeners: { [event: string]: Function[] } = {};

  /**
   * Initialize the 3D dice system
   * @param selector - CSS selector for the container element
   */
  async initialize(selector: string): Promise<void> {
    if (this.isInitialized) {
      console.warn('Dice3DService already initialized');
      return;
    }

    // Wait a bit to ensure DOM and CSS are fully applied
    await new Promise(resolve => setTimeout(resolve, 50));

    this.container = document.querySelector(selector);
    
    // Ensure container exists and has dimensions
    if (!this.container) {
      throw new Error(`Container not found: ${selector}`);
    }
    
    // Check if container is visible in DOM
    const computedStyle = window.getComputedStyle(this.container);
    if (computedStyle.display === 'none') {
      throw new Error(`Container is not visible (display: none)`);
    }
    
    if (this.container.offsetWidth === 0 || this.container.offsetHeight === 0) {
      throw new Error(`Container has no dimensions: ${this.container.offsetWidth}x${this.container.offsetHeight}`);
    }
    
    console.log(`Container dimensions: ${this.container.offsetWidth}x${this.container.offsetHeight}`);
    
    try {
      // Check WebGL support first
      const canvas = document.createElement('canvas');
      const webglContext = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      console.log('WebGL support:', !!webglContext);
      if (!webglContext) {
        throw new Error('WebGL not supported in this browser');
      }

      // Dynamic import of the dice-box-threejs package
      const { default: DiceBox } = await import('@3d-dice/dice-box-threejs');
      console.log('DiceBox constructor:', DiceBox);
      console.log('DiceBox type:', typeof DiceBox);
      
      // Check if the library loaded correctly
      if (!DiceBox) {
        throw new Error('DiceBox not found in @3d-dice/dice-box-threejs import');
      }
      
      // Use exact same configuration that works in DiceTestView
      const config = {
        assetPath: '/assets/dice-box/',
        theme_customColorset: {
          background: "#00ffcb",
          foreground: "#ffffff",
          texture: "marble",
          material: "metal"
        },
        light_intensity: 1,
        gravity_multiplier: 600,
        baseScale: 100,
        strength: 2,
        sounds: true,
        framerate: 1/60,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onRollComplete: (results: any) => {
          console.log('DiceBox onRollComplete callback:', results);
          this.isRolling = false;
          
          // Schedule cleanup 5 seconds after dice have settled
          this.scheduleCleanupAfterSettle();
        }
      };
      
      console.log('Initializing 3D dice with config:', config);
      console.log('Container selector:', selector);
      console.log('Container element:', this.container);
      console.log('Container computed styles:', window.getComputedStyle(this.container));
      
      // Initialize dice-box-threejs - ready to use immediately
      try {
        console.log('Creating DiceBox instance...');
        this.diceBox = new DiceBox(selector, config);
        console.log('DiceBox constructor completed');
        console.log('DiceBox instance:', this.diceBox);
        console.log('DiceBox properties:', Object.keys(this.diceBox || {}));
        console.log('DiceBox prototype:', Object.getPrototypeOf(this.diceBox || {}));
        console.log('DiceBox constructor name:', this.diceBox?.constructor?.name);
        
        // Try to access internal properties if available
        if (this.diceBox) {
          console.log('DiceBox internal state:');
          console.log('- has scene property:', 'scene' in this.diceBox);
          console.log('- has renderer property:', 'renderer' in this.diceBox);
          console.log('- has camera property:', 'camera' in this.diceBox);
          console.log('- has world property:', 'world' in this.diceBox);
          console.log('- has init property:', 'init' in this.diceBox);
          console.log('- has roll property:', 'roll' in this.diceBox);
          
          // Try to access renderer directly if it exists
          if ('renderer' in this.diceBox) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            console.log('- renderer value:', (this.diceBox as any).renderer);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            console.log('- renderer type:', typeof (this.diceBox as any).renderer);
          }
          
          // Check if there are any methods that might initialize the renderer
          const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(this.diceBox));
          console.log('DiceBox methods:', methods);
        }
        
        // Initialize the DiceBox renderer and camera
        console.log('Calling DiceBox.initialize()...');
        if (typeof this.diceBox.initialize === 'function') {
          await this.diceBox.initialize();
          console.log('DiceBox.initialize() completed');
          
          // Wait like the working example does to ensure everything is ready
          console.log('Waiting 1 second for dice box to fully initialize...');
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Check if renderer is now available
          if (this.diceBox && 'renderer' in this.diceBox) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const renderer = (this.diceBox as any).renderer;
            console.log('After initialize - renderer value:', renderer);
            console.log('After initialize - has camera:', 'camera' in this.diceBox);
            
            // Let the library use its default camera positioning like in DiceTestView
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const camera = (this.diceBox as any).camera;
            if (camera) {
              console.log('Using default camera position:', camera.position);
            }
            
            // Check if the canvas is properly attached to our container
            if (renderer && renderer.domElement) {
              console.log('Canvas element:', renderer.domElement);
              console.log('Canvas parent:', renderer.domElement.parentNode);
              console.log('Canvas style:', renderer.domElement.style.cssText);
              console.log('Container children:', this.container.children.length);
              
              // Ensure canvas is attached to our container
              if (renderer.domElement.parentNode !== this.container) {
                console.log('Attaching canvas to container...');
                this.container.appendChild(renderer.domElement);
              }
            }
          }
        } else {
          console.warn('DiceBox.initialize method not found');
        }
        
      } catch (constructorError) {
        console.error('DiceBox constructor failed:', constructorError);
        console.error('Constructor error stack:', constructorError instanceof Error ? constructorError.stack : 'No stack trace');
        throw constructorError;
      }
      
      this.isInitialized = true;
      console.log('3D dice service initialized successfully');
      
    } catch (error) {
      console.error('Failed to initialize 3D dice service:', error);
      throw new Error(`Failed to initialize 3D dice: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Roll dice with predetermined notation string
   * @param notation - The dice notation string (e.g., "2d20+1d6@15,8,3")
   */
  async rollWithNotation(notation: string): Promise<void> {
    if (!this.diceBox || !this.isInitialized) {
      console.warn('Dice3DService not initialized');
      return;
    }
    
    // Verify renderer exists before attempting to roll
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!('renderer' in this.diceBox) || !(this.diceBox as any).renderer) {
      console.error('Three.js renderer not initialized, cannot roll 3D dice');
      return;
    }
    
    if (this.isRolling) {
      console.warn('Dice are already rolling, skipping new roll');
      return;
    }

    this.isRolling = true;
    
    try {
      console.log('Rolling 3D dice with notation:', notation);
      
      // Check renderer state before rolling
      if ('renderer' in this.diceBox) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        console.log('Before roll - renderer state:', (this.diceBox as any).renderer);
      }
      
      console.log('About to call diceBox.roll()...');
      
      // Roll dice with predetermined results
      try {
        console.log('Starting dice roll animation...');
        
        // Check scene state before rolling
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const scene = (this.diceBox as any).scene;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const camera = (this.diceBox as any).camera;
        console.log('Scene children count before roll:', scene ? scene.children?.length : 'no scene');
        console.log('Camera position:', camera ? `${camera.position.x}, ${camera.position.y}, ${camera.position.z}` : 'no camera');
        
        // Roll dice with predetermined results using direct notation
        console.log('Rolling dice with notation:', notation);
        
        try {
          // Direct call - no timeouts or complex logic
          this.diceBox.roll(notation);
          console.log('Roll initiated, waiting for onRollComplete callback...');
        } catch (error) {
          console.error('Error rolling dice:', error);
          this.isRolling = false;
          throw error;
        }
        
        // Check scene state after rolling
        console.log('Scene children count after roll:', scene ? scene.children?.length : 'no scene');
        
        // Check if there are actual dice in the scene
        if (this.diceBox.meshes) {
          console.log('Dice meshes count:', this.diceBox.meshes.length);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          console.log('Dice meshes types:', this.diceBox.meshes.map((mesh: any) => mesh.geometry?.type || 'unknown'));
        }
        if (this.diceBox.diceList) {
          console.log('Dice list count:', this.diceBox.diceList.length);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          console.log('Dice list details:', this.diceBox.diceList.map((die: any) => ({ sides: die.sides, result: die.result })));
        }
        
        // Log scene children to see all objects
        if (scene && scene.children) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          console.log('Scene children details:', scene.children.map((child: any) => ({ 
            type: child.type, 
            name: child.name, 
            position: `${child.position?.x}, ${child.position?.y}, ${child.position?.z}` 
          })));
        }
        
        // Check if canvas is visible and has content
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const renderer = (this.diceBox as any).renderer;
        if (renderer && renderer.domElement) {
          console.log('Canvas dimensions:', renderer.domElement.width, 'x', renderer.domElement.height);
          console.log('Canvas visibility:', window.getComputedStyle(renderer.domElement).visibility);
          console.log('Canvas display:', window.getComputedStyle(renderer.domElement).display);
          console.log('Canvas z-index:', window.getComputedStyle(renderer.domElement).zIndex);
        }
        
        // Wait a bit to see if dice settle visibly
        console.log('Waiting 2 seconds to observe dice settling...');
        setTimeout(() => {
          console.log('After 2s - Scene children:', scene ? scene.children?.length : 'no scene');
          console.log('After 2s - Dice meshes:', this.diceBox.meshes ? this.diceBox.meshes.length : 'no meshes');
        }, 2000);
      } catch (rollError) {
        console.error('Roll failed:', rollError);
        console.error('Roll error stack:', rollError instanceof Error ? rollError.stack : 'No stack');
        throw rollError;
      }
      
      // Note: Cleanup is now handled by onRollComplete callback
      // which will call scheduleCleanupAfterSettle() when dice finish settling
    } catch (error) {
      console.error('Error rolling 3D dice:', error);
      this.isRolling = false;
    }
  }


  /**
   * Schedule cleanup after dice have settled (called by onRollComplete)
   * This provides better timing than a fixed delay from roll start
   */
  private scheduleCleanupAfterSettle(): void {
    console.log('Dice have settled - scheduling cleanup in 5 seconds');
    
    if (this.cleanupTimer) {
      clearTimeout(this.cleanupTimer);
    }
    
    this.cleanupTimer = setTimeout(() => {
      this.clearDice();
    }, 5000);
  }

  /**
   * Clear dice from the scene
   * Note: dice-box-threejs doesn't have a clear method, so we just stop tracking rolls
   * and let the overlay hide. The next roll will naturally replace any existing dice.
   */
  clearDice(): void {
    this.isRolling = false;
    
    if (this.cleanupTimer) {
      clearTimeout(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    console.log('Dice cleanup completed - overlay will hide');
    
    // Emit cleanup event to notify listeners (like overlay)
    this.emit('diceCleared');
  }

  /**
   * Check if the service is initialized
   */
  isReady(): boolean {
    return this.isInitialized && this.diceBox !== null;
  }

  /**
   * Add event listener
   */
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  on(event: string, callback: Function): void {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    this.eventListeners[event].push(callback);
  }

  /**
   * Remove event listener
   */
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  off(event: string, callback: Function): void {
    if (this.eventListeners[event]) {
      const index = this.eventListeners[event].indexOf(callback);
      if (index > -1) {
        this.eventListeners[event].splice(index, 1);
      }
    }
  }

  /**
   * Emit event to all listeners
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private emit(event: string, ...args: any[]): void {
    if (this.eventListeners[event]) {
      this.eventListeners[event].forEach(callback => {
        try {
          callback(...args);
        } catch (error) {
          console.warn('Error in dice service event listener:', error);
        }
      });
    }
  }

  /**
   * Cleanup resources and destroy the dice box
   */
  destroy(): void {
    console.log('Destroying 3D dice service');
    
    // Clear any running timers
    this.clearDice();
    
    // Clear all event listeners
    this.eventListeners = {};
    
    // Note: dice-box-threejs doesn't have a destroy method
    // Just reset our state
    this.diceBox = null;
    this.container = null;
    this.isInitialized = false;
    this.isRolling = false;
  }
}

// Export a singleton instance for use across the application
export const dice3DService = new Dice3DService();
export default dice3DService;