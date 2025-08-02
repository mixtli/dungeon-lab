<template>
  <div class="dnd5e-character-sheet">
    <!-- Header -->
    <header class="sheet-header" @mousedown="startDrag">
      <div class="character-info">
        <div class="character-portrait">
          {{ character.name.charAt(0) }}
        </div>
        <div class="character-details">
          <h1 class="character-name">{{ character.name }}</h1>
          <p class="character-subtitle">
            Level {{ character.pluginData?.progression?.level || character.pluginData?.level || 1 }} {{ character.pluginData?.species?.name || character.pluginData?.race?.name || 'Human' }} {{ character.pluginData?.classes?.[0]?.class?.name || character.pluginData?.characterClass?.name || 'Fighter' }}
          </p>
        </div>
      </div>
      <div class="header-actions">
        <button @click="saveCharacter" :disabled="readonly || !isDirty" class="save-btn">
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
          <div class="stat-card" @click="rollInitiative" title="Click to roll initiative">
            <div class="stat-label">Initiative</div>
            <div class="stat-value">{{ initiativeBonus }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Armor Class</div>
            <div class="stat-value">{{ armorClassDisplay }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Hit Points</div>
            <div class="stat-value">{{ hitPointsDisplay }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Speed</div>
            <div class="stat-value">{{ speedDisplay }}</div>
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
        
        <div v-if="character.pluginData?.attributes?.inspiration || character.pluginData?.inspiration" class="inspiration-section">
          <div class="inspiration-indicator">
            ⭐ Inspiration
          </div>
        </div>
      </div>
      
      <!-- Abilities Tab -->
      <div v-if="activeTab === 'abilities'" class="tab-pane abilities-tab">
        <div class="abilities-grid">
          <div 
            v-for="(abilityScore, abilityName) in finalAbilities" 
            :key="abilityName"
            class="ability-card"
            @click="rollAbilityCheck(abilityName)"
            :title="'Click to roll ' + abilityName + ' check'"
          >
            <div class="ability-name">{{ abilityName.slice(0, 3).toUpperCase() }}</div>
            <div class="ability-score">{{ abilityScore }}</div>
            <div class="ability-modifier">{{ formatModifier(abilityModifiers[abilityName]) }}</div>
          </div>
        </div>
        
        <div class="saving-throws">
          <h3>Saving Throws</h3>
          <div class="saves-grid">
            <div 
              v-for="(abilityScore, abilityName) in finalAbilities" 
              :key="abilityName"
              class="save-item"
              @click="rollSavingThrow(abilityName)"
              :title="'Click to roll ' + abilityName + ' save'"
            >
              <div class="save-prof" :class="{ proficient: savingThrowProficiencies[abilityName] }">
                {{ savingThrowProficiencies[abilityName] ? '●' : '○' }}
              </div>
              <div class="save-name">{{ abilityName.slice(0, 3).toUpperCase() }}</div>
              <div class="save-bonus">{{ formatModifier(savingThrowBonuses[abilityName]) }}</div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Skills Tab -->
      <div v-if="activeTab === 'skills'" class="tab-pane skills-tab">
        <div class="skills-list">
          <div 
            v-for="(skill, skillName) in character.pluginData?.skills || DEFAULT_SKILLS" 
            :key="skillName"
            class="skill-item"
            @click="rollSkillCheck(skillName)"
            :title="'Click to roll ' + skillName + ' (' + skill.ability + ')'"
          >
            <div class="skill-prof" :class="skill.proficiency">
              {{ skill.proficiency === 'expertise' ? '◆' : skill.proficiency === 'proficient' ? '●' : skill.proficiency === 'half' ? '◐' : '○' }}
            </div>
            <div class="skill-name">{{ skillName }}</div>
            <div class="skill-ability">({{ skill.ability.slice(0, 3) }})</div>
            <div class="skill-bonus">{{ formatModifier(skillBonuses[skillName]) }}</div>
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
              :readonly="readonly"
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
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { DEFAULT_SKILLS } from './types/dnd/skills.mjs';
import type { IActor, PluginContext } from '@dungeon-lab/shared/types/index.mjs';

// Props
interface Props {
  character: IActor;
  context?: PluginContext;
  readonly?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  readonly: false
});

// Use character directly - no transformation needed
const character = computed(() => props.character);

// Emits
const emit = defineEmits<{
  'update:character': [character: IActor];
  'save': [character: IActor];
  'roll': [rollType: string, data: Record<string, unknown>];
  'close': [];
}>();

// Component state
const activeTab = ref('overview');
const isDirty = ref(false);

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
  const abilities = props.character.pluginData?.abilities || {};
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
  const progression = props.character.pluginData?.progression;
  if (progression?.proficiencyBonus) {
    return progression.proficiencyBonus;
  }
  
  // Calculate from level (fallback)
  const level = progression?.level || props.character.pluginData?.level || 1;
  return Math.ceil(level / 4) + 1;
});

