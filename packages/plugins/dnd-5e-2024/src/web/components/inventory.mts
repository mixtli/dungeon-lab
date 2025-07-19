/**
 * D&D 5e Inventory Component
 * 
 * Equipment and inventory management for D&D 5e characters
 */

import { defineComponent, ref, computed } from 'vue';
import { PluginButton, PluginInput, PluginCard } from '@dungeon-lab/shared/components/ui-library.mjs';
import type { CharacterData, Item } from '@dungeon-lab/shared/types/game-data.mjs';

export const DnD5eInventory = defineComponent({
  name: 'DnD5eInventory',
  
  props: {
    character: {
      type: Object as () => CharacterData,
      required: true
    },
    items: {
      type: Array as () => Item[],
      required: true
    }
  },
  
  emits: {
    'equip-item': (item: Item, slot: string) => true,
    'unequip-item': (item: Item) => true,
    'use-item': (item: Item) => true,
    'drop-item': (item: Item) => true
  },
  
  setup(props, { emit }) {
    const activeCategory = ref('weapons');
    
    const categories = [
      { id: 'weapons', name: 'Weapons' },
      { id: 'armor', name: 'Armor' },
      { id: 'consumables', name: 'Consumables' },
      { id: 'tools', name: 'Tools' },
      { id: 'treasure', name: 'Treasure' },
      { id: 'other', name: 'Other' }
    ];
    
    const filteredItems = computed(() => {
      return props.items.filter(item => item.category === activeCategory.value);
    });
    
    const totalWeight = computed(() => {
      return props.items.reduce((total, item) => total + item.weight, 0);
    });
    
    const carryingCapacity = computed(() => {
      const strScore = props.character.abilities.strength?.value || 10;
      return strScore * 15; // Standard D&D 5e carrying capacity
    });
    
    const encumbranceLevel = computed(() => {
      const weight = totalWeight.value;
      const capacity = carryingCapacity.value;
      
      if (weight <= capacity / 3) return 'light';
      if (weight <= capacity * 2 / 3) return 'medium';
      if (weight <= capacity) return 'heavy';
      return 'overloaded';
    });
    
    const equipItem = (item: Item) => {
      // Determine appropriate equipment slot
      const slot = getEquipmentSlot(item);
      emit('equip-item', item, slot);
    };
    
    const unequipItem = (item: Item) => {
      emit('unequip-item', item);
    };
    
    const useItem = (item: Item) => {
      emit('use-item', item);
    };
    
    const dropItem = (item: Item) => {
      emit('drop-item', item);
    };
    
    const getEquipmentSlot = (item: Item): string => {
      if (item.category === 'weapon') {
        return 'main_hand';
      } else if (item.category === 'armor') {
        return 'chest';
      } else if (item.category === 'shield') {
        return 'off_hand';
      }
      return 'other';
    };
    
    return {
      activeCategory,
      categories,
      filteredItems,
      totalWeight,
      carryingCapacity,
      encumbranceLevel,
      equipItem,
      unequipItem,
      useItem,
      dropItem,
      PluginButton,
      PluginInput,
      PluginCard
    };
  },
  
  template: `
    <div class="dnd5e-inventory">
      <PluginCard title="Inventory">
        <!-- Weight and Encumbrance -->
        <div class="mb-4 p-3 bg-gray-50 rounded-lg">
          <div class="flex justify-between items-center">
            <span class="text-sm text-gray-600">Carrying Capacity</span>
            <span class="text-sm font-medium">
              {{ totalWeight }}/{{ carryingCapacity }} lbs
            </span>
          </div>
          <div class="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div 
              class="h-2 rounded-full transition-all duration-300"
              :class="{
                'bg-green-500': encumbranceLevel === 'light',
                'bg-yellow-500': encumbranceLevel === 'medium',
                'bg-orange-500': encumbranceLevel === 'heavy',
                'bg-red-500': encumbranceLevel === 'overloaded'
              }"
              :style="{ width: Math.min(100, (totalWeight / carryingCapacity) * 100) + '%' }"
            ></div>
          </div>
          <div class="text-xs text-gray-500 mt-1 capitalize">
            {{ encumbranceLevel }} load
          </div>
        </div>
        
        <!-- Category Tabs -->
        <div class="flex space-x-1 mb-4">
          <button
            v-for="category in categories"
            :key="category.id"
            @click="activeCategory = category.id"
            :class="[
              'px-3 py-2 rounded-md text-sm font-medium transition-colors',
              activeCategory === category.id
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            ]"
          >
            {{ category.name }}
          </button>
        </div>
        
        <!-- Items List -->
        <div class="space-y-2">
          <div
            v-for="item in filteredItems"
            :key="item.id"
            class="item flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100"
          >
            <div class="flex-1">
              <div class="flex items-center space-x-2">
                <h3 class="font-medium">{{ item.name }}</h3>
                <span class="text-sm text-gray-500">{{ item.weight }} lbs</span>
                <span class="text-sm text-gray-500">{{ item.value.amount }} {{ item.value.currency }}</span>
              </div>
              <p class="text-sm text-gray-600 mt-1">{{ item.description }}</p>
            </div>
            <div class="flex items-center space-x-2">
              <PluginButton
                variant="ghost"
                size="sm"
                @click="equipItem(item)"
                v-if="item.category === 'weapon' || item.category === 'armor'"
              >
                Equip
              </PluginButton>
              <PluginButton
                variant="ghost"
                size="sm"
                @click="useItem(item)"
                v-if="item.category === 'consumables'"
              >
                Use
              </PluginButton>
              <PluginButton
                variant="ghost"
                size="sm"
                @click="dropItem(item)"
                class="text-red-600 hover:text-red-700"
              >
                Drop
              </PluginButton>
            </div>
          </div>
        </div>
        
        <div v-if="filteredItems.length === 0" class="text-center text-gray-500 py-8">
          No items in this category
        </div>
      </PluginCard>
    </div>
  `
});