<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';

interface CharacterFormData {
  name: string;
  type: string;
  data: {
    race: string;
    class: string;
    level: number;
    background: string;
    alignment: string;
    hitPoints: {
      current: number;
      maximum: number;
    };
  };
}

const router = useRouter();
const isSubmitting = ref(false);
const error = ref<string | null>(null);

const formData = ref<CharacterFormData>({
  name: '',
  type: 'character',
  data: {
    race: '',
    class: '',
    level: 1,
    background: '',
    alignment: '',
    hitPoints: {
      current: 10,
      maximum: 10
    }
  }
});

const alignmentOptions = [
  'lawful good',
  'neutral good',
  'chaotic good',
  'lawful neutral',
  'true neutral',
  'chaotic neutral',
  'lawful evil',
  'neutral evil',
  'chaotic evil'
];

const classOptions = [
  'Barbarian',
  'Bard',
  'Cleric',
  'Druid',
  'Fighter',
  'Monk',
  'Paladin',
  'Ranger',
  'Rogue',
  'Sorcerer',
  'Warlock',
  'Wizard'
];

const raceOptions = [
  'Dragonborn',
  'Dwarf',
  'Elf',
  'Gnome',
  'Half-Elf',
  'Half-Orc',
  'Halfling',
  'Human',
  'Tiefling'
];

const backgroundOptions = [
  'Acolyte',
  'Charlatan',
  'Criminal',
  'Entertainer',
  'Folk Hero',
  'Guild Artisan',
  'Hermit',
  'Noble',
  'Outlander',
  'Sage',
  'Sailor',
  'Soldier',
  'Urchin'
];

async function handleSubmit() {
  try {
    isSubmitting.value = true;
    error.value = null;

    const response = await fetch('/api/actors', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formData.value),
    });

    if (!response.ok) {
      throw new Error('Failed to create character');
    }

    const character = await response.json();
    router.push(`/character/${character.id}`);
  } catch (err) {
    console.error('Error creating character:', err);
    error.value = 'Failed to create character. Please try again.';
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <div class="max-w-3xl mx-auto p-6">
    <div class="bg-white rounded-lg shadow-md p-6">
      <h1 class="text-2xl font-bold text-gray-900 mb-6">Create New Character</h1>

      <form @submit.prevent="handleSubmit" class="space-y-6">
        <!-- Error Message -->
        <div v-if="error" class="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
          <p class="text-red-700">{{ error }}</p>
        </div>

        <!-- Basic Information -->
        <div class="space-y-4">
          <div>
            <label for="name" class="block text-sm font-medium text-gray-700">Character Name</label>
            <input
              type="text"
              id="name"
              v-model="formData.name"
              required
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
          </div>

          <div>
            <label for="race" class="block text-sm font-medium text-gray-700">Race</label>
            <select
              id="race"
              v-model="formData.data.race"
              required
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">Select a race</option>
              <option v-for="race in raceOptions" :key="race" :value="race">{{ race }}</option>
            </select>
          </div>

          <div>
            <label for="class" class="block text-sm font-medium text-gray-700">Class</label>
            <select
              id="class"
              v-model="formData.data.class"
              required
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">Select a class</option>
              <option v-for="className in classOptions" :key="className" :value="className">{{ className }}</option>
            </select>
          </div>

          <div>
            <label for="level" class="block text-sm font-medium text-gray-700">Level</label>
            <input
              type="number"
              id="level"
              v-model="formData.data.level"
              min="1"
              max="20"
              required
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
          </div>

          <div>
            <label for="background" class="block text-sm font-medium text-gray-700">Background</label>
            <select
              id="background"
              v-model="formData.data.background"
              required
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">Select a background</option>
              <option v-for="bg in backgroundOptions" :key="bg" :value="bg">{{ bg }}</option>
            </select>
          </div>

          <div>
            <label for="alignment" class="block text-sm font-medium text-gray-700">Alignment</label>
            <select
              id="alignment"
              v-model="formData.data.alignment"
              required
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">Select an alignment</option>
              <option v-for="alignment in alignmentOptions" :key="alignment" :value="alignment">
                {{ alignment.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') }}
              </option>
            </select>
          </div>

          <div>
            <label for="hp" class="block text-sm font-medium text-gray-700">Hit Points</label>
            <div class="flex gap-4">
              <div class="flex-1">
                <input
                  type="number"
                  id="hp"
                  v-model="formData.data.hitPoints.maximum"
                  min="1"
                  required
                  class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Maximum HP"
                  @input="formData.data.hitPoints.current = formData.data.hitPoints.maximum"
                >
              </div>
            </div>
          </div>
        </div>

        <div class="flex justify-end space-x-4">
          <button
            type="button"
            @click="router.push('/characters')"
            class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Cancel
          </button>
          <button
            type="submit"
            :disabled="isSubmitting"
            class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ isSubmitting ? 'Creating...' : 'Create Character' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template> 