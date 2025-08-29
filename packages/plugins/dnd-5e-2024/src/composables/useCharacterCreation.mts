import { reactive, computed, readonly } from 'vue';
import { CompendiumsClient } from '@dungeon-lab/client/index.mjs';
import type { ICompendiumEntry } from '@dungeon-lab/shared/types/index.mjs';
import { resolveReferenceOrObjectId, resolveMultipleReferences } from '@dungeon-lab/shared/utils/index.mjs';
import type { ReferenceOrObjectId } from '@dungeon-lab/shared/types/reference.mjs';
import type { EquipmentSelections } from '../utils/equipment-processor.mjs';
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
import type { DndCharacterClassDocument, DndBackgroundDocument, DndSpeciesDocument } from '../types/dnd/index.mjs';

// Type definitions for better type safety
interface ItemGroupEntry {
  pluginData: {
    items: Array<string | { _ref?: { id?: string; slug?: string } }>;
  };
}

interface ItemWithReference {
  _ref?: {
    id?: string;
    slug?: string;
  };
}
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

  // Create client instances
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
  const fetchClasses = async (): Promise<Array<{entryId: string, document: DndCharacterClassDocument}>> => {
    try {
      const response = await compendiumClient.getAllCompendiumEntries({
        pluginId: 'dnd-5e-2024',
        documentType: 'vtt-document',
        pluginDocumentType: 'character-class'
      });
      // Return both compendium entry ObjectId and document content
      return response.entries.map((entry: ICompendiumEntry) => ({
        entryId: entry.id,
        document: entry.content as DndCharacterClassDocument
      }));
    } catch (error) {
      console.error('Failed to fetch classes:', error);
      throw new Error('Failed to load character classes');
    }
  };

  const fetchSpecies = async (): Promise<Array<{entryId: string, document: DndSpeciesDocument}>> => {
    try {
      const response = await compendiumClient.getAllCompendiumEntries({
        pluginId: 'dnd-5e-2024',
        documentType: 'vtt-document',
        pluginDocumentType: 'species'
      });
      // Return both compendium entry ObjectId and document content
      return response.entries.map((entry: ICompendiumEntry) => ({
        entryId: entry.id,
        document: entry.content as DndSpeciesDocument
      }));
    } catch (error) {
      console.error('Failed to fetch species:', error);
      throw new Error('Failed to load character species');
    }
  };

  const fetchBackgrounds = async (): Promise<Array<{entryId: string, document: DndBackgroundDocument}>> => {
    try {
      const response = await compendiumClient.getAllCompendiumEntries({
        pluginId: 'dnd-5e-2024',
        documentType: 'vtt-document',
        pluginDocumentType: 'background'
      });
      // Return both compendium entry ObjectId and document content
      return response.entries.map((entry: ICompendiumEntry) => ({
        entryId: entry.id,
        document: entry.content as DndBackgroundDocument
      }));
    } catch (error) {
      console.error('Failed to fetch backgrounds:', error);
      throw new Error('Failed to load character backgrounds');
    }
  };

  const fetchLanguages = async (): Promise<Array<{entryId: string, document: DndLanguageDocument}>> => {
    try {
      const response = await compendiumClient.getAllCompendiumEntries({
        pluginId: 'dnd-5e-2024',
        documentType: 'vtt-document',
        pluginDocumentType: 'language'
      });
      // Return both compendium entry ObjectId and document content
      return response.entries.map((entry: ICompendiumEntry) => ({
        entryId: entry.id,
        document: entry.content as DndLanguageDocument
      }));
    } catch (error) {
      console.error('Failed to fetch languages:', error);
      throw new Error('Failed to load languages');
    }
  };

  const fetchItemGroup = async (groupId: string): Promise<ItemGroupEntry> => {
    try {
      // groupId is now an ObjectId string, use the single entry endpoint
      const entry = await compendiumClient.getCompendiumEntry(groupId);
      return entry.content;
    } catch (error) {
      console.error(`Failed to fetch item group '${groupId}':`, error);
      throw new Error(`Failed to load item group`);
    }
  };

  const fetchItems = async (itemIds: string[]): Promise<ICompendiumEntry[]> => {
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
  const fetchItemsInGroup = async (groupId: string): Promise<ICompendiumEntry[]> => {
    try {
      // First get the item group
      const itemGroup = await fetchItemGroup(groupId);
      
      // Extract item IDs from the group
      // Handle both resolved ObjectIds and reference structures
      const itemIds = itemGroup.pluginData.items.map((item: string | ItemWithReference) => {
        if (typeof item === 'string') {
          // Already resolved to ObjectId
          return item;
        } else if (item._ref) {
          // Reference structure (shouldn't happen but handle it)
          return item._ref.id || item._ref.slug;
        }
        return item;
      }).filter((item): item is string => Boolean(item) && typeof item === 'string');
      
      // Fetch all items in the group
      return await fetchItems(itemIds);
    } catch (error) {
      console.error(`Failed to fetch items in group '${groupId}':`, error);
      throw new Error(`Failed to load items in group`);
    }
  };

  // Reference resolution utilities using the composable's compendium client
  const resolveReference = async (reference: ReferenceOrObjectId, fallback = 'Unknown'): Promise<string> => {
    return resolveReferenceOrObjectId(reference, compendiumClient, { fallback });
  };

  const resolveReferences = async (references: ReferenceOrObjectId[], fallback = 'Unknown'): Promise<string[]> => {
    return resolveMultipleReferences(references, compendiumClient, { fallback });
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

  // Calculate starting gold from equipment choices
  const calculateStartingGold = async (characterData: CharacterCreationFormData): Promise<number> => {
    let totalGold = 0;

    try {
      // Get class document to check equipment choices
      const classDocument = await compendiumClient.getCompendiumEntry(characterData.class.id);
      const classData = classDocument.content as DndCharacterClassDocument;
      
      // Check if class equipment choice gives gold
      if (classData.pluginData.startingEquipment) {
        const selectedChoice = classData.pluginData.startingEquipment.find(
          (option: { label: string; gold?: number }) => option.label === characterData.class.selectedEquipment
        );
        if (selectedChoice?.gold) {
          totalGold += selectedChoice.gold;
        }
      }

      // Check background equipment choice
      if (characterData.origin.background.selectedEquipment === 'gold') {
        // Background gold alternative is always 50 GP
        totalGold += 50;
      }

      return totalGold;
    } catch (error) {
      console.error('Failed to calculate starting gold:', error);
      return 0; // Default to 0 if calculation fails
    }
  };

  // Prepare equipment items data without creating documents
  const prepareEquipmentItemsData = async (
    equipmentSelections: EquipmentSelections,
    classDocument: DndCharacterClassDocument,
    backgroundDocument: DndBackgroundDocument
  ): Promise<Array<{ entryId: string; quantity: number }>> => {
    const itemsToCreate: { entryId: string; quantity: number }[] = [];
    
    try {
      // Collect items from class equipment choice
      const classData = classDocument.pluginData;
      if (classData.startingEquipment) {
        const selectedChoice = classData.startingEquipment.find(
          (option: unknown) => (option as { label: string }).label === equipmentSelections.classEquipment
        );
        if (selectedChoice && typeof selectedChoice === 'object' && 'items' in selectedChoice && Array.isArray((selectedChoice as { items: unknown[] }).items)) {
          for (const entry of (selectedChoice as { items: Array<{ item: unknown; quantity: number }> }).items) {
            const entryId = typeof entry.item === 'string' ? entry.item : 
                           (entry.item && typeof entry.item === 'object' && '_ref' in entry.item ? 
                            (entry.item as { _ref: { slug?: string } })._ref?.slug : undefined) || 'unknown';
            itemsToCreate.push({
              entryId,
              quantity: entry.quantity || 1
            });
          }
        }
      }

      // Collect items from background equipment choice
      if (equipmentSelections.backgroundEquipment === 'package') {
        const backgroundData = backgroundDocument.pluginData;
        const equipmentPackage = backgroundData.equipment.equipmentPackage;
        if (equipmentPackage?.items) {
          for (const entry of equipmentPackage.items) {
            if (entry.item) {
              const entryId = typeof entry.item === 'string' ? entry.item : 
                           (entry.item && typeof entry.item === 'object' && '_ref' in entry.item ? 
                            (entry.item as { _ref: { slug?: string } })._ref?.slug : undefined) || 'unknown';
              itemsToCreate.push({
                entryId,
                quantity: entry.quantity || 1
              });
            }
          }
        }
      }

      // Prepare item document data from compendium entries
      const itemsData = [];
      for (const { entryId, quantity } of itemsToCreate) {
        try {
          // Get compendium entry
          const compendiumEntry = await compendiumClient.getCompendiumEntry(entryId);
          
          if (!compendiumEntry || !compendiumEntry.content) {
            console.warn(`Could not find compendium entry: ${entryId}`);
            continue;
          }

          // Prepare item document data
          const contentData = { ...compendiumEntry.content };
          if (contentData.imageId && typeof contentData.imageId === 'object' && '_id' in contentData.imageId) {
            contentData.imageId = contentData.imageId._id;
          }
          if (contentData.tokenImageId && typeof contentData.tokenImageId === 'object' && '_id' in contentData.tokenImageId) {
            contentData.tokenImageId = contentData.tokenImageId._id;
          }
          
          const itemData = {
            ...contentData,
            // Will be set by web client: ownerId, carrierId
            // Set initial item state
            itemState: {
              equipped: false, // Default to not equipped
              quantity: quantity || 1
            }
          };

          itemsData.push(itemData);
        } catch (error) {
          console.error(`Failed to prepare item data from compendium entry ${entryId}:`, error);
        }
      }

      return itemsData;
    } catch (error) {
      console.error('Failed to prepare equipment items data:', error);
      return [];
    }
  };

  const prepareCharacterCreationData = async (basicInfo: BasicCharacterInfo): Promise<{ characterData: unknown; itemsData: Array<{ entryId: string; quantity: number }> }> => {
    const characterData = getCharacterData();
    if (!characterData) {
      throw new Error('Character data is not complete or valid');
    }

    try {
      // Calculate starting gold from equipment choices
      const startingGold = await calculateStartingGold(characterData);
      
      // Transform character data to proper D&D schema format with calculated currency
      const transformedPluginData = await transformCharacterCreatorData(characterData, basicInfo, startingGold);
      
      // Prepare character document data (don't create yet)
      const characterDocumentData = {
        // Document-level fields
        name: basicInfo.name,
        description: basicInfo.description || '',
        documentType: 'character' as const,
        pluginDocumentType: 'character',
        pluginId: 'dnd-5e-2024',
        userData: {},
        itemState: {}, // Characters don't use itemState, but field is required
        // Image fields will be handled by the web client
        
        // Plugin-specific data in proper D&D schema format
        pluginData: transformedPluginData
      };

      // Prepare equipment items data (don't create yet)
      const equipmentSelections: EquipmentSelections = {
        classEquipment: characterData.class.selectedEquipment,
        backgroundEquipment: characterData.origin.background.selectedEquipment
      };

      // Fetch class and background documents for equipment processing
      const [classDocument, backgroundDocument] = await Promise.all([
        compendiumClient.getCompendiumEntry(characterData.class.id),
        compendiumClient.getCompendiumEntry(characterData.origin.background.id)
      ]);

      const itemsData = await prepareEquipmentItemsData(
        equipmentSelections,
        classDocument.content as DndCharacterClassDocument,
        backgroundDocument.content as DndBackgroundDocument,
      );

      // Return prepared data for web client to create
      return {
        characterData: characterDocumentData,
        itemsData
      };

    } catch (error) {
      console.error('Failed to prepare character creation data:', error);
      throw error;
    }
  };
  
  // Internal transformation function to convert creator data to D&D schema
  const transformCharacterCreatorData = async (creatorData: CharacterCreationFormData, basicInfo: BasicCharacterInfo, startingGold: number = 0) => {
    // Fetch compendium documents for class, species, and background
    const [classDocument, backgroundDocument] = await Promise.all([
      compendiumClient.getCompendiumEntry(creatorData.class.id),
      compendiumClient.getCompendiumEntry(creatorData.origin.background.id)
    ]);
    
    const classData = classDocument.content as DndCharacterClassDocument;
    const backgroundData = backgroundDocument.content as DndBackgroundDocument;
    
    // Helper function to calculate ability modifier
    const calculateAbilityModifier = (score: number): number => {
      return Math.floor((score - 10) / 2);
    };
    
    // Helper function to calculate total ability score (base + racial + enhancement, or override)
    const calculateAbilityTotal = (base: number, racial: number, enhancement: number, override?: number): number => {
      return override ?? (base + racial + enhancement);
    };
    
    // Get saving throw proficiencies from class data
    const classSavingThrows = classData.pluginData.proficiencies.savingThrows || [];
    
    // Transform simple ability scores to complex D&D schema format
    const abilities = {
      strength: (() => {
        const base = creatorData.abilities.strength || 10;
        const racial = creatorData.abilities.backgroundChoice?.strength || 0;
        const enhancement = 0;
        const total = calculateAbilityTotal(base, racial, enhancement);
        return {
          base,
          racial,
          enhancement,
          modifier: calculateAbilityModifier(total),
          total,
          saveProficient: classSavingThrows.includes('strength'),
          saveBonus: 0
        };
      })(),
      dexterity: (() => {
        const base = creatorData.abilities.dexterity || 10;
        const racial = creatorData.abilities.backgroundChoice?.dexterity || 0;
        const enhancement = 0;
        const total = calculateAbilityTotal(base, racial, enhancement);
        return {
          base,
          racial,
          enhancement,
          modifier: calculateAbilityModifier(total),
          total,
          saveProficient: classSavingThrows.includes('dexterity'),
          saveBonus: 0
        };
      })(),
      constitution: (() => {
        const base = creatorData.abilities.constitution || 10;
        const racial = creatorData.abilities.backgroundChoice?.constitution || 0;
        const enhancement = 0;
        const total = calculateAbilityTotal(base, racial, enhancement);
        return {
          base,
          racial,
          enhancement,
          modifier: calculateAbilityModifier(total),
          total,
          saveProficient: classSavingThrows.includes('constitution'),
          saveBonus: 0
        };
      })(),
      intelligence: (() => {
        const base = creatorData.abilities.intelligence || 10;
        const racial = creatorData.abilities.backgroundChoice?.intelligence || 0;
        const enhancement = 0;
        const total = calculateAbilityTotal(base, racial, enhancement);
        return {
          base,
          racial,
          enhancement,
          modifier: calculateAbilityModifier(total),
          total,
          saveProficient: classSavingThrows.includes('intelligence'),
          saveBonus: 0
        };
      })(),
      wisdom: (() => {
        const base = creatorData.abilities.wisdom || 10;
        const racial = creatorData.abilities.backgroundChoice?.wisdom || 0;
        const enhancement = 0;
        const total = calculateAbilityTotal(base, racial, enhancement);
        return {
          base,
          racial,
          enhancement,
          modifier: calculateAbilityModifier(total),
          total,
          saveProficient: classSavingThrows.includes('wisdom'),
          saveBonus: 0
        };
      })(),
      charisma: (() => {
        const base = creatorData.abilities.charisma || 10;
        const racial = creatorData.abilities.backgroundChoice?.charisma || 0;
        const enhancement = 0;
        const total = calculateAbilityTotal(base, racial, enhancement);
        return {
          base,
          racial,
          enhancement,
          modifier: calculateAbilityModifier(total),
          total,
          saveProficient: classSavingThrows.includes('charisma'),
          saveBonus: 0
        };
      })()
    };
    
    // Build proper D&D schema structure
    return {
      name: basicInfo.name,
      
      // Character origin (2024 system) - send ObjectIds
      species: creatorData.origin.species.id,
      background: creatorData.origin.background.id,
      
      // Selected lineage/subspecies (e.g., "Drow" for Elves)
      lineage: creatorData.origin.species.subspecies,
      
      // Character classes (array format for multiclassing) - send ObjectIds
      classes: [{
        class: creatorData.class.id,
        level: 1
      }],
      
      // Character progression
      progression: {
        level: 1,
        experiencePoints: 0,
        proficiencyBonus: 2,
        classLevels: {
          [creatorData.class.id]: 1
        },
        hitDice: {
          [creatorData.class.id]: {
            total: 1,
            used: 0
          }
        }
      },
      
      // Core attributes calculated from class and ability scores
      attributes: {
        hitPoints: (() => {
          const hitDie = classData.pluginData.hitDie;
          const conModifier = abilities.constitution.modifier;
          const maxHP = hitDie + conModifier;
          return {
            current: maxHP,
            maximum: maxHP,
            temporary: 0
          };
        })(),
        armorClass: {
          value: 10 + abilities.dexterity.modifier, // Base AC + Dex modifier
          calculation: 'natural' as const
        },
        initiative: {
          bonus: abilities.dexterity.modifier,
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
      
      // Skills - mark selected skills as proficient from class and background
      skills: (() => {
        const skillsObj: Record<string, { proficient: boolean; expert: boolean; bonus: number; advantage: boolean; disadvantage: boolean }> = {};
        
        // Initialize all skills as not proficient
        const allSkills = [
          'acrobatics', 'animal handling', 'arcana', 'athletics', 'deception',
          'history', 'insight', 'intimidation', 'investigation', 'medicine',
          'nature', 'perception', 'performance', 'persuasion', 'religion',
          'sleight of hand', 'stealth', 'survival'
        ];
        
        allSkills.forEach(skill => {
          skillsObj[skill] = {
            proficient: false,
            expert: false,
            bonus: 0,
            advantage: false,
            disadvantage: false
          };
        });
        
        // Mark class selected skills as proficient
        if (creatorData.class.selectedSkills) {
          creatorData.class.selectedSkills.forEach(skill => {
            if (skillsObj[skill]) {
              skillsObj[skill].proficient = true;
            }
          });
        }
        
        // Mark background skills as proficient (backgrounds grant 2 fixed skills)
        if (backgroundData.pluginData.skillProficiencies) {
          backgroundData.pluginData.skillProficiencies.forEach((skill: string) => {
            if (skillsObj[skill]) {
              skillsObj[skill].proficient = true;
            }
          });
        }
        
        return skillsObj;
      })(),
      
      // Proficiencies - combine class and background proficiencies
      proficiencies: {
        armor: [...(classData.pluginData.proficiencies.armor || [])],
        weapons: [...(classData.pluginData.proficiencies.weapons || [])],
        tools: [
          // Convert class tool proficiencies to character schema format
          ...(classData.pluginData.proficiencies.tools || []).map((tool: unknown) => {
            const toolName = typeof tool === 'string' ? tool : 
                           (tool && typeof tool === 'object' && '_ref' in tool ? (tool as { _ref: { slug?: string } })._ref?.slug : undefined) || 
                           (tool && typeof tool === 'object' && 'constraint' in tool ? (tool as { constraint: { displayText?: string } }).constraint?.displayText : undefined) || 
                           'unknown-tool';
            return {
              tool: toolName,
              proficient: true,
              expert: false
            };
          }),
          // Add background tool proficiencies (handle both fixed array and choice structure)
          ...(Array.isArray(backgroundData.pluginData.toolProficiencies) 
              ? backgroundData.pluginData.toolProficiencies.map((tool: unknown) => {
                  const toolName = typeof tool === 'string' ? tool : 
                                 (tool && typeof tool === 'object' && '_ref' in tool ? (tool as { _ref: { slug?: string } })._ref?.slug : undefined) || 
                                 (tool && typeof tool === 'object' && 'constraint' in tool ? (tool as { constraint: { displayText?: string } }).constraint?.displayText : undefined) || 
                                 'unknown-tool';
                  return {
                    tool: toolName,
                    proficient: true,
                    expert: false
                  };
                })
              : []) // For now, skip choice-based tool proficiencies (TODO: handle genericChoiceSchema)
        ],
        languages: creatorData.origin.selectedLanguages?.map(lang => lang.id) || [] // Send ObjectIds
      },
      
      // Character currency (calculated from equipment choices)
      currency: {
        platinum: 0,
        gold: startingGold,
        electrum: 0,
        silver: 0,
        copper: 0
      },
      
      // Features and feats
      features: {
        classFeatures: (() => {
          const classFeatures: Array<{
            name: string;
            class: string;
            level: number;
            description?: string;
            uses?: {
              current: number;
              maximum: number;
              per: 'short' | 'long' | 'turn' | 'round' | 'encounter' | 'daily';
            };
          }> = [];
          
          // Add level 1 class features
          const level1Features = classData.pluginData.features.filter((feature: unknown) => (feature as { level: number }).level === 1);
          
          for (const feature of level1Features) {
            const characterFeature: {
              name: string;
              class: string;
              level: number;
              description: string;
              [key: string]: unknown;
            } = {
              name: feature.name,
              class: creatorData.class.id, // Class ObjectId
              level: feature.level,
              description: feature.description
            };
            
            // Transform uses from class definition to character runtime state
            if (feature.uses) {
              characterFeature.uses = {
                current: feature.uses.value, // Start with full uses
                maximum: feature.uses.value,
                per: feature.uses.per
              };
            }
            
            classFeatures.push(characterFeature);
          }
          
          return classFeatures;
        })(),
        feats: (() => {
          const feats: string[] = [];
          
          // Add origin feat from background
          if (backgroundData.pluginData.originFeat?.feat) {
            const originFeatRef = backgroundData.pluginData.originFeat.feat;
            if (typeof originFeatRef === 'string') {
              // Already resolved ObjectId string
              feats.push(originFeatRef);
            } else if (originFeatRef && typeof originFeatRef === 'object' && '_ref' in originFeatRef) {
              // Reference object - this shouldn't happen in runtime but handle gracefully
              console.warn('Origin feat is unresolved reference, skipping:', originFeatRef);
            }
          }
          
          return feats;
        })(),
        speciesTraits: []
      },
      
      // Roleplaying information
      roleplay: {
        alignment: creatorData.details.alignment,
        personality: creatorData.details.personalityTraits || '',
        ideals: creatorData.details.ideals || '',
        bonds: creatorData.details.bonds || '',
        flaws: creatorData.details.flaws || '',
        appearance: `Age: ${creatorData.details.age || ''}, Height: ${creatorData.details.height || ''}, Weight: ${creatorData.details.weight || ''}`,
        backstory: creatorData.details.backstory || ''
      },
      
      // Character size (default Medium for most species)
      size: 'medium' as const,
      
      // Source information
      source: 'character-creator'
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
    
    // Reference resolution
    resolveReference,
    resolveReferences,
    
    // State management
    resetState,
    
    // Character creation
    getCharacterData,
    prepareCharacterCreationData,
    
    // Constants
    FORM_STEPS
  };
}