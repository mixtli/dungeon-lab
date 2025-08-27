<template>
  <div class="dnd5e-sheet dnd5e-weapon-sheet">
    <!-- Header -->
    <header class="sheet-header" @mousedown="startDrag">
      <div class="weapon-info">
        <div class="weapon-icon">
          <div class="weapon-type-badge" :class="`category-${weaponData.category || 'simple'}`">
            {{ getWeaponIcon(weaponData) }}
          </div>
        </div>
        <div class="weapon-details">
          <h1 class="weapon-name">{{ weapon.name }}</h1>
          <p class="weapon-subtitle">
            {{ weaponTypeText }} • {{ weaponData.category || 'Simple' }}
          </p>
        </div>
      </div>
      <div class="header-actions">
        <button @click="$emit('close')" class="close-btn" title="Close">
          ✕
        </button>
      </div>
    </header>

    <!-- Weapon Image (if available) -->
    <div v-if="weaponImageUrl" class="weapon-image-container">
      <img 
        :src="weaponImageUrl" 
        :alt="weapon.name"
        class="weapon-image"
      />
    </div>

    <!-- Content -->
    <div class="sheet-content">
      <!-- Basic Information -->
      <section class="weapon-section">
        <h3 class="section-title">Weapon Details</h3>
        <div class="weapon-properties">
          <div class="property-row">
            <span class="property-label">Damage:</span>
            <span class="property-value damage">
              {{ weaponData.damage?.dice || 'Unknown' }}
              <span class="damage-type">{{ weaponData.damage?.type || '' }}</span>
            </span>
          </div>
          <div v-if="weaponData.versatileDamage" class="property-row">
            <span class="property-label">Versatile:</span>
            <span class="property-value damage">
              {{ weaponData.versatileDamage.dice }}
              <span class="damage-type">{{ weaponData.versatileDamage.type }}</span>
            </span>
          </div>
          <div v-if="weaponData.range" class="property-row">
            <span class="property-label">Range:</span>
            <span class="property-value">{{ weaponData.range.normal }}/{{ weaponData.range.long }} ft</span>
          </div>
          <div v-if="weaponData.weight" class="property-row">
            <span class="property-label">Weight:</span>
            <span class="property-value">{{ weaponData.weight }} lbs</span>
          </div>
          <div v-if="weaponData.cost" class="property-row">
            <span class="property-label">Cost:</span>
            <span class="property-value">{{ weaponData.cost.amount }} {{ weaponData.cost.currency }}</span>
          </div>
        </div>
      </section>

      <!-- Properties -->
      <section v-if="weaponData.properties?.length" class="weapon-section">
        <h3 class="section-title">Properties</h3>
        <div class="properties-list">
          <span 
            v-for="property in weaponData.properties" 
            :key="property"
            class="property-tag"
          >
            {{ formatProperty(property) }}
          </span>
        </div>
      </section>

      <!-- Weapon Mastery (2024 D&D) -->
      <section v-if="weaponData.mastery" class="weapon-section">
        <h3 class="section-title">Weapon Mastery</h3>
        <div class="mastery-info">
          <span class="mastery-property">{{ formatProperty(weaponData.mastery) }}</span>
        </div>
      </section>

      <!-- Magic Properties -->
      <section v-if="weaponData.magical" class="weapon-section">
        <h3 class="section-title">Magical Properties</h3>
        <div class="magic-properties">
          <div v-if="weaponData.enchantmentBonus" class="property-row">
            <span class="property-label">Enchantment:</span>
            <span class="property-value enchanted">+{{ weaponData.enchantmentBonus }}</span>
          </div>
          <div v-if="weaponData.rarity" class="property-row">
            <span class="property-label">Rarity:</span>
            <span class="property-value" :class="`rarity-${weaponData.rarity}`">{{ formatRarity(weaponData.rarity) }}</span>
          </div>
          <div v-if="weaponData.attunement" class="property-row">
            <span class="property-label">Attunement:</span>
            <span class="property-value attunement">Required</span>
          </div>
        </div>
      </section>

      <!-- Description -->
      <section v-if="weaponData.description" class="weapon-section">
        <h3 class="section-title">Description</h3>
        <div class="weapon-description">
          {{ weaponData.description }}
        </div>
      </section>

      <!-- Source -->
      <footer v-if="weaponData.source" class="weapon-source">
        <small>Source: {{ weaponData.source }}{{ weaponData.page ? `, page ${weaponData.page}` : '' }}</small>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, type Ref } from 'vue';
import type { BaseDocument } from '@dungeon-lab/shared/types/index.mjs';
import type { DndItemDocument, DndWeaponData } from '../../types/dnd/item.mjs';

// Props - following the same pattern as spell sheet
interface Props {
  document: Ref<BaseDocument>;
  documentCopy?: Ref<BaseDocument | null>;
  items?: Ref<any[]>;
  editMode?: boolean;
  readonly?: boolean;
  hasUnsavedChanges?: boolean;
  save?: () => void;
  cancel?: () => void;
  reset?: () => void;
}

const props = withDefaults(defineProps<Props>(), {
  readonly: true // Weapon sheets are always read-only
});

// Events - unified interface
const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'drag-start', event: MouseEvent): void;
}>();

// Type-safe weapon accessor
const weapon = computed(() => {
  return props.document.value as DndItemDocument;
});

// Weapon data accessor
const weaponData = computed((): DndWeaponData => {
  return weapon.value.pluginData as DndWeaponData;
});

