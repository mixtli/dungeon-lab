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
          {{ weapon?.name || 'Weapon' }} Damage
        </h2>
        <button 
          @click="closeDialog"
          class="text-gray-400 hover:text-gray-600 text-xl font-bold"
        >
          ×
        </button>
      </div>

      <!-- Weapon Information -->
      <div v-if="weapon" class="bg-amber-100 dark:bg-amber-900 rounded p-3 mb-6">
        <div class="text-sm font-medium text-amber-800 dark:text-amber-200">
          {{ weapon.name }}
        </div>
        <div v-if="weaponDamage" class="text-xs text-amber-600 dark:text-amber-300">
          Damage: {{ weaponDamage }}
        </div>
        <div v-if="damageType" class="text-xs text-amber-600 dark:text-amber-300">
          Type: {{ damageType }}
        </div>
      </div>

      <!-- Roll Options -->
      <div class="space-y-4 mb-6">
        <!-- Critical Hit Option -->
        <div>
          <label class="flex items-center">
            <input
              v-model="isCritical"
              type="checkbox"
              class="mr-2 text-amber-600"
            />
            <span class="text-orange-600 font-medium">Critical Hit</span>
            <span class="text-xs text-gray-500 ml-2">(double damage dice)</span>
          </label>
        </div>

        <!-- Custom Modifier -->
        <div>
          <label for="customModifier" class="block text-sm font-medium text-gray-700 mb-1">
            Custom Modifier
          </label>
          <input
            id="customModifier"
            v-model.number="customModifier"
            type="number"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
            placeholder="0"
          />
        </div>

        <!-- Recipients -->
        <div>
          <label for="recipients" class="block text-sm font-medium text-gray-700 mb-1">
            Roll Visibility
          </label>
          <select
            id="recipients"
            v-model="recipients"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
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
            Damage bonus: {{ formatModifier(damageBonus || 0) }}
            <span v-if="customModifier !== 0">
              | Custom: {{ formatModifier(customModifier) }}
            </span>
            <span v-if="isCritical" class="text-orange-600 font-medium">
              | Critical Hit (dice doubled)
            </span>
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex space-x-3">
        <button
          @click="handleRoll"
          class="flex-1 bg-amber-600 text-white py-2 px-4 rounded-md hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
        >
          🗡️ Roll Damage
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
  'roll': [rollData: WeaponDamageRollData];
}

const emit = defineEmits<Emits>();

// Types
export interface WeaponDamageRollData {
  action: 'damage';
  weapon: IItem;
  customModifier: number;
  isCritical: boolean;
  recipients: 'public' | 'private' | 'gm';
}

// Reactive state
const customModifier = ref(0);
const isCritical = ref(false);
const recipients = ref<'public' | 'private' | 'gm'>('public');

// Computed properties
const weaponDamage = computed(() => {
  if (!props.weapon) return null;
  const pluginData = props.weapon.pluginData as any;
  if (pluginData?.damage?.dice && pluginData?.damage?.type) {
    return `${pluginData.damage.dice} ${pluginData.damage.type}`;
  }
  return null;
});

const damageType = computed(() => {
  if (!props.weapon) return null;
  const pluginData = props.weapon.pluginData as any;
  return pluginData?.damageType || pluginData?.damage?.type || 'bludgeoning';
});

const damageBonus = computed(() => {
  if (!props.weapon || !props.character) return null;
  
  const weapon = props.weapon;
  const character = props.character;
  
  let bonus = 0;
  
  // Get weapon ability (same as attack ability for damage)
  const ability = getWeaponDamageAbility(weapon);
  const abilityMod = getAbilityModifier(character, ability);
  bonus += abilityMod;
  
  // Add magical enhancement
  const enhancement = (weapon.pluginData as any)?.enhancement || 0;
  bonus += enhancement;
  
  return bonus;
});

const rollPreview = computed(() => {
  if (!props.weapon) return 'No weapon';
  
  const weapon = props.weapon;
  const pluginData = weapon.pluginData as any;
  
  if (!pluginData?.damage?.dice) return 'No damage dice';
  
  // Parse dice notation (e.g., "1d6", "2d4")
  const diceMatch = pluginData.damage.dice.match(/(\d+)d(\d+)/);
  if (!diceMatch) return pluginData.damage.dice;
  
  const quantity = parseInt(diceMatch[1]);
  const sides = parseInt(diceMatch[2]);
  
  // Double dice for critical hits
  const finalQuantity = isCritical.value ? quantity * 2 : quantity;
  const diceNotation = `${finalQuantity}d${sides}`;
  
  const totalModifier = (damageBonus.value || 0) + customModifier.value;
  
  if (totalModifier === 0) {
    return diceNotation;
  }
  
  return `${diceNotation}${formatModifier(totalModifier)}`;
});

// Helper methods
function getWeaponDamageAbility(weapon: IItem): string {
  // Same logic as attack ability for damage
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

function formatModifier(value: number): string {
  return value >= 0 ? `+${value}` : `${value}`;
}

// Methods
function closeDialog() {
  emit('update:modelValue', false);
  // Reset form values when closing
  customModifier.value = 0;
  isCritical.value = false;
  recipients.value = 'public';
}

function handleRoll() {
  if (!props.weapon) return;
  
  const rollData: WeaponDamageRollData = {
    action: 'damage',
    weapon: props.weapon,
    customModifier: customModifier.value,
    isCritical: isCritical.value,
    recipients: recipients.value
  };
  
  emit('roll', rollData);
  closeDialog();
}
</script>

<style scoped>
/* Component-specific styles */
</style>