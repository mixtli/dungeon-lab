/**
 * D&D 5e Character Sheet Component
 * Main character sheet interface for D&D 5e characters
 */

import { defineComponent, ref, computed, onMounted } from 'vue';
import { useCharacterSheet } from '@dungeon-lab/shared';
import { PluginButton, PluginInput, PluginSelect, PluginCard } from '@dungeon-lab/shared';
import type { CharacterData } from '@dungeon-lab/shared';

// D&D 5e specific character data interface
export interface DnD5eCharacterData extends CharacterData {
  inspiration: boolean;
  armorClass: {
    base: number;
    modifiers: number[];
    total: number;
  };
  hitPoints: {
    current: number;
    maximum: number;
    temporary: number;
  };
  deathSaves: {
    successes: number;
    failures: number;
  };
  hitDice: {
    current: number;
    maximum: number;
    type: string;
  };
  savingThrows: Record<string, {
    proficient: boolean;
    bonus: number;
  }>;
}

export default defineComponent({
  name: 'DnD5eCharacterSheet',
  
  props: {
    character: {
      type: Object as () => DnD5eCharacterData,
      required: true
    },
    context: {
      type: Object,
      required: true
    },
    readonly: {
      type: Boolean,
      default: false
    }
  },
  
  emits: {
    'update:character': (character: DnD5eCharacterData) => !!character,
    'save': (character: DnD5eCharacterData) => !!character,
    'roll': (rollType: string, data: Record<string, unknown>) => !!rollType && !!data
  },
  
  setup(props, { emit }) {
    // Use base character sheet functionality
    const baseSheet = useCharacterSheet(props.character, props.context, {
      autoSave: true,
      autoSaveDelay: 2000
    });
    
    // D&D 5e specific state
    const activeTab = ref('basic');
    const editMode = ref(false);
    
    // Computed properties for D&D 5e mechanics
    const abilityModifiers = computed(() => {
      const modifiers: Record<string, number> = {};
      
      for (const [abilityName, ability] of Object.entries(props.character.abilities)) {
        modifiers[abilityName] = Math.floor((ability.value - 10) / 2);
      }
      
      return modifiers;
    });
    
    const proficiencyBonus = computed(() => {
      return Math.ceil(props.character.level / 4) + 1;
    });
    
    const savingThrowBonuses = computed(() => {
      const bonuses: Record<string, number> = {};
      
      for (const [abilityName, savingThrow] of Object.entries(props.character.savingThrows)) {
        const abilityMod = abilityModifiers.value[abilityName] || 0;
        const profBonus = savingThrow.proficient ? proficiencyBonus.value : 0;
        bonuses[abilityName] = abilityMod + profBonus + savingThrow.bonus;
      }
      
      return bonuses;
    });
    
    const skillBonuses = computed(() => {
      const bonuses: Record<string, number> = {};
      
      for (const [skillName, skill] of Object.entries(props.character.skills.skills)) {
        const abilityMod = abilityModifiers.value[skill.ability] || 0;
        let profBonus = 0;
        
        if (skill.proficiency === 'proficient') {
          profBonus = proficiencyBonus.value;
        } else if (skill.proficiency === 'expertise') {
          profBonus = proficiencyBonus.value * 2;
        } else if (skill.proficiency === 'half') {
          profBonus = Math.floor(proficiencyBonus.value / 2);
        }
        
        bonuses[skillName] = abilityMod + profBonus + skill.modifiers.reduce((sum, mod) => sum + mod, 0);
      }
      
      return bonuses;
    });
    
    const passivePerception = computed(() => {
      const perceptionBonus = skillBonuses.value.perception || 0;
      return 10 + perceptionBonus;
    });
    
    // Tab management
    const tabs = [
      { id: 'basic', name: 'Basic Info', icon: '👤' },
      { id: 'abilities', name: 'Abilities', icon: '💪' },
      { id: 'skills', name: 'Skills', icon: '🎯' },
      { id: 'combat', name: 'Combat', icon: '⚔️' },
      { id: 'spells', name: 'Spells', icon: '✨' },
      { id: 'equipment', name: 'Equipment', icon: '🎒' },
      { id: 'features', name: 'Features', icon: '🌟' },
      { id: 'notes', name: 'Notes', icon: '📝' }
    ];
    
    // Methods
    const rollAbilityCheck = (ability: string) => {
      const modifier = abilityModifiers.value[ability] || 0;
      emit('roll', 'ability-check', {
        ability,
        modifier,
        expression: `1d20+${modifier}`
      });
    };
    
    const rollSavingThrow = (ability: string) => {
      const bonus = savingThrowBonuses.value[ability] || 0;
      emit('roll', 'saving-throw', {
        ability,
        bonus,
        expression: `1d20+${bonus}`
      });
    };
    
    const rollSkillCheck = (skill: string) => {
      const bonus = skillBonuses.value[skill] || 0;
      emit('roll', 'skill-check', {
        skill,
        bonus,
        expression: `1d20+${bonus}`
      });
    };
    
    const rollInitiative = () => {
      const dexModifier = abilityModifiers.value.dexterity || 0;
      emit('roll', 'initiative', {
        modifier: dexModifier,
        expression: `1d20+${dexModifier}`
      });
    };
    
    const rollAttack = (weapon: unknown) => {
      // Implementation for weapon attacks
      emit('roll', 'attack', { weapon });
    };
    
    const rollDamage = (weapon: unknown) => {
      // Implementation for damage rolls
      emit('roll', 'damage', { weapon });
    };
    
    const castSpell = (spell: unknown) => {
      // Implementation for spell casting
      emit('roll', 'spell', { spell });
    };
    
    const updateCharacter = (updates: Partial<DnD5eCharacterData>) => {
      const updatedCharacter = { ...props.character, ...updates };
      emit('update:character', updatedCharacter);
    };
    
    const saveCharacter = () => {
      emit('save', props.character);
    };
    
    const switchTab = (tabId: string) => {
      activeTab.value = tabId;
    };
    
    const toggleEditMode = () => {
      editMode.value = !editMode.value;
    };
    
    // Lifecycle
    onMounted(() => {
      console.log('D&D 5e Character Sheet mounted for character:', props.character.name);
    });
    
    return {
      // Base sheet functionality
      ...baseSheet,
      
      // D&D 5e specific state
      activeTab,
      editMode,
      tabs,
      
      // Computed properties
      abilityModifiers,
      proficiencyBonus,
      savingThrowBonuses,
      skillBonuses,
      passivePerception,
      
      // Methods
      rollAbilityCheck,
      rollSavingThrow,
      rollSkillCheck,
      rollInitiative,
      rollAttack,
      rollDamage,
      castSpell,
      updateCharacter,
      saveCharacter,
      switchTab,
      toggleEditMode,
      
      // Components
      PluginButton,
      PluginInput,
      PluginSelect,
      PluginCard
    };
  },
  
  template: `
    <div class="dnd5e-character-sheet bg-white min-h-screen">
      <!-- Header -->
      <div class="character-header bg-gradient-to-r from-red-600 to-red-800 text-white p-6 shadow-lg">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-4">
            <div class="character-portrait w-16 h-16 bg-white rounded-full flex items-center justify-center">
              <span class="text-2xl text-red-600">{{ character.name.charAt(0) }}</span>
            </div>
            <div>
              <h1 class="text-3xl font-bold">{{ character.name }}</h1>
              <p class="text-red-200">
                Level {{ character.level }} {{ character.race.name }} {{ character.classes[0]?.name }}
              </p>
            </div>
          </div>
          <div class="flex space-x-2">
            <PluginButton 
              variant="secondary" 
              @click="toggleEditMode"
              :disabled="readonly"
            >
              {{ editMode ? 'View' : 'Edit' }}
            </PluginButton>
            <PluginButton 
              variant="primary" 
              @click="saveCharacter"
              :disabled="readonly || !isDirty"
            >
              Save
            </PluginButton>
          </div>
        </div>
      </div>
      
      <!-- Tab Navigation -->
      <div class="tab-navigation bg-gray-100 border-b border-gray-200">
        <div class="flex space-x-1 p-2">
          <button 
            v-for="tab in tabs" 
            :key="tab.id"
            @click="switchTab(tab.id)"
            :class="[
              'px-4 py-2 rounded-t-lg font-medium text-sm transition-colors',
              activeTab === tab.id 
                ? 'bg-white text-red-600 border-t-2 border-red-600' 
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-200'
            ]"
          >
            <span class="mr-2">{{ tab.icon }}</span>
            {{ tab.name }}
          </button>
        </div>
      </div>
      
      <!-- Tab Content -->
      <div class="tab-content p-6">
        <!-- Basic Info Tab -->
        <div v-if="activeTab === 'basic'" class="space-y-6">
          <PluginCard title="Character Information">
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <PluginInput
                label="Character Name"
                :modelValue="character.name"
                @update:modelValue="updateCharacter({ name: $event })"
                :readonly="readonly || !editMode"
              />
              <PluginInput
                label="Background"
                :modelValue="character.background.name"
                @update:modelValue="updateCharacter({ background: { ...character.background, name: $event } })"
                :readonly="readonly || !editMode"
              />
              <PluginInput
                label="Race"
                :modelValue="character.race.name"
                @update:modelValue="updateCharacter({ race: { ...character.race, name: $event } })"
                :readonly="readonly || !editMode"
              />
              <PluginInput
                label="Class"
                :modelValue="character.classes[0]?.name || ''"
                :readonly="readonly || !editMode"
              />
              <PluginInput
                label="Level"
                type="number"
                :modelValue="character.level"
                @update:modelValue="updateCharacter({ level: Number($event) })"
                :readonly="readonly || !editMode"
                :min="1"
                :max="20"
              />
              <PluginInput
                label="Experience Points"
                type="number"
                :modelValue="character.experience.current"
                @update:modelValue="updateCharacter({ experience: { ...character.experience, current: Number($event) } })"
                :readonly="readonly || !editMode"
              />
            </div>
          </PluginCard>
          
          <PluginCard title="Core Stats">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div class="stat-box text-center p-4 bg-gray-50 rounded-lg">
                <div class="text-sm text-gray-600">Armor Class</div>
                <div class="text-2xl font-bold text-gray-800">{{ character.armorClass.total }}</div>
              </div>
              <div class="stat-box text-center p-4 bg-gray-50 rounded-lg">
                <div class="text-sm text-gray-600">Hit Points</div>
                <div class="text-2xl font-bold text-gray-800">
                  {{ character.hitPoints.current }}/{{ character.hitPoints.maximum }}
                </div>
              </div>
              <div class="stat-box text-center p-4 bg-gray-50 rounded-lg">
                <div class="text-sm text-gray-600">Speed</div>
                <div class="text-2xl font-bold text-gray-800">{{ character.combat.speed.walking }}ft</div>
              </div>
            </div>
          </PluginCard>
        </div>
        
        <!-- Abilities Tab -->
        <div v-if="activeTab === 'abilities'" class="space-y-6">
          <PluginCard title="Ability Scores">
            <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div 
                v-for="(ability, abilityName) in character.abilities" 
                :key="abilityName"
                class="ability-score text-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                @click="rollAbilityCheck(abilityName)"
              >
                <div class="text-sm font-medium text-gray-600 uppercase">{{ abilityName }}</div>
                <div class="text-2xl font-bold text-gray-800 my-2">{{ ability.value }}</div>
                <div class="text-sm text-gray-600">
                  {{ abilityModifiers[abilityName] >= 0 ? '+' : '' }}{{ abilityModifiers[abilityName] }}
                </div>
              </div>
            </div>
          </PluginCard>
          
          <PluginCard title="Saving Throws">
            <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div 
                v-for="(savingThrow, abilityName) in character.savingThrows" 
                :key="abilityName"
                class="saving-throw flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                @click="rollSavingThrow(abilityName)"
              >
                <div class="flex items-center space-x-2">
                  <div class="w-3 h-3 rounded-full" :class="savingThrow.proficient ? 'bg-green-500' : 'bg-gray-300'"></div>
                  <span class="font-medium capitalize">{{ abilityName }}</span>
                </div>
                <div class="text-lg font-bold">
                  {{ savingThrowBonuses[abilityName] >= 0 ? '+' : '' }}{{ savingThrowBonuses[abilityName] }}
                </div>
              </div>
            </div>
          </PluginCard>
        </div>
        
        <!-- Skills Tab -->
        <div v-if="activeTab === 'skills'" class="space-y-6">
          <PluginCard title="Skills">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div 
                v-for="(skill, skillName) in character.skills.skills" 
                :key="skillName"
                class="skill flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                @click="rollSkillCheck(skillName)"
              >
                <div class="flex items-center space-x-2">
                  <div class="w-3 h-3 rounded-full" :class="{
                    'bg-yellow-500': skill.proficiency === 'expertise',
                    'bg-green-500': skill.proficiency === 'proficient',
                    'bg-blue-500': skill.proficiency === 'half',
                    'bg-gray-300': skill.proficiency === 'none'
                  }"></div>
                  <span class="font-medium capitalize">{{ skillName }}</span>
                  <span class="text-sm text-gray-500">({{ skill.ability }})</span>
                </div>
                <div class="text-lg font-bold">
                  {{ skillBonuses[skillName] >= 0 ? '+' : '' }}{{ skillBonuses[skillName] }}
                </div>
              </div>
            </div>
          </PluginCard>
          
          <PluginCard title="Other Proficiencies">
            <div class="text-center text-gray-500 py-8">
              Additional proficiencies and languages will be displayed here.
            </div>
          </PluginCard>
        </div>
        
        <!-- Combat Tab -->
        <div v-if="activeTab === 'combat'" class="space-y-6">
          <PluginCard title="Combat Stats">
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div class="stat-box text-center p-4 bg-gray-50 rounded-lg">
                <div class="text-sm text-gray-600">Initiative</div>
                <div class="text-2xl font-bold text-gray-800 cursor-pointer hover:text-red-600" @click="rollInitiative()">
                  {{ abilityModifiers.dexterity >= 0 ? '+' : '' }}{{ abilityModifiers.dexterity }}
                </div>
              </div>
              <div class="stat-box text-center p-4 bg-gray-50 rounded-lg">
                <div class="text-sm text-gray-600">Prof. Bonus</div>
                <div class="text-2xl font-bold text-gray-800">+{{ proficiencyBonus }}</div>
              </div>
              <div class="stat-box text-center p-4 bg-gray-50 rounded-lg">
                <div class="text-sm text-gray-600">Passive Perception</div>
                <div class="text-2xl font-bold text-gray-800">{{ passivePerception }}</div>
              </div>
              <div class="stat-box text-center p-4 bg-gray-50 rounded-lg">
                <div class="text-sm text-gray-600">Inspiration</div>
                <div class="text-2xl font-bold cursor-pointer" 
                     :class="character.inspiration ? 'text-yellow-500' : 'text-gray-400'"
                     @click="updateCharacter({ inspiration: !character.inspiration })">
                  {{ character.inspiration ? '★' : '☆' }}
                </div>
              </div>
            </div>
          </PluginCard>
          
          <PluginCard title="Attacks & Spellcasting">
            <div class="text-center text-gray-500 py-8">
              Attack and spell attack options will be displayed here.
            </div>
          </PluginCard>
        </div>
        
        <!-- Other tabs with placeholder content -->
        <div v-if="activeTab === 'spells'" class="space-y-6">
          <PluginCard title="Spells">
            <div class="text-center text-gray-500 py-8">
              Spell list and spellcasting features will be displayed here.
            </div>
          </PluginCard>
        </div>
        
        <div v-if="activeTab === 'equipment'" class="space-y-6">
          <PluginCard title="Equipment">
            <div class="text-center text-gray-500 py-8">
              Character equipment and inventory will be displayed here.
            </div>
          </PluginCard>
        </div>
        
        <div v-if="activeTab === 'features'" class="space-y-6">
          <PluginCard title="Features & Traits">
            <div class="text-center text-gray-500 py-8">
              Character features and traits will be displayed here.
            </div>
          </PluginCard>
        </div>
        
        <div v-if="activeTab === 'notes'" class="space-y-6">
          <PluginCard title="Notes">
            <div class="text-center text-gray-500 py-8">
              Character notes and backstory will be displayed here.
            </div>
          </PluginCard>
        </div>
      </div>
    </div>
  `
});