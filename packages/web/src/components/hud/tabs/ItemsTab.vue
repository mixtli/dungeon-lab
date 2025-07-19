<template>
  <div class="items-tab">
    <div class="items-header">
      <h4>Items</h4>
      <div class="items-controls">
        <button class="control-button" title="Add Item">
          <i class="mdi mdi-plus"></i>
        </button>
        <button class="control-button" title="Import Items">
          <i class="mdi mdi-upload"></i>
        </button>
        <button class="control-button" title="Item Settings">
          <i class="mdi mdi-cog"></i>
        </button>
      </div>
    </div>

    <div class="search-filter">
      <div class="search-box">
        <i class="mdi mdi-magnify search-icon"></i>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search items..."
          class="search-input"
        />
      </div>
      
      <div class="filter-tabs">
        <button
          v-for="filter in filterOptions"
          :key="filter.id"
          class="filter-tab"
          :class="{ 'filter-active': activeFilter === filter.id }"
          @click="activeFilter = filter.id"
        >
          {{ filter.label }}
        </button>
      </div>
    </div>

    <div class="items-list">
      <div
        v-for="item in filteredItems"
        :key="item.id"
        class="item-card"
        :class="`item-${item.data?.rarity || 'common'}`"
        @click="selectItem(item)"
      >
        <div class="item-icon">
          <img v-if="item.image?.url" :src="item.image.url" :alt="item.name" />
          <i v-else :class="getItemIcon(item.type)"></i>
        </div>
        
        <div class="item-info">
          <div class="item-name">{{ item.name }}</div>
          <div class="item-details">
            <span class="item-type">{{ item.type }}</span>
            <span v-if="item.data?.rarity" class="item-rarity" :class="`rarity-${item.data.rarity}`">{{ item.data.rarity }}</span>
          </div>
          <div v-if="item.description" class="item-description">{{ item.description }}</div>
          <div class="item-properties" v-if="item.data?.properties?.length">
            <span
              v-for="property in item.data.properties"
              :key="property"
              class="property-tag"
            >
              {{ property }}
            </span>
          </div>
        </div>

        <div class="item-actions">
          <button class="action-button" title="Give to Player" @click.stop="giveToPlayer(item)">
            <i class="mdi mdi-gift"></i>
          </button>
          <button class="action-button" title="Edit Item" @click.stop="editItem(item)">
            <i class="mdi mdi-pencil"></i>
          </button>
          <button class="action-button" title="Duplicate" @click.stop="duplicateItem(item)">
            <i class="mdi mdi-content-copy"></i>
          </button>
        </div>
      </div>
    </div>

    <div class="quick-actions">
      <button class="quick-action-button">
        <i class="mdi mdi-sword"></i>
        Create Weapon
      </button>
      <button class="quick-action-button">
        <i class="mdi mdi-shield"></i>
        Create Armor
      </button>
      <button class="quick-action-button">
        <i class="mdi mdi-flask"></i>
        Create Potion
      </button>
      <button class="quick-action-button">
        <i class="mdi mdi-auto-fix"></i>
        Create Magic Item
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useItemStore } from '../../../stores/item.store.mjs';
import type { IItem } from '@dungeon-lab/shared/types/index.mjs';

const itemStore = useItemStore();
const searchQuery = ref('');
const activeFilter = ref('all');

const filterOptions = [
  { id: 'all', label: 'All' },
  { id: 'weapon', label: 'Weapons' },
  { id: 'armor', label: 'Armor' },
  { id: 'potion', label: 'Potions' },
  { id: 'magic', label: 'Magic Items' },
  { id: 'tool', label: 'Tools' }
];

// Use real data from store instead of hardcoded
const items = computed(() => itemStore.items);

const filteredItems = computed(() => {
  let filtered = items.value;

  // Filter by type
  if (activeFilter.value !== 'all') {
    filtered = filtered.filter(item => item.type === activeFilter.value);
  }

  // Filter by search query
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(item => 
      item.name.toLowerCase().includes(query) ||
      item.type.toLowerCase().includes(query) ||
      item.description?.toLowerCase().includes(query)
    );
  }

  return filtered;
});

// Load items when component mounts
onMounted(async () => {
  try {
    await itemStore.ensureItemsLoaded();
  } catch (error) {
    console.error('Failed to load items:', error);
  }
});

// Helper function to get appropriate icon for item type
function getItemIcon(type: string): string {
  const iconMap: Record<string, string> = {
    weapon: 'mdi mdi-sword',
    armor: 'mdi mdi-shield',
    potion: 'mdi mdi-flask',
    consumable: 'mdi mdi-flask',
    magic: 'mdi mdi-auto-fix',
    tool: 'mdi mdi-wrench',
    gear: 'mdi mdi-bag-personal',
    spell: 'mdi mdi-book-open-variant',
    default: 'mdi mdi-package-variant'
  };
  return iconMap[type] || iconMap.default;
}

