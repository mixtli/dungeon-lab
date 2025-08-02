/**
 * D&D 5e Skills and Default Skill List
 */

export type ProficiencyLevel = 'none' | 'proficient' | 'expertise' | 'half';

export interface SkillData {
  ability: string;
  proficiency: ProficiencyLevel;
  modifiers: number[];
}

/**
 * Default skill list for D&D 5e
 * Maps skill names to their governing ability and default proficiency
 */
export const DEFAULT_SKILLS: Record<string, SkillData> = {
  athletics: { ability: 'strength', proficiency: 'none', modifiers: [] },
  acrobatics: { ability: 'dexterity', proficiency: 'none', modifiers: [] },
  'sleight-of-hand': { ability: 'dexterity', proficiency: 'none', modifiers: [] },
  stealth: { ability: 'dexterity', proficiency: 'none', modifiers: [] },
  arcana: { ability: 'intelligence', proficiency: 'none', modifiers: [] },
  history: { ability: 'intelligence', proficiency: 'none', modifiers: [] },
  investigation: { ability: 'intelligence', proficiency: 'none', modifiers: [] },
  nature: { ability: 'intelligence', proficiency: 'none', modifiers: [] },
  religion: { ability: 'intelligence', proficiency: 'none', modifiers: [] },
  'animal-handling': { ability: 'wisdom', proficiency: 'none', modifiers: [] },
  insight: { ability: 'wisdom', proficiency: 'none', modifiers: [] },
  medicine: { ability: 'wisdom', proficiency: 'none', modifiers: [] },
  perception: { ability: 'wisdom', proficiency: 'none', modifiers: [] },
  survival: { ability: 'wisdom', proficiency: 'none', modifiers: [] },
  deception: { ability: 'charisma', proficiency: 'none', modifiers: [] },
  intimidation: { ability: 'charisma', proficiency: 'none', modifiers: [] },
  performance: { ability: 'charisma', proficiency: 'none', modifiers: [] },
  persuasion: { ability: 'charisma', proficiency: 'none', modifiers: [] },
};