<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { pluginRegistry } from '@/services/plugin-registry.mts';
import { useAuthStore } from '@/stores/auth.store.mts';
import type { DicePreferences } from '@dungeon-lab/shared/types/index.mjs';

const selectedGameSystem = ref<string>(localStorage.getItem('activeGameSystem') || '');
const previousGameSystem = ref<string>('');
const loading = ref(true);
const gameSystemPluginOptions = ref<{ id: string; name: string }[]>([]);

// Auth store for user preferences
const authStore = useAuthStore();

// Dice preferences - initialize with current defaults from dice-3d.service
const dicePreferences = ref<DicePreferences>({
  theme_customColorset: {
    background: "#00ffcb",
    foreground: "#ffffff", 
    texture: "marble",
    material: "metal"
  },
  theme_material: "metal",
  light_intensity: 1,
  gravity_multiplier: 600,
  baseScale: 100,
  strength: 2,
  sounds: true
});

// Available material options
const materialOptions = [
  { value: 'none', label: 'None' },
  { value: 'metal', label: 'Metal' },
  { value: 'wood', label: 'Wood' },
  { value: 'glass', label: 'Glass' },
  { value: 'plastic', label: 'Plastic' }
];



// Function to save dice preferences
async function saveDicePreferences() {
  try {
    console.log('Saving dice preferences:', dicePreferences.value);
    const success = await authStore.updateUserPreferences({
      dicePreferences: dicePreferences.value
    });
    
    if (success) {
      console.log('Dice preferences saved successfully');
    } else {
      console.error('Failed to save dice preferences');
    }
  } catch (error) {
    console.error('Failed to save dice preferences:', error);
  }
}

// Watch for dice preferences changes and auto-save (debounced)
let saveTimeout: ReturnType<typeof setTimeout> | null = null;
watch(dicePreferences, () => {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }
  saveTimeout = setTimeout(() => {
    saveDicePreferences();
  }, 1000); // 1 second debounce
}, { deep: true });

// Function to reset dice preferences to defaults
function resetDicePreferences() {
  dicePreferences.value = {
    theme_customColorset: {
      background: "#00ffcb",
      foreground: "#ffffff", 
      texture: "marble",
      material: "metal"
    },
    theme_material: "metal",
    light_intensity: 1,
    gravity_multiplier: 600,
    baseScale: 100,
    strength: 2,
    sounds: true
  };
}

onMounted(async () => {
  try {
    // Ensure plugin registry is initialized
    await pluginRegistry.initialize();
    
    // Get available plugins from the frontend plugin registry
    const plugins = pluginRegistry.getPlugins();
    gameSystemPluginOptions.value = plugins.map(plugin => ({
      id: plugin.manifest.id,
      name: plugin.manifest.name
    }));
    
    console.log('Available game system plugins:', gameSystemPluginOptions.value);
    previousGameSystem.value = selectedGameSystem.value;

    // Load user dice preferences if available
    if (authStore.user?.preferences?.dicePreferences) {
      dicePreferences.value = { ...authStore.user.preferences.dicePreferences };
      console.log('Loaded user dice preferences:', dicePreferences.value);
    }
  } catch (error) {
    console.error('Failed to load plugin list:', error);
  } finally {
    loading.value = false;
  }
});

async function handleGameSystemChange(event: Event) {
  const select = event.target as HTMLSelectElement;
  const newGameSystemId = select.value;

  // If there was a previous game system, call its onUnload handler
  if (previousGameSystem.value) {
    const oldPlugin = pluginRegistry.getGameSystemPlugin(previousGameSystem.value);
    if (oldPlugin?.onUnload) {
      await oldPlugin.onUnload();
    }
  }

  // Call onLoad handler for the new game system
  // Only load the selected plugin now
  // Load plugin - the registry will create the proper context and call onLoad
  await pluginRegistry.loadPlugin(newGameSystemId);

  // Update localStorage and previous game system reference
  localStorage.setItem('activeGameSystem', newGameSystemId);
  previousGameSystem.value = newGameSystemId;
}

</script>

