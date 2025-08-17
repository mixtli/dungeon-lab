<template>
  <div class="dnd5e-sheet dnd5e-actor-sheet">
    <!-- Header -->
    <header class="sheet-header" @mousedown="startDrag">
      <div class="character-info">
        <div class="character-portrait">
          <img 
            v-if="actor.tokenImage?.url" 
            :src="actor.tokenImage.url" 
            :alt="actor.name"
            class="token-image"
          />
          <div v-else class="letter-avatar">
            {{ actor.name.charAt(0) }}
          </div>
        </div>
        <div class="character-details">
          <h1 v-if="!editMode || readonly" class="character-name">{{ actor.name }}</h1>
          <input 
            v-else
            :value="localFormData.name"
            @input="updateFormField('name', ($event.target as HTMLInputElement).value)"
            class="character-name-input"
            type="text"
          />
          <p class="character-subtitle">
            {{ creatureTypeDisplay }} • {{ challengeRatingDisplay }}
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
          @click="saveActor" 
          class="save-btn"
          :disabled="!hasUnsavedChanges"
          :title="hasUnsavedChanges ? 'Save changes' : 'No changes to save'"
        >
          💾
        </button>
        <button 
          v-if="editMode && !readonly && hasUnsavedChanges" 
          @click="cancelEdit" 
          class="cancel-btn"
          title="Cancel changes"
        >
          ❌
        </button>
        <button @click="closeSheet" class="close-btn">
          ✕
        </button>
      </div>
    </header>
    
    <!-- Stat Block Content -->
    <main class="sheet-content stat-block-content">
      <!-- Basic Stats Section -->
      <section class="dnd-section basic-stats">
        <div class="stat-line">
          <span class="stat-label">Armor Class</span>
          <span v-if="!editMode || readonly" class="stat-value">{{ armorClassDisplay }}</span>
          <input 
            v-else
            :value="localFormData.armorClass"
            @input="updateFormField('armorClass', parseInt(($event.target as HTMLInputElement).value) || 10)"
            class="stat-input inline"
            type="number"
            min="1"
            max="30"
          />
        </div>
        
        <div class="stat-line">
          <span class="stat-label">Hit Points</span>
          <span v-if="!editMode || readonly" class="stat-value">{{ hitPointsDisplay }}</span>
          <div v-else class="hit-points-edit inline">
            <input 
              :value="localFormData.hitPointsCurrent"
              @input="updateFormField('hitPointsCurrent', parseInt(($event.target as HTMLInputElement).value) || 0)"
              class="stat-input hp-current"
              type="number"
              min="0"
              :max="localFormData.hitPointsMax"
            />
            <span class="hp-separator">/</span>
            <input 
              :value="localFormData.hitPointsMax"
              @input="updateFormField('hitPointsMax', parseInt(($event.target as HTMLInputElement).value) || 1)"
              class="stat-input hp-max"
              type="number"
              min="1"
              max="999"
            />
          </div>
        </div>

        <div class="stat-line">
          <span class="stat-label">Speed</span>
          <span class="stat-value">{{ speedDisplay }}</span>
        </div>
      </section>

      <!-- Ability Scores -->
      <section class="dnd-section ability-scores">
        <h3>Ability Scores</h3>
        <div class="actor-abilities-grid">
          <div 
            v-for="ability in abilities" 
            :key="ability.key"
            class="ability-card"
            @click="rollAbilityCheck(ability.key)"
            :title="`Click to roll ${ability.name} check`"
          >
            <div class="ability-name">{{ ability.name }}</div>
            <div v-if="!editMode || readonly" class="ability-score">{{ getAbilityScore(ability.key) }}</div>
            <input 
              v-else
              :value="localFormData.abilities[ability.key as keyof typeof localFormData.abilities]"
              @input="updateFormAbility(ability.key, parseInt(($event.target as HTMLInputElement).value) || 10)"
              class="ability-input"
              type="number"
              min="1"
              max="30"
              @click.stop
            />
            <div class="ability-modifier">{{ getAbilityModifier(ability.key) }}</div>
          </div>
        </div>
      </section>

      <!-- Skills and Saves -->
      <section class="dnd-section skills-saves" v-if="hasSavingThrows || hasSkills">
        <div v-if="hasSavingThrows" class="saving-throws">
          <h4>Saving Throws</h4>
          <div class="saves-list">
            <span 
              v-for="save in savingThrows" 
              :key="save.ability"
              class="save-item"
              @click="rollSavingThrow(save.ability)"
              :title="`Click to roll ${save.ability} save`"
            >
              {{ save.ability }} {{ formatModifier(save.modifier) }}
            </span>
          </div>
        </div>

        <div v-if="hasSkills" class="skills">
          <h4>Skills</h4>
          <div class="skills-list">
            <span 
              v-for="skill in skills" 
              :key="skill.name"
              class="skill-item"
              @click="rollSkillCheck(skill.name)"
              :title="`Click to roll ${skill.name} check`"
            >
              {{ skill.name }} {{ formatModifier(skill.modifier) }}
            </span>
          </div>
        </div>
      </section>

      <!-- Resistances/Immunities -->
      <section class="dnd-section resistances" v-if="hasResistances">
        <div v-if="damageResistances.length" class="resistance-line">
          <span class="resistance-label">Damage Resistances</span>
          <span class="resistance-value">{{ damageResistances.join(', ') }}</span>
        </div>
        <div v-if="damageImmunities.length" class="resistance-line">
          <span class="resistance-label">Damage Immunities</span>
          <span class="resistance-value">{{ damageImmunities.join(', ') }}</span>
        </div>
        <div v-if="conditionImmunities.length" class="resistance-line">
          <span class="resistance-label">Condition Immunities</span>
          <span class="resistance-value">{{ conditionImmunities.join(', ') }}</span>
        </div>
      </section>

      <!-- Senses -->
      <section class="dnd-section senses-languages" v-if="senses.length">
        <div class="stat-line">
          <span class="stat-label">Senses</span>
          <span class="stat-value">{{ senses.join(', ') }}</span>
        </div>
      </section>

      <!-- Languages -->
      <section class="dnd-section senses-languages" v-if="languages.length">
        <div class="stat-line">
          <span class="stat-label">Languages</span>
          <span class="stat-value">{{ languages.join(', ') }}</span>
        </div>
      </section>

      <!-- Challenge Rating -->
      <section class="dnd-section challenge-rating">
        <div class="stat-line">
          <span class="stat-label">Challenge Rating</span>
          <span class="stat-value">{{ challengeRatingDisplay }}</span>
        </div>
      </section>

      <!-- Actions -->
      <section class="dnd-section actions-section" v-if="hasActions">
        <h3>Actions</h3>
        <div v-for="action in actions" :key="action.name" class="action-item">
          <div class="action-header">
            <h4 class="action-name">{{ action.name }}</h4>
            <button 
              v-if="action.rollable"
              @click="rollAction(action)"
              class="action-roll-btn"
              title="Roll action"
            >
              🎲
            </button>
          </div>
          <p class="action-description" v-html="action.description"></p>
        </div>
      </section>

      <!-- Legendary Actions -->
      <section class="dnd-section legendary-actions" v-if="hasLegendaryActions">
        <h3>Legendary Actions</h3>
        <p class="legendary-description">Can take {{ legendaryActionsPerTurn }} legendary actions, choosing from the options below. Only one legendary action option can be used at a time and only at the end of another creature's turn. Regains spent legendary actions at the start of its turn.</p>
        <div v-for="action in legendaryActions" :key="action.name" class="action-item">
          <div class="action-header">
            <h4 class="action-name">{{ action.name }} <span v-if="action.cost > 1">(Costs {{ action.cost }} Actions)</span></h4>
            <button 
              v-if="action.rollable"
              @click="rollAction(action)"
              class="action-roll-btn"
              title="Roll action"
            >
              🎲
            </button>
          </div>
          <p class="action-description" v-html="action.description"></p>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, type Ref } from 'vue';
