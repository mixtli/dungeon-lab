<template>
  <div v-if="show" class="character-sheet-container">
    <!-- Plugin Container with Style Isolation -->
    <PluginContainer
      :width="576"
      :height="384"
      background-color="#ffffff"
    >
      <!-- D&D 5e Character Sheet Component -->
      <component
        :is="characterSheetComponent"
        v-if="characterSheetComponent && character"
        :character="characterSheetData"
        :readonly="readonly"
        @update:character="handleCharacterUpdate"
        @save="handleSave"
        @roll="handleRoll"
        @close="$emit('close')"
      />
      
      <!-- Fallback for when plugin/component not available -->
      <div
        v-else
        class="w-full h-full bg-white rounded-lg border-2 border-gray-300 p-6 flex flex-col items-center justify-center"
      >
        <div class="text-center">
          <i class="mdi mdi-account-alert text-4xl text-gray-400 mb-4"></i>
          <h3 class="text-lg font-semibold text-gray-900 mb-2">Character Sheet Unavailable</h3>
          <p class="text-sm text-gray-600 mb-4">
            {{ character ? `The character sheet component for game system "${character.gameSystemId}" is not available.` : 'No character data provided.' }}
          </p>
          <details class="mb-4 text-left">
            <summary class="text-sm text-gray-500 cursor-pointer">Debug Information</summary>
            <div class="mt-2 text-xs text-gray-400 font-mono">
              <div>Character Game System: {{ character?.gameSystemId || 'none' }}</div>
              <div>Active Game System: {{ getActiveGameSystem() }}</div>
            </div>
          </details>
          <button
            @click="$emit('close')"
            class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </PluginContainer>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { IActor } from '@dungeon-lab/shared/types/index.mjs';
import { pluginRegistry } from '../../services/plugin-registry.mts';
import PluginContainer from '../common/PluginContainer.vue';

const props = defineProps<{
  show: boolean;
  character: IActor | null;
  readonly?: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'update:character', character: IActor): void;
  (e: 'save', character: IActor): void;
  (e: 'roll', rollType: string, data: Record<string, unknown>): void;
}>();

// Get the character sheet component directly from the plugin registry (synchronous)
const characterSheetComponent = computed(() => {
  console.log('[CharacterSheetModal] Character game system ID:', props.character?.gameSystemId);
  
  if (!props.character?.gameSystemId) {
    return null;
  }

  // For D&D 5e 2024, get component directly from plugin registry
  if (props.character.gameSystemId === 'dnd5e-2024' || props.character.gameSystemId === 'dnd-5e-2024') {
    // Try the direct component ID (as registered by the plugin)
    const component = pluginRegistry.getComponentById('dnd-5e-2024-character-sheet');
    if (component) {
      console.log('[CharacterSheetModal] D&D 5e character sheet found by direct ID');
      return component;
    } else {
      console.warn('[CharacterSheetModal] D&D 5e character sheet component not found in registry');
      return null;
    }
  }

  // Add support for other game systems here
  // if (props.character.gameSystemId === 'pathfinder') { ... }
  
  return null;
});

