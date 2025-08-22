<template>
  <div 
    v-if="modelValue" 
    class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
    @click.self="closeDialog"
  >
    <div class="bg-gray-800 rounded-lg shadow-xl p-4 max-w-md w-full mx-4">
      <!-- Dialog Header -->
      <div class="relative mb-6">
        <h2 class="text-xl font-bold text-red-600 text-center">
          Attack with {{ weapon?.name || 'Weapon' }}
        </h2>
        <button 
          @click="closeDialog"
          class="absolute top-0 right-0 text-gray-400 hover:text-gray-200 text-xl font-bold"
        >
          ×
        </button>
      </div>

      <!-- Roll Formula -->
      <div v-if="weapon" class="text-center mb-4">
        <div class="text-lg font-mono text-gray-200">
          {{ rollPreview }}
        </div>
      </div>

      <!-- Roll Options -->
      <div class="space-y-4 mb-4">
        <!-- Roll Mode Buttons -->
        <div class="flex space-x-2">
          <button
            @click="advantageMode = 'disadvantage'"
            :class="['flex-1 py-2 px-3 rounded text-sm font-medium transition-colors',
                     advantageMode === 'disadvantage' 
                       ? 'bg-red-600 text-white' 
                       : 'bg-gray-700 text-gray-300 hover:bg-gray-600']"
          >
            Disadvantage
          </button>
          <button
            @click="advantageMode = 'normal'"
            :class="['flex-1 py-2 px-3 rounded text-sm font-medium transition-colors',
                     advantageMode === 'normal' 
                       ? 'bg-blue-600 text-white' 
                       : 'bg-gray-700 text-gray-300 hover:bg-gray-600']"
          >
            Normal
          </button>
          <button
            @click="advantageMode = 'advantage'"
            :class="['flex-1 py-2 px-3 rounded text-sm font-medium transition-colors',
                     advantageMode === 'advantage' 
                       ? 'bg-green-600 text-white' 
                       : 'bg-gray-700 text-gray-300 hover:bg-gray-600']"
          >
            Advantage
          </button>
        </div>

        <!-- Inputs above action buttons -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label for="customModifier" class="block text-sm font-medium text-gray-200 mb-1">
              Custom Modifier
            </label>
            <input
              id="customModifier"
              v-model.number="customModifier"
              type="number"
              class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              placeholder="0"
            />
          </div>
          <div>
            <label for="recipients" class="block text-sm font-medium text-gray-200 mb-1">
              Roll Visibility
            </label>
            <select
              id="recipients"
              v-model="recipients"
              class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
            >
              <option value="public">Public (everyone can see)</option>
              <option value="private">Private (only you can see)</option>
              <option value="gm">GM Only (only GM can see)</option>
            </select>
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
          class="flex-1 bg-gray-600 text-gray-100 py-2 px-4 rounded-md hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-400 font-medium"
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
// const weaponProperties = computed(() => {
//   if (!props.weapon) return null;
//   const pluginData = props.weapon.pluginData as any;
//   if (pluginData?.properties && Array.isArray(pluginData.properties) && pluginData.properties.length > 0) {
//     return pluginData.properties.join(', ');
//   }
//   return null;
// });

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