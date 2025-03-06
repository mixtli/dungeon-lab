<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';

// Define the Character interface to match our data structure
interface Character {
  id: string;
  name: string;
  race: string;
  class: string;
  level: number;
  background: string;
  alignment: string;
  experience: number;
  attributes: {
    strength: { score: number; modifier: number; };
    dexterity: { score: number; modifier: number; };
    constitution: { score: number; modifier: number; };
    intelligence: { score: number; modifier: number; };
    wisdom: { score: number; modifier: number; };
    charisma: { score: number; modifier: number; };
  };
  hitPoints: {
    current: number;
    maximum: number;
    temporary?: number;
  };
  armorClass: number;
  initiative: number;
  speed: number;
  proficiencyBonus?: number;
  savingThrows: {
    strength: { proficient: boolean; value: number; };
    dexterity: { proficient: boolean; value: number; };
    constitution: { proficient: boolean; value: number; };
    intelligence: { proficient: boolean; value: number; };
    wisdom: { proficient: boolean; value: number; };
    charisma: { proficient: boolean; value: number; };
  };
  skills: Array<{
    name: string;
    ability: string;
    proficient: boolean;
    value: number;
  }>;
  equipment: Array<{
    name: string;
    type: string;
    description?: string;
    damage?: string;
    properties?: string[];
  }>;
  features: Array<{
    name: string;
    description: string;
  }>;
}

const route = useRoute();
const characterId = route.params.id as string;
const isLoading = ref(true);
const character = ref<Character | null>(null);
const activeTab = ref('weapons'); // For equipment tabs

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
    console.error('Error loading character:', error);
  } finally {
    isLoading.value = false;
  }
});
</script>