import type { IActor, BaseDocument } from '@dungeon-lab/shared/types/index.mjs';

// Props - unified interface for all document types
interface Props {
  document: Ref<BaseDocument>;
  items?: Ref<any[]>;
  editMode?: boolean;
  readonly?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  readonly: false
});

// Type-safe actor accessor with validation
const actor = computed(() => {
  const doc = props.document?.value;
  if (!doc) {
    console.warn('[ActorSheet] No document provided');
    return null;
  }
  if (doc.documentType !== 'actor') {
    console.warn('[ActorSheet] Document is not an actor:', doc.documentType);
    return null;
  }
  return doc as IActor;
});

// Debug logging for props
console.log('[ActorSheet] Component received props:', {
  document: props.document,
  documentValue: props.document?.value,
  documentName: props.document?.value?.name,
  documentType: props.document?.value?.documentType,
  items: props.items,
  editMode: props.editMode,
  readonly: props.readonly
});

// Debug logging for actor ref
console.log('[ActorSheet] Actor ref:', actor);
console.log('[ActorSheet] Actor value:', actor?.value);
console.log('[ActorSheet] Actor name:', actor?.value?.name);

// Events - unified interface
const emit = defineEmits<{
  (e: 'update:document', document: BaseDocument): void;
  (e: 'save'): void;
  (e: 'roll', rollType: string, data: Record<string, unknown>): void;
  (e: 'close'): void;
  (e: 'drag-start', event: MouseEvent): void;
}>();

