<template>
  <div class="dnd5e-sheet dnd5e-gear-sheet">
    <!-- Header -->
    <header class="sheet-header" @mousedown="startDrag">
      <div class="gear-info">
        <div class="gear-icon">
          <div class="gear-type-badge" :class="`category-${gearData.category || 'other'}`">
            {{ getGearIcon(gearData) }}
          </div>
        </div>
        <div class="gear-details">
          <h1 class="gear-name">{{ gear.name }}</h1>
          <p class="gear-subtitle">
            {{ gearTypeText }}{{ gearData.category ? ` • ${formatCategory(gearData.category)}` : '' }}
          </p>
        </div>
      </div>
      <div class="header-actions">
        <button @click="copyItemId" class="copy-btn" title="Copy Item ID">
          📋
        </button>
        <button @click="$emit('close')" class="close-btn" title="Close">
          ✕
        </button>
      </div>
    </header>

    <!-- Gear Image (if available) -->
    <div v-if="gearImageUrl" class="gear-image-container">
      <img 
        :src="gearImageUrl" 
        :alt="gear.name"
        class="gear-image"
      />
    </div>

    <!-- Content -->
    <div class="sheet-content">
      <!-- Ownership Information -->
      <section class="gear-section ownership-section">
        <h3 class="section-title">Ownership</h3>
        <div class="ownership-info">
          <!-- Carrier Information -->
          <div class="ownership-row">
            <span class="ownership-label">Carried by:</span>
            <div class="ownership-status" :style="{ color: ownershipStatus.color }">
              <span class="ownership-icon">{{ ownershipStatus.icon }}</span>
              <span class="ownership-text">{{ ownershipStatus.text }}</span>
            </div>
          </div>
          <div v-if="ownerCharacter" class="owner-details">
            <small class="owner-subtitle">Currently carried by this character</small>
          </div>
          <div v-else class="owner-details">
            <small class="owner-subtitle">Available for assignment to a character</small>
          </div>
          
          <!-- Owner Information -->
          <div class="ownership-row" v-if="ownerUser">
            <span class="ownership-label">Owned by:</span>
            <div class="ownership-status" style="color: #28a745">
              <span class="ownership-icon">👤</span>
              <span class="ownership-text">{{ ownerUser.displayName || ownerUser.username }}</span>
            </div>
          </div>
          <div v-else class="owner-details">
            <small class="owner-subtitle">No user owner assigned</small>
          </div>
        </div>
      </section>

      <!-- Basic Information -->
      <section class="gear-section">
        <h3 class="section-title">{{ gearData.itemType === 'tool' ? 'Tool' : 'Gear' }} Details</h3>
        <div class="gear-properties">
          <div v-if="gearData.category" class="property-row">
            <span class="property-label">Category:</span>
            <span class="property-value category">{{ formatCategory(gearData.category) }}</span>
          </div>
          <div v-if="gearData.weight" class="property-row">
            <span class="property-label">Weight:</span>
            <span class="property-value">{{ gearData.weight }} lbs</span>
          </div>
          <div v-if="gearData.cost" class="property-row">
            <span class="property-label">Cost:</span>
            <span class="property-value">{{ gearData.cost.amount }} {{ gearData.cost.currency }}</span>
          </div>
          <div v-if="isToolData && toolData.itemGroup" class="property-row">
            <span class="property-label">Item Group:</span>
            <span class="property-value">{{ toolData.itemGroup.name }}</span>
          </div>
        </div>
      </section>

      <!-- Consumable Properties -->
      <section v-if="isGearData && gearData.consumable" class="gear-section">
        <h3 class="section-title">Consumable Properties</h3>
        <div class="consumable-properties">
          <div class="property-row">
            <span class="property-label">Uses:</span>
            <span class="property-value uses">{{ gearData.consumable.uses }}</span>
          </div>
          <div v-if="gearData.consumable.duration" class="property-row">
            <span class="property-label">Duration:</span>
            <span class="property-value">{{ gearData.consumable.duration }}</span>
          </div>
        </div>
      </section>

      <!-- Magic Properties -->
      <section v-if="gearData.magical" class="gear-section">
        <h3 class="section-title">Magical Properties</h3>
        <div class="magic-properties">
          <div v-if="gearData.rarity" class="property-row">
            <span class="property-label">Rarity:</span>
            <span class="property-value" :class="`rarity-${gearData.rarity}`">{{ formatRarity(gearData.rarity) }}</span>
          </div>
          <div v-if="gearData.attunement" class="property-row">
            <span class="property-label">Attunement:</span>
            <span class="property-value attunement">Required</span>
          </div>
        </div>
      </section>

      <!-- Description -->
      <section v-if="gearData.description" class="gear-section">
        <h3 class="section-title">Description</h3>
        <div class="gear-description">
          {{ gearData.description }}
        </div>
      </section>

      <!-- Source -->
      <footer v-if="gearData.source" class="gear-source">
        <small>Source: {{ gearData.source }}{{ gearData.page ? `, page ${gearData.page}` : '' }}</small>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, type Ref } from 'vue';
