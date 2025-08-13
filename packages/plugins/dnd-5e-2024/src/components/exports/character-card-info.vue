<template>
  <div class="mt-1">
    <!-- Species and class on first line (centered) -->
    <p v-if="speciesAndClass" class="text-sm text-gray-600 text-center">
      {{ speciesAndClass }}
    </p>
    
    <!-- Level (left) and Hit points (right) on second line -->
    <div v-if="levelOrHitPoints" class="flex justify-between items-center mt-1">
      <span v-if="resolvedData.level" class="text-sm text-gray-600">
        Level {{ resolvedData.level }}
      </span>
      <span v-else></span>
      
      <span v-if="hitPoints" class="text-sm text-gray-900 ml-auto">
        {{ hitPoints.current }}/{{ hitPoints.maximum }} HP
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import type { ICharacter } from '@dungeon-lab/shared/types/index.mjs';
import { getPluginContext } from '@dungeon-lab/shared-ui/utils/plugin-context.mjs';
import type { DndCharacterData } from '../../types/dnd/character.mjs';

// Props
interface Props {
  character: ICharacter;
}

const props = defineProps<Props>();

// Reactive data for resolved names
const resolvedData = ref<{
  speciesName?: string;
  className?: string;
  level?: number;
  hitPoints?: { current: number; maximum: number };
}>({});

// Extract and resolve character details from D&D 5e plugin data
onMounted(async () => {
  if (!props.character.pluginData) {
    console.log('No plugin data for character:', props.character.name);
    return;
  }
  
  const context = getPluginContext();
  if (!context) {
    console.warn('Plugin context not available for character:', props.character.name);
    return;
  }
  
  try {
    const data = props.character.pluginData as DndCharacterData;
    console.log('D&D character data for', props.character.name, ':', data);
    
    // Get level from progression
    const level = data.progression?.level;
    characterSheetComponent.value = component;
    // Get hit points from attributes
    const hitPoints = data.attributes?.hitPoints;
    
    // Resolve species name - only if it's a resolved ObjectId string
    let speciesName: string | undefined;
    if (data.species && typeof data.species === 'string') {
      try {
        const speciesDoc = await context.getDocument(data.species);
        speciesName = speciesDoc.name;
      } catch (error) {
        console.warn('Failed to resolve species:', data.species, error);
      }
    } else if (data.species && typeof data.species === 'object') {
      console.log('Species reference is unresolved, skipping:', data.species);
    }
    
    // Resolve class name (get the first class) - only if it's a resolved ObjectId string
    let className: string | undefined;
    if (data.classes && data.classes.length > 0) {
      const firstClass = data.classes[0];
      try {
        if (typeof firstClass.class === 'string') {
          const classDoc = await context.getDocument(firstClass.class);
          className = classDoc.name;
        } else if (typeof firstClass.class === 'object') {
          console.log('Class reference is unresolved, skipping:', firstClass.class);
        }
      } catch (error) {
        console.warn('Failed to resolve class:', firstClass.class, error);
      }
    }
    
    resolvedData.value = {
      speciesName,
      className,
      level,
      hitPoints
    };
    
    console.log('Resolved character details for', props.character.name, ':', resolvedData.value);
  } catch (error) {
    console.error('Error resolving character data:', error);
  }
});

// Computed for species and class display (first line)
const speciesAndClass = computed(() => {
  const { speciesName, className } = resolvedData.value;
  
  const parts = [];
  if (speciesName) parts.push(speciesName);
  if (className) parts.push(className);
  
  return parts.length > 0 ? parts.join(' ') : null;
});

// Computed for hit points
const hitPoints = computed(() => {
  return resolvedData.value.hitPoints || null;
});

// Computed to check if we should show the second line
const levelOrHitPoints = computed(() => {
  return resolvedData.value.level || hitPoints.value;
});
</script>