// Component state
const editMode = ref(false);

// Local form state - tracks user edits independently of gameState
const localFormData = ref({
  name: '',
  armorClass: 10,
  hitPointsCurrent: 1,
  hitPointsMax: 1,
  abilities: {
    strength: 10,
    dexterity: 10,
    constitution: 10,
    intelligence: 10,
    wisdom: 10,
    charisma: 10
  }
});

// Track which fields have been modified
const modifiedFields = ref(new Set<string>());

// Update form field and track as modified
const updateFormField = (field: string, value: any) => {
  (localFormData.value as any)[field] = value;
  modifiedFields.value.add(field);
};

// Update ability score in form and track as modified
const updateFormAbility = (ability: string, value: number) => {
  localFormData.value.abilities[ability as keyof typeof localFormData.value.abilities] = value;
  modifiedFields.value.add(`abilities.${ability}`);
};

// Reset form to match current actor state
const resetForm = () => {
  localFormData.value = {
    name: actor.value.name,
    armorClass: (() => {
      const acData = actor.value.pluginData?.armorClass;
      return (typeof acData === 'object' && acData && 'value' in acData) ? (acData as any).value : (acData || 10);
    })(),
    hitPointsCurrent: (() => {
      const hpData = actor.value.pluginData?.hitPoints;
      if (typeof hpData === 'object' && hpData) {
        const current = 'current' in hpData ? (hpData as any).current : undefined;
        const average = 'average' in hpData ? (hpData as any).average : undefined;
        return current ?? average ?? 1;
      }
      return actor.value.pluginData?.hitPointsCurrent ?? 1;
    })(),
    hitPointsMax: (() => {
      const hpData = actor.value.pluginData?.hitPoints;
      if (typeof hpData === 'object' && hpData && 'average' in hpData) {
        return (hpData as any).average;
      }
      return actor.value.pluginData?.hitPointsMax || 1;
    })(),
    abilities: {
      strength: actor.value.pluginData?.abilities?.strength || 10,
      dexterity: actor.value.pluginData?.abilities?.dexterity || 10,
      constitution: actor.value.pluginData?.abilities?.constitution || 10,
      intelligence: actor.value.pluginData?.abilities?.intelligence || 10,
      wisdom: actor.value.pluginData?.abilities?.wisdom || 10,
      charisma: actor.value.pluginData?.abilities?.charisma || 10
    }
  };
  modifiedFields.value.clear();
};

// Check if form has unsaved changes
const hasUnsavedChanges = computed(() => modifiedFields.value.size > 0);

