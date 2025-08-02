import { z } from 'zod';

// Base interface for form steps
export interface FormStep {
  id: string;
  name: string;
  component: string;
}

// Tool group selection for group-choice tool proficiencies
export interface ToolGroupSelection {
  groupId: string;          // The slug of the item-group (e.g., 'musical-instrument')
  groupName: string;        // Display name (e.g., 'Musical Instruments')
  selectedItems: string[];  // Array of selected item IDs
}

// Class selection data
export interface ClassSelection {
  id: string;
  name: string;
  selectedSkills: string[];
  selectedTools: ToolGroupSelection[];  // New: tool group selections
  selectedEquipment: 'A' | 'B';
}

// Species data
export interface SpeciesSelection {
  id: string;
  name: string;
  subspecies?: string;
}

// Background data
export interface BackgroundSelection {
  id: string;
  name: string;
  selectedEquipment: string;
}

// Language selection for origins
export interface LanguageSelection {
  id: string;
  name: string;
}

// Origin combines species and background
export interface OriginSelection {
  species: SpeciesSelection;
  background: BackgroundSelection;
  selectedLanguages: LanguageSelection[];
}

// Background ability score choice (D&D 2024: 3 points to distribute, max +2 per ability)
export interface BackgroundAbilityChoice {
  // Map of ability name to bonus points (0-2)
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
}

// Ability scores
export interface AbilityScores {
  method: 'standard' | 'pointbuy' | 'roll';
  pointsRemaining: number;
  availableScores: number[];
  // Base scores before any bonuses (optional during assignment process)
  strength?: number;
  dexterity?: number;
  constitution?: number;
  intelligence?: number;
  wisdom?: number;
  charisma?: number;
  // Background ability score choices
  backgroundChoice: BackgroundAbilityChoice;
}

// Character details
export interface CharacterDetails {
  alignment: 'lawful-good' | 'neutral-good' | 'chaotic-good' | 
           'lawful-neutral' | 'true-neutral' | 'chaotic-neutral' |
           'lawful-evil' | 'neutral-evil' | 'chaotic-evil';
  age?: string;
  height?: string;
  weight?: string;
  eyes?: string;
  hair?: string;
  skin?: string;
  personalityTraits?: string;
  ideals?: string;
  bonds?: string;
  flaws?: string;
  backstory?: string;
  allies?: string;
  additionalFeatures?: string;
}

// Main character creation state
export interface CharacterCreationState {
  currentStep: number;
  characterData: {
    class: ClassSelection | null;
    origin: OriginSelection | null;
    abilities: AbilityScores | null;
    details: CharacterDetails | null;
  };
  validationErrors: Record<string, string[]>;
  isValid: boolean;
}

// Basic info from main system
export interface BasicCharacterInfo {
  name: string;
  description: string;
  avatarImage: File | null;
  tokenImage: File | null;
}

// Import actual D&D document types instead of duplicating them
// Compendium data will use: DndCharacterClassDocument, DndSpeciesDocument, DndBackgroundDocument

// Validation schemas using Zod
export const toolGroupSelectionSchema = z.object({
  groupId: z.string().min(1),
  groupName: z.string().min(1),
  selectedItems: z.array(z.string())
});

export const classSelectionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  selectedSkills: z.array(z.string()),
  selectedTools: z.array(toolGroupSelectionSchema),
  selectedEquipment: z.enum(['A', 'B'])
});

export const speciesSelectionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  subspecies: z.string().optional()
});

export const backgroundSelectionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  selectedEquipment: z.string()
});

export const languageSelectionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1)
});

export const originSelectionSchema = z.object({
  species: speciesSelectionSchema,
  background: backgroundSelectionSchema,
  selectedLanguages: z.array(languageSelectionSchema)
});

export const backgroundAbilityChoiceSchema = z.object({
  strength: z.number().int().min(0).max(2),
  dexterity: z.number().int().min(0).max(2),
  constitution: z.number().int().min(0).max(2),
  intelligence: z.number().int().min(0).max(2),
  wisdom: z.number().int().min(0).max(2),
  charisma: z.number().int().min(0).max(2)
}).refine((data) => {
  // Total points must equal 3
  const totalPoints = data.strength + data.dexterity + data.constitution + 
                     data.intelligence + data.wisdom + data.charisma;
  return totalPoints === 3;
}, {
  message: 'Background ability score bonuses must total exactly 3 points'
});

export const abilityScoresSchema = z.object({
  method: z.enum(['standard', 'pointbuy', 'roll']),
  pointsRemaining: z.number().int().min(0).max(27),
  availableScores: z.array(z.number().int()),
  strength: z.number().int().min(3).max(20).optional(),
  dexterity: z.number().int().min(3).max(20).optional(),
  constitution: z.number().int().min(3).max(20).optional(),
  intelligence: z.number().int().min(3).max(20).optional(),
  wisdom: z.number().int().min(3).max(20).optional(),
  charisma: z.number().int().min(3).max(20).optional(),
  backgroundChoice: backgroundAbilityChoiceSchema
}).refine((data) => {
  // For final validation, ensure all ability scores are assigned when method is standard or roll
  if (data.method === 'standard' || data.method === 'roll') {
    return data.strength !== undefined && 
           data.dexterity !== undefined && 
           data.constitution !== undefined && 
           data.intelligence !== undefined && 
           data.wisdom !== undefined && 
           data.charisma !== undefined;
  }
  return true;
}, {
  message: 'All ability scores must be assigned when using standard array or roll method'
});

export const characterDetailsSchema = z.object({
  alignment: z.enum([
    'lawful-good', 'neutral-good', 'chaotic-good',
    'lawful-neutral', 'true-neutral', 'chaotic-neutral',
    'lawful-evil', 'neutral-evil', 'chaotic-evil'
  ]),
  age: z.string().optional(),
  height: z.string().optional(),
  weight: z.string().optional(),
  eyes: z.string().optional(),
  hair: z.string().optional(),
  skin: z.string().optional(),
  personalityTraits: z.string().optional(),
  ideals: z.string().optional(),
  bonds: z.string().optional(),
  flaws: z.string().optional(),
  backstory: z.string().optional(),
  allies: z.string().optional(),
  additionalFeatures: z.string().optional()
});

// Full character creation form schema
export const characterCreationFormSchema = z.object({
  class: classSelectionSchema,
  origin: originSelectionSchema,
  abilities: abilityScoresSchema,
  details: characterDetailsSchema
});

// Type inference from schemas
export type CharacterCreationFormData = z.infer<typeof characterCreationFormSchema>;
export type PartialCharacterCreationFormData = Partial<CharacterCreationFormData>;