// Implement real functionality
async function selectItem(item: IItem): Promise<void> {
  try {
    await itemStore.setCurrentItem(item.id);
    console.log('Selected item:', item.name);
  } catch (error) {
    console.error('Failed to select item:', error);
  }
}

async function giveToPlayer(item: IItem): Promise<void> {
  console.log('Giving to player:', item);
  // TODO: Implement give to player
}

async function editItem(item: IItem): Promise<void> {
  console.log('Editing item:', item);
  // TODO: Navigate to item edit view or open modal
}

async function duplicateItem(item: IItem): Promise<void> {
  try {
    const duplicatedData = {
      ...item,
      name: `${item.name} (Copy)`,
      id: undefined // Let server generate new ID
    };
    await itemStore.createItemSocket(duplicatedData);
    console.log('Duplicated item:', item.name);
  } catch (error) {
    console.error('Failed to duplicate item:', error);
  }
}
</script>

<style scoped>
.items-tab {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: transparent;
}

.items-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.items-header h4 {
  color: white;
  margin: 0;
  font-weight: 600;
}

.items-controls {
  display: flex;
  gap: 4px;
}

.control-button {
  width: 28px;
  height: 28px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.control-button:hover {
  background: rgba(255, 255, 255, 0.15);
  color: white;
}

.search-filter {
  padding: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.search-box {
  position: relative;
  margin-bottom: 12px;
}

.search-icon {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: rgba(255, 255, 255, 0.5);
  font-size: 16px;
}

.search-input {
  width: 100%;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  padding: 8px 12px 8px 36px;
  color: white;
  font-size: 14px;
  transition: all 0.2s ease;
}

.search-input:focus {
  outline: none;
  border-color: rgba(59, 130, 246, 0.5);
  background: rgba(255, 255, 255, 0.15);
}

.search-input::placeholder {
  color: rgba(255, 255, 255, 0.5);
}

.filter-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.filter-tab {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  padding: 6px 12px;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 12px;
  font-weight: 600;
}

.filter-tab:hover {
  background: rgba(255, 255, 255, 0.15);
  color: white;
}

.filter-tab.filter-active {
  background: rgba(59, 130, 246, 0.6);
  color: white;
  border-color: rgba(59, 130, 246, 0.8);
}

.items-list {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.item-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.item-card:hover {
  background: rgba(255, 255, 255, 0.1);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.item-card.item-common {
  border-left: 3px solid #9ca3af;
}

.item-card.item-uncommon {
  border-left: 3px solid #22c55e;
}

.item-card.item-rare {
  border-left: 3px solid #3b82f6;
}

.item-card.item-very-rare {
  border-left: 3px solid #8b5cf6;
}

.item-card.item-legendary {
  border-left: 3px solid #f59e0b;
}

.item-icon {
  width: 40px;
  height: 40px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.8);
  flex-shrink: 0;
}

.item-icon i {
  font-size: 20px;
}

.item-info {
  flex: 1;
  min-width: 0;
}

.item-name {
  color: white;
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 4px;
}

.item-details {
  display: flex;
  gap: 8px;
  margin-bottom: 6px;
  align-items: center;
}

.item-type {
  color: rgba(255, 255, 255, 0.6);
  font-size: 12px;
  text-transform: capitalize;
}

.item-rarity {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 2px 6px;
  border-radius: 3px;
}

.rarity-common {
  color: #9ca3af;
  background: rgba(156, 163, 175, 0.2);
}

.rarity-uncommon {
  color: #22c55e;
  background: rgba(34, 197, 94, 0.2);
}

.rarity-rare {
  color: #3b82f6;
  background: rgba(59, 130, 246, 0.2);
}

.rarity-very-rare {
  color: #8b5cf6;
  background: rgba(139, 92, 246, 0.2);
}

.rarity-legendary {
  color: #f59e0b;
  background: rgba(245, 158, 11, 0.2);
}

.item-description {
  color: rgba(255, 255, 255, 0.8);
  font-size: 12px;
  line-height: 1.4;
  margin-bottom: 8px;
}

.item-properties {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.property-tag {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.7);
  font-size: 10px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 3px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.item-actions {
  display: flex;
  flex-direction: column;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s ease;
  flex-shrink: 0;
}

.item-card:hover .item-actions {
  opacity: 1;
}

.action-button {
  width: 28px;
  height: 28px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-button:hover {
  background: rgba(255, 255, 255, 0.15);
  color: white;
}

.quick-actions {
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding: 16px;
  background: rgba(0, 0, 0, 0.2);
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.quick-action-button {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  padding: 10px 8px;
  color: rgba(255, 255, 255, 0.8);
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  font-weight: 600;
  font-size: 12px;
}

.quick-action-button:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
  transform: translateY(-1px);
}

.quick-action-button i {
  font-size: 16px;
}

/* Scrollbar styling */
.items-list::-webkit-scrollbar {
  width: 6px;
}

.items-list::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
}

.items-list::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.3);
  border-radius: 3px;
}

.items-list::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.5);
}
</style>