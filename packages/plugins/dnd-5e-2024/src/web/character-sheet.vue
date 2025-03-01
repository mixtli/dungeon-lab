<script setup lang="ts">
import { computed, ref } from 'vue';
import { ElInput, ElSelect, ElOption, ElButton, ElInputNumber, ElCheckbox, ElRow, ElCol, ElCard, ElMessage } from 'element-plus';
import { rollInitiative as rollInitiativeApi } from './initiative-api';

const props = defineProps<{
  character: Record<string, any>;
  editable?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:character', value: Record<string, any>): void;
  (e: 'rollInitiative', result: { total: number; rolls: number[] }): void;
}>();

// Initiative roll result
const initiativeRollResult = ref<{ total: number; rolls: number[] } | null>(null);
const isRollingInitiative = ref(false);

// Deep clone the character data to avoid direct mutation
const characterData = ref<Record<string, any>>(JSON.parse(JSON.stringify(props.character || {})));

// Default character data if none provided
if (!props.character) {
  characterData.value = {
    name: '',
    type: 'character',
    abilities: {
      strength: 10,
      dexterity: 10,
      constitution: 10,
      intelligence: 10,
      wisdom: 10,
      charisma: 10
    },
    class: '',
    race: '',
    background: '',
    hitPoints: 10,
    level: 1,
    proficiencyBonus: 2,
    savingThrows: {
      strength: false,
      dexterity: false,
      constitution: false,
      intelligence: false,
      wisdom: false,
      charisma: false
    },
    skills: {
      acrobatics: false,
      animalHandling: false,
      arcana: false,
      athletics: false,
      deception: false,
      history: false,
      insight: false,
      intimidation: false,
      investigation: false,
      medicine: false,
      nature: false,
      perception: false,
      performance: false,
      persuasion: false,
      religion: false,
      sleightOfHand: false,
      stealth: false,
      survival: false
    },
    initiative: 0,
    armorClass: 10,
    speed: 30,
    inventory: []
  };
}

// Watch for changes and emit updates
function updateCharacter() {
  emit('update:character', JSON.parse(JSON.stringify(characterData.value)));
}

// Calculate ability modifiers
function getAbilityModifier(abilityScore: number): number {
  return Math.floor((abilityScore - 10) / 2);
}

// Calculate saving throws
function getSavingThrow(ability: string): number {
  const abilityScore = characterData.value.abilities[ability];
  const isProficient = characterData.value.savingThrows[ability];
  const abilityMod = getAbilityModifier(abilityScore);
  
  return isProficient 
    ? abilityMod + characterData.value.proficiencyBonus
    : abilityMod;
}

// Calculate skill modifiers
const skillAbilities = {
  acrobatics: 'dexterity',
  animalHandling: 'wisdom',
  arcana: 'intelligence',
  athletics: 'strength',
  deception: 'charisma',
  history: 'intelligence',
  insight: 'wisdom',
  intimidation: 'charisma',
  investigation: 'intelligence',
  medicine: 'wisdom',
  nature: 'intelligence',
  perception: 'wisdom',
  performance: 'charisma',
  persuasion: 'charisma',
  religion: 'intelligence',
  sleightOfHand: 'dexterity',
  stealth: 'dexterity',
  survival: 'wisdom'
};

function getSkillModifier(skill: string): number {
  const ability = skillAbilities[skill as keyof typeof skillAbilities];
  const abilityScore = characterData.value.abilities[ability];
  const isProficient = characterData.value.skills[skill];
  const abilityMod = getAbilityModifier(abilityScore);
  
  return isProficient 
    ? abilityMod + characterData.value.proficiencyBonus
    : abilityMod;
}

// Calculate initiative modifier
const initiativeModifier = computed(() => {
  return getAbilityModifier(characterData.value.abilities.dexterity);
});

// Handle initiative roll
async function rollInitiative() {
  try {
    isRollingInitiative.value = true;
    const dexterityModifier = initiativeModifier.value;
    
    const result = await rollInitiativeApi(dexterityModifier);
    
    initiativeRollResult.value = {
      total: result.total,
      rolls: result.rolls
    };
    
    // Emit the result
    emit('rollInitiative', initiativeRollResult.value);
    
    // Show success message
    ElMessage.success(`Initiative roll: ${result.total}`);
  } catch (error) {
    console.error('Failed to roll initiative:', error);
    ElMessage.error('Failed to roll initiative. Please try again.');
  } finally {
    isRollingInitiative.value = false;
  }
}