<template>
  <div class="p-6">
    <!-- Loading State -->
    <div v-if="isLoading" class="flex justify-center items-center min-h-[400px]">
      <div class="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
    </div>
    
    <div v-else class="max-w-7xl mx-auto">
      <div class="grid gap-6">
        <!-- Character Header -->
        <div class="col-span-full">
          <div class="bg-white rounded-lg shadow p-6">
            <div class="flex flex-col md:flex-row justify-between items-center">
              <div>
                <h1 class="text-3xl font-bold text-gray-900">{{ character?.name }}</h1>
                <div class="text-gray-600 mt-1">
                  Level {{ character?.level }} {{ character?.race }} {{ character?.class }} | {{ character?.background }} | {{ character?.alignment }}
                </div>
              </div>
              
              <div class="flex gap-6 mt-4 md:mt-0">
                <div class="text-center">
                  <div class="text-sm font-medium text-gray-500">HP</div>
                  <div class="text-lg font-semibold text-gray-900">{{ character?.hitPoints.current }}/{{ character?.hitPoints.maximum }}</div>
                </div>
                
                <div class="text-center">
                  <div class="text-sm font-medium text-gray-500">AC</div>
                  <div class="text-lg font-semibold text-gray-900">{{ character?.armorClass }}</div>
                </div>
                
                <div class="text-center">
                  <div class="text-sm font-medium text-gray-500">Initiative</div>
                  <div class="text-lg font-semibold text-gray-900">+{{ character?.initiative }}</div>
                </div>
                
                <div class="text-center">
                  <div class="text-sm font-medium text-gray-500">Speed</div>
                  <div class="text-lg font-semibold text-gray-900">{{ character?.speed }}ft</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Attributes and Skills -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div class="space-y-6">
            <!-- Attributes -->
            <div class="bg-white rounded-lg shadow">
              <div class="border-b border-gray-200 px-6 py-4">
                <h2 class="text-xl font-bold text-gray-900">Attributes</h2>
              </div>
              
              <div class="p-6 grid grid-cols-2 gap-4">
                <div v-for="(attr, key) in character?.attributes" :key="key" 
                  class="bg-gray-50 rounded-lg p-4 text-center"
                >
                  <div class="text-sm font-medium text-gray-500">{{ key.charAt(0).toUpperCase() + key.slice(1) }}</div>
                  <div class="text-2xl font-bold text-gray-900">{{ attr.score }}</div>
                  <div class="text-sm font-medium text-gray-700">{{ attr.modifier >= 0 ? '+' + attr.modifier : attr.modifier }}</div>
                </div>
              </div>
            </div>

            <!-- Saving Throws -->
            <div class="bg-white rounded-lg shadow">
              <div class="border-b border-gray-200 px-6 py-4">
                <h2 class="text-xl font-bold text-gray-900">Saving Throws</h2>
              </div>
              
              <ul class="divide-y divide-gray-200">
                <li v-for="(save, key) in character?.savingThrows" :key="key" 
                  class="px-6 py-3 flex items-center"
                >
                  <div class="w-5 h-5 mr-3 flex items-center justify-center">
                    <div class="w-4 h-4 border-2 rounded"
                      :class="save.proficient ? 'bg-blue-500 border-blue-500' : 'border-gray-300'"
                    >
                      <svg v-if="save.proficient" class="w-3 h-3 text-white" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                      </svg>
                    </div>
                  </div>
                  <span class="flex-1 text-gray-900">{{ key.charAt(0).toUpperCase() + key.slice(1) }}</span>
                  <span class="font-medium text-gray-900">{{ save.value >= 0 ? '+' + save.value : save.value }}</span>
                </li>
              </ul>
            </div>

            <!-- Skills -->
            <div class="bg-white rounded-lg shadow">
              <div class="border-b border-gray-200 px-6 py-4">
                <h2 class="text-xl font-bold text-gray-900">Skills</h2>
              </div>
              
              <ul class="divide-y divide-gray-200">
                <li v-for="skill in character?.skills" :key="skill.name" 
                  class="px-6 py-3 flex items-center"
                >
                  <div class="w-5 h-5 mr-3 flex items-center justify-center">
                    <div class="w-4 h-4 border-2 rounded"
                      :class="skill.proficient ? 'bg-blue-500 border-blue-500' : 'border-gray-300'"
                    >
                      <svg v-if="skill.proficient" class="w-3 h-3 text-white" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                      </svg>
                    </div>
                  </div>
                  <span class="flex-1 text-gray-900">{{ skill.name }} ({{ skill.ability.charAt(0).toUpperCase() }})</span>
                  <span class="font-medium text-gray-900">{{ skill.value >= 0 ? '+' + skill.value : skill.value }}</span>
                </li>
              </ul>
            </div>
          </div>
          
          <!-- Equipment -->
          <div class="md:col-span-2">
            <div class="bg-white rounded-lg shadow">
              <div class="border-b border-gray-200 px-6 py-4">
                <h2 class="text-xl font-bold text-gray-900">Equipment</h2>
              </div>
              
              <!-- Tabs -->
              <div class="border-b border-gray-200">
                <nav class="flex -mb-px">
                  <button 
                    @click="activeTab = 'weapons'"
                    class="px-6 py-3 font-medium text-sm border-b-2 whitespace-nowrap"
                    :class="activeTab === 'weapons' ? 
                      'border-blue-500 text-blue-600' : 
                      'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'"
                  >
                    Weapons
                  </button>
                  <button 
                    @click="activeTab = 'armor'"
                    class="px-6 py-3 font-medium text-sm border-b-2 whitespace-nowrap"
                    :class="activeTab === 'armor' ? 
                      'border-blue-500 text-blue-600' : 
                      'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'"
                  >
                    Armor
                  </button>
                  <button 
                    @click="activeTab = 'gear'"
                    class="px-6 py-3 font-medium text-sm border-b-2 whitespace-nowrap"
                    :class="activeTab === 'gear' ? 
                      'border-blue-500 text-blue-600' : 
                      'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'"
                  >
                    Gear
                  </button>
                </nav>
              </div>

              <!-- Tab Content -->
              <div class="p-6">
                <!-- Weapons -->
                <div v-if="activeTab === 'weapons'" class="space-y-4">
                  <div v-for="item in character?.equipment.filter(i => i.type === 'weapon')" 
                    :key="item.name"
                    class="bg-gray-50 rounded-lg p-4"
                  >
                    <div class="font-semibold text-gray-900">{{ item.name }}</div>
                    <div class="mt-2 text-sm text-gray-600">
                      <div>Damage: {{ item.damage }}</div>
                      <div v-if="item.properties && item.properties.length">
                        Properties: {{ item.properties.join(', ') }}
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Armor -->
                <div v-if="activeTab === 'armor'" class="space-y-4">
                  <div v-for="item in character?.equipment.filter(i => i.type === 'armor')" 
                    :key="item.name"
                    class="bg-gray-50 rounded-lg p-4"
                  >
                    <div class="font-semibold text-gray-900">{{ item.name }}</div>
                    <div class="mt-2 text-sm text-gray-600">{{ item.description }}</div>
                  </div>
                </div>

                <!-- Gear -->
                <div v-if="activeTab === 'gear'" class="space-y-4">
                  <div v-for="item in character?.equipment.filter(i => i.type === 'gear')" 
                    :key="item.name"
                    class="bg-gray-50 rounded-lg p-4"
                  >
                    <div class="font-semibold text-gray-900">{{ item.name }}</div>
                    <div class="mt-2 text-sm text-gray-600">{{ item.description }}</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Features -->
            <div class="bg-white rounded-lg shadow mt-6">
              <div class="border-b border-gray-200 px-6 py-4">
                <h2 class="text-xl font-bold text-gray-900">Features & Traits</h2>
              </div>
              
              <div class="divide-y divide-gray-200">
                <div v-for="feature in character?.features" :key="feature.name" class="p-6">
                  <h3 class="font-semibold text-gray-900">{{ feature.name }}</h3>
                  <p class="mt-2 text-gray-600">{{ feature.description }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
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
  color: rgb(107 114 128); /* text-gray-500 */
}

.vital-stat {
  text-align: center;
  padding: 0.5rem 1rem;
  border: 1px solid rgb(229 231 235); /* border-gray-200 */
  border-radius: 0.25rem;
  min-width: 80px;
}

.stat-label {
  font-size: 0.9rem;
  color: rgb(107 114 128); /* text-gray-500 */
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
  border: 1px solid rgb(229 231 235); /* border-gray-200 */
  border-radius: 0.25rem;
  padding: 0.5rem;
  text-align: center;
}

.attribute-name {
  font-size: 0.9rem;
  color: rgb(107 114 128); /* text-gray-500 */
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
  border-bottom: 1px solid rgb(243 244 246); /* border-gray-100 */
}

.equipment-item:last-child,
.feature-item:last-child {
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: none;
}

.item-details,
.feature-description {
  color: rgb(107 114 128); /* text-gray-500 */
  font-size: 0.9rem;
  margin-top: 0.25rem;
}
</style> 