// Ability scores data
const abilities = [
  { key: 'strength', name: 'STR' },
  { key: 'dexterity', name: 'DEX' },
  { key: 'constitution', name: 'CON' },
  { key: 'intelligence', name: 'INT' },
  { key: 'wisdom', name: 'WIS' },
  { key: 'charisma', name: 'CHA' }
];

// Reactive ability scores
const abilityScores = computed({
  get: () => actor.value.pluginData?.abilities || {
    strength: 10,
    dexterity: 10,
    constitution: 10,
    intelligence: 10,
    wisdom: 10,
    charisma: 10
  },
  set: (value) => {
    if (!actor.value.pluginData) {
      actor.value.pluginData = {};
    }
    actor.value.pluginData.abilities = value;
    emit('update:document', actor.value!);
  }
});

// Computed properties
const creatureTypeDisplay = computed(() => {
  const size = actor.value.pluginData?.size || 'Medium';
  const type = actor.value.pluginData?.type || 'humanoid';
  return `${size} ${type}`;
});

const challengeRatingDisplay = computed(() => {
  const cr = actor.value.pluginData?.challengeRating || '1/8';
  const xp = actor.value.pluginData?.experiencePoints || 25;
  return `${cr} (${xp} XP)`;
});

const armorClassDisplay = computed(() => {
  const acData = actor.value.pluginData?.armorClass;
  const ac = (typeof acData === 'object' && acData && 'value' in acData) ? (acData as any).value : (acData || 10);
  const source = (typeof acData === 'object' && acData && 'source' in acData) ? (acData as any).source : undefined;
  return source ? `${ac} (${source})` : ac.toString();
});

const armorClassValue = computed({
  get: () => {
    const acData = actor.value.pluginData?.armorClass;
    return (typeof acData === 'object' && acData && 'value' in acData) ? (acData as any).value : (acData || 10);
  },
  set: (value) => {
    if (!actor.value.pluginData) {
      actor.value.pluginData = {};
    }
    // Keep existing structure if it's an object, otherwise create simple value
    const existing = actor.value.pluginData.armorClass;
    if (typeof existing === 'object') {
      actor.value.pluginData.armorClass = { ...existing, value };
    } else {
      actor.value.pluginData.armorClass = { value };
    }
    emit('update:document', actor.value!);
  }
});

const hitPointsMax = computed({
  get: () => {
    const hpData = actor.value.pluginData?.hitPoints;
    if (typeof hpData === 'object' && hpData && 'average' in hpData) {
      return (hpData as any).average;
    }
    return actor.value.pluginData?.hitPointsMax || 1;
  },
  set: (value) => {
    if (!actor.value.pluginData) {
      actor.value.pluginData = {};
    }
    // Update the hitPoints.average if structured data exists
    const existing = actor.value.pluginData.hitPoints;
    if (typeof existing === 'object') {
      actor.value.pluginData.hitPoints = { ...existing, average: value };
    } else {
      actor.value.pluginData.hitPointsMax = value;
    }
    emit('update:document', actor.value!);
  }
});

const hitPointsCurrent = computed({
  get: () => {
    const hpData = actor.value.pluginData?.hitPoints;
    if (typeof hpData === 'object' && hpData) {
      const current = 'current' in hpData ? (hpData as any).current : undefined;
      const average = 'average' in hpData ? (hpData as any).average : undefined;
      return current ?? average ?? 1;
    }
    return actor.value.pluginData?.hitPointsCurrent ?? hitPointsMax.value;
  },
  set: (value) => {
    if (!actor.value.pluginData) {
      actor.value.pluginData = {};
    }
    // Update the hitPoints.current if structured data exists
    const existing = actor.value.pluginData.hitPoints;
    if (typeof existing === 'object') {
      actor.value.pluginData.hitPoints = { ...existing, current: value };
    } else {
      actor.value.pluginData.hitPointsCurrent = value;
    }
    emit('update:document', actor.value!);
  }
});