// Classes for D&D 5e 2024
const classOptions = [
  'Warrior', 'Mage', 'Priest', 'Rogue', 'Druid', 'Monk', 'Paladin', 'Ranger'
];

// Races for D&D 5e 2024
const raceOptions = [
  'Human', 'Elf', 'Dwarf', 'Halfling', 'Gnome', 'Orc', 'Tiefling', 'Dragonborn'
];

// Backgrounds for D&D 5e 2024
const backgroundOptions = [
  'Acolyte', 'Artisan', 'Criminal', 'Entertainer', 'Farmer', 'Guard', 'Merchant', 'Noble', 'Sailor', 'Soldier', 'Scholar'
];
</script>

<template>
  <div class="dnd5e-character-sheet">
    <ElCard class="character-header">
      <ElRow :gutter="20">
        <ElCol :span="8">
          <div class="form-group">
            <label>Character Name</label>
            <ElInput v-model="characterData.name" :disabled="!editable" @change="updateCharacter" />
          </div>
        </ElCol>
        <ElCol :span="6">
          <div class="form-group">
            <label>Class</label>
            <ElSelect v-model="characterData.class" :disabled="!editable" @change="updateCharacter" class="w-full">
              <ElOption v-for="option in classOptions" :key="option" :value="option" :label="option" />
            </ElSelect>
          </div>
        </ElCol>
        <ElCol :span="6">
          <div class="form-group">
            <label>Race</label>
            <ElSelect v-model="characterData.race" :disabled="!editable" @change="updateCharacter" class="w-full">
              <ElOption v-for="option in raceOptions" :key="option" :value="option" :label="option" />
            </ElSelect>
          </div>
        </ElCol>
        <ElCol :span="4">
          <div class="form-group">
            <label>Level</label>
            <ElInputNumber v-model="characterData.level" :min="1" :max="20" :disabled="!editable" @change="updateCharacter" />
          </div>
        </ElCol>
      </ElRow>
    </ElCard>

    <ElRow :gutter="20" class="mt-4">
      <!-- Ability Scores -->
      <ElCol :span="6">
        <ElCard>
          <template #header>
            <div class="card-header">
              <span>Ability Scores</span>
            </div>
          </template>
          
          <div v-for="ability in ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma']" 
               :key="ability" 
               class="ability-score">
            <div class="ability-label">{{ ability.charAt(0).toUpperCase() + ability.slice(1) }}</div>
            <ElInputNumber 
              v-model="characterData.abilities[ability]" 
              :min="1" 
              :max="30" 
              :disabled="!editable" 
              @change="updateCharacter" 
            />
            <div class="ability-modifier">{{ getAbilityModifier(characterData.abilities[ability]) >= 0 ? '+' : '' }}{{ getAbilityModifier(characterData.abilities[ability]) }}</div>
          </div>
        </ElCard>
      </ElCol>

      <!-- Core Stats -->
      <ElCol :span="8">
        <ElCard>
          <template #header>
            <div class="card-header">
              <span>Character Stats</span>
            </div>
          </template>
          
          <ElRow :gutter="10">
            <ElCol :span="8">
              <div class="stat-box">
                <div class="stat-label">Armor Class</div>
                <ElInputNumber v-model="characterData.armorClass" :disabled="!editable" @change="updateCharacter" />
              </div>
            </ElCol>
            <ElCol :span="8">
              <div class="stat-box">
                <div class="stat-label">Initiative</div>
                <div class="initiative-box">
                  <div class="initiative-mod">{{ initiativeModifier >= 0 ? '+' : '' }}{{ initiativeModifier }}</div>
                  <ElButton 
                    type="primary" 
                    size="small" 
                    @click="rollInitiative"
                    :loading="isRollingInitiative"
                  >
                    Roll
                  </ElButton>
                </div>
                <div v-if="initiativeRollResult" class="initiative-result">
                  <div class="roll-result">Result: {{ initiativeRollResult.total }}</div>
                  <div class="roll-detail">
                    <span v-for="(roll, index) in initiativeRollResult.rolls" :key="index" class="die-roll">
                      [{{ roll }}]
                    </span>
                    {{ initiativeModifier >= 0 ? '+' : '' }}{{ initiativeModifier }}
                  </div>
                </div>
              </div>
            </ElCol>
            <ElCol :span="8">
              <div class="stat-box">
                <div class="stat-label">Speed</div>
                <ElInputNumber v-model="characterData.speed" :disabled="!editable" @change="updateCharacter" />
              </div>
            </ElCol>
          </ElRow>
          
          <div class="mt-4">
            <div class="stat-label">Hit Points</div>
            <ElInputNumber v-model="characterData.hitPoints" :min="0" :disabled="!editable" @change="updateCharacter" class="w-full" />
          </div>
          
          <div class="mt-4">
            <div class="stat-label">Background</div>
            <ElSelect v-model="characterData.background" :disabled="!editable" @change="updateCharacter" class="w-full">
              <ElOption v-for="option in backgroundOptions" :key="option" :value="option" :label="option" />
            </ElSelect>
          </div>
          
          <div class="mt-4">
            <div class="stat-label">Proficiency Bonus</div>
            <div class="proficiency-bonus">+{{ characterData.proficiencyBonus }}</div>
          </div>
        </ElCard>
      </ElCol>

      <!-- Saving Throws & Skills -->
      <ElCol :span="10">
        <ElCard>
          <template #header>
            <div class="card-header">
              <span>Saving Throws & Skills</span>
            </div>
          </template>
          
          <ElRow :gutter="20">
            <ElCol :span="12">
              <h4>Saving Throws</h4>
              <div v-for="ability in ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma']" 
                   :key="`save-${ability}`" 
                   class="saving-throw">
                <ElCheckbox 
                  v-model="characterData.savingThrows[ability]" 
                  :disabled="!editable" 
                  @change="updateCharacter"
                />
                <span class="saving-throw-mod">{{ getSavingThrow(ability) >= 0 ? '+' : '' }}{{ getSavingThrow(ability) }}</span>
                <span class="saving-throw-name">{{ ability.charAt(0).toUpperCase() + ability.slice(1) }}</span>
              </div>
            </ElCol>
            
            <ElCol :span="12">
              <h4>Skills</h4>
              <div v-for="skill in Object.keys(characterData.skills)" 
                   :key="`skill-${skill}`" 
                   class="skill">
                <ElCheckbox 
                  v-model="characterData.skills[skill]" 
                  :disabled="!editable" 
                  @change="updateCharacter"
                />
                <span class="skill-mod">{{ getSkillModifier(skill) >= 0 ? '+' : '' }}{{ getSkillModifier(skill) }}</span>
                <span class="skill-name">
                  {{ skill.replace(/([A-Z])/g, ' $1').trim() }}
                  <span class="skill-ability">({{ skillAbilities[skill as keyof typeof skillAbilities].substring(0, 3) }})</span>
                </span>
              </div>
            </ElCol>
          </ElRow>
        </ElCard>
      </ElCol>
    </ElRow>
  </div>
