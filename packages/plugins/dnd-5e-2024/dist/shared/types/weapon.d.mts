import { z } from 'zod';
export declare const weaponSchema: z.ZodObject<{
    damage: z.ZodString;
    damageType: z.ZodEnum<["slashing", "piercing", "bludgeoning", "acid", "cold", "fire", "force", "lightning", "necrotic", "poison", "psychic", "radiant", "thunder"]>;
    range: z.ZodUnion<[z.ZodLiteral<"melee">, z.ZodObject<{
        normal: z.ZodNumber;
        long: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        normal: number;
        long?: number | undefined;
    }, {
        normal: number;
        long?: number | undefined;
    }>]>;
    properties: z.ZodArray<z.ZodEnum<["ammunition", "finesse", "heavy", "light", "loading", "reach", "special", "thrown", "two-handed", "versatile"]>, "many">;
}, "strip", z.ZodTypeAny, {
    damage: string;
    damageType: "slashing" | "piercing" | "bludgeoning" | "acid" | "cold" | "fire" | "force" | "lightning" | "necrotic" | "poison" | "psychic" | "radiant" | "thunder";
    range: "melee" | {
        normal: number;
        long?: number | undefined;
    };
    properties: ("ammunition" | "finesse" | "heavy" | "light" | "loading" | "reach" | "special" | "thrown" | "two-handed" | "versatile")[];
}, {
    damage: string;
    damageType: "slashing" | "piercing" | "bludgeoning" | "acid" | "cold" | "fire" | "force" | "lightning" | "necrotic" | "poison" | "psychic" | "radiant" | "thunder";
    range: "melee" | {
        normal: number;
        long?: number | undefined;
    };
    properties: ("ammunition" | "finesse" | "heavy" | "light" | "loading" | "reach" | "special" | "thrown" | "two-handed" | "versatile")[];
}>;
export type IWeapon = z.infer<typeof weaponSchema>;
export declare const weaponJsonSchema: {
    type: string;
    required: string[];
    properties: {
        damage: {
            type: string;
        };
        damageType: {
            type: string;
            enum: string[];
        };
        range: {
            oneOf: ({
                type: string;
                enum: string[];
                required?: undefined;
                properties?: undefined;
            } | {
                type: string;
                required: string[];
                properties: {
                    normal: {
                        type: string;
                    };
                    long: {
                        type: string;
                    };
                };
                enum?: undefined;
            })[];
        };
        properties: {
            type: string;
            items: {
                type: string;
                enum: string[];
            };
        };
    };
};
//# sourceMappingURL=weapon.d.mts.map