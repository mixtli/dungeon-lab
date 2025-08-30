<template>
  <div class="class-selection-step">
    <div class="step-header mb-6">
      <h2 class="text-2xl font-bold text-gray-900">Choose Your Class</h2>
      <p class="text-gray-600 mt-2">
        Select your character's class, which determines their abilities, skills, and role in the party.
      </p>
    </div>

    <div class="class-selection-content">
      <!-- Loading state -->
      <div v-if="loading" class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div class="flex items-center">
          <Icon name="loading" class="w-5 h-5 text-blue-600 mr-2 animate-spin" />
          <span class="text-blue-800 text-sm">Loading character classes...</span>
        </div>
      </div>

      <!-- Error state -->
      <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <div class="flex items-center">
          <Icon name="error" class="w-5 h-5 text-red-600 mr-2" />
          <span class="text-red-800 text-sm">{{ error }}</span>
        </div>
      </div>

      <!-- Class selection form -->
      <div v-else class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Class
          </label>
          <MobileSelect
            :model-value="localData.id || null"
            :options="classSelectOptions"
            placeholder="Select a class..."
            :disabled="loading"
            value-key="id"
            label-key="name"
            @update:model-value="handleClassSelection"
          />
        </div>

        <!-- Class details section -->
        <div v-if="selectedClass" class="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4">
          <h3 class="text-lg font-semibold text-gray-900">{{ selectedClass.name }}</h3>
          
          <!-- Class description -->
          <p class="text-gray-900 text-sm">{{ selectedClass.pluginData.description }}</p>
          
          <!-- Basic class info -->
          <div class="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span class="font-medium text-gray-700">Hit Die:</span>
              <span class="ml-2 text-gray-900">d{{ selectedClass.pluginData.hitDie }}</span>
            </div>
            <div>
              <span class="font-medium text-gray-700">Primary Abilities:</span>
              <span class="ml-2 text-gray-900">{{ selectedClass.pluginData.primaryAbilities.join(', ') }}</span>
            </div>
          </div>
          
          <!-- Saving throws -->
          <div class="text-sm">
            <span class="font-medium text-gray-700">Saving Throw Proficiencies:</span>
            <span class="ml-2 text-gray-900">{{ selectedClass.pluginData.proficiencies.savingThrows.join(', ') }}</span>
          </div>
          
          <!-- Proficiencies -->
          <div class="space-y-2 text-sm">
            <div v-if="selectedClass.pluginData.proficiencies.armor.length > 0">
              <span class="font-medium text-gray-700">Armor:</span>
              <span class="ml-2 text-gray-900">{{ formatProficiencies(selectedClass.pluginData.proficiencies.armor) }}</span>
            </div>
            <div v-if="selectedClass.pluginData.proficiencies.weapons.length > 0">
              <span class="font-medium text-gray-700">Weapons:</span>
              <span class="ml-2 text-gray-900">{{ formatProficiencies(selectedClass.pluginData.proficiencies.weapons) }}</span>
            </div>
            <div v-if="selectedClass.pluginData.proficiencies.tools.length > 0">
              <span class="font-medium text-gray-700">Tools:</span>
              <span class="ml-2 text-gray-900">{{ formatProficiencies(selectedClass.pluginData.proficiencies.tools) }}</span>
            </div>
          </div>
        </div>

        <!-- Skill selection section -->
        <div v-if="selectedClass && selectedClass.pluginData.proficiencies.skills.count > 0" class="space-y-3">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Skill Proficiencies
            </label>
            <p class="text-sm text-gray-600 mb-3">
              Choose {{ selectedClass.pluginData.proficiencies.skills.count }} 
              skill{{ selectedClass.pluginData.proficiencies.skills.count > 1 ? 's' : '' }} 
              from the following options:
            </p>
          </div>
          
          <div class="grid grid-cols-2 gap-2">
            <label 
              v-for="skill in selectedClass.pluginData.proficiencies.skills.choices" 
              :key="skill"
              class="flex items-center"
            >
              <input
                v-model="localData.selectedSkills"
                type="checkbox"
                :value="skill"
                class="mr-2 rounded"
                :disabled="(localData.selectedSkills?.length || 0) >= selectedClass.pluginData.proficiencies.skills.count && !(localData.selectedSkills || []).includes(skill)"
                @change="updateClass"
              />
              <span class="text-sm text-gray-900">{{ skill }}</span>
            </label>
          </div>
          
          <!-- Skill selection validation -->
          <div v-if="(localData.selectedSkills?.length || 0) !== selectedClass.pluginData.proficiencies.skills.count" 
               class="text-sm text-amber-700 font-medium">
            Select exactly {{ selectedClass.pluginData.proficiencies.skills.count }} skill{{ selectedClass.pluginData.proficiencies.skills.count > 1 ? 's' : '' }}.
            Currently selected: {{ localData.selectedSkills?.length || 0 }}
          </div>
        </div>

        <!-- Tool proficiency selection section -->
        <div v-if="selectedClass && hasGroupChoiceTools" class="space-y-4">
          <div v-for="(toolGroup, groupIndex) in groupChoiceTools" :key="groupIndex" class="space-y-3">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-3">
                {{ toolGroup.displayText }}
              </label>
            </div>

            <!-- Loading state for tool group -->
            <div v-if="toolGroup.loading" class="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div class="flex items-center">
                <Icon name="loading" class="w-4 h-4 text-blue-600 mr-2 animate-spin" />
                <span class="text-blue-800 text-sm">Loading {{ toolGroup.groupName }}...</span>
              </div>
            </div>

            <!-- Error state for tool group -->
            <div v-else-if="toolGroup.error" class="bg-red-50 border border-red-200 rounded-lg p-3">
              <div class="flex items-center">
                <Icon name="error" class="w-4 h-4 text-red-600 mr-2" />
                <span class="text-red-800 text-sm">{{ toolGroup.error }}</span>
              </div>
            </div>

            <!-- Tool selection dropdowns -->
            <div v-else class="space-y-2">
              <div v-for="choiceIndex in toolGroup.count" :key="choiceIndex" class="w-full">
                <MobileSelect
                  :model-value="getSelectedTool(groupIndex, choiceIndex - 1)"
                  :options="getAvailableToolsForChoice(groupIndex, choiceIndex - 1)"
                  :placeholder="`Select ${toolGroup.groupName.toLowerCase().slice(0, -1)}...`"
                  :disabled="!toolGroup.items?.length"
                  value-key="id"
                  label-key="name"
                  @update:model-value="handleToolSelection(groupIndex, choiceIndex - 1, $event)"
                />
              </div>

              <!-- Tool selection validation -->
              <div v-if="getSelectedToolsCount(groupIndex) !== toolGroup.count" 
                   class="text-sm text-amber-700 font-medium">
                {{ getSelectedToolsCount(groupIndex) }} of {{ toolGroup.count }} selected
              </div>
            </div>
          </div>
        </div>

        <div v-if="localData.id">
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Equipment Package
          </label>
          <div class="space-y-3">
            <label 
              v-for="option in startingEquipmentOptions" 
              :key="option.label"
              class="equipment-card flex items-start p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
            >
              <input
                v-model="localData.selectedEquipment"
                type="radio"
                :value="option.label"
                class="mr-3 mt-1"
                @change="updateClass"
              />
              <div class="flex-1">
                <div class="font-medium text-gray-900">Option {{ option.label }}</div>
                <div class="text-sm text-gray-600 mb-2">{{ option.description }}</div>
                
                <!-- Show gold if any -->
                <div v-if="option.gold" class="text-sm text-green-600 font-medium">
                  + {{ option.gold }} GP
                </div>
              </div>
            </label>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue';
