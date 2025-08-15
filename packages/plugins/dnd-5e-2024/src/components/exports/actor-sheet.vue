<template>
  <div class="dnd5e-sheet dnd5e-actor-sheet">
    <!-- Header -->
    <header class="sheet-header" @mousedown="startDrag">
      <div class="character-info">
        <div class="character-portrait">
          {{ actor.name.charAt(0) }}
        </div>
        <div class="character-details">
          <h1 v-if="!editMode || readonly" class="character-name">{{ actor.name }}</h1>
          <input 
            v-else
            v-model="actor.name"
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
        >
          💾
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
            v-model.number="armorClassValue"
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
              :value="getAbilityScore(ability.key)"
              @input="updateAbilityScore(ability.key, ($event.target as HTMLInputElement).value)"
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
import { ref, computed, onMounted } from 'vue';
import type { IActor } from '@dungeon-lab/shared/types/index.mjs';

// Props
interface Props {
  actor: IActor;
  readonly?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  readonly: false
});

// Events
const emit = defineEmits<{
  (e: 'update:actor', actor: IActor): void;
  (e: 'save'): void;
  (e: 'roll', rollType: string, data: Record<string, unknown>): void;
  (e: 'close'): void;
  (e: 'drag-start', event: MouseEvent): void;
}>();

// Component state
const editMode = ref(false);

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
  get: () => props.actor.pluginData?.abilities || {
    strength: 10,
    dexterity: 10,
    constitution: 10,
    intelligence: 10,
    wisdom: 10,
    charisma: 10
  },
  set: (value) => {
    if (!props.actor.pluginData) {
      props.actor.pluginData = {};
    }
    props.actor.pluginData.abilities = value;
    emit('update:actor', props.actor);
  }
});

// Computed properties
const creatureTypeDisplay = computed(() => {
  const size = props.actor.pluginData?.size || 'Medium';
  const type = props.actor.pluginData?.type || 'humanoid';
  return `${size} ${type}`;
});

const challengeRatingDisplay = computed(() => {
  const cr = props.actor.pluginData?.challengeRating || '1/8';
  const xp = props.actor.pluginData?.experiencePoints || 25;
  return `${cr} (${xp} XP)`;
});

const armorClassDisplay = computed(() => {
  const acData = props.actor.pluginData?.armorClass;
  const ac = (typeof acData === 'object' && acData && 'value' in acData) ? (acData as any).value : (acData || 10);
  const source = (typeof acData === 'object' && acData && 'source' in acData) ? (acData as any).source : undefined;
  return source ? `${ac} (${source})` : ac.toString();
});

const armorClassValue = computed({
  get: () => {
    const acData = props.actor.pluginData?.armorClass;
    return (typeof acData === 'object' && acData && 'value' in acData) ? (acData as any).value : (acData || 10);
  },
  set: (value) => {
    if (!props.actor.pluginData) {
      props.actor.pluginData = {};
    }
    // Keep existing structure if it's an object, otherwise create simple value
    const existing = props.actor.pluginData.armorClass;
    if (typeof existing === 'object') {
      props.actor.pluginData.armorClass = { ...existing, value };
    } else {
      props.actor.pluginData.armorClass = { value };
    }
    emit('update:actor', props.actor);
  }
});

const hitPointsMax = computed({
  get: () => {
    const hpData = props.actor.pluginData?.hitPoints;
    if (typeof hpData === 'object' && hpData && 'average' in hpData) {
      return (hpData as any).average;
    }
    return props.actor.pluginData?.hitPointsMax || 1;
  },
  set: (value) => {
    if (!props.actor.pluginData) {
      props.actor.pluginData = {};
    }
    // Update the hitPoints.average if structured data exists
    const existing = props.actor.pluginData.hitPoints;
    if (typeof existing === 'object') {
      props.actor.pluginData.hitPoints = { ...existing, average: value };
    } else {
      props.actor.pluginData.hitPointsMax = value;
    }
    emit('update:actor', props.actor);
  }
});

