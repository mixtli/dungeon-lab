<template>
  <div>
    <div v-if="loading" class="plugin-loading">
      <p>Loading plugin content...</p>
    </div>

    <div v-if="error" class="plugin-error">
      <p>Error loading plugin: {{ error }}</p>
    </div>

    <!-- Plugin container will be rendered here -->
    <div ref="pluginMountPoint" class="plugin-mount-point"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import { pluginRegistry } from '@/services/plugin-registry.service.mjs';
import { IGameSystemPluginWeb, IPluginComponent } from '@dungeon-lab/shared/types/plugin.mjs';

const props = defineProps<{
  pluginId: string;
  componentId: string;
  initialData?: Record<string, any>;
}>();

const emit = defineEmits<{
  'update:data': [data: Record<string, any>];
  submit: [data: Record<string, any>];
  cancel: [];
  error: [error: string];
}>();

const pluginMountPoint = ref<HTMLElement | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);
let component: IPluginComponent | null = null;

// Watch for plugin or component changes
watch(
  () => [props.pluginId, props.componentId],
  async () => {
    if (pluginMountPoint.value) {
      await loadComponent();
    }
  }
);

onMounted(async () => {
  if (props.pluginId && props.componentId) {
    await loadComponent();
  }
});

onBeforeUnmount(() => {
  cleanupComponent();
});

async function loadComponent() {
  // Clean up previous component if exists
  cleanupComponent();

  // Reset state
  loading.value = true;
  error.value = null;

  if (!pluginMountPoint.value || !props.pluginId || !props.componentId) {
    loading.value = false;
    return;
  }

  try {
    // Get the plugin from the registry
    const plugin = pluginRegistry.getGameSystemPlugin(props.pluginId) as IGameSystemPluginWeb;

    if (!plugin) {
      throw new Error(`Plugin ${props.pluginId} not found`);
    }

    // Load the component
    const loadedComponent = plugin.loadComponent(props.componentId);

    if (!loadedComponent) {
      console.error(`Component ${props.componentId} not found in plugin ${props.pluginId}`);
      throw new Error(`Component ${props.componentId} not found in plugin ${props.pluginId}`);
    }

    component = loadedComponent;

    // Mount the component
    await component.onMount(pluginMountPoint.value);

    // Update with initial data if provided
    if (props.initialData) {
      await component.onUpdate(props.initialData);
    }

    loading.value = false;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    error.value = errorMessage;
    emit('error', errorMessage);
    loading.value = false;
  }
}

function cleanupComponent() {
  if (component) {
    component.onUnmount();
    component = null;
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
  box-shadow:
    0 1px 3px 0 rgba(0, 0, 0, 0.1),
    0 1px 2px 0 rgba(0, 0, 0, 0.06);
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