const hitPointsDisplay = computed(() => {
  const current = hitPointsCurrent.value;
  const max = hitPointsMax.value;
  const hpData = actor.value.pluginData?.hitPoints;
  const formula = (typeof hpData === 'object' && hpData && 'formula' in hpData) ? ` (${(hpData as any).formula})` : '';
  return `${current}/${max}${formula}`;
});

const speedDisplay = computed(() => {
  const speeds = actor.value.pluginData?.speed || { walk: 30 };
  const speedParts = [];
  
  // Type guard to ensure speeds is an object
  if (typeof speeds === 'object' && speeds !== null) {
    const speedObj = speeds as any;
    if (speedObj.walk) speedParts.push(`${speedObj.walk} ft.`);
    if (speedObj.fly) speedParts.push(`fly ${speedObj.fly} ft.`);
    if (speedObj.swim) speedParts.push(`swim ${speedObj.swim} ft.`);
    if (speedObj.climb) speedParts.push(`climb ${speedObj.climb} ft.`);
    if (speedObj.burrow) speedParts.push(`burrow ${speedObj.burrow} ft.`);
  }
  
  return speedParts.join(', ') || '30 ft.';
});

// Saving throws
const savingThrows = computed(() => {
  const savingThrowsData = actor.value.pluginData?.savingThrows;
  return Array.isArray(savingThrowsData) ? savingThrowsData : [];
});

const hasSavingThrows = computed(() => savingThrows.value.length > 0);

// Skills
const skills = computed(() => {
  const skillsData = actor.value.pluginData?.skills;
  return Array.isArray(skillsData) ? skillsData : [];
});

const hasSkills = computed(() => skills.value.length > 0);

// Resistances and immunities
const damageResistances = computed(() => {
  const resistancesData = actor.value.pluginData?.damageResistances;
  return Array.isArray(resistancesData) ? resistancesData : [];
});

const damageImmunities = computed(() => {
  const immunitiesData = actor.value.pluginData?.damageImmunities;
  return Array.isArray(immunitiesData) ? immunitiesData : [];
});

const conditionImmunities = computed(() => {
  const conditionImmunitiesData = actor.value.pluginData?.conditionImmunities;
  return Array.isArray(conditionImmunitiesData) ? conditionImmunitiesData : [];
});

const hasResistances = computed(() => {
  return damageResistances.value.length > 0 || 
         damageImmunities.value.length > 0 || 
         conditionImmunities.value.length > 0;
});

// Senses and languages
const senses = computed(() => {
  const sensesData = actor.value.pluginData?.senses;
  const sensesArray = Array.isArray(sensesData) ? sensesData : [];
  const passivePerception = actor.value.pluginData?.passivePerception;
  const result = [...sensesArray];
  if (passivePerception) {
    result.push(`passive Perception ${passivePerception}`);
  }
  return result;
});

const languages = computed(() => {
  const languagesData = actor.value.pluginData?.languages;
  return Array.isArray(languagesData) ? languagesData : [];
});

// Actions
const actions = computed(() => {
  const actionsData = actor.value.pluginData?.actions;
  return Array.isArray(actionsData) ? actionsData : [];
});

const hasActions = computed(() => actions.value.length > 0);

const legendaryActions = computed(() => {
  const legendaryActionsData = actor.value.pluginData?.legendaryActions;
  return Array.isArray(legendaryActionsData) ? legendaryActionsData : [];
});

const hasLegendaryActions = computed(() => legendaryActions.value.length > 0);

const legendaryActionsPerTurn = computed(() => {
  return actor.value.pluginData?.legendaryActionsPerTurn || 3;
});

// Helper functions
const getAbilityScore = (ability: string): number => {
  const scores = abilityScores.value as Record<string, number>;
  return scores[ability] || 10;
};

const updateAbilityScore = (ability: string, value: string) => {
  const numValue = parseInt(value) || 10;
  const currentScores = { ...abilityScores.value };
  (currentScores as Record<string, number>)[ability] = numValue;
  abilityScores.value = currentScores;
};

const getAbilityModifier = (ability: string): string => {
  const score = getAbilityScore(ability);
  const modifier = Math.floor((score - 10) / 2);
  return formatModifier(modifier);
};

