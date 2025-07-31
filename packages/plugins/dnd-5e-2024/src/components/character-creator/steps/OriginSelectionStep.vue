<template>
  <div class="origin-selection-step">
    <div class="step-header mb-6">
      <h2 class="text-2xl font-bold text-gray-900">Choose Your Origin</h2>
      <p class="text-gray-600 mt-2">
        Select your character's species and background, which provide racial traits and life experiences.
      </p>
    </div>

    <div class="origin-selection-content">
      <!-- Loading state -->
      <div v-if="loading" class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div class="flex items-center">
          <Icon name="loading" class="w-5 h-5 text-blue-600 mr-2 animate-spin" />
          <span class="text-blue-800 text-sm">Loading species and backgrounds...</span>
        </div>
      </div>

      <!-- Error state -->
      <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <div class="flex items-center">
          <Icon name="error" class="w-5 h-5 text-red-600 mr-2" />
          <span class="text-red-800 text-sm">{{ error }}</span>
        </div>
      </div>

      <!-- Origin selection form -->
      <div v-else class="space-y-6">
        <!-- Species Selection -->
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Species
            </label>
            <MobileSelect
              :model-value="localData.species?.id || null"
              :options="speciesSelectOptions"
              placeholder="Select a species..."
              :disabled="loading"
              value-key="id"
              label-key="name"
              @update:model-value="handleSpeciesSelection"
            />
          </div>

          <!-- Lineage/Subrace Selection -->
          <div v-if="selectedSpecies && availableLineages.length > 0" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                {{ selectedSpecies.name }} Lineage
              </label>
              <MobileSelect
                :model-value="localData.species?.subspecies || null"
                :options="lineageSelectOptions"
                placeholder="Select a lineage..."
                :disabled="loading"
                value-key="name"
                label-key="name"
                @update:model-value="handleLineageSelection"
              />
            </div>
          </div>

          <!-- Species details section -->
          <div v-if="selectedSpecies" class="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4">
            <h3 class="text-lg font-semibold text-gray-900">
              {{ selectedSpecies.name }}
              <span v-if="localData.species?.subspecies" class="text-blue-600">
                ({{ localData.species.subspecies }})
              </span>
            </h3>
            
            <!-- Species description -->
            <p class="text-gray-900 text-sm">{{ selectedSpecies.pluginData.description }}</p>
            
            <!-- Basic species info -->
            <div class="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span class="font-medium text-gray-700">Size:</span>
                <span class="ml-2 text-gray-900">{{ selectedSpecies.pluginData.size.category }}</span>
              </div>
              <div>
                <span class="font-medium text-gray-700">Speed:</span>
                <span class="ml-2 text-gray-900">{{ getDisplaySpeed }} ft</span>
              </div>
            </div>
            
            <!-- Creature Type -->
            <div class="text-sm">
              <span class="font-medium text-gray-700">Type:</span>
              <span class="ml-2 text-gray-900">{{ selectedSpecies.pluginData.creatureType }}</span>
            </div>
            
            <!-- Selected lineage benefits -->
            <div v-if="selectedLineage" class="bg-blue-50 border border-blue-200 rounded p-3 space-y-2">
              <h4 class="font-medium text-blue-900">{{ selectedLineage.name }} Benefits:</h4>
              <p class="text-sm text-blue-800">{{ selectedLineage.level1Benefits }}</p>
            </div>
            
            <!-- Species Traits -->
            <div v-if="selectedSpecies.pluginData.traits.length > 0" class="space-y-2">
              <h4 class="font-medium text-gray-700">Traits:</h4>
              <div class="space-y-2">
                <div v-for="trait in selectedSpecies.pluginData.traits" :key="trait.name" class="text-sm">
                  <span class="font-medium text-gray-900">{{ trait.name }}:</span>
                  <span class="ml-1 text-gray-700">{{ trait.description }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Background Selection -->
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Background
            </label>
            <MobileSelect
              :model-value="localData.background?.id || null"
              :options="backgroundSelectOptions"
              placeholder="Select a background..."
              :disabled="loading"
              value-key="id"
              label-key="name"
              @update:model-value="handleBackgroundSelection"
            />
          </div>

          <!-- Background details section -->
          <div v-if="selectedBackground" class="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4">
            <h3 class="text-lg font-semibold text-gray-900">{{ selectedBackground.name }}</h3>
            
            <!-- Background description -->
            <p class="text-gray-900 text-sm">{{ selectedBackground.pluginData.description }}</p>
            
            <!-- Skill Proficiencies -->
            <div v-if="selectedBackground.pluginData.skillProficiencies.length > 0" class="text-sm">
              <span class="font-medium text-gray-700">Skill Proficiencies:</span>
              <span class="ml-2 text-gray-900">{{ selectedBackground.pluginData.skillProficiencies.join(', ') }}</span>
            </div>
            
            <!-- Tool Proficiencies -->
            <div v-if="selectedBackground.pluginData.toolProficiencies" class="text-sm">
              <span class="font-medium text-gray-700">Tool Proficiencies:</span>
              <span class="ml-2 text-gray-900">{{ formatToolProficiencies(selectedBackground.pluginData.toolProficiencies) }}</span>
            </div>
            
            <!-- Ability Score Choices (2024: moved from species to backgrounds) -->
            <div v-if="selectedBackground.pluginData.abilityScores.length > 0" class="text-sm">
              <span class="font-medium text-gray-700">Ability Score Choice:</span>
              <span class="ml-2 text-gray-900">Choose +2 and +1 from {{ selectedBackground.pluginData.abilityScores.join(', ') }}</span>
            </div>
            
            <!-- Origin Feat -->
            <div class="text-sm">
              <span class="font-medium text-gray-700">Origin Feat:</span>
              <span class="ml-2 text-gray-900">{{ selectedBackground.pluginData.originFeat.name }}</span>
            </div>
          </div>
        </div>

        <!-- Equipment Package Selection -->
        <div v-if="selectedBackground && selectedBackground.pluginData.equipment">
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Equipment Package
          </label>
          <div class="space-y-3">
            <label class="equipment-card flex items-start p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
              <input
                v-model="localData.background!.selectedEquipment"
                type="radio"
                value="package"
                class="mr-3 mt-1"
                @change="updateOrigin"
              />
              <div class="flex-1">
                <div class="font-medium text-gray-900">Equipment Package</div>
                <div class="text-sm text-gray-600 mb-2">Starting equipment package</div>
                
                <!-- Show equipment items -->
                <div v-if="equipmentDisplay" class="text-sm text-gray-700 mb-2">
                  {{ equipmentDisplay.items }}
                </div>
                
                <!-- Show gold if any -->
                <div v-if="equipmentDisplay?.gold" class="text-sm text-green-600 font-medium">
                  + {{ equipmentDisplay.gold }} GP
                </div>
              </div>
            </label>

            <label class="equipment-card flex items-start p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
              <input
                v-model="localData.background!.selectedEquipment"
                type="radio"
                value="gold"
                class="mr-3 mt-1"
                @change="updateOrigin"
              />
              <div class="flex-1">
                <div class="font-medium text-gray-900">Buy Equipment</div>
                <div class="text-sm text-gray-600 mb-2">Start with gold pieces to purchase your own equipment and gear.</div>
                
                <!-- Show gold amount -->
                <div class="text-sm text-green-600 font-medium">
                  {{ selectedBackground.pluginData.equipment?.goldAlternative || 50 }} GP
                </div>
              </div>
            </label>
          </div>
        </div>

        <!-- Additional Languages -->
        <div class="space-y-4">
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Additional Languages (Choose 2)
          </label>
          
          <!-- Loading languages -->
          <div v-if="languagesLoading" class="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div class="flex items-center">
              <Icon name="loading" class="w-4 h-4 text-blue-600 mr-2 animate-spin" />
              <span class="text-blue-800 text-sm">Loading languages...</span>
            </div>
          </div>
          
          <!-- Language selection -->
          <div v-else-if="availableLanguages.length > 0" class="space-y-3">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-3">
              <label
                v-for="language in availableLanguages"
                :key="language.id"
                class="flex items-center p-2 border border-gray-200 rounded cursor-pointer hover:bg-gray-50 transition-colors"
                :class="{
                  'bg-blue-50 border-blue-300': selectedLanguageIds.includes(language.id),
                  'opacity-50 cursor-not-allowed': selectedLanguageIds.length >= 2 && !selectedLanguageIds.includes(language.id)
                }"
              >
                <input
                  type="checkbox"
                  :value="language.id"
                  :checked="selectedLanguageIds.includes(language.id)"
                  :disabled="selectedLanguageIds.length >= 2 && !selectedLanguageIds.includes(language.id)"
                  @change="handleLanguageToggle(language)"
                  class="mr-2"
                />
                <div class="flex-1 min-w-0">
                  <div class="font-medium text-gray-900 text-sm">{{ language.name }}</div>
                  <div v-if="language.pluginData.category" class="text-xs text-gray-600">
                    {{ language.pluginData.category === 'standard' ? 'Standard' : 'Rare' }}
                  </div>
                </div>
              </label>
            </div>
            
            <!-- Selected languages summary -->
            <div v-if="localData.selectedLanguages && localData.selectedLanguages.length > 0" class="text-sm text-gray-700">
              <span class="font-medium">Selected:</span>
              {{ localData.selectedLanguages.map(l => l.name).join(', ') }}
              <span class="text-gray-500">({{ localData.selectedLanguages.length }}/2)</span>
            </div>
          </div>
          
          <!-- Error loading languages -->
          <div v-else-if="languagesError" class="bg-red-50 border border-red-200 rounded-lg p-3">
            <div class="flex items-center">
              <Icon name="error" class="w-4 h-4 text-red-600 mr-2" />
              <span class="text-red-800 text-sm">{{ languagesError }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue';
import type { OriginSelection, LanguageSelection } from '../../../types/character-creation.mjs';
import type { DndSpeciesDocument } from '../../../types/dnd/species.mjs';
import type { DndBackgroundDocument } from '../../../types/dnd/background.mjs';
import type { DndLanguageDocument } from '../../../types/dnd/language.mjs';
import { useCharacterCreation } from '../../../composables/useCharacterCreation.mjs';
import Icon from '../../common/Icon.vue';
import MobileSelect from '../../common/MobileSelect.vue';

// Props
interface Props {
  modelValue: OriginSelection | null;
}

const props = defineProps<Props>();

// Emits
interface Emits {
  (e: 'update:modelValue', value: OriginSelection): void;
  (e: 'validate'): void;
  (e: 'next'): void;
  (e: 'back'): void;
}

const emit = defineEmits<Emits>();

// Composable for data fetching
const { fetchSpecies, fetchBackgrounds, fetchLanguages } = useCharacterCreation();

// Local reactive data
const localData = ref<Partial<OriginSelection>>({
  species: {
    id: props.modelValue?.species?.id || '',
    name: props.modelValue?.species?.name || '',
    subspecies: props.modelValue?.species?.subspecies || undefined
  },
  background: {
    id: props.modelValue?.background?.id || '',
    name: props.modelValue?.background?.name || '',
    selectedEquipment: props.modelValue?.background?.selectedEquipment || 'package'
  },
  selectedLanguages: props.modelValue?.selectedLanguages || []
});

// Ensure selectedLanguages is always an array
if (!localData.value.selectedLanguages) {
  localData.value.selectedLanguages = [];
}

// Compendium data
const availableSpecies = ref<DndSpeciesDocument[]>([]);
const availableBackgrounds = ref<DndBackgroundDocument[]>([]);
const availableLanguages = ref<DndLanguageDocument[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const languagesLoading = ref(false);
const languagesError = ref<string | null>(null);

// Computed
const isValid = computed(() => {
  const hasSpecies = localData.value.species?.id && localData.value.species?.name;
  const hasBackground = localData.value.background?.id && 
                       localData.value.background?.name &&
                       localData.value.background?.selectedEquipment;
  
  // If species has lineages available, one must be selected
  const hasRequiredLineage = availableLineages.value.length === 0 || 
                           (availableLineages.value.length > 0 && localData.value.species?.subspecies);
  
  return hasSpecies && hasBackground && hasRequiredLineage;
});

const selectedSpecies = computed(() => {
  return availableSpecies.value.find(species => species.id === localData.value.species?.id);
});

const selectedBackground = computed(() => {
  return availableBackgrounds.value.find(bg => bg.id === localData.value.background?.id);
});

const speciesSelectOptions = computed(() => {
  return availableSpecies.value.map(species => ({
    id: species.id,
    name: species.name
  }));
});

const backgroundSelectOptions = computed(() => {
  return availableBackgrounds.value.map(bg => ({
    id: bg.id,
    name: bg.name
  }));
});

const selectedLanguageIds = computed(() => {
  return localData.value.selectedLanguages?.map(lang => lang.id) || [];
});

const equipmentDisplay = computed(() => {
  if (!selectedBackground.value?.pluginData.equipment?.equipmentPackage?.items) {
    return null;
  }
  
  const items = selectedBackground.value.pluginData.equipment.equipmentPackage.items;
  const goldPieces = selectedBackground.value.pluginData.equipment.equipmentPackage.goldPieces;
  
  // Format items with quantities
  const itemList = items.map(item => 
    item.quantity > 1 ? `${item.name} (${item.quantity})` : item.name
  ).join(', ');
  
  return {
    items: itemList,
    gold: goldPieces || 0
  };
});

const availableLineages = computed(() => {
  return selectedSpecies.value?.pluginData.lineages || [];
});

const lineageSelectOptions = computed(() => {
  return availableLineages.value.map(lineage => ({
    name: lineage.name,
    description: lineage.description
  }));
});

const selectedLineage = computed(() => {
  if (!localData.value.species?.subspecies) return null;
  return availableLineages.value.find(lineage => lineage.name === localData.value.species?.subspecies);
});

const getDisplaySpeed = computed(() => {
  const baseSpeed = selectedSpecies.value?.pluginData.movement.walk || 30;
  
  // Wood Elf lineage increases speed to 35
  if (selectedLineage.value?.name === 'Wood Elf') {
    return 35;
  }
  
  return baseSpeed;
});

// Methods
const loadData = async () => {
  try {
    loading.value = true;
    error.value = null;
    
    // Load species and backgrounds in parallel
    const [speciesData, backgroundsData] = await Promise.all([
      fetchSpecies(),
      fetchBackgrounds()
    ]);
    
    availableSpecies.value = speciesData;
    availableBackgrounds.value = backgroundsData;
  } catch (err) {
    error.value = 'Failed to load species and backgrounds.';
    console.error('Origin data loading error:', err);
    // Fallback to empty arrays - component will show error state
    availableSpecies.value = [];
    availableBackgrounds.value = [];
  } finally {
    loading.value = false;
  }
};

const loadLanguages = async () => {
  try {
    languagesLoading.value = true;
    languagesError.value = null;
    
    const languagesData = await fetchLanguages();
    availableLanguages.value = languagesData;
  } catch (err) {
    languagesError.value = 'Failed to load languages.';
    console.error('Languages loading error:', err);
    availableLanguages.value = [];
  } finally {
    languagesLoading.value = false;
  }
};

// Removed formatAbilityScoreIncrease - ability scores moved to backgrounds in 2024

const formatToolProficiencies = (proficiencies: any): string => {
  if (!proficiencies) return 'None';
  
  // Handle array of tool proficiencies (fixed list)
  if (Array.isArray(proficiencies)) {
    return proficiencies.map(prof => {
      if (typeof prof === 'string') {
        return prof;
      } else if (prof.displayName) {
        return prof.displayName;
      } else if (prof.tool && prof.tool._ref) {
        return formatItemName(prof.tool._ref.slug);
      }
      return 'Unknown Tool';
    }).join(', ');
  }
  
  // Handle choice structure (generic choice)
  if (proficiencies.options && proficiencies.count) {
    return `Choose ${proficiencies.count} from ${proficiencies.options.map((opt: any) => opt.name).join(', ')}`;
  }
  
  return 'None';
};

const formatItemName = (slug: string): string => {
  // Convert slug to readable name (e.g., "thieves-tools" -> "Thieves' Tools")
  return slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
    .replace(/s Tools$/, "s' Tools"); // Handle possessive forms
};

const handleSpeciesSelection = (value: string | number | null) => {
  const speciesId = value as string;
  const species = availableSpecies.value.find(s => s.id === speciesId);
  
  if (species) {
    localData.value.species = {
      id: species.id,
      name: species.name,
      subspecies: undefined // Reset subspecies when changing species
    };
  } else {
    localData.value.species = {
      id: '',
      name: '',
      subspecies: undefined
    };
  }
  
  updateOrigin();
};

const handleLineageSelection = (value: string | number | null) => {
  const lineageName = value as string;
  
  if (localData.value.species) {
    localData.value.species.subspecies = lineageName || undefined;
  }
  
  updateOrigin();
};

const handleBackgroundSelection = (value: string | number | null) => {
  const backgroundId = value as string;
  const background = availableBackgrounds.value.find(bg => bg.id === backgroundId);
  
  if (background) {
    localData.value.background = {
      id: background.id,
      name: background.name,
      selectedEquipment: 'package' // Default to equipment package
    };
  } else {
    localData.value.background = {
      id: '',
      name: '',
      selectedEquipment: 'package'
    };
  }
  
  updateOrigin();
};

const handleLanguageToggle = (language: DndLanguageDocument) => {
  const currentSelection = localData.value.selectedLanguages || [];
  const languageSelection: LanguageSelection = {
    id: language.id,
    name: language.name
  };
  
  const isSelected = currentSelection.some(lang => lang.id === language.id);
  
  if (isSelected) {
    // Remove language
    localData.value.selectedLanguages = currentSelection.filter(lang => lang.id !== language.id);
  } else if (currentSelection.length < 2) {
    // Add language (only if less than 2 selected)
    localData.value.selectedLanguages = [...currentSelection, languageSelection];
  }
  
  updateOrigin();
};

const updateOrigin = () => {
  if (isValid.value) {
    emit('update:modelValue', localData.value as OriginSelection);
  }
  
  emit('validate');
};

// Load data on component mount
onMounted(() => {
  loadData();
  loadLanguages();
});

// Watch for external changes
watch(() => props.modelValue, (newValue) => {
  if (newValue) {
    localData.value = { ...newValue };
  }
}, { deep: true });
</script>

<style scoped>
.origin-selection-step {
  @apply space-y-6;
}

.step-header h2 {
  @apply text-2xl font-bold text-gray-900;
}

.step-header p {
  @apply text-gray-600 mt-2;
}

/* Loading animation for spinner icon */
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.animate-spin {
  animation: spin 1s linear infinite;
}

/* Enhanced focus states for accessibility */
select:focus,
input[type="text"]:focus,
input[type="radio"]:focus {
  @apply ring-2 ring-blue-500 ring-offset-2;
}

/* Mobile-optimized input styling */
input[type="text"] {
  @apply text-base;
  /* Prevent zoom on iOS */
  font-size: 16px;
}

@media (max-width: 640px) {
  input[type="text"] {
    /* Larger touch targets on mobile */
    @apply py-4 text-lg;
    /* Ensure 16px font size to prevent zoom */
    font-size: 16px !important;
  }
}

/* Better radio button styling */
input[type="radio"] {
  @apply w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500;
}

@media (max-width: 640px) {
  input[type="radio"] {
    @apply w-5 h-5;
  }
}

/* Mobile-responsive grid adjustments */
@media (max-width: 640px) {
  .grid-cols-2 {
    @apply grid-cols-1;
  }
}

/* Hover states for equipment cards */
.equipment-card:hover {
  @apply shadow-sm;
}

/* Selected state for equipment cards */
.equipment-card:has(input:checked) {
  @apply bg-blue-50 border-blue-200;
}

/* Mobile margin removal */
@media (max-width: 768px) {
  .origin-selection-step {
    /* Remove margins on mobile for full screen utilization */
    margin: 0;
    padding: 0;
  }
}
</style>