const hitPointsCurrent = computed({
  get: () => {
    const hpData = props.actor.pluginData?.hitPoints;
    if (typeof hpData === 'object' && hpData) {
      const current = 'current' in hpData ? (hpData as any).current : undefined;
      const average = 'average' in hpData ? (hpData as any).average : undefined;
      return current ?? average ?? 1;
    }
    return props.actor.pluginData?.hitPointsCurrent ?? hitPointsMax.value;
  },
  set: (value) => {
    if (!props.actor.pluginData) {
      props.actor.pluginData = {};
    }
    // Update the hitPoints.current if structured data exists
    const existing = props.actor.pluginData.hitPoints;
    if (typeof existing === 'object') {
      props.actor.pluginData.hitPoints = { ...existing, current: value };
    } else {
      props.actor.pluginData.hitPointsCurrent = value;
    }
    emit('update:actor', props.actor);
  }
});

const hitPointsDisplay = computed(() => {
  const current = hitPointsCurrent.value;
  const max = hitPointsMax.value;
  const hpData = props.actor.pluginData?.hitPoints;
  const formula = (typeof hpData === 'object' && hpData && 'formula' in hpData) ? ` (${(hpData as any).formula})` : '';
  return `${current}/${max}${formula}`;
});

const speedDisplay = computed(() => {
  const speeds = props.actor.pluginData?.speed || { walk: 30 };
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
  const savingThrowsData = props.actor.pluginData?.savingThrows;
  return Array.isArray(savingThrowsData) ? savingThrowsData : [];
});

const hasSavingThrows = computed(() => savingThrows.value.length > 0);

// Skills
const skills = computed(() => {
  const skillsData = props.actor.pluginData?.skills;
  return Array.isArray(skillsData) ? skillsData : [];
});

const hasSkills = computed(() => skills.value.length > 0);

// Resistances and immunities
const damageResistances = computed(() => {
  const resistancesData = props.actor.pluginData?.damageResistances;
  return Array.isArray(resistancesData) ? resistancesData : [];
});

const damageImmunities = computed(() => {
  const immunitiesData = props.actor.pluginData?.damageImmunities;
  return Array.isArray(immunitiesData) ? immunitiesData : [];
});

const conditionImmunities = computed(() => {
  const conditionImmunitiesData = props.actor.pluginData?.conditionImmunities;
  return Array.isArray(conditionImmunitiesData) ? conditionImmunitiesData : [];
});

const hasResistances = computed(() => {
  return damageResistances.value.length > 0 || 
         damageImmunities.value.length > 0 || 
         conditionImmunities.value.length > 0;
});

// Senses and languages
const senses = computed(() => {
  const sensesData = props.actor.pluginData?.senses;
  const sensesArray = Array.isArray(sensesData) ? sensesData : [];
  const passivePerception = props.actor.pluginData?.passivePerception;
  const result = [...sensesArray];
  if (passivePerception) {
    result.push(`passive Perception ${passivePerception}`);
  }
  return result;
});

const languages = computed(() => {
  const languagesData = props.actor.pluginData?.languages;
  return Array.isArray(languagesData) ? languagesData : [];
});

// Actions
const actions = computed(() => {
  const actionsData = props.actor.pluginData?.actions;
  return Array.isArray(actionsData) ? actionsData : [];
});

const hasActions = computed(() => actions.value.length > 0);

const legendaryActions = computed(() => {
  const legendaryActionsData = props.actor.pluginData?.legendaryActions;
  return Array.isArray(legendaryActionsData) ? legendaryActionsData : [];
});

const hasLegendaryActions = computed(() => legendaryActions.value.length > 0);

const legendaryActionsPerTurn = computed(() => {
  return props.actor.pluginData?.legendaryActionsPerTurn || 3;
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
  editMode.value = !editMode.value;
};

const saveActor = () => {
  emit('save');
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
  console.log('[ActorSheet] Mounted with actor:', props.actor.name);
});
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
</style>