<template>
  <component 
    v-if="pluginComponent" 
    :is="pluginComponent" 
    :character="character" 
  />
  <div v-else-if="character.pluginData" class="fallback-info">
    <!-- Fallback display when plugin component is not available -->
    <p class="text-gray-600 text-sm">
      Character details unavailable
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, type Component } from 'vue';
import type { ICharacter } from '@dungeon-lab/shared/types/index.mjs';

interface Props {
  character: ICharacter;
  getComponent: (character: ICharacter) => Promise<Component | null>;
}

const props = defineProps<Props>();

const pluginComponent = ref<Component | null>(null);

onMounted(async () => {
  try {
    pluginComponent.value = await props.getComponent(props.character);
  } catch (error) {
    console.warn('Failed to load character card info component:', error);
    pluginComponent.value = null;
  }
});
</script>

<style scoped>
.fallback-info {
  margin-top: 4px;
}
</style>