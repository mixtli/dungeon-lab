<template>
  <div class="dnd5e-sheet dnd5e-spell-sheet">
    <!-- Header -->
    <header class="sheet-header" @mousedown="startDrag">
      <div class="spell-info">
        <div class="spell-icon">
          <div class="spell-level-badge" :class="`level-${spellData.level}`">
            {{ spellData.level === 0 ? 'C' : spellData.level }}
          </div>
        </div>
        <div class="spell-details">
          <h1 class="spell-name">{{ spell.name }}</h1>
          <p class="spell-subtitle">
            {{ spellLevelText }} • {{ spellData.school }}
          </p>
        </div>
      </div>
      <div class="header-actions">
        <button @click="$emit('close')" class="close-btn" title="Close">
          ✕
        </button>
      </div>
    </header>

    <!-- Content -->
    <div class="sheet-content">
      <!-- Basic Information -->
      <section class="spell-section">
        <h3 class="section-title">Spell Details</h3>
        <div class="spell-properties">
          <div class="property-row">
            <span class="property-label">Casting Time:</span>
            <span class="property-value">{{ spellData.castingTime || 'Unknown' }}</span>
          </div>
          <div class="property-row">
            <span class="property-label">Range:</span>
            <span class="property-value">{{ spellData.range || 'Unknown' }}</span>
          </div>
          <div class="property-row">
            <span class="property-label">Duration:</span>
            <span class="property-value">{{ spellData.duration || 'Unknown' }}</span>
          </div>
          <div class="property-row">
            <span class="property-label">Components:</span>
            <span class="property-value">{{ componentsText }}</span>
          </div>
          <div v-if="spellData.concentration" class="property-row">
            <span class="property-label">Concentration:</span>
            <span class="property-value concentration">Yes</span>
          </div>
          <div v-if="spellData.ritual" class="property-row">
            <span class="property-label">Ritual:</span>
            <span class="property-value ritual">Yes</span>
          </div>
        </div>
      </section>

      <!-- Description -->
      <section v-if="spellData.description" class="spell-section">
        <h3 class="section-title">Description</h3>
        <div class="spell-description">
          {{ spellData.description }}
        </div>
      </section>

      <!-- Class Availability -->
      <section v-if="classAvailabilityText" class="spell-section">
        <h3 class="section-title">Available to Classes</h3>
        <div class="class-list">
          {{ classAvailabilityText }}
        </div>
      </section>

      <!-- Damage Information -->
      <section v-if="spellData.damage" class="spell-section">
        <h3 class="section-title">Damage</h3>
        <div class="damage-info">
          <span class="damage-dice">{{ spellData.damage.dice }}</span>
          <span class="damage-type">{{ spellData.damage.type }}</span>
        </div>
      </section>

      <!-- Saving Throw -->
      <section v-if="spellData.savingThrow" class="spell-section">
        <h3 class="section-title">Saving Throw</h3>
        <div class="saving-throw-info">
          <span class="save-ability">{{ spellData.savingThrow.ability.toUpperCase() }}</span>
          <span class="save-effect">{{ spellData.savingThrow.effectOnSave }}</span>
        </div>
      </section>

      <!-- Attack Roll -->
      <section v-if="spellData.attackRoll" class="spell-section">
        <h3 class="section-title">Attack</h3>
        <div class="attack-info">
          <span class="attack-type">{{ spellData.attackRoll.type }} spell attack</span>
        </div>
      </section>

      <!-- Area of Effect -->
      <section v-if="spellData.areaOfEffect" class="spell-section">
        <h3 class="section-title">Area of Effect</h3>
        <div class="aoe-info">
          <span class="aoe-size">{{ spellData.areaOfEffect.size }}-foot</span>
          <span class="aoe-type">{{ spellData.areaOfEffect.type }}</span>
        </div>
      </section>

      <!-- Scaling -->
      <section v-if="spellData.scaling?.higherLevels" class="spell-section">
        <h3 class="section-title">At Higher Levels</h3>
        <div class="scaling-description">
          {{ spellData.scaling.higherLevels.description || 'Scaling information not available' }}
        </div>
      </section>

      <!-- Source -->
      <footer v-if="spellData.source" class="spell-source">
        <small>Source: {{ spellData.source }}{{ spellData.page ? `, page ${spellData.page}` : '' }}</small>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, type Ref } from 'vue';
