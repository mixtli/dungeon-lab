<template>
  <div class="dnd5e-character-sheet">
    <!-- Header -->
    <header class="sheet-header" @mousedown="startDrag">
      <div class="character-info">
        <div class="character-portrait">
          {{ character.name.charAt(0) }}
        </div>
        <div class="character-details">
          <h1 v-if="!editMode || readonly" class="character-name">{{ character.name }}</h1>
          <input 
            v-else
            v-model="character.name"
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
              v-else
              v-model.number="initiativeBonusValue"
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
              v-model.number="armorClassValue"
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
        <div class="empty-state">Equipment features coming soon...</div>
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
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, markRaw, type Ref } from 'vue';
import type { IActor, IItem } from '@dungeon-lab/shared/types/index.mjs';
import type { DndCharacterClassDocument } from '../types/dnd/character-class.mjs';
import type { DndSpeciesDocument } from '../types/dnd/species.mjs';
import type { DndBackgroundDocument } from '../types/dnd/background.mjs';
import { getPluginContext } from '@dungeon-lab/shared/utils/plugin-context.mjs';

// Props
interface Props {
  character: Ref<IActor>;
  items: Ref<IItem[]>;
  editMode: boolean;
  readonly?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  readonly: false
});

// Use reactive character directly  
const character = props.character;

// Compendium document data
const speciesDocument = ref<DndSpeciesDocument | null>(null);
const classDocument = ref<DndCharacterClassDocument | null>(null);
const backgroundDocument = ref<DndBackgroundDocument | null>(null);
const compendiumLoading = ref(false);
const compendiumError = ref<string | null>(null);

// Emits
const emit = defineEmits<{
  'save': [character: IActor];
  'roll': [rollType: string, data: Record<string, unknown>];
  'close': [];
  'toggle-edit-mode': [];
}>();

// Component state
const activeTab = ref('overview');

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

