import { defineComponent, ref, reactive, onMounted, onUnmounted } from 'vue';
import type { PluginContext } from '../types/plugin.mjs';

/**
 * Base plugin component props
 */
export interface BasePluginComponentProps {
  /** Plugin context */
  context: PluginContext;
  
  /** Initial data for the component */
  initialData?: Record<string, unknown>;
  
  /** Whether the component is in readonly mode */
  readonly?: boolean;
}

/**
 * Base plugin component emits
 */
export interface BasePluginComponentEmits {
  /** Emitted when component data is updated */
  'update': [data: Record<string, unknown>];
  
  /** Emitted when component is submitted */
  'submit': [data: Record<string, unknown>];
  
  /** Emitted when component encounters an error */
  'error': [error: string];
  
  /** Emitted when component wants to cancel */
  'cancel': [];
}

/**
 * Base Vue 3 component for character sheets
 * Provides common functionality for character sheet components
 */
export const BaseCharacterSheetComponent = defineComponent({
  props: {
    character: {
      type: Object,
      required: true
    },
    context: {
      type: Object as () => PluginContext,
      required: true
    },
    readonly: {
      type: Boolean,
      default: false
    }
  },
  
  emits: {
    'update': (_character: Record<string, unknown>) => true,
    'error': (_error: string) => true
  },
  
  setup(props, { emit }) {
    const loading = ref(false);
    const error = ref<string | null>(null);
    const localCharacter = reactive({ ...props.character });
    
    // Watch for character prop changes
    const stopWatching = props.context.store.subscribe('character', (newCharacter) => {
      Object.assign(localCharacter, newCharacter);
    });
    
    onMounted(() => {
      // Component mounted - could load additional data here
    });
    
    onUnmounted(() => {
      stopWatching();
    });
    
    const updateCharacter = (updates: Partial<Record<string, unknown>>) => {
      if (props.readonly) return;
      
      Object.assign(localCharacter, updates);
      emit('update', localCharacter);
    };
    
    const handleError = (errorMessage: string) => {
      error.value = errorMessage;
      emit('error', errorMessage);
    };
    
    return {
      loading,
      error,
      localCharacter,
      updateCharacter,
      handleError
    };
  }
});

/**
 * Base Vue 3 component for game mechanics
 * Provides common functionality for mechanics like dice rolling, initiative, etc.
 */
export const BaseMechanicsComponent = defineComponent({
  props: {
    mechanic: {
      type: String,
      required: true
    },
    context: {
      type: Object as () => PluginContext,
      required: true
    },
    parameters: {
      type: Object,
      default: () => ({})
    }
  },
  
  emits: {
    'result': (_result: Record<string, unknown>) => true,
    'error': (_error: string) => true
  },
  
  setup(props, { emit }) {
    const loading = ref(false);
    const error = ref<string | null>(null);
    const result = ref<unknown>(null);
    
    const executeMechanic = async () => {
      try {
        loading.value = true;
        error.value = null;
        
        // Get the mechanic from context
        // This would be implemented by the actual plugin registry
        const mechanic = props.context.store.get<{ execute: (params: unknown) => Promise<unknown> }>(`mechanic:${props.mechanic}`);
        if (!mechanic || typeof mechanic.execute !== 'function') {
          throw new Error(`Mechanic '${props.mechanic}' not found`);
        }
        
        // Execute the mechanic with parameters
        const mechanicResult = await mechanic.execute(props.parameters);
        result.value = mechanicResult;
        emit('result', mechanicResult);
        
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        error.value = errorMessage;
        emit('error', errorMessage);
      } finally {
        loading.value = false;
      }
    };
    
    return {
      loading,
      error,
      result,
      executeMechanic
    };
  }
});

/**
 * Plugin component lifecycle management
 */
export interface PluginComponentLifecycle {
  /**
   * Called when component is mounted
   */
  onPluginMount?(): void | Promise<void>;
  
  /**
   * Called when component is unmounted
   */
  onPluginUnmount?(): void | Promise<void>;
  
  /**
   * Called when plugin data is updated
   */
  onPluginDataUpdate?(data: unknown): void | Promise<void>;
  
  /**
   * Called when plugin should validate its data
   */
  onPluginValidate?(): boolean | Promise<boolean>;
}

/**
 * Plugin component utilities
 */
export const PluginComponentUtils = {
  /**
   * Create a reactive data store for plugin components
   */
  createStore<T extends Record<string, unknown>>(initialData: T) {
    const store = reactive(initialData);
    const subscribers = new Map<string, ((value: unknown) => void)[]>();
    
    return {
      get<K extends keyof T>(key: K): T[K] {
        return store[key as string] as T[K];
      },
      
      set<K extends keyof T>(key: K, value: T[K]) {
        (store as any)[key] = value;
        const keySubscribers = subscribers.get(key as string) || [];
        keySubscribers.forEach(callback => callback(value));
      },
      
      subscribe<K extends keyof T>(key: K, callback: (value: T[K]) => void): () => void {
        const keyStr = key as string;
        if (!subscribers.has(keyStr)) {
          subscribers.set(keyStr, []);
        }
        const wrappedCallback = (value: unknown) => callback(value as T[K]);
        subscribers.get(keyStr)!.push(wrappedCallback);
        
        // Return unsubscribe function
        return () => {
          const keySubscribers = subscribers.get(keyStr);
          if (keySubscribers) {
            const index = keySubscribers.indexOf(wrappedCallback);
            if (index > -1) {
              keySubscribers.splice(index, 1);
            }
          }
        };
      },
      
      getAll(): T {
        return { ...store } as T;
      }
    };
  },
  
  /**
   * Create an event emitter for plugin components
   */
  createEventEmitter() {
    const listeners = new Map<string, ((data: unknown) => void)[]>();
    
    return {
      emit(event: string, data?: unknown) {
        const eventListeners = listeners.get(event) || [];
        eventListeners.forEach(listener => listener(data));
      },
      
      on(event: string, handler: (data: unknown) => void): () => void {
        if (!listeners.has(event)) {
          listeners.set(event, []);
        }
        listeners.get(event)!.push(handler);
        
        // Return unsubscribe function
        return () => {
          const eventListeners = listeners.get(event);
          if (eventListeners) {
            const index = eventListeners.indexOf(handler);
            if (index > -1) {
              eventListeners.splice(index, 1);
            }
          }
        };
      }
    };
  }
};