import type { BaseDocument } from '@dungeon-lab/shared/types/index.mjs';
import type { DndSpellDocument, DndSpellData } from '../../types/dnd/spell.mjs';

// Props - following the same pattern as other sheets
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
  readonly: true // Spell sheets are always read-only
});

// Events - unified interface
const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'drag-start', event: MouseEvent): void;
}>();

// Type-safe spell accessor
const spell = computed(() => {
  return props.document.value as DndSpellDocument;
});

// Spell data accessor
const spellData = computed((): DndSpellData => {
  return spell.value.pluginData as DndSpellData;
});

// Computed display properties
const spellLevelText = computed(() => {
  const level = spellData.value.level;
  if (level === 0) return 'Cantrip';
  
  const suffixes = ['th', 'st', 'nd', 'rd'];
  const suffix = level <= 3 ? suffixes[level] : suffixes[0];
  return `${level}${suffix} level`;
});

const componentsText = computed(() => {
  const components = spellData.value.components;
  if (!components) return 'Unknown';
  
  const parts = [];
  if (components.verbal) parts.push('V');
  if (components.somatic) parts.push('S');
  if (components.material) {
    if (components.materialComponents?.description) {
      parts.push(`M (${components.materialComponents.description})`);
    } else {
      parts.push('M');
    }
  }
  
  return parts.join(', ') || 'None';
});

const classAvailabilityText = computed(() => {
  const availability = spellData.value.classAvailability;
  if (!availability || !Array.isArray(availability)) return '';
  
  return availability.join(', ');
});

// Drag handling
const startDrag = (event: MouseEvent) => {
  emit('drag-start', event);
};

// Debug logging
onMounted(() => {
  console.log('[SpellSheet] Mounted with spell:', spell.value?.name);
  console.log('[SpellSheet] Spell data:', spellData.value);
});
</script>

<style scoped>
.dnd5e-spell-sheet {
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
  background: linear-gradient(135deg, #4c63d2 0%, #6c5ce7 100%);
  color: white;
  padding: 16px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: move;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}

.spell-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.spell-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

.spell-level-badge {
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

.spell-level-badge.level-0 {
  background: linear-gradient(135deg, #00b894, #00cec9);
}

.spell-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.spell-name {
  font-size: 24px;
  font-weight: 600;
  margin: 0;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.spell-subtitle {
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

/* Content */
.sheet-content {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.spell-section {
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
  color: #4c63d2;
  border-bottom: 1px solid #e9ecef;
  padding-bottom: 8px;
}

.spell-properties {
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

.property-value.concentration,
.property-value.ritual {
  color: #4c63d2;
  font-weight: 500;
}

.spell-description {
  line-height: 1.6;
  color: #495057;
}

.class-list {
  color: #495057;
  font-weight: 500;
}

.damage-info {
  display: flex;
  gap: 8px;
  align-items: center;
}

.damage-dice {
  font-weight: 600;
  color: #e74c3c;
  font-size: 18px;
}

.damage-type {
  color: #495057;
  text-transform: capitalize;
}

.saving-throw-info {
  display: flex;
  gap: 12px;
  align-items: center;
}

.save-ability {
  font-weight: 600;
  color: #4c63d2;
  background: #f8f9fa;
  padding: 4px 8px;
  border-radius: 4px;
  border: 1px solid #dee2e6;
}

.save-effect {
  color: #495057;
  text-transform: capitalize;
}

.attack-info {
  color: #495057;
  font-weight: 500;
  text-transform: capitalize;
}

.aoe-info {
  display: flex;
  gap: 8px;
  align-items: center;
}

.aoe-size {
  font-weight: 600;
  color: #4c63d2;
}

.aoe-type {
  color: #495057;
  text-transform: capitalize;
}

.scaling-description {
  color: #495057;
  line-height: 1.6;
}

.spell-source {
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