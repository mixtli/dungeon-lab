<template>
  <div class="dnd5e-actor-sheet">
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
    <main class="stat-block-content">
      <!-- Basic Stats Section -->
      <section class="basic-stats">
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
      <section class="ability-scores">
        <h3>Ability Scores</h3>
        <div class="abilities-grid">
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
      <section class="skills-saves" v-if="hasSavingThrows || hasSkills">
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
      <section class="resistances" v-if="hasResistances">
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
      <section class="senses" v-if="senses.length">
        <div class="stat-line">
          <span class="stat-label">Senses</span>
          <span class="stat-value">{{ senses.join(', ') }}</span>
        </div>
      </section>

      <!-- Languages -->
      <section class="languages" v-if="languages.length">
        <div class="stat-line">
          <span class="stat-label">Languages</span>
          <span class="stat-value">{{ languages.join(', ') }}</span>
        </div>
      </section>

      <!-- Challenge Rating -->
      <section class="challenge-rating">
        <div class="stat-line">
          <span class="stat-label">Challenge Rating</span>
          <span class="stat-value">{{ challengeRatingDisplay }}</span>
        </div>
      </section>

      <!-- Actions -->
      <section class="actions" v-if="hasActions">
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
      <section class="legendary-actions" v-if="hasLegendaryActions">
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
  // Handle window dragging - implementation depends on parent container
  // This is just a placeholder for the drag functionality
  console.log('Start drag', event);
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

<style scoped>
@import '../character-sheet-styles.css';

.dnd5e-actor-sheet {
  @apply w-full h-full bg-white rounded-lg shadow-lg overflow-hidden flex flex-col;
  font-family: 'Roboto', sans-serif;
  min-width: 600px;
  min-height: 400px;
}

.stat-block-content {
  @apply flex-1 p-6 overflow-y-auto space-y-6;
}

.basic-stats {
  @apply space-y-2;
}

.stat-line {
  @apply flex items-center justify-between py-1;
  border-bottom: 1px solid #e5e7eb;
}

.stat-label {
  @apply font-semibold text-gray-700;
}

.stat-value {
  @apply text-gray-900;
}

.stat-input.inline {
  @apply w-20 px-2 py-1 border rounded;
}

.hit-points-edit.inline {
  @apply flex items-center space-x-2;
}

.hp-current, .hp-max {
  @apply w-16 px-2 py-1 border rounded text-center;
}

.hp-separator {
  @apply text-gray-500;
}

.abilities-grid {
  @apply grid grid-cols-6 gap-4;
}

.ability-card {
  @apply text-center p-3 border rounded cursor-pointer hover:bg-gray-50 transition-colors;
}

.ability-name {
  @apply text-xs font-semibold text-gray-600 uppercase;
}

.ability-score {
  @apply text-lg font-bold text-gray-900;
}

.ability-modifier {
  @apply text-sm text-gray-600;
}

.ability-input {
  @apply w-full text-center px-2 py-1 border rounded;
}

.skills-saves {
  @apply grid grid-cols-1 md:grid-cols-2 gap-4;
}

.saves-list, .skills-list {
  @apply flex flex-wrap gap-2;
}

.save-item, .skill-item {
  @apply px-2 py-1 bg-gray-100 rounded cursor-pointer hover:bg-gray-200 transition-colors text-sm;
}

.resistance-line {
  @apply flex justify-between py-1;
}

.resistance-label {
  @apply font-medium text-gray-700;
}

.resistance-value {
  @apply text-gray-900;
}

.action-item {
  @apply border-b border-gray-200 pb-4 last:border-b-0;
}

.action-header {
  @apply flex items-center justify-between mb-2;
}

.action-name {
  @apply font-semibold text-gray-900;
}

.action-roll-btn {
  @apply px-2 py-1 bg-blue-100 hover:bg-blue-200 rounded transition-colors;
}

.action-description {
  @apply text-gray-700 text-sm;
}

.legendary-description {
  @apply text-sm text-gray-600 mb-4 italic;
}

/* Responsive design */
@media (max-width: 768px) {
  .abilities-grid {
    @apply grid-cols-3;
  }
  
  .skills-saves {
    @apply grid-cols-1;
  }
}
</style>