</template>

<style scoped>
.dnd5e-character-sheet {
  font-family: 'Roboto', sans-serif;
  color: #333;
}

.character-header {
  background-color: #f5f5f5;
  margin-bottom: 1rem;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: bold;
}

.ability-score {
  display: flex;
  align-items: center;
  margin-bottom: 0.5rem;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.ability-label {
  width: 100px;
  font-weight: bold;
}

.ability-modifier {
  margin-left: 1rem;
  font-weight: bold;
  width: 30px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stat-box {
  text-align: center;
  margin-bottom: 1rem;
}

.stat-label {
  font-weight: bold;
  margin-bottom: 0.5rem;
}

.initiative-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.initiative-mod {
  font-weight: bold;
  font-size: 1.2rem;
}

.initiative-result {
  margin-top: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 0.5rem;
  background-color: #f9f9f9;
  text-align: center;
}

.roll-result {
  font-weight: bold;
}

.roll-detail {
  font-size: 0.9rem;
  color: #666;
  margin-top: 0.25rem;
}

.die-roll {
  color: #d20;
  font-weight: bold;
  margin: 0 0.1rem;
}

.proficiency-bonus {
  font-size: 1.5rem;
  font-weight: bold;
  text-align: center;
}

.saving-throw, .skill {
  display: flex;
  align-items: center;
  margin-bottom: 0.25rem;
}

.saving-throw-mod, .skill-mod {
  width: 30px;
  font-weight: bold;
  margin: 0 0.5rem;
}

.saving-throw-name, .skill-name {
  flex-grow: 1;
}

.skill-ability {
  color: #666;
  font-size: 0.8rem;
  margin-left: 0.5rem;
}

.w-full {
  width: 100%;
}

.mt-4 {
  margin-top: 1rem;
}
</style> 