import type { ClassSelection } from '../../../../types/character-creation.mjs';
import type { DndCharacterClassDocument } from '../../../../types/dnd/character-class.mjs';
import { useCharacterCreation } from '../../../../composables/useCharacterCreation.mjs';
import { CompendiumsClient } from '@dungeon-lab/client/index.mjs';
import Icon from '../../common/Icon.vue';
import MobileSelect from '../../common/MobileSelect.vue';

// Props
interface Props {
  modelValue: ClassSelection | null;
}

const props = defineProps<Props>();

// Emits
interface Emits {
  (e: 'update:modelValue', value: ClassSelection): void;
  (e: 'validate'): void;
  (e: 'next'): void;
  (e: 'back'): void;
}

const emit = defineEmits<Emits>();

// Composable for data fetching
const { fetchClasses, fetchItemsInGroup } = useCharacterCreation();

// Local reactive data
const localData = ref<Partial<ClassSelection>>({
  id: props.modelValue?.id || '',
  name: props.modelValue?.name || '',
  selectedSkills: props.modelValue?.selectedSkills || [],
  selectedTools: props.modelValue?.selectedTools || [],
  selectedEquipment: props.modelValue?.selectedEquipment || 'A'
});

// Ensure selectedSkills and selectedTools are always arrays
if (!localData.value.selectedSkills) {
  localData.value.selectedSkills = [];
}
if (!localData.value.selectedTools) {
  localData.value.selectedTools = [];
}

