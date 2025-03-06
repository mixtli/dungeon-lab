import { z } from 'zod';
// Ability scores schema
const abilityScoreSchema = z.object({
    score: z.number().min(1).max(30),
    modifier: z.number().min(-5).max(10),
    savingThrow: z.object({
        proficient: z.boolean(),
        bonus: z.number()
    })
});
// Skill schema
const skillSchema = z.object({
    ability: z.enum(['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma']),
    proficient: z.boolean(),
    expertise: z.boolean().optional(),
    bonus: z.number()
});
// Character schema
export const characterSchema = z.object({
    // Basic info
    name: z.string(),
    level: z.number().min(1).max(20),
    race: z.string(),
    class: z.string(),
    background: z.string(),
    alignment: z.enum([
        'lawful good', 'neutral good', 'chaotic good',
        'lawful neutral', 'true neutral', 'chaotic neutral',
        'lawful evil', 'neutral evil', 'chaotic evil'
    ]),
    // Core stats
    experiencePoints: z.number().min(0),
    proficiencyBonus: z.number(),
    armorClass: z.number(),
    initiative: z.number(),
    speed: z.number(),
    hitPoints: z.object({
        maximum: z.number(),
        current: z.number(),
        temporary: z.number().optional()
    }),
    hitDice: z.object({
        total: z.number(),
        current: z.number(),
        type: z.enum(['d6', 'd8', 'd10', 'd12'])
    }),
    // Abilities
    abilities: z.object({
        strength: abilityScoreSchema,
        dexterity: abilityScoreSchema,
        constitution: abilityScoreSchema,
        intelligence: abilityScoreSchema,
        wisdom: abilityScoreSchema,
        charisma: abilityScoreSchema
    }),
    // Skills
    skills: z.object({
        acrobatics: skillSchema,
        animalHandling: skillSchema,
        arcana: skillSchema,
        athletics: skillSchema,
        deception: skillSchema,
        history: skillSchema,
        insight: skillSchema,
        intimidation: skillSchema,
        investigation: skillSchema,
        medicine: skillSchema,
        nature: skillSchema,
        perception: skillSchema,
        performance: skillSchema,
        persuasion: skillSchema,
        religion: skillSchema,
        sleightOfHand: skillSchema,
        stealth: skillSchema,
        survival: skillSchema
    }),
    // Equipment and inventory
    equipment: z.array(z.object({
        id: z.string(),
        quantity: z.number().min(0)
    })),
    // Features and traits
    features: z.array(z.object({
        name: z.string(),
        source: z.string(),
        description: z.string()
    })),
    // Spellcasting
    spellcasting: z.object({
        ability: z.enum(['intelligence', 'wisdom', 'charisma']),
        spellSaveDC: z.number(),
        spellAttackBonus: z.number(),
        spellSlots: z.array(z.object({
            level: z.number().min(1).max(9),
            total: z.number(),
            used: z.number()
        })),
        spells: z.array(z.object({
            id: z.string(),
            prepared: z.boolean().optional()
        }))
    }).optional(),
    // Biography
    biography: z.object({
        appearance: z.string().optional(),
        backstory: z.string().optional(),
        personalityTraits: z.string().optional(),
        ideals: z.string().optional(),
        bonds: z.string().optional(),
        flaws: z.string().optional()
    })
});
// Convert schema to JSON Schema for plugin registration
export const characterJsonSchema = characterSchema.describe('D&D 5E Character');
//# sourceMappingURL=character.mjs.map