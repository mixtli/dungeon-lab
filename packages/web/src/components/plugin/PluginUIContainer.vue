<template>
  <div>
    <div v-if="loading" class="plugin-loading">
      <p>Loading plugin content...</p>
    </div>
    
    <div v-if="error" class="plugin-error">
      <p>Error loading plugin: {{ error }}</p>
    </div>
    
    <!-- Plugin container will be rendered here -->
    <div 
      ref="pluginMountPoint" 
      class="plugin-mount-point"
      :data-plugin-id="pluginId"
      :data-context="context"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import { pluginRegistry } from '@/services/plugin-registry.service.mjs';
import { IGameSystemPluginWeb } from '@dungeon-lab/shared/index.mjs';
import { IPluginUIAssets } from '@dungeon-lab/shared/types/plugin.mjs';
import Handlebars from 'handlebars';

const props = defineProps<{
  pluginId: string;
  context: string;
  initialData?: Record<string, any>;
}>();

const emit = defineEmits<{
  'update:data': [data: Record<string, any>];
  'submit': [data: Record<string, any>];
  'cancel': [];
  'error': [error: string];
}>();

const pluginMountPoint = ref<HTMLElement | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);
let cleanup: (() => void) | null = null;

// Watch for plugin or context changes
watch(
  () => [props.pluginId, props.context],
  async () => {
    if (pluginMountPoint.value) {
      await loadPluginUI();
    }
  }
);

onMounted(async () => {
  if (props.pluginId && props.context) {
    await loadPluginUI();
  }
});

onBeforeUnmount(() => {
  cleanupPluginUI();
});

async function loadPluginUI() {
  // Clean up previous plugin if exists
  cleanupPluginUI();
  
  // Reset state
  loading.value = true;
  error.value = null;
  
  if (!pluginMountPoint.value || !props.pluginId || !props.context) {
    loading.value = false;
    return;
  }
  
  try {
    // Get the plugin from the registry
    const plugin = pluginRegistry.getGameSystemPlugin(props.pluginId) as IGameSystemPluginWeb;
    
    if (!plugin) {
      throw new Error(`Plugin ${props.pluginId} not found`);
    }
    
    // Get or load UI assets for this context
    const uiAssets = await pluginRegistry.getPluginUIAssets(props.pluginId, props.context);
    
    if (!uiAssets) {
      throw new Error(`Failed to load UI assets for plugin ${props.pluginId}, context ${props.context}`);
    }
    
    // Initialize Handlebars
    await initializeHandlebars(uiAssets);
    
    // Add styles to document
    const styleElement = document.createElement('style');
    styleElement.textContent = uiAssets.styles;
    document.head.appendChild(styleElement);
    
    // Create plugin API
    const pluginAPI = createPluginAPI(uiAssets);
    
    // Explicitly call registerHelpers if available, right before template compilation
    if (uiAssets.script.registerHelpers && typeof uiAssets.script.registerHelpers === 'function') {
      try {
        console.log(`Explicitly registering helpers for ${props.pluginId} before template compilation`);
        uiAssets.script.registerHelpers(window.Handlebars);
      } catch (error) {
        console.error(`Error registering helpers for ${props.pluginId}:`, error);
      }
    }
    
    // Compile and render template
    try {
      const template = window.Handlebars.compile(uiAssets.template);
      pluginMountPoint.value.innerHTML = template({
        ...props.initialData,
        pluginId: props.pluginId,
        pluginName: plugin.config.name,
        assetUrls: uiAssets.assetUrls || {}
      });
    } catch (templateError) {
      console.error('Error compiling or rendering template:', templateError);
      throw new Error(`Failed to compile template: ${templateError instanceof Error ? templateError.message : String(templateError)}`);
    }
    
    // Execute script using the module's init function
    let pluginCleanup: (() => void) | void;
    try {
      // Call the init function from the script module
      pluginCleanup = uiAssets.script.init(
        pluginMountPoint.value, 
        pluginAPI,
        props.initialData
      );
    } catch (scriptError) {
      console.error(`Error initializing plugin script:`, scriptError);
      throw new Error(`Failed to initialize plugin script: ${scriptError instanceof Error ? scriptError.message : String(scriptError)}`);
    }
    
    // Store cleanup function
    cleanup = () => {
      // Remove style element
      if (styleElement.parentNode) {
        styleElement.parentNode.removeChild(styleElement);
      }
      
      // Run plugin-provided cleanup if available
      if (typeof pluginCleanup === 'function') {
        try {
          pluginCleanup();
        } catch (error) {
          console.error('Error during plugin cleanup:', error);
        }
      }
      
      // Clear container
      if (pluginMountPoint.value) {
        pluginMountPoint.value.innerHTML = '';
      }
      
      // Unregister any Handlebars partials for this plugin
      if (window.Handlebars && uiAssets.partials) {
        for (const partialName of Object.keys(uiAssets.partials)) {
          const fullPartialName = `${props.pluginId}:${partialName}`;
          window.Handlebars.unregisterPartial(fullPartialName);
        }
      }
    };
    
    loading.value = false;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    error.value = errorMessage;
    emit('error', errorMessage);
    loading.value = false;
  }
}