// Determine saving throw proficiencies from D&D schema
const savingThrowProficiencies = computed(() => {
  const proficiencies: Record<string, boolean> = {};
  const abilities = props.character.pluginData?.abilities || {};
  
  // Use proficiencies from the D&D schema if available
  for (const abilityName of Object.keys(finalAbilities.value)) {
    const ability = abilities[abilityName];
    if (ability && typeof ability === 'object' && 'saveProficient' in ability) {
      proficiencies[abilityName] = ability.saveProficient || false;
    } else {
      // Fallback: determine from character class (legacy logic)
      proficiencies[abilityName] = false;
      const characterClass = props.character.pluginData?.characterClass || props.character.pluginData?.classes?.[0]?.class;
      if (characterClass?.id === 'character-class-wizard' && (abilityName === 'intelligence' || abilityName === 'wisdom')) {
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

const skillBonuses = computed(() => {
  const bonuses: Record<string, number> = {};
  const skills = props.character.pluginData?.skills || {};
  
  // Use D&D schema skills if available, otherwise fall back to class selection
  const selectedSkills = props.character.pluginData?.characterClass?.selectedSkills || 
                         props.character.pluginData?.classes?.[0]?.class?.selectedSkills || [];
  
  for (const [skillName, skill] of Object.entries(DEFAULT_SKILLS)) {
    const abilityMod = abilityModifiers.value[skill.ability] || 0;
    let profBonus = 0;
    
    // Check D&D schema skills first
    const skillData = skills[skillName];
    if (skillData && typeof skillData === 'object') {
      if (skillData.expert) {
        profBonus = proficiencyBonus.value * 2;
      } else if (skillData.proficient) {
        profBonus = proficiencyBonus.value;
      }
      bonuses[skillName] = abilityMod + profBonus + (skillData.bonus || 0);
    } else {
      // Fallback: check if skill is proficient from class selection
      if (selectedSkills.includes(skillName)) {
        profBonus = proficiencyBonus.value;
      }
      bonuses[skillName] = abilityMod + profBonus;
    }
  }
  return bonuses;
});

const passivePerception = computed(() => {
  const perceptionBonus = skillBonuses.value.perception || 0;
  return 10 + perceptionBonus;
});

const armorClassDisplay = computed(() => {
  const attributes = props.character.pluginData?.attributes;
  if (attributes?.armorClass?.value) {
    return attributes.armorClass.value;
  }
  return props.character.pluginData?.armorClass || 10;
});

const hitPointsDisplay = computed(() => {
  const attributes = props.character.pluginData?.attributes;
  if (attributes?.hitPoints) {
    return `${attributes.hitPoints.current}/${attributes.hitPoints.maximum}`;
  }
  const hitPoints = props.character.pluginData?.hitPoints || { current: 8, maximum: 8 };
  return `${hitPoints.current}/${hitPoints.maximum}`;
});

const speedDisplay = computed(() => {
  const attributes = props.character.pluginData?.attributes;
  if (attributes?.movement?.walk) {
    return `${attributes.movement.walk} ft`;
  }
  const speed = props.character.pluginData?.speed || 30;
  return `${speed} ft`;
});

const initiativeBonus = computed(() => {
  const dexMod = abilityModifiers.value.dexterity || 0;
  const attributes = props.character.pluginData?.attributes;
  let initBonus = 0;
  
  if (attributes?.initiative?.bonus !== undefined) {
    initBonus = attributes.initiative.bonus;
  } else {
    initBonus = props.character.pluginData?.initiative || 0;
  }
  
  const bonus = dexMod + initBonus;
  return bonus >= 0 ? `+${bonus}` : `${bonus}`;
});

// Reactive notes for textarea editing
const characterNotes = computed({
  get() {
    // Try D&D schema format first, then fallback to legacy
    return props.character.pluginData?.roleplay?.backstory || 
           props.character.pluginData?.notes || '';
  },
  set(value: string) {
    // Update both for compatibility
    updateCharacter({ 
      notes: value,
      roleplay: { 
        ...props.character.pluginData?.roleplay,
        backstory: value 
      }
    });
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
  const skills = props.character.pluginData?.skills || DEFAULT_SKILLS;
  const ability = skills[skill]?.ability || '';
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
  const initBonus = props.character.pluginData?.initiative || 0;
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

const updateCharacter = (updates: Record<string, unknown>) => {
  const updatedCharacter = { ...props.character, pluginData: { ...props.character.pluginData, ...updates } };
  isDirty.value = true;
  emit('update:character', updatedCharacter);
};

const saveCharacter = () => {
  emit('save', props.character);
  isDirty.value = false;
};

const closeSheet = () => {
  // Emit window event via plugin context if available
  if (props.context?.events) {
    props.context.events.emit('window:close');
  }
  // Also emit the regular close event for backwards compatibility
  emit('close');
};

// Window drag functionality
const startDrag = (event: MouseEvent) => {
  // Don't start drag if clicking on buttons or other interactive elements
  const target = event.target as HTMLElement;
  if (target.tagName === 'BUTTON' || target.closest('button')) {
    return;
  }
  
  // Emit drag start event via plugin context if available
  if (props.context?.events) {
    props.context.events.emit('window:drag-start', {
      startX: event.clientX,
      startY: event.clientY
    });
  }
  
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
  min-width: 900px;
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

.save-btn, .close-btn {
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

.save-btn:hover:not(:disabled), .close-btn:hover {
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
  console.log('D&D 5e Character Sheet mounted for character:', props.character.name);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown);
});
</script>