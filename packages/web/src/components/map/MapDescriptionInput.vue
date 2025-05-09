<script setup lang="ts">
import { ref, computed } from 'vue';

interface Props {
  modelValue: string;
  error?: string;
  placeholder?: string;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  error: '',
  placeholder: 'Describe your map in detail...'
});

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'submit'): void;
}>();

const description = computed({
  get: () => props.modelValue,
  set: (value: string) => emit('update:modelValue', value)
});

const showSuggestions = ref(false);
const selectedCategory = ref('dimensions');

const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Enter' && e.ctrlKey) {
    emit('submit');
  }
};

// Helper text categories for different aspects of map description
const categories = [
  { id: 'dimensions', label: 'Dimensions' },
  { id: 'theme', label: 'Theme/Setting' },
  { id: 'rooms', label: 'Layout & Rooms' },
  { id: 'features', label: 'Features' },
  { id: 'environment', label: 'Environment' }
];

// Content suggestions for each category
const suggestions = {
  dimensions: [
    'Specify the map size (e.g., 30x30 squares)',
    'Mention the scale (e.g., each square represents 5 feet)',
    'Include multiple floors or levels if needed'
  ],
  theme: [
    'Define the overall theme (dungeon, forest, tavern, castle)',
    'Describe the architectural style',
    'Mention time period or cultural influences',
    'Specify if it\'s a natural or constructed environment'
  ],
  rooms: [
    'List key rooms and their purpose',
    'Describe how rooms connect to each other',
    'Specify any large open areas or hallways',
    'Mention the relative positioning of important locations'
  ],
  features: [
    'Detail special features like fountains, altars, statues',
    'Describe furniture or significant objects',
    'Include interactive elements like traps or puzzles',
    'Specify doors, windows, or other openings'
  ],
  environment: [
    'Describe lighting conditions',
    'Include water features, vegetation, or geological elements',
    'Mention weather effects or magical phenomena',
    'Specify environmental hazards'
  ]
};

const insertSuggestion = (suggestion: string) => {
  description.value += `\n- ${suggestion}`;
};

// Example descriptions for inspiration
const examples = [
  {
    title: 'Small Tavern',
    description: 'A cozy tavern (20x15 squares) with a main room for patrons, a bar along the north wall, a kitchen in the northeast corner, and a staircase leading to second-floor rooms. There are 6 tables with chairs, a fireplace on the east wall, and a small stage for entertainment in the southeast corner.'
  },
  {
    title: 'Dungeon Entrance',
    description: 'A 30x30 forgotten dungeon entrance featuring a large antechamber with broken columns, two guardian statues, and an altar in the center. Three corridors branch off to the north, east, and west, with the east corridor partially collapsed. Dim magical light emanates from glowing crystals embedded in the walls.'
  }
];
</script>

<template>
  <div class="map-description-input bg-white rounded-lg shadow p-4">
    <div class="flex justify-between items-center mb-2">
      <label class="block text-sm font-medium text-gray-700">
        Map Description <span class="text-red-500">*</span>
      </label>
      <button
        type="button"
        @click="showSuggestions = !showSuggestions"
        class="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
      >
        {{ showSuggestions ? 'Hide Tips' : 'Show Tips' }}
      </button>
    </div>

    <!-- Error message -->
    <div v-if="props.error" class="mb-2 text-sm text-red-600">{{ props.error }}</div>

    <!-- Text area for map description -->
    <textarea
      v-model="description"
      rows="5"
      :placeholder="placeholder"
      @keydown="handleKeyDown"
      class="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
    ></textarea>
    
    <div class="mt-1 text-xs text-gray-500 flex justify-between">
      <span>Press Ctrl+Enter to submit</span>
      <span>{{ description.length }} characters</span>
    </div>

    <!-- Helper suggestions panel -->
    <div v-if="showSuggestions" class="mt-4 bg-blue-50 rounded-md p-4">
      <h3 class="text-sm font-medium text-blue-800 mb-2">Description Tips</h3>
      
      <!-- Category tabs -->
      <div class="flex flex-wrap gap-1 mb-3 border-b border-blue-200 pb-2">
        <button
          v-for="category in categories"
          :key="category.id"
          @click="selectedCategory = category.id"
          :class="[
            'px-3 py-1 text-xs rounded-t-md',
            selectedCategory === category.id 
              ? 'bg-blue-200 text-blue-800 font-medium' 
              : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
          ]"
        >
          {{ category.label }}
        </button>
      </div>
      
      <!-- Suggestions for selected category -->
      <ul class="text-sm text-blue-700 space-y-1 mb-3">
        <li 
          v-for="(suggestion, index) in suggestions[selectedCategory as keyof typeof suggestions]" 
          :key="index"
          class="flex items-start"
        >
          <span class="inline-block w-2 h-2 bg-blue-500 rounded-full mt-1.5 mr-2"></span>
          <span>{{ suggestion }}</span>
          <button 
            @click="insertSuggestion(suggestion)"
            class="ml-2 text-xs text-blue-600 hover:text-blue-800"
            title="Add to description"
          >
            + Add
          </button>
        </li>
      </ul>
      
      <!-- Examples section -->
      <div class="mt-4 pt-3 border-t border-blue-200">
        <h4 class="text-sm font-medium text-blue-800 mb-2">Examples for Inspiration</h4>
        <div class="space-y-2">
          <div v-for="(example, index) in examples" :key="index" class="text-xs">
            <p class="font-medium text-blue-700">{{ example.title }}:</p>
            <p class="text-blue-600 italic">{{ example.description }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template> 