// Hit points current - direct binding to character.pluginData.attributes.hitPoints.current
const hitPointsCurrent = computed({
  get() {
    const attributes = character.value.pluginData?.attributes as any;
    return attributes?.hitPoints?.current || (character.value.pluginData as any)?.hitPoints?.current || 8;
  },
  set(value: number) {
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

// Methods
const formatModifier = (value: number): string => {
  return value >= 0 ? `+${value}` : `${value}`;
};

const rollAbilityCheck = (ability: string) => {
  const modifier = abilityModifiers.value[ability] || 0;
  emit('roll', 'ability-check', {
    type: 'ability-check',
    ability,
    modifier,
    expression: `1d20${formatModifier(modifier)}`,
    title: `${ability.charAt(0).toUpperCase() + ability.slice(1)} Check`
  });
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
  emit('save', character.value);
};

const toggleEditMode = () => {
  emit('toggle-edit-mode');
};

const closeSheet = () => {
  // Emit close event to parent
  emit('close');
};

// Window drag functionality (simplified)
const startDrag = (event: MouseEvent) => {
  // Don't start drag if clicking on buttons or other interactive elements
  const target = event.target as HTMLElement;
  if (target.tagName === 'BUTTON' || target.closest('button')) {
    return;
  }
  
  // For now, just prevent default. Window management handled by parent.
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
        context.getCompendiumEntry(speciesId)
          .then(entry => { speciesDocument.value = markRaw(entry.content as DndSpeciesDocument); })
          .catch(err => { console.warn('Failed to load species:', err); })
      );
    }
    
    // Fetch class document if we have a class ObjectId
    const classes = character.value.pluginData?.classes as any[];
    const classId = classes?.[0]?.class;
    if (classId && typeof classId === 'string') {
      promises.push(
        context.getCompendiumEntry(classId)
          .then(entry => { classDocument.value = markRaw(entry.content as DndCharacterClassDocument); })
          .catch(err => { console.warn('Failed to load class:', err); })
      );
    }
    
    // Fetch background document if we have a background ObjectId
    const backgroundId = character.value.pluginData?.background;
    if (backgroundId && typeof backgroundId === 'string') {
      promises.push(
        context.getCompendiumEntry(backgroundId)
          .then(entry => { backgroundDocument.value = markRaw(entry.content as DndBackgroundDocument); })
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

// Style injection
const injectStyles = () => {
  const styleId = 'dnd5e-character-sheet-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
/* CSS Custom Properties for D&D Theme */
:root {
  --dnd-red: #D20000;
  --dnd-red-dark: #B40000;
  --dnd-red-light: #FF3333;
  --dnd-gold: #FFD700;
  --dnd-gold-dark: #DAA520;
  --dnd-parchment: #FDF5E6;
  --dnd-parchment-dark: #F5DEB3;
  --dnd-brown: #8B4513;
  --dnd-brown-light: #D2B48C;
  --dnd-black: #2C2C2C;
  --dnd-gray: #6B6B6B;
  --dnd-gray-light: #E5E5E5;
  --dnd-white: #FFFFFF;
  --dnd-shadow: rgba(0, 0, 0, 0.2);
  --dnd-shadow-light: rgba(0, 0, 0, 0.1);
}

/* Main Container */
.dnd5e-character-sheet {
  width: 100%;
  height: 100%;
  max-width: 100%;
  min-height: 600px;
  background: var(--dnd-parchment);
  border: 2px solid var(--dnd-brown);
  border-radius: 12px;
  box-shadow: 0 8px 24px var(--dnd-shadow);
  font-family: 'Open Sans', sans-serif;
  color: var(--dnd-black);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
  box-sizing: border-box;
}

/* Header */
.sheet-header {
  background: linear-gradient(135deg, var(--dnd-red), var(--dnd-red-dark));
  color: var(--dnd-white);
  padding: 12px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 8px var(--dnd-shadow);
  position: relative;
}

.sheet-header::before {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, var(--dnd-gold), var(--dnd-gold-dark), var(--dnd-gold));
}

.character-info {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.character-portrait {
  width: 40px;
  height: 40px;
  background: var(--dnd-gold);
  border: 2px solid var(--dnd-white);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: bold;
  color: var(--dnd-red-dark);
  box-shadow: 0 2px 4px var(--dnd-shadow);
}

.character-name {
  font-family: 'Cinzel', serif;
  font-size: 16px;
  font-weight: bold;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-shadow: 1px 1px 2px var(--dnd-shadow);
}

.character-name-input {
  font-family: 'Cinzel', serif;
  font-size: 16px;
  font-weight: bold;
  margin: 0;
  padding: 4px 8px;
  background: rgba(255, 255, 255, 0.9);
  border: 2px solid var(--dnd-gold);
  border-radius: 4px;
  color: var(--dnd-red);
  outline: none;
  transition: all 0.2s ease;
}

.character-name-input:focus {
  background: var(--dnd-white);
  border-color: var(--dnd-red);
  box-shadow: 0 0 0 2px rgba(210, 0, 0, 0.2);
}

.character-subtitle {
  font-size: 12px;
  opacity: 0.9;
  margin: 2px 0 0 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.edit-toggle-btn, .save-btn, .close-btn {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  background: rgba(255, 255, 255, 0.2);
  color: var(--dnd-white);
  backdrop-filter: blur(4px);
}

.edit-toggle-btn:hover, .save-btn:hover:not(:disabled), .close-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.05);
}

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

.stat-label {
  font-size: 10px;
  font-weight: 600;
  color: var(--dnd-gray);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 18px;
  font-weight: bold;
  color: var(--dnd-red);
  font-family: 'Cinzel', serif;
}

/* Abilities Tab */
.abilities-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  margin-bottom: 16px;
}

.ability-card {
  background: var(--dnd-white);
  border: 2px solid var(--dnd-brown-light);
  border-radius: 8px;
  padding: 12px 8px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px var(--dnd-shadow-light);
}

.ability-card:hover {
  border-color: var(--dnd-red);
  transform: translateY(-2px);
  box-shadow: 0 4px 8px var(--dnd-shadow);
}

.ability-name {
  font-size: 10px;
  font-weight: bold;
  color: var(--dnd-gray);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
}

.ability-score {
  font-size: 20px;
  font-weight: bold;
  color: var(--dnd-red);
  font-family: 'Cinzel', serif;
  margin-bottom: 2px;
}

.ability-modifier {
  font-size: 12px;
  color: var(--dnd-gray);
  font-weight: 500;
}

.ability-score-input {
  width: 60px;
  background: var(--dnd-white);
  border: 2px solid var(--dnd-gold);
  border-radius: 4px;
  padding: 2px 4px;
  font-size: 18px;
  font-weight: bold;
  font-family: 'Cinzel', serif;
  color: var(--dnd-red);
  text-align: center;
  outline: none;
  transition: all 0.2s ease;
  appearance: textfield;
  margin-bottom: 2px;
}

.ability-score-input:focus {
  border-color: var(--dnd-red);
  box-shadow: 0 0 0 2px rgba(210, 0, 0, 0.2);
}

.ability-score-input::-webkit-outer-spin-button,
.ability-score-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.ability-card.non-clickable {
  cursor: default;
}

.ability-card.non-clickable:hover {
  border-color: var(--dnd-brown-light);
  transform: none;
  box-shadow: 0 2px 4px var(--dnd-shadow-light);
}

/* Common styles for sections */
h3 {
  font-family: 'Cinzel', serif;
  font-size: 14px;
  color: var(--dnd-red);
  margin: 0 0 8px 0;
  text-align: center;
  border-bottom: 1px solid var(--dnd-brown-light);
  padding-bottom: 4px;
}

/* Skills and other interactive lists */
.skills-list, .saves-grid, .features-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.skill-item, .save-item, .feature-item {
  background: var(--dnd-white);
  border: 1px solid var(--dnd-gray-light);
  border-radius: 6px;
  padding: 6px 8px;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.skill-item:hover, .save-item:hover {
  border-color: var(--dnd-red);
  background: var(--dnd-parchment);
}

.skill-prof.proficient, .save-prof.proficient {
  color: var(--dnd-red);
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

.skill-bonus, .save-bonus {
  font-weight: bold;
  color: var(--dnd-red);
  min-width: 24px;
  text-align: right;
}

.save-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.save-name {
  flex: 1;
  font-weight: 500;
}

.saves-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 4px;
}

/* Text areas and inputs */
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

/* Stat input fields */
.stat-input {
  width: 100%;
  background: var(--dnd-white);
  border: 2px solid var(--dnd-gold);
  border-radius: 4px;
  padding: 2px 4px;
  font-size: 16px;
  font-weight: bold;
  font-family: 'Cinzel', serif;
  color: var(--dnd-red);
  text-align: center;
  outline: none;
  transition: all 0.2s ease;
  appearance: textfield;
}

.stat-input:focus {
  border-color: var(--dnd-red);
  box-shadow: 0 0 0 2px rgba(210, 0, 0, 0.2);
}

/* Spinbutton controls are now visible for better UX */

/* Hit points edit layout */
.hit-points-edit {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  font-family: 'Cinzel', serif;
  font-weight: bold;
  color: var(--dnd-red);
}

.hp-current, .hp-max {
  width: 40px;
  font-size: 14px;
}

.hp-separator {
  font-size: 16px;
  font-weight: bold;
  color: var(--dnd-red);
}

/* Speed edit layout */
.speed-edit {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  font-family: 'Cinzel', serif;
  font-weight: bold;
  color: var(--dnd-red);
}

.speed-input {
  width: 50px;
  font-size: 14px;
}

.speed-unit {
  font-size: 12px;
  color: var(--dnd-gray);
}

/* Empty states */
.empty-state {
  text-align: center;
  color: var(--dnd-gray);
  font-style: italic;
  padding: 16px;
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
`;
    document.head.appendChild(style);
  }
};

// Lifecycle
onMounted(() => {
  injectStyles();
  document.addEventListener('keydown', handleKeyDown);
  console.log('D&D 5e Character Sheet mounted for character:', character.value.name);
  
  // No longer need to initialize editable fields - direct v-model binding
  
  // Load compendium documents
  loadCompendiumDocuments();
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown);
});

// Watch for character changes and reload compendium data
watch(() => {
  const classes = character.value.pluginData?.classes as any[];
  return [
    character.value.pluginData?.species,
    classes?.[0]?.class,
    character.value.pluginData?.background
  ];
}, () => {
  loadCompendiumDocuments();
}, { deep: true });
</script>