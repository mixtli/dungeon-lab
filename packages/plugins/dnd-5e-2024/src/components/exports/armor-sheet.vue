<template>
  <div class="dnd5e-sheet dnd5e-armor-sheet">
    <!-- Header -->
    <header class="sheet-header" @mousedown="startDrag">
      <div class="armor-info">
        <div class="armor-icon">
          <div class="armor-type-badge" :class="`type-${armorData.type || 'light'}`">
            {{ getArmorIcon(armorData) }}
          </div>
        </div>
        <div class="armor-details">
          <h1 class="armor-name">{{ armor.name }}</h1>
          <p class="armor-subtitle">
            {{ armorTypeText }} • AC {{ armorData.armorClass || 10 }}
          </p>
        </div>
      </div>
      <div class="header-actions">
        <button @click="$emit('close')" class="close-btn" title="Close">
          ✕
        </button>
      </div>
    </header>

    <!-- Armor Image (if available) -->
    <div v-if="armorImageUrl" class="armor-image-container">
      <img 
        :src="armorImageUrl" 
        :alt="armor.name"
        class="armor-image"
      />
    </div>

    <!-- Content -->
    <div class="sheet-content">
      <!-- Basic Information -->
      <section class="armor-section">
        <h3 class="section-title">Armor Details</h3>
        <div class="armor-properties">
          <div class="property-row">
            <span class="property-label">Armor Class:</span>
            <span class="property-value ac">
              {{ armorData.armorClass || 10 }}
              <span v-if="armorData.maxDexBonus !== undefined" class="dex-bonus">
                + Dex (max {{ armorData.maxDexBonus }})
              </span>
              <span v-else-if="armorData.type !== 'heavy'" class="dex-bonus">
                + Dex
              </span>
            </span>
          </div>
          <div v-if="armorData.strengthRequirement" class="property-row">
            <span class="property-label">Strength Required:</span>
            <span class="property-value requirement">{{ armorData.strengthRequirement }}</span>
          </div>
          <div v-if="armorData.stealthDisadvantage" class="property-row">
            <span class="property-label">Stealth:</span>
            <span class="property-value disadvantage">Disadvantage</span>
          </div>
          <div v-if="armorData.donTime" class="property-row">
            <span class="property-label">Don Time:</span>
            <span class="property-value">{{ armorData.donTime }}</span>
          </div>
          <div v-if="armorData.doffTime" class="property-row">
            <span class="property-label">Doff Time:</span>
            <span class="property-value">{{ armorData.doffTime }}</span>
          </div>
          <div v-if="armorData.weight" class="property-row">
            <span class="property-label">Weight:</span>
            <span class="property-value">{{ armorData.weight }} lbs</span>
          </div>
          <div v-if="armorData.cost" class="property-row">
            <span class="property-label">Cost:</span>
            <span class="property-value">{{ armorData.cost.amount }} {{ armorData.cost.currency }}</span>
          </div>
        </div>
      </section>

      <!-- Magic Properties -->
      <section v-if="armorData.magical" class="armor-section">
        <h3 class="section-title">Magical Properties</h3>
        <div class="magic-properties">
          <div v-if="armorData.enchantmentBonus" class="property-row">
            <span class="property-label">Enchantment:</span>
            <span class="property-value enchanted">+{{ armorData.enchantmentBonus }}</span>
          </div>
          <div v-if="armorData.rarity" class="property-row">
            <span class="property-label">Rarity:</span>
            <span class="property-value" :class="`rarity-${armorData.rarity}`">{{ formatRarity(armorData.rarity) }}</span>
          </div>
          <div v-if="armorData.attunement" class="property-row">
            <span class="property-label">Attunement:</span>
            <span class="property-value attunement">Required</span>
          </div>
        </div>
      </section>

      <!-- Description -->
      <section v-if="armorData.description" class="armor-section">
        <h3 class="section-title">Description</h3>
        <div class="armor-description">
          {{ armorData.description }}
        </div>
      </section>

      <!-- Source -->
      <footer v-if="armorData.source" class="armor-source">
        <small>Source: {{ armorData.source }}{{ armorData.page ? `, page ${armorData.page}` : '' }}</small>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, type Ref } from 'vue';
import type { BaseDocument } from '@dungeon-lab/shared/types/index.mjs';
import type { DndItemDocument, DndArmorData } from '../../types/dnd/item.mjs';

// Props - following the same pattern as weapon sheet
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
  readonly: true // Armor sheets are always read-only
});

// Events - unified interface
const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'drag-start', event: MouseEvent): void;
}>();

// Type-safe armor accessor
const armor = computed(() => {
  return props.document.value as DndItemDocument;
});

// Armor data accessor
const armorData = computed((): DndArmorData => {
  return armor.value.pluginData as DndArmorData;
});

// Armor image URL
const armorImageUrl = computed(() => {
  const doc = armor.value as any;
  return doc.image?.url || null;
});

// Computed display properties
const armorTypeText = computed(() => {
  const type = armorData.value.type;
  if (!type) return 'Armor';
  
  // Format armor type (e.g., "light-armor" -> "Light Armor")
  return type.split('-').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
});

// Helper functions
const getArmorIcon = (data: DndArmorData): string => {
  const type = data.type?.toLowerCase() || '';
  
  if (type.includes('shield')) return '🛡️';
  if (type.includes('heavy')) return '🦾';
  if (type.includes('medium')) return '🦺';
  if (type.includes('light')) return '👕';
  
  return '🛡️'; // Default armor icon
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
  console.log('[ArmorSheet] Mounted with armor:', armor.value?.name);
  console.log('[ArmorSheet] Armor data:', armorData.value);
});
</script>

<style scoped>
.dnd5e-armor-sheet {
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

/* Header - Blue/silver theme for armor */
.sheet-header {
  background: linear-gradient(135deg, #4a90e2 0%, #357abd 100%);
  color: white;
  padding: 16px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: move;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}

.armor-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.armor-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

.armor-type-badge {
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

.armor-type-badge.type-heavy {
  background: linear-gradient(135deg, #6c757d, #495057);
}

.armor-type-badge.type-medium {
  background: linear-gradient(135deg, #17a2b8, #138496);
}

.armor-type-badge.type-light {
  background: linear-gradient(135deg, #28a745, #1e7e34);
}

.armor-type-badge.type-shield {
  background: linear-gradient(135deg, #ffc107, #e0a800);
}

.armor-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.armor-name {
  font-size: 24px;
  font-weight: 600;
  margin: 0;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.armor-subtitle {
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

/* Armor Image */
.armor-image-container {
  padding: 20px;
  text-align: center;
  background: white;
  border-bottom: 1px solid #e9ecef;
}

.armor-image {
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

.armor-section {
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
  color: #4a90e2;
  border-bottom: 1px solid #e9ecef;
  padding-bottom: 8px;
}

.armor-properties {
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

.property-value.ac {
  font-weight: 600;
  color: #4a90e2;
  font-size: 16px;
}

.dex-bonus {
  color: #6c757d;
  font-weight: 400;
  margin-left: 4px;
  font-size: 14px;
}

.property-value.requirement {
  color: #dc3545;
  font-weight: 500;
}

.property-value.disadvantage {
  color: #fd7e14;
  font-weight: 500;
}

.property-value.enchanted {
  color: #6f42c1;
  font-weight: 600;
}

.property-value.attunement {
  color: #fd7e14;
  font-weight: 500;
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

.armor-description {
  line-height: 1.6;
  color: #495057;
}

.armor-source {
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