// Document data
const availableClasses = ref<Array<{documentId: string, document: DndCharacterClassDocument}>>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const itemNameCache = ref<Map<string, string>>(new Map());

// Tool group data for group-choice selections
interface ToolGroupData {
  groupId: string;
  groupName: string;
  displayText: string;
  count: number;
  loading: boolean;
  error: string | null;
  items: Array<{ id: string; name: string }> | null;
}

const groupChoiceTools = ref<ToolGroupData[]>([]);

// Computed
const isValid = computed(() => {
  const hasBasicInfo = localData.value.id && localData.value.name && localData.value.selectedEquipment;
  
  if (!hasBasicInfo || !selectedClass.value) {
    return false;
  }
  
  // Check if skill selection is required and completed
  const skillsRequired = selectedClass.value.pluginData.proficiencies.skills.count;
  const skillsSelected = localData.value.selectedSkills?.length || 0;
  
  if (skillsRequired > 0 && skillsSelected !== skillsRequired) {
    return false;
  }
  
  // Check if tool selections are completed for all group choices
  for (const toolGroup of groupChoiceTools.value) {
    const selectedCount = getSelectedToolsCount(groupChoiceTools.value.indexOf(toolGroup));
    if (selectedCount !== toolGroup.count) {
      return false;
    }
  }
  
  return true;
});

const selectedClass = computed(() => {
  return availableClasses.value.find(cls => cls.documentId === localData.value.id)?.document;
});

const hasGroupChoiceTools = computed(() => {
  return groupChoiceTools.value.length > 0;
});

const classSelectOptions = computed(() => {
  return availableClasses.value.map(classItem => ({
    id: classItem.documentId,
    name: classItem.document.name
  }));
});

const startingEquipmentOptions = computed(() => {
  if (!selectedClass.value?.pluginData?.startingEquipment) {
    return [];
  }
  return selectedClass.value.pluginData.startingEquipment;
});

// Methods
const loadClasses = async () => {
  try {
    loading.value = true;
    error.value = null;
    // Use global search across all D&D compendiums
    availableClasses.value = await fetchClasses();
  } catch (err) {
    error.value = 'Failed to load character classes.';
    console.error('Class loading error:', err);
    // Fallback to empty array - component will show error state
    availableClasses.value = [];
  } finally {
    loading.value = false;
  }
};

const formatProficiencies = (proficiencies: any[]): string => {
  return proficiencies.map(prof => {
    if (typeof prof === 'string') {
      return prof;
    } else if (prof.type === 'reference') {
      // Handle both resolved ObjectId strings and unresolved reference objects
      if (prof.item && typeof prof.item === 'string') {
        // ObjectId string - use async lookup
        return getItemDisplayName(prof.item);
      } else if (prof.item && prof.item._ref) {
        // Unresolved reference - use display text or format slug
        return prof.displayText || formatItemName(prof.item._ref.slug);
      } else {
        // Fallback to display text
        return prof.displayText || 'Unknown';
      }
    } else if (prof.type === 'filter') {
      return prof.constraint?.displayText || 'Special';
    } else if (prof.type === 'group-choice') {
      // Handle group choice proficiencies (like "Choose 3 Musical Instruments") 
      return prof.displayText || 'Group Choice';
    }
    return 'Unknown';
  }).join(', ');
};

