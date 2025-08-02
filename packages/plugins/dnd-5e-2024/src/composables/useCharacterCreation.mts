import { reactive, computed, readonly } from 'vue';
import { CompendiumsClient } from '@dungeon-lab/client/index.mjs';
import type { ICompendiumEntry } from '@dungeon-lab/shared/types/index.mjs';
import type {
  CharacterCreationState,
  ClassSelection,
  OriginSelection,
  AbilityScores,
  CharacterDetails,
  BasicCharacterInfo,
  FormStep,
  CharacterCreationFormData
} from '../types/character-creation.mjs';
import type { DndCharacterClassDocument } from '../types/dnd/character-class.mjs';
import type { DndSpeciesDocument } from '../types/dnd/species.mjs';
import type { DndBackgroundDocument } from '../types/dnd/background.mjs';
import type { DndLanguageDocument } from '../types/dnd/language.mjs';
import {
  classSelectionSchema,
  originSelectionSchema,
  abilityScoresSchema,
  characterDetailsSchema,
  characterCreationFormSchema
} from '../types/character-creation.mjs';

// Form steps configuration
const FORM_STEPS: FormStep[] = [
  { id: 'class', name: 'Class', component: 'ClassSelectionStep' },
  { id: 'origin', name: 'Origin', component: 'OriginSelectionStep' },
  { id: 'abilities', name: 'Abilities', component: 'AbilityScoresStep' },
  { id: 'details', name: 'Details', component: 'CharacterDetailsStep' }
];

