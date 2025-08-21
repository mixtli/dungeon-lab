<template>
  <div class="dnd5e-sheet dnd5e-character-sheet">
    <!-- Header -->
    <header class="sheet-header" @mousedown="startDrag">
      <div class="character-info">
        <div class="character-portrait">
          <img 
            v-if="character.tokenImage?.url" 
            :src="character.tokenImage.url" 
            :alt="character.name"
            class="token-image"
          />
          <div v-else class="letter-avatar">
            {{ character.name.charAt(0) }}
          </div>
        </div>
        <div class="character-details">
          <h1 v-if="!editMode || readonly" class="character-name">{{ character.name }}</h1>
          <input 
            v-else-if="characterCopy"
            v-model="characterCopy.name"
            class="character-name-input"
            type="text"
          />
          <p class="character-subtitle">
            Level {{ (character.pluginData?.progression as any)?.level || (character.pluginData as any)?.level || 1 }} {{ speciesDisplayName }} {{ classDisplayName }}
          </p>
        </div>
      </div>
      <div class="header-actions">
        <button 
          v-if="!readonly"
          @click="toggleEditMode" 
          class="edit-toggle-btn"
          :title="editMode ? 'Switch to View Mode' : 'Switch to Edit Mode'"
        >
          {{ editMode ? '👁️' : '✏️' }}
        </button>
        <button 
          v-if="editMode && !readonly" 
          @click="saveCharacter" 
          class="save-btn"
        >
          💾
        </button>
        <button @click="closeSheet" class="close-btn">
          ✕
        </button>
      </div>
    </header>
    
    <!-- Tab Navigation -->
    <nav class="tab-nav">
      <button 
        v-for="tab in tabs" 
        :key="tab.id"
        @click="switchTab(tab.id)"
        :class="['tab-btn', { active: activeTab === tab.id }]"
        :title="tab.name"
      >
        <span class="tab-icon">{{ tab.icon }}</span>
        <span class="tab-name">{{ tab.name }}</span>
      </button>
    </nav>
    
    <!-- Tab Content -->
    <main class="tab-content">
      <!-- Overview Tab -->
      <div v-if="activeTab === 'overview'" class="tab-pane overview-tab">
        <div class="stats-grid">
          <div class="stat-card" @click="rollInitiative" :title="editMode && !readonly ? 'Initiative Bonus' : 'Click to roll initiative'">
            <div class="stat-label">Initiative</div>
            <div v-if="!editMode || readonly" class="stat-value">{{ initiativeBonus }}</div>
            <input 
              v-else-if="characterCopy && characterCopy.pluginData?.attributes?.initiative"
              v-model.number="characterCopy.pluginData.attributes.initiative.bonus"
              class="stat-input"
              type="number"
              min="-10"
              max="20"
              @click.stop
            />
          </div>
          <div class="stat-card">
            <div class="stat-label">Armor Class</div>
            <div v-if="!editMode || readonly" class="stat-value">{{ armorClassDisplay }}</div>
            <input 
              v-else
              v-model.number="characterCopy.pluginData.attributes.armorClass.value"
              class="stat-input"
              type="number"
              min="1"
              max="30"
            />
          </div>
          <div class="stat-card">
            <div class="stat-label">Hit Points</div>
            <div v-if="!editMode || readonly" class="stat-value">{{ hitPointsDisplay }}</div>
            <div v-else class="hit-points-edit">
              <input 
                v-model.number="hitPointsCurrent"
                class="stat-input hp-current"
                type="number"
                min="0"
                :max="hitPointsMax"
              />
              <span class="hp-separator">/</span>
              <input 
                v-model.number="hitPointsMax"
                class="stat-input hp-max"
                type="number"
                min="1"
                max="999"
              />
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Speed</div>
            <div v-if="!editMode || readonly" class="stat-value">{{ speedDisplay }}</div>
            <div v-else class="speed-edit">
              <input 
                v-model.number="speedValue"
                class="stat-input speed-input"
                type="number"
                min="0"
                max="999"
              />
              <span class="speed-unit">ft</span>
            </div>
          </div>
          <div class="stat-card automation-setting">
            <div class="stat-label">Combat Automation</div>
            <div v-if="!editMode || readonly" class="stat-value">
              {{ character.pluginData?.automateAttacks ? 'Enabled' : 'Disabled' }}
            </div>
            <label v-else class="automation-checkbox">
              <input
                v-model="automateAttacksValue"
                type="checkbox"
                class="checkbox-input"
              />
              <span class="checkbox-label">Auto-calculate attacks</span>
            </label>
          </div>
          <div class="stat-card">
            <div class="stat-label">Prof. Bonus</div>
            <div class="stat-value">+{{ proficiencyBonus }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Passive Perception</div>
            <div class="stat-value">{{ passivePerception }}</div>
          </div>
        </div>
        
        <div v-if="(character.pluginData?.attributes as any)?.inspiration || (character.pluginData as any)?.inspiration" class="inspiration-section">
          <div class="inspiration-indicator">
            ⭐ Inspiration
          </div>
        </div>
      </div>
      
      <!-- Abilities Tab -->
      <div v-if="activeTab === 'abilities'" class="tab-pane abilities-tab">
        <div class="abilities-grid">
          <div 
            v-for="(_, abilityName) in finalAbilities" 
            :key="abilityName"
            class="ability-card"
            @click="!editMode || readonly ? rollAbilityCheck(abilityName as string) : null"
            :title="editMode && !readonly ? abilityName + ' score' : 'Click to roll ' + abilityName + ' check'"
            :class="{ 'non-clickable': editMode && !readonly }"
          >
            <div class="ability-name">{{ (abilityName as string).slice(0, 3).toUpperCase() }}</div>
            <div v-if="!editMode || readonly" class="ability-score">{{ finalAbilities[abilityName as string] }}</div>
            <input 
              v-else
              :value="finalAbilities[abilityName as string]"
              @input="updateAbilityScore(abilityName as string, ($event.target as HTMLInputElement).valueAsNumber)"
              class="ability-score-input"
              type="number"
              min="1"
              max="30"
              @click.stop
            />
            <div class="ability-modifier">{{ formatModifier(abilityModifiers[abilityName as string] || 0) }}</div>
          </div>
        </div>
        
        <div class="saving-throws">
          <h3>Saving Throws</h3>
          <div class="saves-grid">
            <div 
              v-for="(_, abilityName) in finalAbilities" 
              :key="abilityName"
              class="save-item"
              @click="rollSavingThrow(abilityName as string)"
              :title="'Click to roll ' + abilityName + ' save'"
            >
              <div class="save-prof" :class="{ proficient: savingThrowProficiencies[abilityName as string] }">
                {{ savingThrowProficiencies[abilityName as string] ? '●' : '○' }}
              </div>
              <div class="save-name">{{ (abilityName as string).slice(0, 3).toUpperCase() }}</div>
              <div class="save-bonus">{{ formatModifier(savingThrowBonuses[abilityName as string] || 0) }}</div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Skills Tab -->
      <div v-if="activeTab === 'skills'" class="tab-pane skills-tab">
        <div class="skills-list">
          <div 
            v-for="(skill, skillName) in characterSkills" 
            :key="skillName"
            class="skill-item"
            @click="rollSkillCheck(skillName as string)"
            :title="'Click to roll ' + skillName + ' (' + skill.ability + ')'"
          >
            <div class="skill-prof" :class="skill.proficiency">
              {{ skill.proficiency === 'expertise' ? '◆' : skill.proficiency === 'proficient' ? '●' : skill.proficiency === 'half' ? '◐' : '○' }}
            </div>
            <div class="skill-name">{{ skillName }}</div>
            <div class="skill-ability">({{ skill.ability.slice(0, 3) }})</div>
            <div class="skill-bonus">{{ formatModifier(skillBonuses[skillName] || 0) }}</div>
          </div>
        </div>
      </div>
      
      <!-- Other tabs -->
      <div v-if="activeTab === 'combat'" class="tab-pane combat-tab">
        <div class="empty-state">Combat features coming soon...</div>
      </div>
      
      <div v-if="activeTab === 'spells'" class="tab-pane spells-tab">
        <div class="empty-state">Spellcasting features coming soon...</div>
      </div>
      
      <div v-if="activeTab === 'gear'" class="tab-pane gear-tab">
        <div 
          class="equipment-section"
          :class="{ 'drag-over': isDragOver }"
          @dragenter="handleDragEnter"
          @dragover="handleDragOver"
          @dragleave="handleDragLeave"
          @drop="handleDrop"
        >
          <!-- Equipment Header -->
          <div class="equipment-header">
            <h3 class="section-title">Equipment</h3>
            <div class="item-count">
              {{ items?.value?.length || 0 }} item{{ (items?.value?.length || 0) !== 1 ? 's' : '' }}
            </div>
          </div>

          <!-- Equipment List -->
          <div v-if="items?.value?.length" class="equipment-list">
            <div 
              v-for="item in items.value" 
              :key="item.id"
              class="equipment-item"
            >
              <div class="item-main">
                <div class="item-header">
                  <h4 class="item-name">{{ item.name }}</h4>
                  <div class="item-type">{{ getItemTypeDisplay(item) }}</div>
                </div>
                <div v-if="item.description" class="item-description">
                  {{ item.description }}
                </div>
              </div>
              
              <div class="item-properties">
                <div v-if="getItemWeight(item)" class="item-property">
                  <span class="property-label">Weight:</span>
                  <span class="property-value">{{ getItemWeight(item) }} lbs</span>
                </div>
                <div v-if="getItemCost(item)" class="item-property">
                  <span class="property-label">Cost:</span>
                  <span class="property-value">{{ getItemCost(item) }}</span>
                </div>
                <div v-if="getItemDamage(item)" class="item-property">
                  <span class="property-label">Damage:</span>
                  <span class="property-value">{{ getItemDamage(item) }}</span>
                </div>
                <div v-if="getItemProperties(item)" class="item-property">
                  <span class="property-label">Properties:</span>
                  <span class="property-value">{{ getItemProperties(item) }}</span>
                </div>
              </div>

              <!-- Weapon Actions -->
              <div v-if="isWeapon(item)" class="weapon-actions">
                <button 
                  @click="initiateWeaponAttack(item)" 
                  class="weapon-action-btn attack-btn"
                  title="Make an attack roll with this weapon"
                >
                  ⚔️ Attack
                </button>
                <button 
                  @click="initiateWeaponDamage(item)" 
                  class="weapon-action-btn damage-btn"
                  title="Roll damage for this weapon"
                >
                  🗡️ Damage
                </button>
                
                <!-- Weapon-level automation toggle -->
                <div class="weapon-automation-toggle">
                  <label class="automation-checkbox-inline">
                    <input
                      v-model="automateAttacksValue"
                      type="checkbox"
                      class="checkbox-input"
                      title="Enable automatic attack resolution for this character"
                    />
                    <span class="checkbox-label-compact">Auto</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <!-- Empty State -->
          <div v-else class="equipment-empty">
            <div class="empty-icon">🎒</div>
            <div class="empty-title">No Equipment</div>
            <div class="empty-description">
              This character doesn't have any equipment yet. Items can be added from the compendium.
            </div>
          </div>
        </div>
      </div>
      
      <div v-if="activeTab === 'background'" class="tab-pane background-tab">
        <div class="empty-state">Background features coming soon...</div>
      </div>
      
      <div v-if="activeTab === 'features'" class="tab-pane features-tab">
        <div class="empty-state">Features coming soon...</div>
      </div>
      
      <div v-if="activeTab === 'notes'" class="tab-pane notes-tab">
        <div class="notes-section">
          <h3>Character Notes</h3>
          <div class="notes-editor">
            <textarea 
              v-model="characterNotes" 
              :readonly="readonly || !editMode"
              class="notes-textarea" 
              placeholder="Write your character notes here..."
              rows="8"
            ></textarea>
          </div>
        </div>
      </div>
    </main>
  </div>

  <!-- Roll Dialog -->
  <AdvantageRollDialog
    v-model="showRollDialog"
    :ability="currentRollAbility"
    :base-modifier="abilityModifiers[currentRollAbility] || 0"
    :character-name="character.name"
    @roll="handleRollSubmission"
  />

  <!-- Weapon Attack Dialog -->
  <WeaponAttackDialog
    v-model="showWeaponAttackDialog"
    :weapon="currentRollWeapon"
    :character="character"
    @roll="handleWeaponAttackRollSubmission"
  />

  <!-- Weapon Damage Dialog -->
  <WeaponDamageDialog
    v-model="showWeaponDamageDialog"
    :weapon="currentRollWeapon"
    :character="character"
    @roll="handleWeaponDamageRollSubmission"
  />
</template>

<script setup lang="ts">
import { ref, computed, inject, onMounted, onUnmounted, watch, markRaw, type Ref } from 'vue';
import type { ICharacter, IItem, BaseDocument } from '@dungeon-lab/shared/types/index.mjs';
import type { DndCharacterClassDocument } from '../../types/dnd/character-class.mjs';
import type { DndSpeciesDocument } from '../../types/dnd/species.mjs';
import type { DndBackgroundDocument } from '../../types/dnd/background.mjs';
import type { AssignItemParameters } from '@dungeon-lab/shared/types/index.mjs';
import { getPluginContext } from '@dungeon-lab/shared-ui/utils/plugin-context.mjs';
import AdvantageRollDialog, { type RollDialogData } from '../internal/common/AdvantageRollDialog.vue';
import WeaponAttackDialog, { type WeaponAttackRollData } from '../internal/common/WeaponAttackDialog.vue';
import WeaponDamageDialog, { type WeaponDamageRollData } from '../internal/common/WeaponDamageDialog.vue';

// Props - enhanced interface with container-provided document copy
interface Props {
  document: Ref<BaseDocument>;           // Original document (for view mode)
  documentCopy: Ref<BaseDocument | null>; // Editable copy (for edit mode)
  items: Ref<IItem[]>;
  editMode: boolean;
  hasUnsavedChanges: boolean;
  readonly?: boolean;
  // Methods provided by container
  save?: () => Promise<void>;
  cancel?: () => void;
  reset?: () => void;
}

const props = withDefaults(defineProps<Props>(), {
  readonly: false
});

// Type-safe character accessor with validation
const character = computed(() => {
  const doc = props.document?.value;
  if (!doc) {
    console.warn('[CharacterSheet] No document provided');
    return null;
  }
  if (doc.documentType !== 'character') {
    console.warn('[CharacterSheet] Document is not a character:', doc.documentType);
    return null;
  }
  return doc as ICharacter;
});

// Debug logging for props
console.log('[CharacterSheet] Component received props:', {
  document: props.document,
  documentValue: props.document?.value,
  documentName: props.document?.value?.name,
  documentType: props.document?.value?.documentType,
  items: props.items,
  editMode: props.editMode,
  readonly: props.readonly
});

// Debug logging for character ref
console.log('[CharacterSheet] Character ref:', character);
console.log('[CharacterSheet] Character value:', character?.value);
console.log('[CharacterSheet] Character name:', character?.value?.name);
console.log('[CharacterSheet] Character armor class:', 
  (character?.value?.pluginData as Record<string, unknown>)?.attributes && 
  ((character?.value?.pluginData as Record<string, unknown>).attributes as Record<string, unknown>)?.armorClass);


// Compendium document data
const speciesDocument = ref<DndSpeciesDocument | null>(null);
const classDocument = ref<DndCharacterClassDocument | null>(null);
const backgroundDocument = ref<DndBackgroundDocument | null>(null);
const compendiumLoading = ref(false);
const compendiumError = ref<string | null>(null);

// Emits - unified event interface
const emit = defineEmits<{
  'update:document': [document: BaseDocument];
  'save': [document: BaseDocument];
  'roll': [rollType: string, data: Record<string, unknown>];
  'close': [];
  'toggle-edit-mode': [];
  'drag-start': [event: MouseEvent];
}>();

// Component state
const activeTab = ref('overview');

// Roll dialog state
const showRollDialog = ref(false);
const currentRollAbility = ref<string>('');
const currentRollWeapon = ref<IItem | null>(null);

// Weapon dialog state
const showWeaponAttackDialog = ref(false);
const showWeaponDamageDialog = ref(false);

// Drag and drop state
const isDragOver = ref(false);
const dragCounter = ref(0);

// Get plugin context for action requests
const pluginContext = getPluginContext();

// Inject target context from encounter (with fallbacks)
const encounterTargetTokenIds = inject('encounterTargetTokenIds', () => ref([]), true);

// Use container-provided document copy - no local state management needed!
// The container handles copy creation, change detection, and save/cancel logic

// Type-safe character copy accessor for edit mode
const characterCopy = computed(() => {
  const copy = props.documentCopy?.value;
  if (!copy) return null;
  if (copy.documentType !== 'character') {
    console.warn('[CharacterSheet] Document copy is not a character:', copy.documentType);
    return null;
  }
  return copy as ICharacter;
});

// Debug logging for document copy (moved after characterCopy declaration to avoid hoisting issues)
console.log('=== DEBUGGING DOCUMENT COPY ===');
console.log('props.documentCopy:', props.documentCopy);
console.log('props.documentCopy.value:', props.documentCopy?.value);
console.log('characterCopy:', characterCopy);
console.log('characterCopy.value:', characterCopy.value);
if (characterCopy.value) {
  console.log('characterCopy.value.pluginData:', characterCopy.value.pluginData);
  console.log('characterCopy.value.pluginData?.attributes:', characterCopy.value.pluginData?.attributes);
  console.log('characterCopy.value.pluginData?.attributes?.initiative:', characterCopy.value.pluginData?.attributes?.initiative);
}

// Direct v-model computed properties for character editing

// Initiative bonus - direct binding to character.pluginData.attributes.initiative.bonus
const initiativeBonusValue = computed({
  get() {
    const attributes = character.value.pluginData?.attributes as any;
    return attributes?.initiative?.bonus || (character.value.pluginData as any)?.initiative || 0;
  },
  set(value: number) {
    if (!character.value.pluginData) character.value.pluginData = {};
    if (!(character.value.pluginData as any).attributes) (character.value.pluginData as any).attributes = {};
    if (!(character.value.pluginData as any).attributes.initiative) (character.value.pluginData as any).attributes.initiative = {};
    (character.value.pluginData as any).attributes.initiative.bonus = value;
    // Also update legacy format
    (character.value.pluginData as any).initiative = value;
  }
});

// Armor class - direct binding to character.pluginData.attributes.armorClass.value
const armorClassValue = computed({
  get() {
    const attributes = character.value.pluginData?.attributes as any;
    return attributes?.armorClass?.value || (character.value.pluginData as any)?.armorClass || 10;
  },
  set(value: number) {
    if (!character.value.pluginData) character.value.pluginData = {};
    if (!(character.value.pluginData as any).attributes) (character.value.pluginData as any).attributes = {};
    (character.value.pluginData as any).attributes.armorClass = { value };
    // Also update legacy format
    (character.value.pluginData as any).armorClass = value;
  }
});

// Hit points current - prioritize state.currentHitPoints for runtime HP, fallback to pluginData
const hitPointsCurrent = computed({
  get() {
    // First check state for runtime current HP
    if (typeof character.value.state?.currentHitPoints === 'number') {
      return character.value.state.currentHitPoints;
    }
    
    // Fallback to pluginData (baseline HP)
    const attributes = character.value.pluginData?.attributes as any;
    const baselineHp = attributes?.hitPoints?.current || (character.value.pluginData as any)?.hitPoints?.current || 8;
    
    // Initialize state if missing
    if (!character.value.state) character.value.state = {};
    character.value.state.currentHitPoints = baselineHp;
    
    return baselineHp;
  },
  set(value: number) {
    // Always update state for runtime HP
    if (!character.value.state) character.value.state = {};
    character.value.state.currentHitPoints = value;
    
    // Also update pluginData for persistence
    if (!character.value.pluginData) character.value.pluginData = {};
    if (!(character.value.pluginData as any).attributes) (character.value.pluginData as any).attributes = {};
    if (!(character.value.pluginData as any).attributes.hitPoints) (character.value.pluginData as any).attributes.hitPoints = {};
    (character.value.pluginData as any).attributes.hitPoints.current = value;
    // Also update legacy format
    if (!(character.value.pluginData as any).hitPoints) (character.value.pluginData as any).hitPoints = {};
    (character.value.pluginData as any).hitPoints.current = value;
  }
});

// Hit points max - direct binding to character.pluginData.attributes.hitPoints.maximum
const hitPointsMax = computed({
  get() {
    const attributes = character.value.pluginData?.attributes as any;
    return attributes?.hitPoints?.maximum || (character.value.pluginData as any)?.hitPoints?.maximum || 8;
  },
  set(value: number) {
    if (!character.value.pluginData) character.value.pluginData = {};
    if (!(character.value.pluginData as any).attributes) (character.value.pluginData as any).attributes = {};
    if (!(character.value.pluginData as any).attributes.hitPoints) (character.value.pluginData as any).attributes.hitPoints = {};
    (character.value.pluginData as any).attributes.hitPoints.maximum = value;
    // Also update legacy format
    if (!(character.value.pluginData as any).hitPoints) (character.value.pluginData as any).hitPoints = {};
    (character.value.pluginData as any).hitPoints.maximum = value;
  }
});

// Speed - direct binding to character.pluginData.attributes.movement.walk
const speedValue = computed({
  get() {
    const attributes = character.value.pluginData?.attributes as any;
    return attributes?.movement?.walk || (character.value.pluginData as any)?.speed || 30;
  },
  set(value: number) {
    if (!character.value.pluginData) character.value.pluginData = {};
    if (!(character.value.pluginData as any).attributes) (character.value.pluginData as any).attributes = {};
    if (!(character.value.pluginData as any).attributes.movement) (character.value.pluginData as any).attributes.movement = {};
    (character.value.pluginData as any).attributes.movement.walk = value;
    // Also update legacy format
    (character.value.pluginData as any).speed = value;
  }
});

// Automate attacks checkbox - direct binding to character.pluginData.automateAttacks
const automateAttacksValue = computed({
  get() {
    return character.value.pluginData?.automateAttacks || false;
  },
  set(value: boolean) {
    if (!character.value.pluginData) character.value.pluginData = {};
    (character.value.pluginData as any).automateAttacks = value;
  }
});

// Tab definitions
const tabs = [
  { id: 'overview', name: 'Main', icon: '📋' },
  { id: 'abilities', name: 'Abilities', icon: '💪' },
  { id: 'skills', name: 'Skills', icon: '🎯' },
  { id: 'combat', name: 'Combat', icon: '⚔️' },
  { id: 'spells', name: 'Spells', icon: '✨' },
  { id: 'gear', name: 'Equipment', icon: '🎒' },
  { id: 'background', name: 'Background', icon: '📜' },
  { id: 'features', name: 'Features', icon: '⭐' },
  { id: 'notes', name: 'Notes', icon: '📝' }
];

// Process ability scores from proper D&D schema
const finalAbilities = computed(() => {
  const abilities = (character.value.pluginData as any)?.abilities || {};
  const finalScores: Record<string, number> = {};
  
  // Standard ability names in order
  const abilityNames = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
  
  for (const abilityName of abilityNames) {
    const ability = abilities[abilityName];
    if (ability && typeof ability === 'object') {
      // New D&D schema format: { base, racial, enhancement, override }
      if (ability.override !== undefined) {
        finalScores[abilityName] = ability.override;
      } else {
        finalScores[abilityName] = (ability.base || 10) + (ability.racial || 0) + (ability.enhancement || 0);
      }
    } else {
      // Fallback for legacy format or simple numbers
      finalScores[abilityName] = typeof ability === 'number' ? ability : 10;
    }
  }
  
  return finalScores;
});

// Ability score update method - directly updates character.pluginData.abilities[ability].override
const updateAbilityScore = (abilityName: string, newScore: number) => {
  if (isNaN(newScore) || newScore < 1 || newScore > 30) return;
  
  // Ensure abilities structure exists
  if (!character.value.pluginData) character.value.pluginData = {};
  if (!(character.value.pluginData as any).abilities) (character.value.pluginData as any).abilities = {};
  if (!(character.value.pluginData as any).abilities[abilityName]) (character.value.pluginData as any).abilities[abilityName] = {};
  
  // Set the override value directly
  (character.value.pluginData as any).abilities[abilityName].override = newScore;
};

// Computed properties for D&D 5e mechanics
const abilityModifiers = computed(() => {
  const modifiers: Record<string, number> = {};
  for (const [abilityName, abilityValue] of Object.entries(finalAbilities.value)) {
    modifiers[abilityName] = Math.floor((abilityValue - 10) / 2);
  }
  return modifiers;
});

const proficiencyBonus = computed(() => {
  // Try D&D schema first
  const progression = character.value.pluginData?.progression as any;
  if (progression?.proficiencyBonus) {
    return progression.proficiencyBonus;
  }
  
  // Calculate from level (fallback)
  const level = progression?.level || (character.value.pluginData as any)?.level || 1;
  return Math.ceil(level / 4) + 1;
});

// Determine saving throw proficiencies from D&D schema
const savingThrowProficiencies = computed(() => {
  const proficiencies: Record<string, boolean> = {};
  const abilities = (character.value.pluginData as any)?.abilities || {};
  
  // Use proficiencies from the D&D schema if available
  for (const abilityName of Object.keys(finalAbilities.value)) {
    const ability = abilities[abilityName];
    if (ability && typeof ability === 'object' && 'saveProficient' in ability) {
      proficiencies[abilityName] = ability.saveProficient || false;
    } else {
      // Fallback: determine from character class (legacy logic)
      proficiencies[abilityName] = false;
      // Use fetched class document for determining save proficiencies
      if (classDocument.value?.pluginData?.proficiencies?.savingThrows?.includes(abilityName as 'strength' | 'dexterity' | 'constitution' | 'intelligence' | 'wisdom' | 'charisma')) {
        proficiencies[abilityName] = true;
      }
    }
  }
  
  return proficiencies;
});

const savingThrowBonuses = computed(() => {
  const bonuses: Record<string, number> = {};
  for (const abilityName of Object.keys(finalAbilities.value)) {
    const abilityMod = abilityModifiers.value[abilityName] || 0;
    const profBonus = savingThrowProficiencies.value[abilityName] ? proficiencyBonus.value : 0;
    bonuses[abilityName] = abilityMod + profBonus;
  }
  return bonuses;
});

// Skills structure from character data - no defaults
const characterSkills = computed(() => {
  const skills = character.value.pluginData?.skills || {};
  
  // Define standard D&D 5e skills with their abilities
  const standardSkills = {
    'acrobatics': 'dexterity',
    'animal handling': 'wisdom',
    'arcana': 'intelligence',
    'athletics': 'strength',
    'deception': 'charisma',
    'history': 'intelligence',
    'insight': 'wisdom',
    'intimidation': 'charisma',
    'investigation': 'intelligence',
    'medicine': 'wisdom',
    'nature': 'intelligence',
    'perception': 'wisdom',
    'performance': 'charisma',
    'persuasion': 'charisma',
    'religion': 'intelligence',
    'sleight of hand': 'dexterity',
    'stealth': 'dexterity',
    'survival': 'wisdom'
  };
  
  // Build skills from character data or standard list
  const result: Record<string, { ability: string; proficiency: string }> = {};
  
  // Use character skills if they exist, otherwise create from standard list
  if (Object.keys(skills).length > 0) {
    for (const [skillName, skillData] of Object.entries(skills)) {
      if (typeof skillData === 'object' && skillData !== null) {
        const skill = skillData as any; // Type assertion for plugin data
        result[skillName] = {
          ability: skill.ability || standardSkills[skillName as keyof typeof standardSkills] || 'wisdom',
          proficiency: skill.expert ? 'expertise' : 
                      skill.proficient ? 'proficient' : 
                      skill.half ? 'half' : 'none'
        };
      }
    }
  } else {
    // Create from standard list with no proficiencies if character has no skills defined
    for (const [skillName, ability] of Object.entries(standardSkills)) {
      result[skillName] = {
        ability,
        proficiency: 'none'
      };
    }
  }
  
  return result;
});

const skillBonuses = computed(() => {
  const bonuses: Record<string, number> = {};
  
  for (const [skillName, skill] of Object.entries(characterSkills.value)) {
    const abilityMod = abilityModifiers.value[skill.ability] || 0;
    let profBonus = 0;
    
    if (skill.proficiency === 'expertise') {
      profBonus = proficiencyBonus.value * 2;
    } else if (skill.proficiency === 'proficient') {
      profBonus = proficiencyBonus.value;
    } else if (skill.proficiency === 'half') {
      profBonus = Math.floor(proficiencyBonus.value / 2);
    }
    
    bonuses[skillName] = abilityMod + profBonus;
  }
  
  return bonuses;
});

const passivePerception = computed(() => {
  const perceptionBonus = skillBonuses.value.perception || 0;
  return 10 + perceptionBonus;
});

const armorClassDisplay = computed(() => {
  const attributes = character.value.pluginData?.attributes as any;
  if (attributes?.armorClass?.value) {
    return attributes.armorClass.value;
  }
  return (character.value.pluginData as any)?.armorClass || 10;
});

const hitPointsDisplay = computed(() => {
  const attributes = character.value.pluginData?.attributes as any;
  if (attributes?.hitPoints) {
    return `${attributes.hitPoints.current}/${attributes.hitPoints.maximum}`;
  }
  const hitPoints = (character.value.pluginData as any)?.hitPoints || { current: 8, maximum: 8 };
  return `${hitPoints.current}/${hitPoints.maximum}`;
});

const speedDisplay = computed(() => {
  const attributes = character.value.pluginData?.attributes as any;
  if (attributes?.movement?.walk) {
    return `${attributes.movement.walk} ft`;
  }
  const speed = (character.value.pluginData as any)?.speed || 30;
  return `${speed} ft`;
});

const initiativeBonus = computed(() => {
  const dexMod = abilityModifiers.value.dexterity || 0;
  const attributes = character.value.pluginData?.attributes as any;
  let initBonus = 0;
  
  if (attributes?.initiative?.bonus !== undefined) {
    initBonus = attributes.initiative.bonus;
  } else {
    initBonus = (character.value.pluginData as any)?.initiative || 0;
  }
  
  const bonus = dexMod + initBonus;
  return bonus >= 0 ? `+${bonus}` : `${bonus}`;
});

// Display names from fetched compendium documents
const speciesDisplayName = computed(() => {
  if (compendiumLoading.value) return 'Loading...';
  if (compendiumError.value) return 'Error loading species';
  return speciesDocument.value?.name || 'Unknown Species';
});

const classDisplayName = computed(() => {
  if (compendiumLoading.value) return 'Loading...';
  if (compendiumError.value) return 'Error loading class';
  return classDocument.value?.name || 'Unknown Class';
});


// Notes - direct binding to character.pluginData.roleplay.backstory
const characterNotes = computed({
  get() {
    // Try D&D schema format first, then fallback to legacy
    return (character.value.pluginData as any)?.roleplay?.backstory || 
           (character.value.pluginData as any)?.notes || '';
  },
  set(value: string) {
    if (!character.value.pluginData) character.value.pluginData = {};
    if (!(character.value.pluginData as any).roleplay) (character.value.pluginData as any).roleplay = {};
    (character.value.pluginData as any).roleplay.backstory = value;
    // Also update legacy format
    (character.value.pluginData as any).notes = value;
  }
});

// Equipment helper functions
const getItemTypeDisplay = (item: IItem): string => {
  const pluginData = item.pluginData as any;
  if (pluginData?.itemType) {
    return pluginData.itemType.charAt(0).toUpperCase() + pluginData.itemType.slice(1);
  }
  return item.pluginDocumentType || 'Item';
};

const getItemWeight = (item: IItem): number | null => {
  const pluginData = item.pluginData as any;
  return pluginData?.weight || null;
};

const getItemCost = (item: IItem): string | null => {
  const pluginData = item.pluginData as any;
  if (pluginData?.cost?.amount && pluginData?.cost?.currency) {
    const amount = pluginData.cost.amount;
    const currency = pluginData.cost.currency.toUpperCase();
    if (currency === 'GP' && amount >= 100) {
      return `${amount / 100} gp`;
    }
    return `${amount} ${currency}`;
  }
  return null;
};

const getItemDamage = (item: IItem): string | null => {
  const pluginData = item.pluginData as any;
  if (pluginData?.damage?.dice && pluginData?.damage?.type) {
    return `${pluginData.damage.dice} ${pluginData.damage.type}`;
  }
  return null;
};

const getItemProperties = (item: IItem): string | null => {
  const pluginData = item.pluginData as any;
  if (pluginData?.properties && Array.isArray(pluginData.properties) && pluginData.properties.length > 0) {
    return pluginData.properties.join(', ');
  }
  return null;
};

// Weapon identification and actions
const isWeapon = (item: IItem): boolean => {
  const pluginData = item.pluginData as any;
  const itemType = pluginData?.type || pluginData?.category || pluginData?.weaponType;
  const weaponTypes = ['weapon', 'simple-weapon', 'martial-weapon', 'melee', 'ranged', 'melee-weapon', 'ranged-weapon'];
  
  return weaponTypes.some(type => 
    itemType === type || 
    (typeof itemType === 'string' && itemType.toLowerCase().includes('weapon'))
  ) || !!(pluginData?.damage?.dice);
};

const initiateWeaponAttack = (weapon: IItem) => {
  console.log('[CharacterSheet] Initiating weapon attack:', weapon.name);
  currentRollWeapon.value = weapon;
  showWeaponAttackDialog.value = true;
};

const initiateWeaponDamage = (weapon: IItem) => {
  console.log('[CharacterSheet] Initiating weapon damage:', weapon.name);
  currentRollWeapon.value = weapon;
  showWeaponDamageDialog.value = true;
};

// Helper functions for weapon calculations (shared between dialogs and roll submission)
const getWeaponAttackAbility = (weapon: IItem): string => {
  const properties = (weapon.pluginData as any)?.properties || [];
  const weaponType = (weapon.pluginData as any)?.weaponType || (weapon.pluginData as any)?.category;
  
  if (properties.includes('finesse')) {
    return 'dexterity';
  }
  
  if (weaponType === 'ranged' || weaponType === 'ranged-weapon') {
    return 'dexterity';
  }
  
  return 'strength';
};

const getAbilityModifier = (character: any, ability: string): number => {
  const abilityScore = character.pluginData?.abilities?.[ability]?.value || 10;
  return Math.floor((abilityScore - 10) / 2);
};

const isProficientWithWeapon = (weapon: IItem, character: any): boolean => {
  const weaponProficiencies = character.pluginData?.proficiencies?.weapons || [];
  const weaponCategory = (weapon.pluginData as any)?.category || (weapon.pluginData as any)?.weaponType;
  
  return weaponProficiencies.includes(weapon.name) || 
         weaponProficiencies.includes(weaponCategory) ||
         weaponProficiencies.includes('simple-weapons') ||
         weaponProficiencies.includes('martial-weapons');
};

const getProficiencyBonus = (character: any): number => {
  const level = character.pluginData?.progression?.level || character.pluginData?.level || 1;
  return Math.ceil(level / 4) + 1;
};

// Methods
const formatModifier = (value: number): string => {
  return value >= 0 ? `+${value}` : `${value}`;
};

// Updated roll handling - opens dialog instead of direct rolling
const rollAbilityCheck = (ability: string) => {
  currentRollAbility.value = ability;
  showRollDialog.value = true;
};

// Handle roll submission from dialog
const handleRollSubmission = (rollData: RollDialogData) => {
  const pluginContext = getPluginContext();
  if (!pluginContext) {
    console.error('Plugin context not available');
    return;
  }

  // Generate unique roll ID
  const rollId = `roll_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Create roll object following the established schema
  const roll = {
    id: rollId,
    rollType: 'ability-check',
    pluginId: 'dnd-5e-2024',
    dice: [{ 
      sides: 20, 
      quantity: rollData.advantageMode === 'normal' ? 1 : 2 
    }],
    recipients: rollData.recipients,
    arguments: { 
      customModifier: rollData.customModifier,
      pluginArgs: { 
        ability: rollData.ability,
        advantageMode: rollData.advantageMode
      }
    },
    modifiers: [
      { 
        type: 'ability', 
        value: rollData.baseModifier, 
        source: `${rollData.ability} modifier` 
      }
    ],
    metadata: {
      title: `${rollData.ability.charAt(0).toUpperCase()}${rollData.ability.slice(1)} Check`,
      characterName: character.value.name
    }
  };

  // Submit roll via plugin context
  pluginContext.submitRoll(roll);
  console.log(`[CharacterSheet] Submitted ${rollData.ability} check roll:`, roll);
};

// Handle weapon attack roll submission
const handleWeaponAttackRollSubmission = (rollData: WeaponAttackRollData) => {
  const pluginContext = getPluginContext();
  if (!pluginContext) {
    console.error('Plugin context not available');
    return;
  }

  // Generate unique roll ID
  const rollId = `roll_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Calculate weapon attack modifiers
  const weapon = rollData.weapon;
  const char = character.value;
  const modifiers = [];

  // Add ability modifier
  const ability = getWeaponAttackAbility(weapon);
  const abilityMod = getAbilityModifier(char, ability);
  if (abilityMod !== 0) {
    modifiers.push({
      type: 'ability',
      value: abilityMod,
      source: `${ability.charAt(0).toUpperCase()}${ability.slice(1)} modifier`
    });
  }

  // Add proficiency bonus if proficient
  if (isProficientWithWeapon(weapon, char)) {
    const profBonus = getProficiencyBonus(char);
    modifiers.push({
      type: 'proficiency',
      value: profBonus,
      source: 'Proficiency bonus'
    });
  }

  // Add enhancement bonus if any
  const enhancement = (weapon.pluginData as any)?.enhancement || 0;
  if (enhancement !== 0) {
    modifiers.push({
      type: 'enhancement',
      value: enhancement,
      source: 'Magic weapon'
    });
  }

  // Create weapon attack roll
  const roll = {
    id: rollId,
    rollType: 'weapon-attack',
    pluginId: 'dnd-5e-2024',
    dice: [{ 
      sides: 20, 
      quantity: rollData.advantageMode === 'normal' ? 1 : 2 
    }],
    recipients: rollData.recipients,
    arguments: { 
      customModifier: rollData.customModifier,
      pluginArgs: { 
        advantageMode: rollData.advantageMode
      }
    },
    modifiers: modifiers,
    metadata: {
      title: `${rollData.weapon.name} Attack`,
      characterName: character.value.name,
      weaponId: rollData.weapon.id,
      characterId: character.value.id,
      // Add automation metadata
      autoMode: character.value.pluginData?.automateAttacks || false,
      targetTokenIds: (character.value.pluginData?.automateAttacks && encounterTargetTokenIds?.value) 
        ? encounterTargetTokenIds.value 
        : []
    }
  };

  pluginContext.submitRoll(roll);
  console.log(`[CharacterSheet] Submitted weapon attack roll:`, roll);
};

// Handle weapon damage roll submission
const handleWeaponDamageRollSubmission = (rollData: WeaponDamageRollData) => {
  const pluginContext = getPluginContext();
  if (!pluginContext) {
    console.error('Plugin context not available');
    return;
  }

  // Generate unique roll ID
  const rollId = `roll_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Parse weapon damage dice
  const weaponData = rollData.weapon.pluginData as any;
  const damageDice = weaponData?.damage?.dice || '1d4';
  
  // Parse dice notation (e.g., "1d6", "2d4")
  const diceMatch = damageDice.match(/(\d+)d(\d+)/);
  if (!diceMatch) {
    console.error('Invalid damage dice notation:', damageDice);
    return;
  }
  
  const quantity = parseInt(diceMatch[1]);
  const sides = parseInt(diceMatch[2]);
  
  // Double dice for critical hits
  const finalQuantity = rollData.isCritical ? quantity * 2 : quantity;

  // Calculate weapon damage modifiers
  const weapon = rollData.weapon;
  const char = character.value;
  const modifiers = [];

  // Add ability modifier (same as attack ability for damage)
  const ability = getWeaponAttackAbility(weapon);
  const abilityMod = getAbilityModifier(char, ability);
  if (abilityMod !== 0) {
    modifiers.push({
      type: 'ability',
      value: abilityMod,
      source: `${ability.charAt(0).toUpperCase()}${ability.slice(1)} modifier`
    });
  }

  // Add enhancement bonus if any
  const enhancement = (weapon.pluginData as any)?.enhancement || 0;
  if (enhancement !== 0) {
    modifiers.push({
      type: 'enhancement',
      value: enhancement,
      source: 'Magic weapon'
    });
  }
  
  const roll = {
    id: rollId,
    rollType: 'weapon-damage',
    pluginId: 'dnd-5e-2024',
    dice: [{ 
      sides: sides, 
      quantity: finalQuantity
    }],
    recipients: rollData.recipients,
    arguments: { 
      customModifier: rollData.customModifier
    },
    modifiers: modifiers,
    metadata: {
      title: `${rollData.weapon.name} Damage`,
      characterName: character.value.name,
      weapon: rollData.weapon,
      character: character.value,
      critical: rollData.isCritical
    }
  };

  pluginContext.submitRoll(roll);
  console.log(`[CharacterSheet] Submitted weapon damage roll:`, roll);
};

const rollSavingThrow = (ability: string) => {
  const bonus = savingThrowBonuses.value[ability] || 0;
  emit('roll', 'saving-throw', {
    type: 'saving-throw',
    ability,
    bonus,
    expression: `1d20${formatModifier(bonus)}`,
    title: `${ability.charAt(0).toUpperCase() + ability.slice(1)} Save`
  });
};

const rollSkillCheck = (skill: string) => {
  const bonus = skillBonuses.value[skill] || 0;
  const skillData = characterSkills.value[skill];
  const ability = skillData?.ability || '';
  emit('roll', 'skill-check', {
    type: 'skill-check',
    skill,
    ability,
    bonus,
    expression: `1d20${formatModifier(bonus)}`,
    title: `${skill.charAt(0).toUpperCase() + skill.slice(1)} (${ability.slice(0, 3).toUpperCase()})`
  });
};

const rollInitiative = () => {
  const dexModifier = abilityModifiers.value.dexterity || 0;
  const initBonus = (character.value.pluginData as any)?.initiative || 0;
  const totalBonus = dexModifier + initBonus;
  emit('roll', 'initiative', {
    type: 'initiative',
    modifier: totalBonus,
    expression: `1d20${formatModifier(totalBonus)}`,
    title: 'Initiative'
  });
};

const switchTab = (tabId: string) => {
  activeTab.value = tabId;
};

// Removed updateCharacter method - direct v-model binding handles all updates

const saveCharacter = () => {
  emit('save', character.value!);
};

const toggleEditMode = () => {
  emit('toggle-edit-mode');
};

const closeSheet = () => {
  // Emit close event to parent
  emit('close');
};

// Window drag functionality - emit event for framework to handle
const startDrag = (event: MouseEvent) => {
  // Don't start drag if clicking on buttons or other interactive elements
  const target = event.target as HTMLElement;
  if (target.tagName === 'BUTTON' || target.closest('button')) {
    return;
  }
  
  // Emit drag start event for framework to handle window positioning
  emit('drag-start', event);
  event.preventDefault();
};

// Keyboard navigation
const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    closeSheet();
  } else if (event.key === 'Tab' && event.ctrlKey) {
    event.preventDefault();
    const currentIndex = tabs.findIndex(tab => tab.id === activeTab.value);
    const nextIndex = (currentIndex + 1) % tabs.length;
    switchTab(tabs[nextIndex].id);
  }
};

// Compendium data fetching functions using PluginContext
const loadCompendiumDocuments = async () => {
  try {
    compendiumLoading.value = true;
    compendiumError.value = null;
    
    const promises = [];
    
    // Get plugin context using shared utility
    const context = getPluginContext();
    if (!context) {
      console.warn('[CharacterSheet] Plugin context not available for compendium loading');
      return;
    }
    
    // Fetch species document if we have a species ObjectId
    const speciesId = character.value.pluginData?.species;
    if (speciesId && typeof speciesId === 'string') {
      promises.push(
        context.getDocument(speciesId)
          .then(doc => { speciesDocument.value = markRaw(doc as DndSpeciesDocument); })
          .catch(err => { console.warn('Failed to load species:', err); })
      );
    }
    
    // Fetch class document if we have a class ObjectId
    const classes = character.value.pluginData?.classes as any[];
    const classId = classes?.[0]?.class;
    if (classId && typeof classId === 'string') {
      promises.push(
        context.getDocument(classId)
          .then(doc => { classDocument.value = markRaw(doc as DndCharacterClassDocument); })
          .catch(err => { console.warn('Failed to load class:', err); })
      );
    }
    
    // Fetch background document if we have a background ObjectId
    const backgroundId = character.value.pluginData?.background;
    if (backgroundId && typeof backgroundId === 'string') {
      promises.push(
        context.getDocument(backgroundId)
          .then(doc => { backgroundDocument.value = markRaw(doc as DndBackgroundDocument); })
          .catch(err => { console.warn('Failed to load background:', err); })
      );
    }
    
    // Wait for all requests to complete
    await Promise.all(promises);
    
  } catch (error) {
    console.error('Failed to load compendium documents:', error);
    compendiumError.value = 'Failed to load character data';
  } finally {
    compendiumLoading.value = false;
  }
};

// ============================================================================
// DRAG AND DROP FUNCTIONALITY  
// ============================================================================

/**
 * Handle drag enter event - increment counter for nested elements
 */
const handleDragEnter = (event: DragEvent) => {
  event.preventDefault();
  event.stopPropagation();
  
  dragCounter.value++;
  if (dragCounter.value === 1) {
    isDragOver.value = true;
  }
};

/**
 * Handle drag over event - necessary to allow drop
 */
const handleDragOver = (event: DragEvent) => {
  event.preventDefault();
  event.stopPropagation();
  
  // Set drop effect to indicate items can be assigned
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'copy';
  }
};

/**
 * Handle drag leave event - decrement counter for nested elements  
 */
const handleDragLeave = (event: DragEvent) => {
  event.preventDefault();
  event.stopPropagation();
  
  dragCounter.value--;
  if (dragCounter.value === 0) {
    isDragOver.value = false;
  }
};

/**
 * Handle drop event - process item assignment
 */
const handleDrop = async (event: DragEvent) => {
  event.preventDefault();
  event.stopPropagation();
  
  // Reset drag state
  isDragOver.value = false;
  dragCounter.value = 0;
  
  if (!event.dataTransfer) {
    console.warn('[CharacterSheet] No drag data available');
    return;
  }
  
  if (!character.value) {
    console.warn('[CharacterSheet] No character available for item assignment');
    return;
  }
  
  try {
    // Parse drag data
    const dragDataStr = event.dataTransfer.getData('application/json');
    if (!dragDataStr) {
      console.warn('[CharacterSheet] No drag data found');
      return;
    }
    
    const dragData = JSON.parse(dragDataStr);
    console.log('[CharacterSheet] Processing drop data:', dragData);
    
    // Validate drag data format
    if (dragData.type !== 'document-token' || dragData.documentType !== 'item') {
      console.warn('[CharacterSheet] Invalid drag data type:', dragData.type, dragData.documentType);
      return;
    }
    
    // Prepare action parameters
    const actionParams: AssignItemParameters = {
      itemId: dragData.documentId,
      targetCharacterId: character.value.id,
      itemName: dragData.name || 'Unknown Item',
      targetCharacterName: character.value.name || 'Unknown Character'
    };
    
    console.log('[CharacterSheet] Requesting item assignment:', actionParams);
    
    // Check if plugin context is available
    if (!pluginContext) {
      console.error('[CharacterSheet] Plugin context not available for action request');
      return;
    }
    
    // Request the action through the plugin context
    const result = await pluginContext.requestAction(
      'assign-item',
      actionParams,
      {
        description: `Assign ${actionParams.itemName} to ${actionParams.targetCharacterName}`
      }
    );
    
    console.log('[CharacterSheet] Action request result:', result);
    
    // Handle result with console feedback
    if (result.success && result.approved) {
      console.log(`[CharacterSheet] SUCCESS: ${actionParams.itemName} has been assigned to ${actionParams.targetCharacterName}`);
    } else if (result.success && !result.approved) {
      console.warn(`[CharacterSheet] DENIED: Assignment denied - ${result.error || 'No reason provided'}`);
    } else {
      console.error(`[CharacterSheet] ERROR: Assignment failed - ${result.error || 'Unknown error'}`);
    }
    
  } catch (error) {
    console.error('[CharacterSheet] Failed to process drop:', error);
  }
};

// No longer using inline style injection - styles now imported from shared stylesheet

onMounted(() => {
  document.addEventListener('keydown', handleKeyDown);
  console.log('D&D 5e Character Sheet mounted for character:', character.value?.name || 'unknown');
  
  // Load compendium documents
  loadCompendiumDocuments();
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown);
});

// Watch for character changes and reload compendium data
watch(() => {
  const classes = character.value?.pluginData?.classes as any[];
  return [
    character.value?.pluginData?.species,
    classes?.[0]?.class,
    character.value?.pluginData?.background
  ];
}, () => {
  loadCompendiumDocuments();
}, { deep: true });

// Document copy is managed by container - no local watch needed
</script>

<style>
@import '../../styles/dnd-theme.css';
</style>

<style scoped>
/* Character Sheet Specific Styles */

/* Tab Navigation */
.tab-nav {
  background: var(--dnd-parchment-dark);
  border-bottom: 2px solid var(--dnd-brown-light);
  display: flex;
  padding: 0;
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.tab-nav::-webkit-scrollbar {
  display: none;
}

.tab-btn {
  flex: 1;
  min-width: 54px;
  max-width: 64px;
  background: transparent;
  border: none;
  padding: 6px 2px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  color: var(--dnd-gray);
  border-bottom: 3px solid transparent;
  font-size: 9px;
}

.tab-btn:hover {
  background: var(--dnd-parchment);
  color: var(--dnd-red);
}

.tab-btn.active {
  background: var(--dnd-parchment);
  color: var(--dnd-red);
  border-bottom-color: var(--dnd-red);
}

.tab-icon {
  font-size: 14px;
  line-height: 1;
}

.tab-name {
  font-weight: 500;
  line-height: 1;
}

/* Tab Content */
.tab-content {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  scrollbar-width: thin;
  scrollbar-color: var(--dnd-brown-light) var(--dnd-parchment);
}

.tab-content::-webkit-scrollbar {
  width: 6px;
}

.tab-content::-webkit-scrollbar-track {
  background: var(--dnd-parchment);
}

.tab-content::-webkit-scrollbar-thumb {
  background: var(--dnd-brown-light);
  border-radius: 3px;
}

.tab-pane {
  animation: fadeIn 0.2s ease-in-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Overview Tab */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  margin-bottom: 16px;
}

.stat-card {
  background: var(--dnd-white);
  border: 1px solid var(--dnd-brown-light);
  border-radius: 8px;
  padding: 8px;
  text-align: center;
  box-shadow: 0 2px 4px var(--dnd-shadow-light);
  transition: all 0.2s ease;
  cursor: pointer;
}

.stat-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px var(--dnd-shadow);
  border-color: var(--dnd-red);
}

.stat-input {
  width: 80px;
  padding: 4px 8px;
  border: 1px solid var(--dnd-brown-light);
  border-radius: 4px;
  background: var(--dnd-white);
  color: var(--dnd-red);
  font-weight: bold;
  text-align: center;
}

.stat-input:focus {
  outline: none;
  border-color: var(--dnd-red);
  box-shadow: 0 0 0 2px rgba(210, 0, 0, 0.2);
}

.hit-points-edit {
  display: flex;
  align-items: center;
  gap: 8px;
}

.hp-current, .hp-max {
  width: 60px;
  padding: 4px;
  border: 1px solid var(--dnd-brown-light);
  border-radius: 4px;
  background: var(--dnd-white);
  color: var(--dnd-red);
  font-weight: bold;
  text-align: center;
}

.speed-edit {
  display: flex;
  align-items: center;
  gap: 4px;
}

.speed-input {
  width: 60px;
}

.speed-unit {
  color: var(--dnd-gray);
  font-size: 12px;
}

.inspiration-section {
  text-align: center;
  margin-top: 8px;
}

.inspiration-indicator {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: var(--dnd-gold);
  color: var(--dnd-red-dark);
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: bold;
  box-shadow: 0 2px 4px var(--dnd-shadow-light);
}

/* Abilities Tab - Character Sheet Specific Layout */
.abilities-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  margin-bottom: 16px;
}

.ability-score-input {
  width: 100%;
  text-align: center;
  padding: 2px 4px;
  border: 2px solid var(--dnd-brown-light);
  border-radius: 4px;
  background: var(--dnd-white);
  color: var(--dnd-red);
  font-weight: bold;
  font-family: 'Cinzel', serif;
}

.ability-score-input:focus {
  outline: none;
  border-color: var(--dnd-red);
  box-shadow: 0 0 0 2px rgba(210, 0, 0, 0.2);
}

.non-clickable {
  cursor: default !important;
}

.saving-throws h3 {
  font-family: 'Cinzel', serif;
  font-size: 14px;
  color: var(--dnd-red);
  margin: 0 0 8px 0;
  text-align: center;
  border-bottom: 1px solid var(--dnd-brown-light);
  padding-bottom: 4px;
}

.saves-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 4px;
}

.save-item {
  background: var(--dnd-white);
  border: 1px solid var(--dnd-gray-light);
  border-radius: 6px;
  padding: 6px 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 12px;
}

.save-item:hover {
  border-color: var(--dnd-red);
  background: var(--dnd-parchment);
}

.save-prof {
  font-size: 12px;
  color: var(--dnd-gray);
}

.save-prof.proficient {
  color: var(--dnd-red);
}

.save-name {
  flex: 1;
  font-weight: 500;
}

.save-bonus {
  font-weight: bold;
  color: var(--dnd-red);
}

/* Skills Tab */
.skills-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.skill-item {
  background: var(--dnd-white);
  border: 1px solid var(--dnd-gray-light);
  border-radius: 6px;
  padding: 6px 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 12px;
}

.skill-item:hover {
  border-color: var(--dnd-red);
  background: var(--dnd-parchment);
}

.skill-prof {
  font-size: 12px;
  color: var(--dnd-gray);
  width: 12px;
  text-align: center;
}

.skill-prof.proficient {
  color: var(--dnd-red);
}

.skill-prof.expertise {
  color: var(--dnd-gold-dark);
}

.skill-prof.half {
  color: var(--dnd-brown);
}

.skill-name {
  flex: 1;
  font-weight: 500;
  text-transform: capitalize;
}

.skill-ability {
  font-size: 10px;
  color: var(--dnd-gray);
  text-transform: uppercase;
}

.skill-bonus {
  font-weight: bold;
  color: var(--dnd-red);
  min-width: 24px;
  text-align: right;
}

/* Notes Tab */
.notes-section h3 {
  font-family: 'Cinzel', serif;
  font-size: 14px;
  color: var(--dnd-red);
  margin: 0 0 8px 0;
  text-align: center;
  border-bottom: 1px solid var(--dnd-brown-light);
  padding-bottom: 4px;
}

.notes-editor {
  margin-bottom: 16px;
}

.notes-textarea {
  width: 100%;
  background: var(--dnd-white);
  border: 1px solid var(--dnd-brown-light);
  border-radius: 6px;
  padding: 8px;
  font-size: 11px;
  font-family: inherit;
  color: var(--dnd-black);
  line-height: 1.4;
  resize: vertical;
  min-height: 120px;
}

.notes-textarea:focus {
  outline: 2px solid var(--dnd-red);
  outline-offset: -2px;
  border-color: var(--dnd-red);
}

.notes-textarea:read-only {
  background: var(--dnd-parchment);
  cursor: default;
}

/* Empty States */
.empty-state {
  text-align: center;
  color: var(--dnd-gray);
  font-style: italic;
  padding: 16px;
  font-size: 12px;
}

/* Character Sheet Specific Overrides */
.character-name-input {
  background: transparent;
  border: none;
  color: var(--dnd-white);
  font-family: 'Cinzel', serif;
  font-size: 16px;
  font-weight: bold;
  text-shadow: 1px 1px 2px var(--dnd-shadow);
  outline: none;
  width: 100%;
}

.character-name-input:focus {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  padding: 2px 4px;
}

/* Responsive Adjustments */
@media (max-width: 400px) {
  .stats-grid {
    grid-template-columns: repeat(3, 1fr);
  }
  
  .abilities-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

/* Accessibility */
@media (prefers-reduced-motion: reduce) {
  .tab-pane {
    animation: none;
  }
  
  .stat-card:hover,
  .ability-card:hover {
    transform: none;
  }
}

/* Avatar Styles */
.token-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
}

.letter-avatar {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: bold;
  color: var(--dnd-red-dark);
}

/* Equipment Section Styles */
.equipment-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
  transition: all 0.2s ease;
  border-radius: 8px;
  position: relative;
}

.equipment-section.drag-over {
  background: rgba(59, 130, 246, 0.1);
  border: 2px dashed rgba(59, 130, 246, 0.5);
  transform: scale(1.02);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.equipment-section.drag-over::before {
  content: "Drop item here to assign to character";
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(59, 130, 246, 0.9);
  color: white;
  padding: 12px 24px;
  border-radius: 6px;
  font-weight: 600;
  font-size: 14px;
  z-index: 10;
  pointer-events: none;
}

.equipment-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 12px;
  border-bottom: 2px solid var(--dnd-brown-light);
}

.section-title {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: var(--dnd-red-dark);
  text-shadow: 1px 1px 2px rgba(0,0,0,0.1);
}

.item-count {
  font-size: 14px;
  color: var(--dnd-brown-dark);
  background: var(--dnd-parchment-dark);
  padding: 4px 12px;
  border-radius: 12px;
  border: 1px solid var(--dnd-brown-light);
}

.equipment-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
  flex: 1;
}

.equipment-item {
  background: var(--dnd-parchment);
  border: 1px solid var(--dnd-brown-light);
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 4px rgba(139, 87, 42, 0.1);
  transition: box-shadow 0.2s ease;
}

.equipment-item:hover {
  box-shadow: 0 4px 8px rgba(139, 87, 42, 0.15);
}

.item-main {
  margin-bottom: 12px;
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 8px;
}

.item-name {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--dnd-red-dark);
  line-height: 1.3;
}

.item-type {
  font-size: 12px;
  color: var(--dnd-brown-dark);
  background: var(--dnd-parchment-dark);
  padding: 2px 8px;
  border-radius: 10px;
  border: 1px solid var(--dnd-brown-light);
  white-space: nowrap;
}

.item-description {
  font-size: 14px;
  color: var(--dnd-brown-dark);
  line-height: 1.4;
  font-style: italic;
}

.item-properties {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  padding-top: 12px;
  border-top: 1px solid var(--dnd-brown-light);
}

.item-property {
  display: flex;
  gap: 6px;
  font-size: 14px;
  align-items: baseline;
}

.property-label {
  color: var(--dnd-brown-dark);
  font-weight: 500;
}

.property-value {
  color: var(--dnd-red-dark);
  font-weight: 600;
}

.equipment-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 48px 24px;
  color: var(--dnd-brown-dark);
  flex: 1;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.6;
}

.empty-title {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 8px;
  color: var(--dnd-red-dark);
}

.empty-description {
  font-size: 14px;
  line-height: 1.5;
  max-width: 300px;
}

/* Responsive Design */
@media (max-width: 600px) {
  .equipment-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .item-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }
  
  .item-properties {
    flex-direction: column;
    gap: 8px;
  }
}

/* Focus Styles for Accessibility */
.tab-btn:focus,
.stat-card:focus,
.ability-card:focus,
.save-item:focus,
.skill-item:focus,
.equipment-item:focus {
  outline: 2px solid var(--dnd-red);
  outline-offset: 2px;
}

/* Weapon Actions */
.weapon-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--dnd-brown-light);
}

.weapon-action-btn {
  flex: 1;
  background: var(--dnd-red);
  color: white;
  border: none;
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-height: 36px;
}

.weapon-action-btn:hover {
  background: var(--dnd-red-dark);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(139, 87, 42, 0.3);
}

.weapon-action-btn:active {
  transform: translateY(0);
  box-shadow: 0 1px 4px rgba(139, 87, 42, 0.2);
}

.weapon-action-btn.attack-btn {
  background: var(--dnd-red);
}

.weapon-action-btn.damage-btn {
  background: var(--dnd-brown);
}

.weapon-action-btn.damage-btn:hover {
  background: var(--dnd-brown-dark);
}

.weapon-action-btn:focus {
  outline: 2px solid var(--dnd-yellow);
  outline-offset: 2px;
}

/* Automation Settings */
.stat-card.automation-setting {
  cursor: default;
}

.stat-card.automation-setting:hover {
  transform: none;
  box-shadow: 0 2px 4px var(--dnd-shadow-light);
  border-color: var(--dnd-brown-light);
}

.automation-checkbox {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  font-size: 12px;
  color: var(--dnd-red);
}

.checkbox-input {
  width: 16px;
  height: 16px;
  accent-color: var(--dnd-red);
  cursor: pointer;
}

.checkbox-label {
  user-select: none;
  font-weight: 500;
}

/* Weapon-level automation toggle */
.weapon-automation-toggle {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--dnd-brown-light);
  display: flex;
  justify-content: center;
}

.automation-checkbox-inline {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.75rem;
  color: var(--dnd-brown);
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 3px;
  transition: background-color 0.2s ease;
}

.automation-checkbox-inline:hover {
  background-color: var(--dnd-background-light);
}

.checkbox-label-compact {
  font-weight: 500;
  user-select: none;
}
</style>