/**
 * Initialize Handlebars and register partials and helpers
 */
async function initializeHandlebars(uiAssets: IPluginUIAssets) {
  // Set up Handlebars if not already on window
  if (!window.Handlebars) {
    window.Handlebars = Handlebars;
  }
  
  // Register common helpers if they don't exist
  if (!window.Handlebars.helpers.eq) {
    // Compare two values for equality
    window.Handlebars.registerHelper('eq', function(a: any, b: any) {
      return a === b;
    });
  }
  
  // Register assetUrl helper if it doesn't exist
  if (!window.Handlebars.helpers.assetUrl) {
    // Get URL for an asset
    window.Handlebars.registerHelper('assetUrl', function(path: string) {
      const assetUrls = uiAssets.assetUrls || {};
      return assetUrls[path] || '';
    });
  }
  
  // Register partials if available
  if (uiAssets.partials) {
    for (const [name, content] of Object.entries(uiAssets.partials)) {
      // Register with namespaced name to avoid conflicts between plugins
      const fullPartialName = `${props.pluginId}:${name}`;
      window.Handlebars.registerPartial(fullPartialName, content);
    }
  }
}

function createPluginAPI(uiAssets: IPluginUIAssets) {
  // The current data state
  const data = { ...props.initialData };
  
  return {
    // Data access
    getData: () => ({ ...data }),
    updateData: (newData: Record<string, any>) => {
      Object.assign(data, newData);
      emit('update:data', data);
    },
    
    // Actions
    submit: (formData: Record<string, any> = {}) => {
      const finalData = { ...data, ...formData };
      emit('submit', finalData);
      return finalData;
    },
    
    cancel: () => {
      emit('cancel');
    },
    
    // Helper for rendering templates
    renderTemplate: (templateString: string, context: Record<string, any> = {}) => {
      if (!window.Handlebars) return '';
      
      try {
        const template = window.Handlebars.compile(templateString);
        return template({ 
          ...data, 
          ...context,
          assetUrls: uiAssets.assetUrls || {},
          pluginId: props.pluginId
        });
      } catch (error) {
        console.error('Error rendering template:', error);
        return '';
      }
    },
    
    // Helper for accessing other script functions
    getScriptFunction: (name: string) => {
      if (!uiAssets.script[name]) {
        console.warn(`Script function '${name}' not found in plugin ${props.pluginId}, context ${props.context}`);
        return undefined;
      }
      return uiAssets.script[name];
    }
  };
}

function cleanupPluginUI() {
  if (cleanup) {
    cleanup();
    cleanup = null;
  }
}

// Define global Handlebars type
declare global {
  interface Window {
    Handlebars: any;
  }
}
</script>

<style scoped>
.plugin-mount-point {
  width: 100%;
  min-height: 200px;
  padding: 1rem;
  background-color: #ffffff;
  border-radius: 0.375rem;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
}

.plugin-loading {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
  background-color: #f9fafb;
  border-radius: 0.375rem;
}

.plugin-error {
  padding: 1rem;
  background-color: #fee2e2;
  border: 1px solid #ef4444;
  border-radius: 0.375rem;
  color: #b91c1c;
  margin-bottom: 1rem;
}
</style> 