export function useCharacterCreation() {
  // Initialize reactive state
  const state = reactive<CharacterCreationState>({
    currentStep: 0,
    characterData: {
      class: null,
      origin: null,
      abilities: null,
      details: null
    },
    validationErrors: {},
    isValid: false
  });

  // Create compendium client instance
  const compendiumClient = new CompendiumsClient();

  // Computed properties
  const currentStepData = computed(() => FORM_STEPS[state.currentStep]);
  const isFirstStep = computed(() => state.currentStep === 0);
  const isLastStep = computed(() => state.currentStep === FORM_STEPS.length - 1);
  const canProceed = computed(() => {
    return validateCurrentStep() && Object.keys(state.validationErrors).length === 0;
  });

  const completionProgress = computed(() => {
    let completed = 0;
    if (state.characterData.class) completed++;
    if (state.characterData.origin) completed++;
    if (state.characterData.abilities) completed++;
    if (state.characterData.details) completed++;
    return Math.round((completed / 4) * 100);
  });

  // State management methods
  const resetState = () => {
    state.currentStep = 0;
    state.characterData = {
      class: null,
      origin: null,
      abilities: null,
      details: null
    };
    state.validationErrors = {};
    state.isValid = false;
  };

  // Navigation methods
  const goToStep = (stepIndex: number) => {
    if (stepIndex >= 0 && stepIndex < FORM_STEPS.length) {
      state.currentStep = stepIndex;
    }
  };

  const nextStep = () => {
    if (!isLastStep.value && canProceed.value) {
      state.currentStep++;
      return true;
    }
    return false;
  };

  const previousStep = () => {
    if (!isFirstStep.value) {
      state.currentStep--;
      return true;
    }
    return false;
  };

  // Validation methods
  const validateCurrentStep = (): boolean => {
    const stepId = FORM_STEPS[state.currentStep].id;
    return validateStep(stepId);
  };

  const validateStep = (stepId: string): boolean => {
    try {
      switch (stepId) {
        case 'class':
          if (state.characterData.class) {
            classSelectionSchema.parse(state.characterData.class);
            delete state.validationErrors.class;
            return true;
          }
          break;
        case 'origin':
          if (state.characterData.origin) {
            originSelectionSchema.parse(state.characterData.origin);
            delete state.validationErrors.origin;
            return true;
          }
          break;
        case 'abilities':
          if (state.characterData.abilities) {
            abilityScoresSchema.parse(state.characterData.abilities);
            delete state.validationErrors.abilities;
            return true;
          }
          break;
        case 'details':
          if (state.characterData.details) {
            characterDetailsSchema.parse(state.characterData.details);
            delete state.validationErrors.details;
            return true;
          }
          break;
      }
      return false;
    } catch (error: unknown) {
      // Store validation errors
      const errorObj = error as { errors?: Array<{ message: string }>; message?: string };
      state.validationErrors[stepId] = errorObj.errors?.map((e) => e.message) || [errorObj.message || 'Validation error'];
      return false;
    }
  };

  const validateAllSteps = () => {
    const steps = ['class', 'origin', 'abilities', 'details'];
    let allValid = true;
    
    for (const stepId of steps) {
      if (!validateStep(stepId)) {
        allValid = false;
      }
    }
    
    state.isValid = allValid;
    return allValid;
  };

  const validateCompleteForm = (): boolean => {
    try {
      if (!state.characterData.class || !state.characterData.origin || 
          !state.characterData.abilities || !state.characterData.details) {
        return false;
      }

      const formData: CharacterCreationFormData = {
        class: state.characterData.class,
        origin: state.characterData.origin,
        abilities: state.characterData.abilities,
        details: state.characterData.details
      };

      characterCreationFormSchema.parse(formData);
      state.validationErrors = {};
      state.isValid = true;
      return true;
    } catch (error: unknown) {
      const errorObj = error as { errors?: Array<{ message: string }>; message?: string };
      state.validationErrors.form = errorObj.errors?.map((e) => e.message) || [errorObj.message || 'Form validation error'];
      state.isValid = false;
      return false;
    }
  };

  // Data update methods
  const updateClassSelection = (classData: ClassSelection) => {
    state.characterData.class = classData;
    validateStep('class');
  };

  const updateOriginSelection = (originData: OriginSelection) => {
    state.characterData.origin = originData;
    validateStep('origin');
  };

  const updateAbilityScores = (abilityData: AbilityScores) => {
    state.characterData.abilities = abilityData;
    validateStep('abilities');
  };

  const updateCharacterDetails = (detailsData: CharacterDetails) => {
    state.characterData.details = detailsData;
    validateStep('details');
  };

  // Compendium data fetching methods using global search
  const fetchClasses = async (): Promise<DndCharacterClassDocument[]> => {
    try {
      const response = await compendiumClient.getAllCompendiumEntries({
        pluginId: 'dnd-5e-2024',
        documentType: 'vtt-document',
        pluginDocumentType: 'character-class'
      });
      // Extract the actual D&D class documents from compendium entries
      return response.entries.map((entry: ICompendiumEntry) => entry.content as DndCharacterClassDocument);
    } catch (error) {
      console.error('Failed to fetch classes:', error);
      throw new Error('Failed to load character classes');
    }
  };

  const fetchSpecies = async (): Promise<DndSpeciesDocument[]> => {
    try {
      const response = await compendiumClient.getAllCompendiumEntries({
        pluginId: 'dnd-5e-2024',
        documentType: 'vtt-document',
        pluginDocumentType: 'species'
      });
      // Extract the actual D&D species documents from compendium entries
      return response.entries.map((entry: ICompendiumEntry) => entry.content as DndSpeciesDocument);
    } catch (error) {
      console.error('Failed to fetch species:', error);
      throw new Error('Failed to load character species');
    }
  };

  const fetchBackgrounds = async (): Promise<DndBackgroundDocument[]> => {
    try {
      const response = await compendiumClient.getAllCompendiumEntries({
        pluginId: 'dnd-5e-2024',
        documentType: 'vtt-document',
        pluginDocumentType: 'background'
      });
      // Extract the actual D&D background documents from compendium entries
      return response.entries.map((entry: ICompendiumEntry) => entry.content as DndBackgroundDocument);
    } catch (error) {
      console.error('Failed to fetch backgrounds:', error);
      throw new Error('Failed to load character backgrounds');
    }
  };

  const fetchLanguages = async (): Promise<DndLanguageDocument[]> => {
    try {
      const response = await compendiumClient.getAllCompendiumEntries({
        pluginId: 'dnd-5e-2024',
        documentType: 'vtt-document',
        pluginDocumentType: 'language'
      });
      // Extract the actual D&D language documents from compendium entries
      return response.entries.map((entry: ICompendiumEntry) => entry.content as DndLanguageDocument);
    } catch (error) {
      console.error('Failed to fetch languages:', error);
      throw new Error('Failed to load languages');
    }
  };

  const fetchItemGroup = async (groupId: string): Promise<any> => {
    try {
      // groupId is now an ObjectId string, use the single entry endpoint
      const entry = await compendiumClient.getCompendiumEntry(groupId);
      return entry.content;
    } catch (error) {
      console.error(`Failed to fetch item group '${groupId}':`, error);
      throw new Error(`Failed to load item group`);
    }
  };

  const fetchItems = async (itemIds: string[]): Promise<any[]> => {
    try {
      // itemIds are now ObjectId strings, fetch each item individually
      const items = await Promise.all(
        itemIds.map(async (itemId) => {
          try {
            const entry = await compendiumClient.getCompendiumEntry(itemId);
            return entry.content;
          } catch (error) {
            console.warn(`Item '${itemId}' not found:`, error);
            return null;
          }
        })
      );
      
      return items.filter(Boolean);
    } catch (error) {
      console.error('Failed to fetch items:', error);
      throw new Error('Failed to load items');
    }
  };

  // General function to get all items in a group - will be reused for other group-choice proficiencies
  const fetchItemsInGroup = async (groupId: string): Promise<any[]> => {
    try {
      // First get the item group
      const itemGroup = await fetchItemGroup(groupId);
      
      // Extract item IDs from the group
      // Handle both resolved ObjectIds and reference structures
      const itemIds = itemGroup.pluginData.items.map((item: any) => {
        if (typeof item === 'string') {
          // Already resolved to ObjectId
          return item;
        } else if (item._ref) {
          // Reference structure (shouldn't happen but handle it)
          return item._ref.id || item._ref.slug;
        }
        return item;
      }).filter(Boolean);
      
      // Fetch all items in the group
      return await fetchItems(itemIds);
    } catch (error) {
      console.error(`Failed to fetch items in group '${groupId}':`, error);
      throw new Error(`Failed to load items in group`);
    }
  };

  // Character creation completion
  const getCharacterData = (): CharacterCreationFormData | null => {
    if (!validateCompleteForm()) {
      return null;
    }
    
    return {
      class: state.characterData.class!,
      origin: state.characterData.origin!,
      abilities: state.characterData.abilities!,
      details: state.characterData.details!
    };
  };

  const createCompleteCharacterData = (basicInfo: BasicCharacterInfo): Record<string, unknown> => {
    const characterData = getCharacterData();
    if (!characterData) {
      throw new Error('Character data is not complete or valid');
    }

    // First gather the creator format data (same as before)
    const creatorData = {
      // Basic info from main system
      name: basicInfo.name,
      description: basicInfo.description,
      avatarImage: basicInfo.avatarImage,
      tokenImage: basicInfo.tokenImage,
      
      // D&D 5e specific data
      gameSystem: 'dnd-5e-2024',
      characterClass: {
        id: characterData.class.id,
        name: characterData.class.name,
        selectedSkills: characterData.class.selectedSkills,
        selectedTools: characterData.class.selectedTools,
        selectedEquipment: characterData.class.selectedEquipment
      },
      species: {
        id: characterData.origin.species.id,
        name: characterData.origin.species.name,
        subspecies: characterData.origin.species.subspecies
      },
      background: {
        id: characterData.origin.background.id,
        name: characterData.origin.background.name,
        selectedEquipment: characterData.origin.background.selectedEquipment
      },
      languages: characterData.origin.selectedLanguages.map(lang => lang.name),
      abilityScores: {
        method: characterData.abilities.method,
        strength: characterData.abilities.strength,
        dexterity: characterData.abilities.dexterity,
        constitution: characterData.abilities.constitution,
        intelligence: characterData.abilities.intelligence,
        wisdom: characterData.abilities.wisdom,
        charisma: characterData.abilities.charisma,
        backgroundChoice: characterData.abilities.backgroundChoice
      },
      alignment: characterData.details.alignment,
      personalDetails: {
        age: characterData.details.age,
        height: characterData.details.height,
        weight: characterData.details.weight,
        eyes: characterData.details.eyes,
        hair: characterData.details.hair,
        skin: characterData.details.skin
      },
      personality: {
        traits: characterData.details.personalityTraits,
        ideals: characterData.details.ideals,
        bonds: characterData.details.bonds,
        flaws: characterData.details.flaws
      },
      backstory: characterData.details.backstory,
      allies: characterData.details.allies,
      additionalFeatures: characterData.details.additionalFeatures
    };
    
    // Now transform creator data to proper D&D schema format
    const transformedPluginData = transformCharacterCreatorData(creatorData);
    
    // Return complete document structure
    return {
      // Document-level fields
      name: creatorData.name,
      description: creatorData.description || '',
      // Only include image fields if they have actual values (not null)
      ...(creatorData.avatarImage && { imageId: creatorData.avatarImage }),
      ...(creatorData.tokenImage && { thumbnailId: creatorData.tokenImage }),
      
      // Plugin-specific data in proper D&D schema format
      pluginData: transformedPluginData
    };
  };
  
  // Internal transformation function to convert creator data to D&D schema
  const transformCharacterCreatorData = (creatorData: any) => {
    // Transform simple ability scores to complex D&D schema format
    const abilities = {
      strength: {
        base: creatorData.abilityScores.strength,
        racial: creatorData.abilityScores.backgroundChoice?.plus2 === 'strength' ? 2 : 
                creatorData.abilityScores.backgroundChoice?.plus1 === 'strength' ? 1 : 0,
        enhancement: 0,
        saveProficient: creatorData.characterClass.id === 'character-class-wizard' ? false : false, // Wizard has Int/Wis saves
        saveBonus: 0
      },
      dexterity: {
        base: creatorData.abilityScores.dexterity,
        racial: creatorData.abilityScores.backgroundChoice?.plus2 === 'dexterity' ? 2 : 
                creatorData.abilityScores.backgroundChoice?.plus1 === 'dexterity' ? 1 : 0,
        enhancement: 0,
        saveProficient: false,
        saveBonus: 0
      },
      constitution: {
        base: creatorData.abilityScores.constitution,
        racial: creatorData.abilityScores.backgroundChoice?.plus2 === 'constitution' ? 2 : 
                creatorData.abilityScores.backgroundChoice?.plus1 === 'constitution' ? 1 : 0,
        enhancement: 0,
        saveProficient: false,
        saveBonus: 0
      },
      intelligence: {
        base: creatorData.abilityScores.intelligence,
        racial: creatorData.abilityScores.backgroundChoice?.plus2 === 'intelligence' ? 2 : 
                creatorData.abilityScores.backgroundChoice?.plus1 === 'intelligence' ? 1 : 0,
        enhancement: 0,
        saveProficient: creatorData.characterClass.id === 'character-class-wizard',
        saveBonus: 0
      },
      wisdom: {
        base: creatorData.abilityScores.wisdom,
        racial: creatorData.abilityScores.backgroundChoice?.plus2 === 'wisdom' ? 2 : 
                creatorData.abilityScores.backgroundChoice?.plus1 === 'wisdom' ? 1 : 0,
        enhancement: 0,
        saveProficient: creatorData.characterClass.id === 'character-class-wizard',
        saveBonus: 0
      },
      charisma: {
        base: creatorData.abilityScores.charisma,
        racial: creatorData.abilityScores.backgroundChoice?.plus2 === 'charisma' ? 2 : 
                creatorData.abilityScores.backgroundChoice?.plus1 === 'charisma' ? 1 : 0,
        enhancement: 0,
        saveProficient: false,
        saveBonus: 0
      }
    };
    
    // Build proper D&D schema structure
    return {
      name: creatorData.name,
      
      // Character origin (2024 system)
      species: {
        id: creatorData.species.id,
        name: creatorData.species.name
      },
      background: {
        id: creatorData.background.id,
        name: creatorData.background.name
      },
      
      // Character classes (array format for multiclassing)
      classes: [{
        class: {
          id: creatorData.characterClass.id,
          name: creatorData.characterClass.name
        },
        level: 1
      }],
      
      // Character progression
      progression: {
        level: 1,
        experiencePoints: 0,
        proficiencyBonus: 2,
        classLevels: {
          [creatorData.characterClass.id]: 1
        },
        hitDice: {
          [creatorData.characterClass.id]: {
            total: 1,
            used: 0
          }
        }
      },
      
      // Core attributes with defaults
      attributes: {
        hitPoints: {
          current: 8, // Base + Con modifier - simplified for now
          maximum: 8,
          temporary: 0
        },
        armorClass: {
          value: 10,
          calculation: 'natural' as const
        },
        initiative: {
          bonus: 0,
          advantage: false
        },
        movement: {
          walk: 30
        },
        deathSaves: {
          successes: 0,
          failures: 0
        },
        exhaustion: 0,
        inspiration: false
      },
      
      // Ability scores
      abilities,
      
      // Skills (simplified - mark selected skills as proficient)
      skills: {
        // This would need to be populated based on selected skills
        // For now, we'll create a basic structure
      },
      
      // Proficiencies
      proficiencies: {
        armor: [],
        weapons: [],
        tools: [],
        languages: creatorData.languages || []
      },
      
      // Inventory with defaults
      inventory: {
        equipped: {},
        carried: [],
        attunedItems: [],
        currency: {
          platinum: 0,
          gold: 0,
          electrum: 0,
          silver: 0,
          copper: 0
        }
      },
      
      // Features and feats
      features: {
        classFeatures: [],
        feats: [],
        speciesTraits: []
      },
      
      // Roleplaying information
      roleplay: {
        alignment: creatorData.alignment,
        personality: creatorData.personality?.traits || '',
        ideals: creatorData.personality?.ideals || '',
        bonds: creatorData.personality?.bonds || '',
        flaws: creatorData.personality?.flaws || '',
        appearance: `Age: ${creatorData.personalDetails?.age || ''}, Height: ${creatorData.personalDetails?.height || ''}, Weight: ${creatorData.personalDetails?.weight || ''}`,
        backstory: creatorData.backstory || ''
      },
      
      // Character size (default Medium for most species)
      size: 'medium' as const,
      
      // Source information
      source: 'character-creator',
      creationDate: new Date(),
      lastModified: new Date()
    };
  };

  return {
    // State (readonly)
    state: readonly(state),
    
    // Computed properties
    currentStepData,
    isFirstStep,
    isLastStep,
    canProceed,
    completionProgress,
    
    // Navigation
    goToStep,
    nextStep,
    previousStep,
    
    // Data updates
    updateClassSelection,
    updateOriginSelection,
    updateAbilityScores,
    updateCharacterDetails,
    
    // Validation
    validateCurrentStep,
    validateAllSteps,
    validateCompleteForm,
    
    // Data fetching
    fetchClasses,
    fetchSpecies,
    fetchBackgrounds,
    fetchLanguages,
    fetchItemGroup,
    fetchItems,
    fetchItemsInGroup,
    
    // State management
    resetState,
    
    // Character creation
    getCharacterData,
    createCompleteCharacterData,
    
    // Constants
    FORM_STEPS
  };
}