// Convert IActor to the format expected by the character sheet
const characterSheetData = computed(() => {
  if (!props.character) return null;

  // Transform the IActor data to match DnD5eCharacterData interface
  // This is a simplified transformation - in a real app you'd have proper data mapping
  return {
    id: props.character.id,
    name: props.character.name,
    level: props.character.data?.level || 1,
    experience: {
      current: props.character.data?.experience?.current || 0,
      next: props.character.data?.experience?.next || 300,
    },
    race: {
      name: props.character.data?.race?.name || props.character.data?.species || 'Human',
      size: props.character.data?.race?.size || 'medium',
    },
    classes: props.character.data?.classes || [
      { name: 'Fighter', level: 1, hitDie: 10 }
    ],
    background: {
      name: props.character.data?.background?.name || props.character.data?.background || 'Folk Hero',
    },
    abilities: props.character.data?.abilities || {
      strength: { value: 10 },
      dexterity: { value: 10 },
      constitution: { value: 10 },
      intelligence: { value: 10 },
      wisdom: { value: 10 },
      charisma: { value: 10 },
    },
    savingThrows: props.character.data?.savingThrows || {
      strength: { proficient: false, bonus: 0 },
      dexterity: { proficient: false, bonus: 0 },
      constitution: { proficient: false, bonus: 0 },
      intelligence: { proficient: false, bonus: 0 },
      wisdom: { proficient: false, bonus: 0 },
      charisma: { proficient: false, bonus: 0 },
    },
    skills: props.character.data?.skills || {
      skills: {
        athletics: { ability: 'strength', proficiency: 'none', modifiers: [] },
        acrobatics: { ability: 'dexterity', proficiency: 'none', modifiers: [] },
        'sleight-of-hand': { ability: 'dexterity', proficiency: 'none', modifiers: [] },
        stealth: { ability: 'dexterity', proficiency: 'none', modifiers: [] },
        arcana: { ability: 'intelligence', proficiency: 'none', modifiers: [] },
        history: { ability: 'intelligence', proficiency: 'none', modifiers: [] },
        investigation: { ability: 'intelligence', proficiency: 'none', modifiers: [] },
        nature: { ability: 'intelligence', proficiency: 'none', modifiers: [] },
        religion: { ability: 'intelligence', proficiency: 'none', modifiers: [] },
        'animal-handling': { ability: 'wisdom', proficiency: 'none', modifiers: [] },
        insight: { ability: 'wisdom', proficiency: 'none', modifiers: [] },
        medicine: { ability: 'wisdom', proficiency: 'none', modifiers: [] },
        perception: { ability: 'wisdom', proficiency: 'none', modifiers: [] },
        survival: { ability: 'wisdom', proficiency: 'none', modifiers: [] },
        deception: { ability: 'charisma', proficiency: 'none', modifiers: [] },
        intimidation: { ability: 'charisma', proficiency: 'none', modifiers: [] },
        performance: { ability: 'charisma', proficiency: 'none', modifiers: [] },
        persuasion: { ability: 'charisma', proficiency: 'none', modifiers: [] },
      }
    },
    hitPoints: {
      current: props.character.data?.hitPoints?.current || 8,
      maximum: props.character.data?.hitPoints?.maximum || 8,
      temporary: props.character.data?.hitPoints?.temporary || 0,
    },
    armorClass: {
      total: props.character.data?.armorClass || 10,
      base: 10,
      modifiers: [],
    },
    initiative: {
      bonus: props.character.data?.initiative || 0,
    },
    combat: {
      speed: {
        walking: props.character.data?.speed || 30,
      },
    },
    inspiration: props.character.data?.inspiration || false,
    deathSaves: {
      successes: props.character.data?.deathSaves?.successes || 0,
      failures: props.character.data?.deathSaves?.failures || 0,
    },
    hitDice: {
      current: props.character.data?.hitDice?.current || 1,
      maximum: props.character.data?.hitDice?.maximum || 1,
      type: props.character.data?.hitDice?.type || 'd10',
    },
    spells: props.character.data?.spells || {
      spellcastingAbility: 'intelligence',
      spellAttackBonus: 0,
      spellSaveDC: 8,
      slots: {},
      known: [],
    },
    equipment: props.character.data?.equipment || {
      weapons: [],
      armor: [],
      items: [],
      currency: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
    },
  };
});

function handleCharacterUpdate(updatedCharacter: Record<string, unknown>) {
  if (!props.character) return;
  
  // Convert back to IActor format and emit
  const updatedActor: IActor = {
    ...props.character,
    name: (updatedCharacter.name as string) || props.character.name,
    data: {
      ...props.character.data,
      ...updatedCharacter,
    },
  };
  
  emit('update:character', updatedActor);
}

function handleSave(character: Record<string, unknown>) {
  if (!props.character) return;
  
  const updatedActor: IActor = {
    ...props.character,
    name: (character.name as string) || props.character.name,
    data: {
      ...props.character.data,
      ...character,
    },
  };
  
  emit('save', updatedActor);
}

function handleRoll(rollType: string, data: Record<string, unknown>) {
  emit('roll', rollType, data);
}

function getActiveGameSystem() {
  return localStorage.getItem('activeGameSystem') || localStorage.getItem('activeGameSession') || 'none';
}
</script>

<style scoped>
.character-sheet-container {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>