<template>
  <div class="max-w-3xl mx-auto p-6">
    <h1 class="text-2xl font-bold mb-6 text-primary-900">Settings</h1>

    <div class="bg-stone dark:bg-stone-700 rounded-lg shadow-xl border border-stone-300 dark:border-stone-600 p-6 mb-6">
      <div class="border-b border-stone-300 dark:border-stone-600 pb-4 mb-4">
        <h2 class="text-xl font-semibold text-primary-900 dark:text-accent-500">Game System</h2>
      </div>

      <div class="game-system-settings">
        <label for="gameSystem" class="block text-sm font-medium text-onyx dark:text-parchment mb-2">
          Active Game System
        </label>
        <div v-if="loading" class="flex items-center justify-center py-8">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-900"></div>
        </div>
        <select
          v-else
          id="gameSystem"
          v-model="selectedGameSystem"
          @change="handleGameSystemChange"
          class="block w-full px-3 py-2 bg-parchment dark:bg-stone-600 border border-stone-300 dark:border-stone-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-900 focus:border-primary-900 text-onyx dark:text-parchment"
        >
          <option value="" disabled>Select a game system</option>
          <option
            v-for="plugin in gameSystemPluginOptions"
            :key="plugin.id"
            :value="plugin.id"
          >
            {{ plugin.name }}
          </option>
        </select>
      </div>
    </div>

    <!-- Dice Preferences Section -->
    <div class="bg-stone dark:bg-stone-700 rounded-lg shadow-xl border border-stone-300 dark:border-stone-600 p-6 mb-6">
      <div class="border-b border-stone-300 dark:border-stone-600 pb-4 mb-6">
        <div class="flex justify-between items-center">
          <h2 class="text-xl font-semibold text-primary-900 dark:text-accent-500">Dice Preferences</h2>
          <button
            @click="resetDicePreferences"
            class="text-sm px-3 py-1 border border-stone-300 dark:border-stone-600 rounded hover:bg-stone-200 dark:hover:bg-stone-600 text-onyx dark:text-parchment transition-colors"
          >
            Reset to Defaults
          </button>
        </div>
        <p class="text-sm text-stone-600 dark:text-stone-400 mt-2">
          Customize how your dice appear when you roll. Other players will see your personalized dice.
        </p>
      </div>

      <div class="space-y-6">
        <!-- Color Customization -->
        <div class="grid md:grid-cols-2 gap-6">
          <div>
            <label class="block text-sm font-medium text-onyx dark:text-parchment mb-2">
              Dice Color
            </label>
            <div class="flex items-center space-x-3">
              <input
                v-model="dicePreferences.theme_customColorset.background"
                type="color"
                class="w-12 h-10 rounded border border-stone-300 dark:border-stone-600 cursor-pointer"
              >
              <input
                v-model="dicePreferences.theme_customColorset.background"
                type="text"
                class="flex-1 px-3 py-2 bg-parchment dark:bg-stone-600 border border-stone-300 dark:border-stone-600 rounded-md text-onyx dark:text-parchment font-mono text-sm"
                placeholder="#00ffcb"
              >
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-onyx dark:text-parchment mb-2">
              Text Color
            </label>
            <div class="flex items-center space-x-3">
              <input
                v-model="dicePreferences.theme_customColorset.foreground"
                type="color"
                class="w-12 h-10 rounded border border-stone-300 dark:border-stone-600 cursor-pointer"
              >
              <input
                v-model="dicePreferences.theme_customColorset.foreground"
                type="text"
                class="flex-1 px-3 py-2 bg-parchment dark:bg-stone-600 border border-stone-300 dark:border-stone-600 rounded-md text-onyx dark:text-parchment font-mono text-sm"
                placeholder="#ffffff"
              >
            </div>
          </div>
        </div>

        <!-- Material Selection -->
        <div>
          <label class="block text-sm font-medium text-onyx dark:text-parchment mb-2">
            Material
          </label>
          <select
            v-model="dicePreferences.theme_material"
            class="block w-full px-3 py-2 bg-parchment dark:bg-stone-600 border border-stone-300 dark:border-stone-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-900 focus:border-primary-900 text-onyx dark:text-parchment"
          >
            <option
              v-for="material in materialOptions"
              :key="material.value"
              :value="material.value"
            >
              {{ material.label }}
            </option>
          </select>
        </div>

        <!-- Physics Settings -->
        <div class="space-y-4">
          <h3 class="text-lg font-medium text-onyx dark:text-parchment">Physics & Effects</h3>
          
          <!-- Light Intensity -->
          <div>
            <label class="block text-sm font-medium text-onyx dark:text-parchment mb-2">
              Light Intensity: {{ dicePreferences.light_intensity.toFixed(1) }}
            </label>
            <input
              v-model.number="dicePreferences.light_intensity"
              type="range"
              min="0.1"
              max="3"
              step="0.1"
              class="w-full h-2 bg-stone-200 dark:bg-stone-600 rounded-lg appearance-none cursor-pointer slider"
            >
            <div class="flex justify-between text-xs text-stone-500 mt-1">
              <span>Dim</span>
              <span>Bright</span>
            </div>
          </div>

          <!-- Gravity -->
          <div>
            <label class="block text-sm font-medium text-onyx dark:text-parchment mb-2">
              Gravity: {{ dicePreferences.gravity_multiplier }}
            </label>
            <input
              v-model.number="dicePreferences.gravity_multiplier"
              type="range"
              min="100"
              max="1000"
              step="50"
              class="w-full h-2 bg-stone-200 dark:bg-stone-600 rounded-lg appearance-none cursor-pointer slider"
            >
            <div class="flex justify-between text-xs text-stone-500 mt-1">
              <span>Light</span>
              <span>Heavy</span>
            </div>
          </div>

          <!-- Dice Size -->
          <div>
            <label class="block text-sm font-medium text-onyx dark:text-parchment mb-2">
              Dice Size: {{ dicePreferences.baseScale }}%
            </label>
            <input
              v-model.number="dicePreferences.baseScale"
              type="range"
              min="50"
              max="200"
              step="10"
              class="w-full h-2 bg-stone-200 dark:bg-stone-600 rounded-lg appearance-none cursor-pointer slider"
            >
            <div class="flex justify-between text-xs text-stone-500 mt-1">
              <span>Small</span>
              <span>Large</span>
            </div>
          </div>

          <!-- Roll Strength -->
          <div>
            <label class="block text-sm font-medium text-onyx dark:text-parchment mb-2">
              Roll Strength: {{ dicePreferences.strength }}
            </label>
            <input
              v-model.number="dicePreferences.strength"
              type="range"
              min="1"
              max="5"
              step="1"
              class="w-full h-2 bg-stone-200 dark:bg-stone-600 rounded-lg appearance-none cursor-pointer slider"
            >
            <div class="flex justify-between text-xs text-stone-500 mt-1">
              <span>Gentle</span>
              <span>Strong</span>
            </div>
          </div>
        </div>

        <!-- Sound Settings -->
        <div>
          <label class="flex items-center space-x-3">
            <input
              v-model="dicePreferences.sounds"
              type="checkbox"
              class="w-4 h-4 text-dragon bg-parchment border-stone-300 rounded focus:ring-dragon dark:focus:ring-dragon dark:ring-offset-stone-800 focus:ring-2 dark:bg-stone-600 dark:border-stone-500"
            >
            <span class="text-sm font-medium text-onyx dark:text-parchment">
              Enable dice sound effects
            </span>
          </label>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
.settings-container {
  max-width: 800px;
  margin: 0 auto;
}

/* Range slider styling */
.slider {
  @apply bg-stone-200 dark:bg-stone-600 rounded-lg appearance-none cursor-pointer;
}

.slider::-webkit-slider-thumb {
  @apply appearance-none w-4 h-4 bg-primary-900 rounded-full cursor-pointer;
}

.slider::-moz-range-thumb {
  @apply w-4 h-4 bg-primary-900 rounded-full cursor-pointer border-0;
}

.slider::-ms-thumb {
  @apply w-4 h-4 bg-primary-900 rounded-full cursor-pointer border-0;
}

/* Color input styling */
input[type="color"] {
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
  background-color: transparent;
  cursor: pointer;
}

input[type="color"]::-webkit-color-swatch-wrapper {
  padding: 0;
  border: none;
  border-radius: 6px;
}

input[type="color"]::-webkit-color-swatch {
  border: none;
  border-radius: 6px;
}

input[type="color"]::-moz-color-swatch {
  border: none;
  border-radius: 6px;
}
</style>
