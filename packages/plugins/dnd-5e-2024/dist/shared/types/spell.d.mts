import { z } from 'zod';
export declare const spellSchema: z.ZodObject<{
    level: z.ZodNumber;
    school: z.ZodEnum<["abjuration", "conjuration", "divination", "enchantment", "evocation", "illusion", "necromancy", "transmutation"]>;
    castingTime: z.ZodEnum<["action", "bonus action", "reaction", "1 minute", "10 minutes", "1 hour", "8 hours", "24 hours", "ritual"]>;
    range: z.ZodUnion<[z.ZodLiteral<"self">, z.ZodLiteral<"touch">, z.ZodObject<{
        type: z.ZodLiteral<"radius">;
        distance: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        type: "radius";
        distance: number;
    }, {
        type: "radius";
        distance: number;
    }>, z.ZodObject<{
        type: z.ZodLiteral<"range">;
        distance: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        type: "range";
        distance: number;
    }, {
        type: "range";
        distance: number;
    }>]>;
    components: z.ZodObject<{
        verbal: z.ZodBoolean;
        somatic: z.ZodBoolean;
        material: z.ZodUnion<[z.ZodBoolean, z.ZodObject<{
            items: z.ZodString;
            consumed: z.ZodOptional<z.ZodBoolean>;
            cost: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            items: string;
            consumed?: boolean | undefined;
            cost?: number | undefined;
        }, {
            items: string;
            consumed?: boolean | undefined;
            cost?: number | undefined;
        }>]>;
    }, "strip", z.ZodTypeAny, {
        verbal: boolean;
        somatic: boolean;
        material: boolean | {
            items: string;
            consumed?: boolean | undefined;
            cost?: number | undefined;
        };
    }, {
        verbal: boolean;
        somatic: boolean;
        material: boolean | {
            items: string;
            consumed?: boolean | undefined;
            cost?: number | undefined;
        };
    }>;
    duration: z.ZodUnion<[z.ZodLiteral<"instantaneous">, z.ZodLiteral<"until dispelled">, z.ZodLiteral<"concentration">, z.ZodObject<{
        type: z.ZodEnum<["rounds", "minutes", "hours", "days"]>;
        amount: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        type: "rounds" | "minutes" | "hours" | "days";
        amount: number;
    }, {
        type: "rounds" | "minutes" | "hours" | "days";
        amount: number;
    }>]>;
    description: z.ZodString;
}, "strip", z.ZodTypeAny, {
    level: number;
    description: string;
    range: "self" | "touch" | {
        type: "radius";
        distance: number;
    } | {
        type: "range";
        distance: number;
    };
    school: "abjuration" | "conjuration" | "divination" | "enchantment" | "evocation" | "illusion" | "necromancy" | "transmutation";
    castingTime: "action" | "bonus action" | "reaction" | "1 minute" | "10 minutes" | "1 hour" | "8 hours" | "24 hours" | "ritual";
    components: {
        verbal: boolean;
        somatic: boolean;
        material: boolean | {
            items: string;
            consumed?: boolean | undefined;
            cost?: number | undefined;
        };
    };
    duration: "instantaneous" | "until dispelled" | "concentration" | {
        type: "rounds" | "minutes" | "hours" | "days";
        amount: number;
    };
}, {
    level: number;
    description: string;
    range: "self" | "touch" | {
        type: "radius";
        distance: number;
    } | {
        type: "range";
        distance: number;
    };
    school: "abjuration" | "conjuration" | "divination" | "enchantment" | "evocation" | "illusion" | "necromancy" | "transmutation";
    castingTime: "action" | "bonus action" | "reaction" | "1 minute" | "10 minutes" | "1 hour" | "8 hours" | "24 hours" | "ritual";
    components: {
        verbal: boolean;
        somatic: boolean;
        material: boolean | {
            items: string;
            consumed?: boolean | undefined;
            cost?: number | undefined;
        };
    };
    duration: "instantaneous" | "until dispelled" | "concentration" | {
        type: "rounds" | "minutes" | "hours" | "days";
        amount: number;
    };
}>;
export type ISpell = z.infer<typeof spellSchema>;
export declare const spellJsonSchema: z.ZodObject<{
    level: z.ZodNumber;
    school: z.ZodEnum<["abjuration", "conjuration", "divination", "enchantment", "evocation", "illusion", "necromancy", "transmutation"]>;
    castingTime: z.ZodEnum<["action", "bonus action", "reaction", "1 minute", "10 minutes", "1 hour", "8 hours", "24 hours", "ritual"]>;
    range: z.ZodUnion<[z.ZodLiteral<"self">, z.ZodLiteral<"touch">, z.ZodObject<{
        type: z.ZodLiteral<"radius">;
        distance: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        type: "radius";
        distance: number;
    }, {
        type: "radius";
        distance: number;
    }>, z.ZodObject<{
        type: z.ZodLiteral<"range">;
        distance: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        type: "range";
        distance: number;
    }, {
        type: "range";
        distance: number;
    }>]>;
    components: z.ZodObject<{
        verbal: z.ZodBoolean;
        somatic: z.ZodBoolean;
        material: z.ZodUnion<[z.ZodBoolean, z.ZodObject<{
            items: z.ZodString;
            consumed: z.ZodOptional<z.ZodBoolean>;
            cost: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            items: string;
            consumed?: boolean | undefined;
            cost?: number | undefined;
        }, {
            items: string;
            consumed?: boolean | undefined;
            cost?: number | undefined;
        }>]>;
    }, "strip", z.ZodTypeAny, {
        verbal: boolean;
        somatic: boolean;
        material: boolean | {
            items: string;
            consumed?: boolean | undefined;
            cost?: number | undefined;
        };
    }, {
        verbal: boolean;
        somatic: boolean;
        material: boolean | {
            items: string;
            consumed?: boolean | undefined;
            cost?: number | undefined;
        };
    }>;
    duration: z.ZodUnion<[z.ZodLiteral<"instantaneous">, z.ZodLiteral<"until dispelled">, z.ZodLiteral<"concentration">, z.ZodObject<{
        type: z.ZodEnum<["rounds", "minutes", "hours", "days"]>;
        amount: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        type: "rounds" | "minutes" | "hours" | "days";
        amount: number;
    }, {
        type: "rounds" | "minutes" | "hours" | "days";
        amount: number;
    }>]>;
    description: z.ZodString;
}, "strip", z.ZodTypeAny, {
    level: number;
    description: string;
    range: "self" | "touch" | {
        type: "radius";
        distance: number;
    } | {
        type: "range";
        distance: number;
    };
    school: "abjuration" | "conjuration" | "divination" | "enchantment" | "evocation" | "illusion" | "necromancy" | "transmutation";
    castingTime: "action" | "bonus action" | "reaction" | "1 minute" | "10 minutes" | "1 hour" | "8 hours" | "24 hours" | "ritual";
    components: {
        verbal: boolean;
        somatic: boolean;
        material: boolean | {
            items: string;
            consumed?: boolean | undefined;
            cost?: number | undefined;
        };
    };
    duration: "instantaneous" | "until dispelled" | "concentration" | {
        type: "rounds" | "minutes" | "hours" | "days";
        amount: number;
    };
}, {
    level: number;
    description: string;
    range: "self" | "touch" | {
        type: "radius";
        distance: number;
    } | {
        type: "range";
        distance: number;
    };
    school: "abjuration" | "conjuration" | "divination" | "enchantment" | "evocation" | "illusion" | "necromancy" | "transmutation";
    castingTime: "action" | "bonus action" | "reaction" | "1 minute" | "10 minutes" | "1 hour" | "8 hours" | "24 hours" | "ritual";
    components: {
        verbal: boolean;
        somatic: boolean;
        material: boolean | {
            items: string;
            consumed?: boolean | undefined;
            cost?: number | undefined;
        };
    };
    duration: "instantaneous" | "until dispelled" | "concentration" | {
        type: "rounds" | "minutes" | "hours" | "days";
        amount: number;
    };
}>;
//# sourceMappingURL=spell.d.mts.map