const formatModifier = (modifier: number): string => {
  return modifier >= 0 ? `+${modifier}` : `${modifier}`;
};

// Actions
const toggleEditMode = () => {
  if (!editMode.value) {
    // Entering edit mode - initialize form with current values
    resetForm();
  }
  editMode.value = !editMode.value;
};

const saveActor = () => {
  // Only save if there are changes
  if (hasUnsavedChanges.value) {
    // TODO: Emit state change request instead of direct save
    emit('save');
    modifiedFields.value.clear();
  }
  editMode.value = false;
};

const cancelEdit = () => {
  resetForm();
  editMode.value = false;
};

const closeSheet = () => {
  emit('close');
};

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

// Roll functions
const rollAbilityCheck = (ability: string) => {
  const modifier = Math.floor((getAbilityScore(ability) - 10) / 2);
  emit('roll', 'ability-check', {
    ability,
    modifier,
    formula: `1d20${formatModifier(modifier)}`
  });
};

const rollSavingThrow = (ability: string) => {
  const save = savingThrows.value.find(s => s.ability.toLowerCase() === ability.toLowerCase());
  const modifier = save?.modifier || Math.floor((getAbilityScore(ability) - 10) / 2);
  emit('roll', 'saving-throw', {
    ability,
    modifier,
    formula: `1d20${formatModifier(modifier)}`
  });
};

const rollSkillCheck = (skillName: string) => {
  const skill = skills.value.find(s => s.name === skillName);
  if (skill) {
    emit('roll', 'skill-check', {
      skill: skillName,
      modifier: skill.modifier,
      formula: `1d20${formatModifier(skill.modifier)}`
    });
  }
};

const rollAction = (action: any) => {
  emit('roll', 'action', {
    actionName: action.name,
    action
  });
};

// Lifecycle
onMounted(() => {
  console.log('[ActorSheet] Mounted with actor:', actor.value?.name || 'unknown');
  // Initialize form data
  resetForm();
});

// Watch for actor changes and reset form
watch(() => actor.value, (newActor) => {
  if (newActor && !editMode.value) {
    resetForm();
  }
}, { deep: true });
</script>

<style>
@import '../../styles/dnd-theme.css';
</style>

<style scoped>
/* Actor Sheet Specific Overrides */
.dnd5e-actor-sheet {
  /* Inherits base styling from dnd-theme.css */
  min-width: 600px;
  min-height: 400px;
}

.stat-block-content {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

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

.action-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.action-roll-btn {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 6px;
  background: var(--dnd-gold);
  color: var(--dnd-red-dark);
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
}

.action-roll-btn:hover {
  background: var(--dnd-gold-dark);
  transform: scale(1.05);
}

.cancel-btn {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 6px;
  background: var(--dnd-red);
  color: var(--dnd-white);
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
}

.cancel-btn:hover {
  background: var(--dnd-red-dark);
  transform: scale(1.05);
}

.save-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.save-btn:disabled:hover {
  transform: none;
}

.legendary-description {
  font-size: 11px;
  color: var(--dnd-gray);
  font-style: italic;
  margin-bottom: 12px;
  line-height: 1.4;
}

/* Use actor-specific grid from theme */
.abilities-grid {
  /* Inherits from .actor-abilities-grid in theme */
}

/* Override section headers to match stat block style */
.ability-scores h3,
.actions h3,
.legendary-actions h3 {
  font-family: 'Cinzel', serif;
  font-size: 14px;
  color: var(--dnd-red);
  margin: 0 0 12px 0;
  text-align: center;
  border-bottom: 1px solid var(--dnd-brown-light);
  padding-bottom: 4px;
}

.saving-throws h4,
.skills h4 {
  font-family: 'Cinzel', serif;
  font-size: 12px;
  color: var(--dnd-red);
  margin: 0 0 8px 0;
  text-align: center;
  border-bottom: 1px solid var(--dnd-brown-light);
  padding-bottom: 2px;
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
</style>