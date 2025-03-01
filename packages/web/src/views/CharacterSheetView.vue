<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const characterId = route.params.id as string;
const isLoading = ref(true);
const character = ref(null);

// Placeholder for character data loading
onMounted(async () => {
  try {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Mock data for a D&D 5e character
    character.value = {
      id: characterId,
      name: 'Tordek Fireforge',
      race: 'Dwarf',
      class: 'Fighter',
      level: 5,
      background: 'Soldier',
      alignment: 'Lawful Good',
      experience: 6500,
      attributes: {
        strength: { score: 16, modifier: 3 },
        dexterity: { score: 12, modifier: 1 },
        constitution: { score: 16, modifier: 3 },
        intelligence: { score: 10, modifier: 0 },
        wisdom: { score: 13, modifier: 1 },
        charisma: { score: 8, modifier: -1 },
      },
      savingThrows: {
        strength: { proficient: true, value: 6 },
        dexterity: { proficient: false, value: 1 },
        constitution: { proficient: true, value: 6 },
        intelligence: { proficient: false, value: 0 },
        wisdom: { proficient: false, value: 1 },
        charisma: { proficient: false, value: -1 },
      },
      skills: [
        { name: 'Athletics', ability: 'strength', proficient: true, value: 6 },
        { name: 'Intimidation', ability: 'charisma', proficient: true, value: 2 },
        { name: 'Perception', ability: 'wisdom', proficient: true, value: 4 },
        { name: 'Survival', ability: 'wisdom', proficient: true, value: 4 },
      ],
      hitPoints: {
        maximum: 45,
        current: 38,
        temporary: 0,
      },
      armorClass: 18,
      initiative: 1,
      speed: 25,
      proficiencyBonus: 3,
      equipment: [
        { name: 'Plate Armor', type: 'armor', description: 'Heavy armor' },
        { name: 'Battleaxe', type: 'weapon', damage: '1d8 slashing', properties: ['Versatile (1d10)'] },
        { name: 'Shield', type: 'armor', description: '+2 AC' },
        { name: 'Handaxe', type: 'weapon', damage: '1d6 slashing', properties: ['Light', 'Thrown (20/60)'] },
        { name: 'Explorer\'s Pack', type: 'gear', description: 'Includes backpack, bedroll, mess kit, tinderbox, 10 torches, 10 days of rations, waterskin, 50 feet of hempen rope' },
      ],
      features: [
        { name: 'Second Wind', description: 'Once per short rest, regain 1d10 + fighter level hit points as a bonus action' },
        { name: 'Action Surge', description: 'Once per short rest, take an additional action on your turn' },
        { name: 'Improved Critical', description: 'Weapon attacks score a critical hit on a roll of 19 or 20' },
        { name: 'Darkvision', description: 'Can see in dim light within 60 feet as if it were bright light, and in darkness as if it were dim light' },
        { name: 'Dwarven Resilience', description: 'Advantage on saving throws against poison, and resistance against poison damage' },
      ],
    };
  } catch (error) {
    console.error('Error loading character data:', error);
  } finally {
    isLoading.value = false;
  }
});
</script>