import type { BaseDocument } from '@dungeon-lab/shared/types/index.mjs';
import type { DndItemDocument, DndGearData, DndToolData, DndItemData } from '../../types/dnd/item.mjs';

// Props - following the same pattern as other sheets
interface Props {
  document: Ref<BaseDocument>;
  documentCopy?: Ref<BaseDocument | null>;
  items?: Ref<any[]>;
  ownerCharacter?: Ref<any | null>; // Owner character for ownership display (carrier)
  ownerUser?: Ref<any | null>; // Owner user for ownership display (actual owner)
  editMode?: boolean;
  readonly?: boolean;
  hasUnsavedChanges?: boolean;
  save?: () => void;
  cancel?: () => void;
  reset?: () => void;
}

const props = withDefaults(defineProps<Props>(), {
  readonly: true // Gear sheets are always read-only
});

// Events - unified interface
const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'drag-start', event: MouseEvent): void;
}>();

// Type-safe gear accessor
const gear = computed(() => {
  return props.document.value as DndItemDocument;
});

// Gear data accessor (could be gear or tool)
const gearData = computed((): DndItemData => {
  return gear.value.pluginData as DndItemData;
});

// Type guards for discriminated union
const isGearData = computed(() => gearData.value.itemType === 'gear');
const isToolData = computed(() => gearData.value.itemType === 'tool');

// Typed accessors
const gearDataTyped = computed((): DndGearData | null => {
  return isGearData.value ? gearData.value as DndGearData : null;
});

const toolData = computed((): DndToolData => {
  return gearData.value as DndToolData;
});

// Gear image URL
const gearImageUrl = computed(() => {
  const doc = gear.value as any;
  return doc.image?.url || null;
});

// Computed display properties
const gearTypeText = computed(() => {
  if (isToolData.value) return 'Tool';
  return 'Gear';
});

// Ownership information - direct owner references from props
const ownerCharacter = computed(() => props.ownerCharacter?.value || null);
const ownerUser = computed(() => props.ownerUser?.value || null);

const ownershipStatus = computed(() => {
  if (!ownerCharacter.value) {
    return {
      status: 'unassigned',
      text: 'Unassigned',
      icon: '📦',
      color: '#6c757d'
    };
  }
  
  return {
    status: 'assigned',
    text: ownerCharacter.value.name || 'Unknown Character',
    icon: '👤',
    color: '#28a745'
  };
});

// Helper functions
const getGearIcon = (data: DndItemData): string => {
  if (data.itemType === 'tool') {
    const toolData = data as DndToolData;
    const category = toolData.category?.toLowerCase() || '';
    
    if (category.includes('artisan')) return '🔧';
    if (category.includes('gaming')) return '🎲';
    if (category.includes('musical')) return '🎵';
    return '🛠️';
  }
  
  const gearData = data as DndGearData;
  const category = gearData.category?.toLowerCase() || '';
  
  if (category.includes('consumable')) return '🧪';
  if (category.includes('container')) return '🎒';
  if (category.includes('ammunition')) return '🏹';
  if (category.includes('treasure')) return '💎';
  if (category.includes('tool')) return '🔧';
  
  return '📦'; // Default gear icon
};