const formatItemName = (slug: string): string => {
  // Convert slug to readable name (e.g., "chain-mail" -> "Chain Mail")
  return slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// Helper functions for handling both resolved and unresolved item references

const getItemDisplayName = (itemRef: any): string => {
  // Handle both resolved ObjectId strings and unresolved _ref objects
  if (typeof itemRef === 'string') {
    // Resolved ObjectId string - check cache first, then fetch if needed
    const cachedName = itemNameCache.value.get(itemRef);
    if (cachedName) {
      return cachedName;
    }
    
    // Fetch item name asynchronously and cache it
    fetchItemName(itemRef).then(name => {
      itemNameCache.value.set(itemRef, name);
      // Force reactivity update by setting the Map again
      itemNameCache.value = new Map(itemNameCache.value);
    }).catch(() => {
      itemNameCache.value.set(itemRef, 'Unknown Item');
      // Force reactivity update by setting the Map again
      itemNameCache.value = new Map(itemNameCache.value);
    });
    
    // Return loading state for now
    return 'Loading...';
  } else if (itemRef && itemRef._ref && itemRef._ref.slug) {
    // Unresolved reference object - use the slug to generate a display name
    return formatItemName(itemRef._ref.slug);
  } else if (itemRef && itemRef._error) {
    // Failed reference resolution - show error info
    return `Unknown Item (${itemRef._error.reason})`;
  } else {
    // Fallback
    return 'Unknown Item';
  }
};

// Helper function to fetch item name by ObjectId
const fetchItemName = async (itemId: string): Promise<string> => {
  try {
    // Use the compendium client to fetch the item
    const compendiumClient = new CompendiumsClient();
    const entry = await compendiumClient.getCompendiumEntry(itemId);
    return entry.content.name || 'Unknown Item';
  } catch (error) {
    console.warn(`Failed to fetch item name for ${itemId}:`, error);
    return 'Unknown Item';
  }
};

const updateClass = () => {
  if (localData.value.id && selectedClass.value) {
    // Set name from the actual class document
    localData.value.name = selectedClass.value.name;
    
    // Clear selected skills if the class changed (they're class-specific)
    if ((localData.value.selectedSkills?.length || 0) > 0) {
      const availableSkills = selectedClass.value.pluginData.proficiencies.skills.choices;
      localData.value.selectedSkills = (localData.value.selectedSkills || []).filter(skill => 
        availableSkills.includes(skill)
      );
    }
    
    // Load tool groups for group-choice proficiencies
    loadToolGroups();
    
    if (isValid.value) {
      emit('update:modelValue', localData.value as ClassSelection);
    }
  } else if (!localData.value.id) {
    // Clear all selections if no class is selected
    localData.value.name = '';
    localData.value.selectedSkills = [];
    localData.value.selectedTools = [];
    groupChoiceTools.value = [];
  }
  
  emit('validate');
};

const loadToolGroups = async () => {
  if (!selectedClass.value) {
    return;
  }
  
  const toolProficiencies = selectedClass.value.pluginData.proficiencies.tools;
  const groupChoices = toolProficiencies.filter((tool: any) => tool.type === 'group-choice');
  
  if (groupChoices.length === 0) {
    groupChoiceTools.value = [];
    return;
  }
  
  // Initialize tool group data with null safety
  groupChoiceTools.value = groupChoices.map((choice: any) => {
    let groupId: string;
    
    // Handle different possible structures:
    // 1. Full reference structure: choice.group._ref.slug (shouldn't happen after MongoDB processing)
    // 2. MongoDB resolved reference: choice.group is the ObjectId string
    if (choice.group && choice.group._ref && choice.group._ref.slug) {
      // Full reference structure (shouldn't happen but handle it)
      groupId = choice.group._ref.slug;
    } else if (typeof choice.group === 'string') {
      // MongoDB has resolved the reference to an ObjectId string - use it directly
      groupId = choice.group;
    } else {
      console.error('Invalid group structure in choice:', choice);
      return {
        groupId: 'unknown',
        groupName: 'Unknown',
        displayText: choice.displayText || 'Unknown',
        count: choice.count || 1,
        loading: false,
        error: 'Invalid group reference structure',
        items: null
      };
    }
    
    return {
      groupId: groupId,
      groupName: choice.displayText.split(' ').slice(-1)[0], // Extract last word (e.g., "Instruments" from "Choose 3 Musical Instruments")
      displayText: choice.displayText,
      count: choice.count,
      loading: true,
      error: null,
      items: null
    };
  });
  
  // Load each tool group
  for (let i = 0; i < groupChoiceTools.value.length; i++) {
    const toolGroup = groupChoiceTools.value[i];
    
    // Skip if there was an error in initialization
    if (toolGroup.error) {
      continue;
    }
    
    try {
      const items = await fetchItemsInGroup(toolGroup.groupId);
      
      toolGroup.items = items.map(item => ({
        id: item.id,
        name: item.entry.name
      }));
      toolGroup.loading = false;
      
      // Initialize selected tools for this group if not already present
      if (!localData.value.selectedTools?.find(group => group.groupId === toolGroup.groupId)) {
        localData.value.selectedTools?.push({
          groupId: toolGroup.groupId,
          groupName: toolGroup.groupName,
          selectedItems: []
        });
      }
    } catch (error) {
      console.error('Error loading tool group:', error);
      toolGroup.error = error instanceof Error ? error.message : 'Failed to load items';
      toolGroup.loading = false;
    }
  }
};

const getSelectedTool = (groupIndex: number, choiceIndex: number): string => {
  const toolGroup = groupChoiceTools.value[groupIndex];
  const selectedGroup = localData.value.selectedTools?.find(group => group.groupId === toolGroup.groupId);
  return selectedGroup?.selectedItems[choiceIndex] || '';
};

const handleClassSelection = (value: string | number | null) => {
  localData.value.id = value as string;
  updateClass();
};

const handleToolSelection = (groupIndex: number, choiceIndex: number, value: string | number | null) => {
  const toolGroup = groupChoiceTools.value[groupIndex];
  
  let selectedGroup = localData.value.selectedTools?.find(group => group.groupId === toolGroup.groupId);
  if (!selectedGroup) {
    selectedGroup = {
      groupId: toolGroup.groupId,
      groupName: toolGroup.groupName,
      selectedItems: []
    };
    localData.value.selectedTools?.push(selectedGroup);
  }
  
  // Ensure the selectedItems array has enough slots
  while (selectedGroup.selectedItems.length <= choiceIndex) {
    selectedGroup.selectedItems.push('');
  }
  
  selectedGroup.selectedItems[choiceIndex] = value as string;
  
  updateClass();
};


const getAvailableToolsForChoice = (groupIndex: number, choiceIndex: number) => {
  const toolGroup = groupChoiceTools.value[groupIndex];
  if (!toolGroup.items) return [];
  
  const selectedGroup = localData.value.selectedTools?.find(group => group.groupId === toolGroup.groupId);
  const alreadySelected = selectedGroup?.selectedItems.filter((item, index) => 
    item && index !== choiceIndex
  ) || [];
  
  return toolGroup.items.filter(item => !alreadySelected.includes(item.id));
};

const getSelectedToolsCount = (groupIndex: number): number => {
  const toolGroup = groupChoiceTools.value[groupIndex];
  const selectedGroup = localData.value.selectedTools?.find(group => group.groupId === toolGroup.groupId);
  return selectedGroup?.selectedItems.filter(item => item).length || 0;
};

// Load classes on component mount
onMounted(() => {
  loadClasses();
});

// Watch for external changes
watch(() => props.modelValue, (newValue) => {
  if (newValue) {
    localData.value = { ...newValue };
  }
}, { deep: true });
</script>

<style scoped>
.class-selection-step {
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
input[type="checkbox"]:focus,
input[type="radio"]:focus {
  @apply ring-2 ring-blue-500 ring-offset-2;
}

/* Mobile-optimized select styling */
select {
  @apply text-base;
  /* Prevent zoom on iOS */
  font-size: 16px;
}

@media (max-width: 640px) {
  select {
    /* Larger touch targets on mobile */
    @apply py-4 text-lg;
    /* Ensure 16px font size to prevent zoom */
    font-size: 16px !important;
  }
  
  /* Make select options more readable on mobile */
  select option {
    @apply py-2 text-base;
    font-size: 16px;
  }
}

/* Better checkbox styling */
input[type="checkbox"] {
  @apply w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500;
}

@media (max-width: 640px) {
  input[type="checkbox"] {
    @apply w-5 h-5;
  }
}

/* Disabled state styling */
input[type="checkbox"]:disabled {
  @apply opacity-50 cursor-not-allowed;
}

label:has(input[type="checkbox"]:disabled) {
  @apply opacity-60;
}

/* Mobile-responsive grid for skills */
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
</style>