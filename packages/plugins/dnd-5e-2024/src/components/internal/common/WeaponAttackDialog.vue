<template>
  <div 
    v-if="modelValue" 
    class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
    @click.self="closeDialog"
  >
    <div class="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
      <!-- Dialog Header -->
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-xl font-bold text-gray-800">
          {{ weapon?.name || 'Weapon' }} Attack
        </h2>
        <button 
          @click="closeDialog"
          class="text-gray-400 hover:text-gray-600 text-xl font-bold"
        >
          ×
        </button>
      </div>

      <!-- Weapon Information -->
      <div v-if="weapon" class="bg-red-100 dark:bg-red-900 rounded p-3 mb-6">
        <div class="text-sm font-medium text-red-800 dark:text-red-200">
          {{ weapon.name }}
        </div>
        <div v-if="weaponProperties" class="text-xs text-red-600 dark:text-red-300">
          Properties: {{ weaponProperties }}
        </div>
        <div v-if="attackBonus !== null" class="text-xs text-red-600 dark:text-red-300 mt-1">
          Attack Bonus: {{ formatModifier(attackBonus) }}
        </div>
      </div>

      <!-- Roll Options -->
      <div class="space-y-4 mb-6">
        <!-- Custom Modifier -->
        <div>
          <label for="customModifier" class="block text-sm font-medium text-gray-700 mb-1">
            Custom Modifier
          </label>
          <input
            id="customModifier"
            v-model.number="customModifier"
            type="number"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
            placeholder="0"
          />
        </div>

        <!-- Advantage Mode -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Roll Mode
          </label>
          <div class="space-y-2">
            <label class="flex items-center">
              <input
                v-model="advantageMode"
                type="radio"
                value="disadvantage"
                class="mr-2 text-red-600"
              />
              <span class="text-red-600">Disadvantage</span>
              <span class="text-xs text-gray-500 ml-2">(roll twice, take lower)</span>
            </label>
            <label class="flex items-center">
              <input
                v-model="advantageMode"
                type="radio"
                value="normal"
                class="mr-2 text-red-600"
              />
              <span class="text-gray-800">Normal</span>
              <span class="text-xs text-gray-500 ml-2">(single roll)</span>
            </label>
            <label class="flex items-center">
              <input
                v-model="advantageMode"
                type="radio"
                value="advantage"
                class="mr-2 text-red-600"
              />
              <span class="text-green-600">Advantage</span>
              <span class="text-xs text-gray-500 ml-2">(roll twice, take higher)</span>
            </label>
          </div>
        </div>

        <!-- Recipients -->
        <div>
          <label for="recipients" class="block text-sm font-medium text-gray-700 mb-1">
            Roll Visibility
          </label>
          <select
            id="recipients"
            v-model="recipients"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="public">Public (everyone can see)</option>
            <option value="private">Private (only you can see)</option>
            <option value="gm">GM Only (only GM can see)</option>
          </select>
        </div>

        <!-- Roll Preview -->
        <div class="bg-gray-50 p-3 rounded-md">
          <div class="text-sm text-gray-600">
            <strong>Rolling:</strong> {{ rollPreview }}
          </div>
          <div class="text-xs text-gray-500 mt-1">
            Attack bonus: {{ formatModifier(attackBonus || 0) }}
            <span v-if="customModifier !== 0">
              | Custom: {{ formatModifier(customModifier) }}
            </span>
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex space-x-3">
        <button
          @click="handleRoll"
          class="flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 font-medium"
        >
          ⚔️ Roll Attack
        </button>
        <button
          @click="closeDialog"
          class="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 font-medium"
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { IItem } from '@dungeon-lab/shared/types/index.mjs';

// Props
interface Props {
  modelValue: boolean;
  weapon?: IItem | null;
  character?: any;
}

const props = defineProps<Props>();

// Emits
interface Emits {
  'update:modelValue': [value: boolean];
  'roll': [rollData: WeaponAttackRollData];
}

