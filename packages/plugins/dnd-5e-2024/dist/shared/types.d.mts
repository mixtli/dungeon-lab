import { z } from 'zod';
export declare const dndCharacterDataSchema: z.ZodObject<{
    species: z.ZodString;
    classes: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        level: z.ZodNumber;
        subclass: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        level: number;
        subclass?: string | undefined;
    }, {
        name: string;
        level: number;
        subclass?: string | undefined;
    }>, "many">;
    alignment: z.ZodString;
    speed: z.ZodObject<{
        walk: z.ZodNumber;
        fly: z.ZodOptional<z.ZodNumber>;
        swim: z.ZodOptional<z.ZodNumber>;
        climb: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        walk: number;
        fly?: number | undefined;
        swim?: number | undefined;
        climb?: number | undefined;
    }, {
        walk: number;
        fly?: number | undefined;
        swim?: number | undefined;
        climb?: number | undefined;
    }>;
    hitPoints: z.ZodObject<{
        current: z.ZodNumber;
        maximum: z.ZodNumber;
        temporary: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        maximum: number;
        current: number;
        temporary?: number | undefined;
    }, {
        maximum: number;
        current: number;
        temporary?: number | undefined;
    }>;
    abilityScores: z.ZodObject<{
        strength: z.ZodNumber;
        dexterity: z.ZodNumber;
        constitution: z.ZodNumber;
        intelligence: z.ZodNumber;
        wisdom: z.ZodNumber;
        charisma: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        strength: number;
        dexterity: number;
        constitution: number;
        intelligence: number;
        wisdom: number;
        charisma: number;
    }, {
        strength: number;
        dexterity: number;
        constitution: number;
        intelligence: number;
        wisdom: number;
        charisma: number;
    }>;
    skills: z.ZodRecord<z.ZodString, z.ZodObject<{
        proficient: z.ZodBoolean;
        expertise: z.ZodOptional<z.ZodBoolean>;
        bonus: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        proficient: boolean;
        bonus: number;
        expertise?: boolean | undefined;
    }, {
        proficient: boolean;
        bonus: number;
        expertise?: boolean | undefined;
    }>>;
    armorClass: z.ZodObject<{
        base: z.ZodNumber;
        bonus: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        base: number;
        bonus?: number | undefined;
    }, {
        base: number;
        bonus?: number | undefined;
    }>;
    savingThrows: z.ZodRecord<z.ZodString, z.ZodObject<{
        proficient: z.ZodBoolean;
        bonus: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        proficient: boolean;
        bonus: number;
    }, {
        proficient: boolean;
        bonus: number;
    }>>;
    languages: z.ZodArray<z.ZodString, "many">;
    background: z.ZodObject<{
        name: z.ZodString;
        trait: z.ZodString;
        ideal: z.ZodString;
        bond: z.ZodString;
        flaw: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        name: string;
        trait: string;
        ideal: string;
        bond: string;
        flaw: string;
    }, {
        name: string;
        trait: string;
        ideal: string;
        bond: string;
        flaw: string;
    }>;
    details: z.ZodObject<{
        age: z.ZodOptional<z.ZodNumber>;
        height: z.ZodOptional<z.ZodString>;
        weight: z.ZodOptional<z.ZodString>;
        eyes: z.ZodOptional<z.ZodString>;
        skin: z.ZodOptional<z.ZodString>;
        hair: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        age?: number | undefined;
        height?: string | undefined;
        weight?: string | undefined;
        eyes?: string | undefined;
        skin?: string | undefined;
        hair?: string | undefined;
    }, {
        age?: number | undefined;
        height?: string | undefined;
        weight?: string | undefined;
        eyes?: string | undefined;
        skin?: string | undefined;
        hair?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    background: {
        name: string;
        trait: string;
        ideal: string;
        bond: string;
        flaw: string;
    };
    alignment: string;
    armorClass: {
        base: number;
        bonus?: number | undefined;
    };
    speed: {
        walk: number;
        fly?: number | undefined;
        swim?: number | undefined;
        climb?: number | undefined;
    };
    hitPoints: {
        maximum: number;
        current: number;
        temporary?: number | undefined;
    };
    skills: Record<string, {
        proficient: boolean;
        bonus: number;
        expertise?: boolean | undefined;
    }>;
    species: string;
    classes: {
        name: string;
        level: number;
        subclass?: string | undefined;
    }[];
    abilityScores: {
        strength: number;
        dexterity: number;
        constitution: number;
        intelligence: number;
        wisdom: number;
        charisma: number;
    };
    savingThrows: Record<string, {
        proficient: boolean;
        bonus: number;
    }>;
    languages: string[];
    details: {
        age?: number | undefined;
        height?: string | undefined;
        weight?: string | undefined;
        eyes?: string | undefined;
        skin?: string | undefined;
        hair?: string | undefined;
    };
}, {
    background: {
        name: string;
        trait: string;
        ideal: string;
        bond: string;
        flaw: string;
    };
    alignment: string;
    armorClass: {
        base: number;
        bonus?: number | undefined;
    };
    speed: {
        walk: number;
        fly?: number | undefined;
        swim?: number | undefined;
        climb?: number | undefined;
    };
    hitPoints: {
        maximum: number;
        current: number;
        temporary?: number | undefined;
    };
    skills: Record<string, {
        proficient: boolean;
        bonus: number;
        expertise?: boolean | undefined;
    }>;
    species: string;
    classes: {
        name: string;
        level: number;
        subclass?: string | undefined;
    }[];
    abilityScores: {
        strength: number;
        dexterity: number;
        constitution: number;
        intelligence: number;
        wisdom: number;
        charisma: number;
    };
    savingThrows: Record<string, {
        proficient: boolean;
        bonus: number;
    }>;
    languages: string[];
    details: {
        age?: number | undefined;
        height?: string | undefined;
        weight?: string | undefined;
        eyes?: string | undefined;
        skin?: string | undefined;
        hair?: string | undefined;
    };
}>;
export declare const dndWeaponDataSchema: z.ZodObject<{
    damage: z.ZodObject<{
        diceCount: z.ZodNumber;
        diceType: z.ZodNumber;
        type: z.ZodString;
        bonus: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        type: string;
        diceCount: number;
        diceType: number;
        bonus?: number | undefined;
    }, {
        type: string;
        diceCount: number;
        diceType: number;
        bonus?: number | undefined;
    }>;
    properties: z.ZodArray<z.ZodString, "many">;
    throwRange: z.ZodOptional<z.ZodObject<{
        normal: z.ZodNumber;
        maximum: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        maximum: number;
        normal: number;
    }, {
        maximum: number;
        normal: number;
    }>>;
}, "strip", z.ZodTypeAny, {
    damage: {
        type: string;
        diceCount: number;
        diceType: number;
        bonus?: number | undefined;
    };
    properties: string[];
    throwRange?: {
        maximum: number;
        normal: number;
    } | undefined;
}, {
    damage: {
        type: string;
        diceCount: number;
        diceType: number;
        bonus?: number | undefined;
    };
    properties: string[];
    throwRange?: {
        maximum: number;
        normal: number;
    } | undefined;
}>;
export declare const dndSpellDataSchema: z.ZodObject<{
    level: z.ZodNumber;
    castingTime: z.ZodString;
    rangeArea: z.ZodString;
    attackSave: z.ZodOptional<z.ZodString>;
    duration: z.ZodString;
    damageEffect: z.ZodString;
    components: z.ZodArray<z.ZodString, "many">;
    school: z.ZodString;
}, "strip", z.ZodTypeAny, {
    level: number;
    school: string;
    castingTime: string;
    components: string[];
    duration: string;
    rangeArea: string;
    damageEffect: string;
    attackSave?: string | undefined;
}, {
    level: number;
    school: string;
    castingTime: string;
    components: string[];
    duration: string;
    rangeArea: string;
    damageEffect: string;
    attackSave?: string | undefined;
}>;
export type DndCharacterData = z.infer<typeof dndCharacterDataSchema>;
export type DndWeaponData = z.infer<typeof dndWeaponDataSchema>;
export type DndSpellData = z.infer<typeof dndSpellDataSchema>;
//# sourceMappingURL=types.d.mts.map