const formatCategory = (category: string): string => {
  return category.split('-').map(word => 
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

// Copy ID to clipboard
const copyItemId = async () => {
  try {
    await navigator.clipboard.writeText(gear.value.id);
    console.log(`[GearSheet] Copied item ID to clipboard: ${gear.value.id}`);
    // You could add a toast notification here if desired
  } catch (err) {
    console.error('[GearSheet] Failed to copy item ID:', err);
  }
};

// Debug logging
onMounted(() => {
  console.log('[GearSheet] Mounted with gear:', gear.value?.name);
  console.log('[GearSheet] Gear data:', gearData.value);
  console.log('[GearSheet] Item type:', gearData.value.itemType);
});
</script>

<style scoped>
.dnd5e-gear-sheet {
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

/* Header - Green/brown theme for gear */
.sheet-header {
  background: linear-gradient(135deg, #28a745 0%, #1e7e34 100%);
  color: white;
  padding: 16px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: move;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}

.gear-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.gear-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

.gear-type-badge {
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

.gear-type-badge.category-consumable {
  background: linear-gradient(135deg, #6f42c1, #563d7c);
}

.gear-type-badge.category-container {
  background: linear-gradient(135deg, #8b4513, #a0522d);
}

.gear-type-badge.category-tool {
  background: linear-gradient(135deg, #17a2b8, #138496);
}

.gear-type-badge.category-ammunition {
  background: linear-gradient(135deg, #dc3545, #c82333);
}

.gear-type-badge.category-treasure {
  background: linear-gradient(135deg, #ffc107, #e0a800);
}

.gear-type-badge.category-artisan {
  background: linear-gradient(135deg, #fd7e14, #e8650b);
}

.gear-type-badge.category-gaming-set {
  background: linear-gradient(135deg, #6f42c1, #563d7c);
}

.gear-type-badge.category-musical-instrument {
  background: linear-gradient(135deg, #e83e8c, #d91a72);
}

.gear-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.gear-name {
  font-size: 24px;
  font-weight: 600;
  margin: 0;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.gear-subtitle {
  font-size: 14px;
  margin: 0;
  opacity: 0.9;
  text-transform: capitalize;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.copy-btn,
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

.copy-btn:hover,
.close-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.copy-btn {
  font-size: 14px;
}

/* Gear Image */
.gear-image-container {
  padding: 20px;
  text-align: center;
  background: white;
  border-bottom: 1px solid #e9ecef;
}

.gear-image {
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

.gear-section {
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
  color: #28a745;
  border-bottom: 1px solid #e9ecef;
  padding-bottom: 8px;
}

.gear-properties,
.consumable-properties {
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

.property-value.category {
  font-weight: 500;
  color: #28a745;
  text-transform: capitalize;
}

.property-value.uses {
  font-weight: 600;
  color: #6f42c1;
  font-size: 16px;
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

.gear-description {
  line-height: 1.6;
  color: #495057;
}

.gear-source {
  margin-top: auto;
  padding: 12px 16px;
  background: #f8f9fa;
  border-top: 1px solid #e9ecef;
  text-align: center;
  color: #6c757d;
}

/* Ownership Section */
.ownership-section {
  border-left: 4px solid #28a745;
}

.ownership-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ownership-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.ownership-label {
  font-weight: 500;
  color: #495057;
  min-width: 80px;
  font-size: 14px;
}

.ownership-status {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 16px;
}

.ownership-icon {
  font-size: 20px;
}

.ownership-text {
  flex: 1;
}

.owner-details {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.owner-subtitle {
  color: #6c757d;
  font-size: 12px;
  font-style: italic;
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