const emit = defineEmits<Emits>();

// Types
export interface WeaponAttackRollData {
  action: 'attack';
  weapon: IItem;
  customModifier: number;
  advantageMode: 'advantage' | 'normal' | 'disadvantage';
  recipients: 'public' | 'private' | 'gm';
}

// Reactive state
const customModifier = ref(0);
const advantageMode = ref<'advantage' | 'normal' | 'disadvantage'>('normal');
const recipients = ref<'public' | 'private' | 'gm'>('public');

// Computed properties
const weaponProperties = computed(() => {
  if (!props.weapon) return null;
  const pluginData = props.weapon.pluginData as any;
  if (pluginData?.properties && Array.isArray(pluginData.properties) && pluginData.properties.length > 0) {
    return pluginData.properties.join(', ');
  }
  return null;
});

const attackBonus = computed(() => {
  if (!props.weapon || !props.character) return null;
  
  const weapon = props.weapon;
  const character = props.character;
  
  let bonus = 0;
  
  // Get weapon ability
  const ability = getWeaponAttackAbility(weapon);
  const abilityMod = getAbilityModifier(character, ability);
  bonus += abilityMod;
  
  // Add proficiency if proficient
  if (isProficientWithWeapon(weapon, character)) {
    bonus += getProficiencyBonus(character);
  }
  
  // Add magical enhancement
  const enhancement = (weapon.pluginData as any)?.enhancement || 0;
  bonus += enhancement;
  
  return bonus;
});

const rollPreview = computed(() => {
  const diceCount = advantageMode.value === 'normal' ? 1 : 2;
  const diceNotation = `${diceCount}d20`;
  const totalModifier = (attackBonus.value || 0) + customModifier.value;
  
  if (totalModifier === 0) {
    return diceNotation;
  }
  
  return `${diceNotation}${formatModifier(totalModifier)}`;
});

// Helper methods
function getWeaponAttackAbility(weapon: IItem): string {
  const properties = (weapon.pluginData as any)?.properties || [];
  const weaponType = (weapon.pluginData as any)?.weaponType || (weapon.pluginData as any)?.category;
  
  if (properties.includes('finesse')) {
    return 'dexterity';
  }
  
  if (weaponType === 'ranged' || weaponType === 'ranged-weapon') {
    return 'dexterity';
  }
  
  return 'strength';
}

function getAbilityModifier(character: any, ability: string): number {
  const abilityScore = character.pluginData?.abilities?.[ability]?.value || 10;
  return Math.floor((abilityScore - 10) / 2);
}

function isProficientWithWeapon(weapon: IItem, character: any): boolean {
  const weaponProficiencies = character.pluginData?.proficiencies?.weapons || [];
  const weaponCategory = (weapon.pluginData as any)?.category || (weapon.pluginData as any)?.weaponType;
  
  return weaponProficiencies.includes(weapon.name) || 
         weaponProficiencies.includes(weaponCategory) ||
         weaponProficiencies.includes('simple-weapons') ||
         weaponProficiencies.includes('martial-weapons');
}

function getProficiencyBonus(character: any): number {
  const level = character.pluginData?.progression?.level || character.pluginData?.level || 1;
  return Math.ceil(level / 4) + 1;
}

function formatModifier(value: number): string {
  return value >= 0 ? `+${value}` : `${value}`;
}

// Methods
function closeDialog() {
  emit('update:modelValue', false);
  // Reset form values when closing
  customModifier.value = 0;
  advantageMode.value = 'normal';
  recipients.value = 'public';
}

function handleRoll() {
  if (!props.weapon) return;
  
  const rollData: WeaponAttackRollData = {
    action: 'attack',
    weapon: props.weapon,
    customModifier: customModifier.value,
    advantageMode: advantageMode.value,
    recipients: recipients.value
  };
  
  emit('roll', rollData);
  closeDialog();
}
</script>

<style scoped>
/* Component-specific styles */
</style>