<template>
  <div class="character-sheet-view">
    <div v-if="isLoading" class="loading-container" v-loading="isLoading">
      <p>Loading character sheet...</p>
    </div>
    
    <div v-else class="character-sheet">
      <el-row :gutter="20">
        <!-- Character Header -->
        <el-col :span="24">
          <el-card class="mb-4">
            <div class="flex flex-col md:flex-row justify-between items-center">
              <div class="character-identity">
                <h1 class="text-3xl font-bold">{{ character?.name }}</h1>
                <div class="character-subtitle">
                  Level {{ character?.level }} {{ character?.race }} {{ character?.class }} | {{ character?.background }} | {{ character?.alignment }}
                </div>
              </div>
              
              <div class="character-vitals flex gap-4 mt-4 md:mt-0">
                <div class="vital-stat">
                  <div class="stat-label">HP</div>
                  <div class="stat-value">{{ character?.hitPoints.current }}/{{ character?.hitPoints.maximum }}</div>
                </div>
                
                <div class="vital-stat">
                  <div class="stat-label">AC</div>
                  <div class="stat-value">{{ character?.armorClass }}</div>
                </div>
                
                <div class="vital-stat">
                  <div class="stat-label">Initiative</div>
                  <div class="stat-value">+{{ character?.initiative }}</div>
                </div>
                
                <div class="vital-stat">
                  <div class="stat-label">Speed</div>
                  <div class="stat-value">{{ character?.speed }}ft</div>
                </div>
              </div>
            </div>
          </el-card>
        </el-col>
        
        <!-- Attributes and Skills -->
        <el-col :span="8">
          <el-card class="mb-4">
            <template #header>
              <div class="card-header">
                <h2 class="text-xl font-bold">Attributes</h2>
              </div>
            </template>
            
            <div class="attributes-grid">
              <div v-for="(attr, key) in character?.attributes" :key="key" class="attribute-box">
                <div class="attribute-name">{{ key.charAt(0).toUpperCase() + key.slice(1) }}</div>
                <div class="attribute-score">{{ attr.score }}</div>
                <div class="attribute-modifier">{{ attr.modifier >= 0 ? '+' + attr.modifier : attr.modifier }}</div>
              </div>
            </div>
          </el-card>
          
          <el-card class="mb-4">
            <template #header>
              <div class="card-header">
                <h2 class="text-xl font-bold">Saving Throws</h2>
              </div>
            </template>
            
            <ul class="saving-throws-list">
              <li v-for="(save, key) in character?.savingThrows" :key="key" class="saving-throw-item">
                <el-checkbox :model-value="save.proficient" disabled></el-checkbox>
                <span class="save-name">{{ key.charAt(0).toUpperCase() + key.slice(1) }}</span>
                <span class="save-value">{{ save.value >= 0 ? '+' + save.value : save.value }}</span>
              </li>
            </ul>
          </el-card>
          
          <el-card>
            <template #header>
              <div class="card-header">
                <h2 class="text-xl font-bold">Skills</h2>
              </div>
            </template>
            
            <ul class="skills-list">
              <li v-for="skill in character?.skills" :key="skill.name" class="skill-item">
                <el-checkbox :model-value="skill.proficient" disabled></el-checkbox>
                <span class="skill-name">{{ skill.name }} ({{ skill.ability.charAt(0).toUpperCase() }})</span>
                <span class="skill-value">{{ skill.value >= 0 ? '+' + skill.value : skill.value }}</span>
              </li>
            </ul>
          </el-card>
        </el-col>
        
        <!-- Equipment -->
        <el-col :span="8">
          <el-card class="mb-4">
            <template #header>
              <div class="card-header">
                <h2 class="text-xl font-bold">Equipment</h2>
              </div>
            </template>
            
            <el-tabs>
              <el-tab-pane label="Weapons">
                <ul class="equipment-list">
                  <li v-for="item in character?.equipment.filter(i => i.type === 'weapon')" :key="item.name" class="equipment-item">
                    <div class="item-name font-semibold">{{ item.name }}</div>
                    <div class="item-details">
                      <span>Damage: {{ item.damage }}</span>
                      <span v-if="item.properties && item.properties.length">
                        Properties: {{ item.properties.join(', ') }}
                      </span>
                    </div>
                  </li>
                </ul>
              </el-tab-pane>
              
              <el-tab-pane label="Armor">
                <ul class="equipment-list">
                  <li v-for="item in character?.equipment.filter(i => i.type === 'armor')" :key="item.name" class="equipment-item">
                    <div class="item-name font-semibold">{{ item.name }}</div>
                    <div class="item-details">{{ item.description }}</div>
                  </li>
                </ul>
              </el-tab-pane>
              
              <el-tab-pane label="Gear">
                <ul class="equipment-list">
                  <li v-for="item in character?.equipment.filter(i => i.type === 'gear')" :key="item.name" class="equipment-item">
                    <div class="item-name font-semibold">{{ item.name }}</div>
                    <div class="item-details">{{ item.description }}</div>
                  </li>
                </ul>
              </el-tab-pane>
            </el-tabs>
          </el-card>
        </el-col>
        
        <!-- Features -->
        <el-col :span="8">
          <el-card>
            <template #header>
              <div class="card-header">
                <h2 class="text-xl font-bold">Features & Traits</h2>
              </div>
            </template>
            
            <ul class="features-list">
              <li v-for="feature in character?.features" :key="feature.name" class="feature-item">
                <div class="feature-name font-semibold">{{ feature.name }}</div>
                <div class="feature-description">{{ feature.description }}</div>
              </li>
            </ul>
          </el-card>
        </el-col>
      </el-row>
    </div>
  </div>
</template>

<style scoped>
.character-sheet-view {
  padding: 1rem;
}

.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 400px;
}

.character-subtitle {
  color: var(--el-text-color-secondary);
  font-size: 1.1rem;
}

.vital-stat {
  text-align: center;
  padding: 0.5rem 1rem;
  border: 1px solid var(--el-border-color);
  border-radius: 0.25rem;
  min-width: 80px;
}

.stat-label {
  font-size: 0.9rem;
  color: var(--el-text-color-secondary);
  margin-bottom: 0.25rem;
}

.stat-value {
  font-size: 1.25rem;
  font-weight: bold;
}

.attributes-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

.attribute-box {
  border: 1px solid var(--el-border-color);
  border-radius: 0.25rem;
  padding: 0.5rem;
  text-align: center;
}

.attribute-name {
  font-size: 0.9rem;
  color: var(--el-text-color-secondary);
}

.attribute-score {
  font-size: 1.5rem;
  font-weight: bold;
}

.attribute-modifier {
  font-size: 1.1rem;
}

.saving-throws-list,
.skills-list,
.equipment-list,
.features-list {
  list-style: none;
  padding: 0;
}

.saving-throw-item,
.skill-item {
  display: flex;
  align-items: center;
  margin-bottom: 0.5rem;
}

.save-name,
.skill-name {
  flex: 1;
  margin-left: 0.5rem;
}

.save-value,
.skill-value {
  font-weight: bold;
}

.equipment-item,
.feature-item {
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--el-border-color-light);
}

.equipment-item:last-child,
.feature-item:last-child {
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: none;
}

.item-details,
.feature-description {
  color: var(--el-text-color-secondary);
  font-size: 0.9rem;
  margin-top: 0.25rem;
}
</style> 