// Weapon image URL
const weaponImageUrl = computed(() => {
  const doc = weapon.value as any;
  return doc.image?.url || null;
});

// Computed display properties
const weaponTypeText = computed(() => {
  const type = weaponData.value.type;
  if (!type) return 'Weapon';
  
  // Format weapon type (e.g., "longsword" -> "Longsword")
  return type.split('-').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
});

// Helper functions
const getWeaponIcon = (data: DndWeaponData): string => {
  const type = data.type?.toLowerCase() || '';
  const category = data.category?.toLowerCase() || '';
  
  if (type.includes('bow') || type.includes('crossbow') || category === 'ranged') return '🏹';
  if (type.includes('sword')) return '⚔️';
  if (type.includes('axe')) return '🪓';
  if (type.includes('hammer') || type.includes('mace')) return '🔨';
  if (type.includes('spear') || type.includes('javelin')) return '🗡️';
  if (type.includes('dagger')) return '🗡️';
  
  return '⚔️'; // Default weapon icon
};

const formatProperty = (property: string): string => {
  return property.split('-').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
};

const formatRarity = (rarity: string): string => {
  return rarity.charAt(0).toUpperCase() + rarity.slice(1);
};

// Drag handling
const startDrag = (event: MouseEvent) => {
  emit('drag-start', event);
};

// Debug logging
onMounted(() => {
  console.log('[WeaponSheet] Mounted with weapon:', weapon.value?.name);
  console.log('[WeaponSheet] Weapon data:', weaponData.value);
});
</script>

<style scoped>
.dnd5e-weapon-sheet {
  display: flex;
  flex-direction: column;
  height: 100%;
  max-height: 90vh;
  width: 500px;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border: 1px solid #dee2e6;
  border-radius: 12px;
  overflow: hidden;
  font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
}

/* Header */
.sheet-header {
  background: linear-gradient(135deg, #8b4513 0%, #a0522d 100%);
  color: white;
  padding: 16px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: move;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}

.weapon-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.weapon-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

.weapon-type-badge {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 18px;
  background: rgba(255, 255, 255, 0.2);
  border: 2px solid rgba(255, 255, 255, 0.3);
}

.weapon-type-badge.category-martial {
  background: linear-gradient(135deg, #dc3545, #c82333);
}

.weapon-type-badge.category-simple {
  background: linear-gradient(135deg, #28a745, #218838);
}

.weapon-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.weapon-name {
  font-size: 24px;
  font-weight: 600;
  margin: 0;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.weapon-subtitle {
  font-size: 14px;
  margin: 0;
  opacity: 0.9;
  text-transform: capitalize;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.close-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 16px;
  transition: background-color 0.2s;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

/* Weapon Image */
.weapon-image-container {
  padding: 20px;
  text-align: center;
  background: white;
  border-bottom: 1px solid #e9ecef;
}

.weapon-image {
  max-width: 200px;
  max-height: 150px;
  object-fit: contain;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

/* Content */
.sheet-content {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.weapon-section {
  background: white;
  border-radius: 8px;
  padding: 16px;
  border: 1px solid #e9ecef;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 12px 0;
  color: #8b4513;
  border-bottom: 1px solid #e9ecef;
  padding-bottom: 8px;
}

.weapon-properties {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.property-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
}

.property-label {
  font-weight: 500;
  color: #495057;
  min-width: 120px;
}

.property-value {
  color: #212529;
  text-align: right;
  flex: 1;
}

.property-value.damage {
  font-weight: 600;
  color: #dc3545;
  font-size: 16px;
}

.damage-type {
  color: #6c757d;
  font-weight: 400;
  margin-left: 4px;
  text-transform: capitalize;
}

.property-value.enchanted {
  color: #6f42c1;
  font-weight: 600;
}

.property-value.attunement {
  color: #fd7e14;
  font-weight: 500;
}

.properties-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.property-tag {
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 16px;
  padding: 4px 12px;
  font-size: 12px;
  font-weight: 500;
  color: #495057;
  text-transform: capitalize;
}

.mastery-info {
  display: flex;
  gap: 8px;
}

.mastery-property {
  background: linear-gradient(135deg, #8b4513, #a0522d);
  color: white;
  border-radius: 16px;
  padding: 6px 14px;
  font-size: 13px;
  font-weight: 600;
  text-transform: capitalize;
}

.magic-properties {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.rarity-common { color: #6c757d; }
.rarity-uncommon { color: #28a745; }
.rarity-rare { color: #17a2b8; }
.rarity-very-rare { color: #6f42c1; }
.rarity-legendary { color: #fd7e14; }
.rarity-artifact { color: #dc3545; }

.weapon-description {
  line-height: 1.6;
  color: #495057;
}

.weapon-source {
  margin-top: auto;
  padding: 12px 16px;
  background: #f8f9fa;
  border-top: 1px solid #e9ecef;
  text-align: center;
  color: #6c757d;
}

/* Scrollbar styling */
.sheet-content::-webkit-scrollbar {
  width: 6px;
}

.sheet-content::-webkit-scrollbar-track {
  background: #f1f3f4;
  border-radius: 3px;
}

.sheet-content::-webkit-scrollbar-thumb {
  background: #c1c8cd;
  border-radius: 3px;
}

.sheet-content::-webkit-scrollbar-thumb:hover {
  background: #a0a8af;
}
</style>