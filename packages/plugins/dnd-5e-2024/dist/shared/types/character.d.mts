import { z } from 'zod';
export declare const characterSchema: z.ZodObject<{
    name: z.ZodString;
    species: z.ZodString;
    classes: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        level: z.ZodNumber;
        subclass: z.ZodOptional<z.ZodString>;
        hitDiceType: z.ZodEnum<["d6", "d8", "d10", "d12"]>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        level: number;
        hitDiceType: "d6" | "d8" | "d10" | "d12";
        subclass?: string | undefined;
    }, {
        name: string;
        level: number;
        hitDiceType: "d6" | "d8" | "d10" | "d12";
        subclass?: string | undefined;
    }>, "many">;
    background: z.ZodString;
    alignment: z.ZodEnum<["lawful good", "neutral good", "chaotic good", "lawful neutral", "true neutral", "chaotic neutral", "lawful evil", "neutral evil", "chaotic evil"]>;
    experiencePoints: z.ZodNumber;
    proficiencyBonus: z.ZodNumber;
    armorClass: z.ZodNumber;
    initiative: z.ZodNumber;
    speed: z.ZodNumber;
    hitPoints: z.ZodObject<{
        maximum: z.ZodNumber;
        current: z.ZodNumber;
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
    hitDice: z.ZodObject<{
        total: z.ZodNumber;
        current: z.ZodNumber;
        type: z.ZodEnum<["d6", "d8", "d10", "d12"]>;
    }, "strip", z.ZodTypeAny, {
        type: "d6" | "d8" | "d10" | "d12";
        current: number;
        total: number;
    }, {
        type: "d6" | "d8" | "d10" | "d12";
        current: number;
        total: number;
    }>;
    abilities: z.ZodObject<{
        strength: z.ZodObject<{
            score: z.ZodNumber;
            modifier: z.ZodNumber;
            savingThrow: z.ZodObject<{
                proficient: z.ZodBoolean;
                bonus: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                proficient: boolean;
                bonus: number;
            }, {
                proficient: boolean;
                bonus: number;
            }>;
        }, "strip", z.ZodTypeAny, {
            score: number;
            modifier: number;
            savingThrow: {
                proficient: boolean;
                bonus: number;
            };
        }, {
            score: number;
            modifier: number;
            savingThrow: {
                proficient: boolean;
                bonus: number;
            };
        }>;
        dexterity: z.ZodObject<{
            score: z.ZodNumber;
            modifier: z.ZodNumber;
            savingThrow: z.ZodObject<{
                proficient: z.ZodBoolean;
                bonus: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                proficient: boolean;
                bonus: number;
            }, {
                proficient: boolean;
                bonus: number;
            }>;
        }, "strip", z.ZodTypeAny, {
            score: number;
            modifier: number;
            savingThrow: {
                proficient: boolean;
                bonus: number;
            };
        }, {
            score: number;
            modifier: number;
            savingThrow: {
                proficient: boolean;
                bonus: number;
            };
        }>;
        constitution: z.ZodObject<{
            score: z.ZodNumber;
            modifier: z.ZodNumber;
            savingThrow: z.ZodObject<{
                proficient: z.ZodBoolean;
                bonus: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                proficient: boolean;
                bonus: number;
            }, {
                proficient: boolean;
                bonus: number;
            }>;
        }, "strip", z.ZodTypeAny, {
            score: number;
            modifier: number;
            savingThrow: {
                proficient: boolean;
                bonus: number;
            };
        }, {
            score: number;
            modifier: number;
            savingThrow: {
                proficient: boolean;
                bonus: number;
            };
        }>;
        intelligence: z.ZodObject<{
            score: z.ZodNumber;
            modifier: z.ZodNumber;
            savingThrow: z.ZodObject<{
                proficient: z.ZodBoolean;
                bonus: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                proficient: boolean;
                bonus: number;
            }, {
                proficient: boolean;
                bonus: number;
            }>;
        }, "strip", z.ZodTypeAny, {
            score: number;
            modifier: number;
            savingThrow: {
                proficient: boolean;
                bonus: number;
            };
        }, {
            score: number;
            modifier: number;
            savingThrow: {
                proficient: boolean;
                bonus: number;
            };
        }>;
        wisdom: z.ZodObject<{
            score: z.ZodNumber;
            modifier: z.ZodNumber;
            savingThrow: z.ZodObject<{
                proficient: z.ZodBoolean;
                bonus: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                proficient: boolean;
                bonus: number;
            }, {
                proficient: boolean;
                bonus: number;
            }>;
        }, "strip", z.ZodTypeAny, {
            score: number;
            modifier: number;
            savingThrow: {
                proficient: boolean;
                bonus: number;
            };
        }, {
            score: number;
            modifier: number;
            savingThrow: {
                proficient: boolean;
                bonus: number;
            };
        }>;
        charisma: z.ZodObject<{
            score: z.ZodNumber;
            modifier: z.ZodNumber;
            savingThrow: z.ZodObject<{
                proficient: z.ZodBoolean;
                bonus: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                proficient: boolean;
                bonus: number;
            }, {
                proficient: boolean;
                bonus: number;
            }>;
        }, "strip", z.ZodTypeAny, {
            score: number;
            modifier: number;
            savingThrow: {
                proficient: boolean;
                bonus: number;
            };
        }, {
            score: number;
            modifier: number;
            savingThrow: {
                proficient: boolean;
                bonus: number;
            };
        }>;
    }, "strip", z.ZodTypeAny, {
        strength: {
            score: number;
            modifier: number;
            savingThrow: {
                proficient: boolean;
                bonus: number;
            };
        };
        dexterity: {
            score: number;
            modifier: number;
            savingThrow: {
                proficient: boolean;
                bonus: number;
            };
        };
        constitution: {
            score: number;
            modifier: number;
            savingThrow: {
                proficient: boolean;
                bonus: number;
            };
        };
        intelligence: {
            score: number;
            modifier: number;
            savingThrow: {
                proficient: boolean;
                bonus: number;
            };
        };
        wisdom: {
            score: number;
            modifier: number;
            savingThrow: {
                proficient: boolean;
                bonus: number;
            };
        };
        charisma: {
            score: number;
            modifier: number;
            savingThrow: {
                proficient: boolean;
                bonus: number;
            };
        };
    }, {
        strength: {
            score: number;
            modifier: number;
            savingThrow: {
                proficient: boolean;
                bonus: number;
            };
        };
        dexterity: {
            score: number;
            modifier: number;
            savingThrow: {
                proficient: boolean;
                bonus: number;
            };
        };
        constitution: {
            score: number;
            modifier: number;
            savingThrow: {
                proficient: boolean;
                bonus: number;
            };
        };
        intelligence: {
            score: number;
            modifier: number;
            savingThrow: {
                proficient: boolean;
                bonus: number;
            };
        };
        wisdom: {
            score: number;
            modifier: number;
            savingThrow: {
                proficient: boolean;
                bonus: number;
            };
        };
        charisma: {
            score: number;
            modifier: number;
            savingThrow: {
                proficient: boolean;
                bonus: number;
            };
        };
    }>;
    skills: z.ZodObject<{
        acrobatics: z.ZodObject<{
            ability: z.ZodEnum<["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"]>;
            proficient: z.ZodBoolean;
            expertise: z.ZodOptional<z.ZodBoolean>;
            bonus: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        }, {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        }>;
        animalHandling: z.ZodObject<{
            ability: z.ZodEnum<["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"]>;
            proficient: z.ZodBoolean;
            expertise: z.ZodOptional<z.ZodBoolean>;
            bonus: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        }, {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        }>;
        arcana: z.ZodObject<{
            ability: z.ZodEnum<["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"]>;
            proficient: z.ZodBoolean;
            expertise: z.ZodOptional<z.ZodBoolean>;
            bonus: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        }, {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        }>;
        athletics: z.ZodObject<{
            ability: z.ZodEnum<["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"]>;
            proficient: z.ZodBoolean;
            expertise: z.ZodOptional<z.ZodBoolean>;
            bonus: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        }, {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        }>;
        deception: z.ZodObject<{
            ability: z.ZodEnum<["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"]>;
            proficient: z.ZodBoolean;
            expertise: z.ZodOptional<z.ZodBoolean>;
            bonus: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        }, {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        }>;
        history: z.ZodObject<{
            ability: z.ZodEnum<["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"]>;
            proficient: z.ZodBoolean;
            expertise: z.ZodOptional<z.ZodBoolean>;
            bonus: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        }, {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        }>;
        insight: z.ZodObject<{
            ability: z.ZodEnum<["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"]>;
            proficient: z.ZodBoolean;
            expertise: z.ZodOptional<z.ZodBoolean>;
            bonus: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        }, {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        }>;
        intimidation: z.ZodObject<{
            ability: z.ZodEnum<["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"]>;
            proficient: z.ZodBoolean;
            expertise: z.ZodOptional<z.ZodBoolean>;
            bonus: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        }, {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        }>;
        investigation: z.ZodObject<{
            ability: z.ZodEnum<["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"]>;
            proficient: z.ZodBoolean;
            expertise: z.ZodOptional<z.ZodBoolean>;
            bonus: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        }, {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        }>;
        medicine: z.ZodObject<{
            ability: z.ZodEnum<["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"]>;
            proficient: z.ZodBoolean;
            expertise: z.ZodOptional<z.ZodBoolean>;
            bonus: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        }, {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        }>;
        nature: z.ZodObject<{
            ability: z.ZodEnum<["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"]>;
            proficient: z.ZodBoolean;
            expertise: z.ZodOptional<z.ZodBoolean>;
            bonus: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        }, {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        }>;
        perception: z.ZodObject<{
            ability: z.ZodEnum<["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"]>;
            proficient: z.ZodBoolean;
            expertise: z.ZodOptional<z.ZodBoolean>;
            bonus: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        }, {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        }>;
        performance: z.ZodObject<{
            ability: z.ZodEnum<["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"]>;
            proficient: z.ZodBoolean;
            expertise: z.ZodOptional<z.ZodBoolean>;
            bonus: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        }, {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        }>;
        persuasion: z.ZodObject<{
            ability: z.ZodEnum<["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"]>;
            proficient: z.ZodBoolean;
            expertise: z.ZodOptional<z.ZodBoolean>;
            bonus: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        }, {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        }>;
        religion: z.ZodObject<{
            ability: z.ZodEnum<["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"]>;
            proficient: z.ZodBoolean;
            expertise: z.ZodOptional<z.ZodBoolean>;
            bonus: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        }, {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        }>;
        sleightOfHand: z.ZodObject<{
            ability: z.ZodEnum<["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"]>;
            proficient: z.ZodBoolean;
            expertise: z.ZodOptional<z.ZodBoolean>;
            bonus: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        }, {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        }>;
        stealth: z.ZodObject<{
            ability: z.ZodEnum<["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"]>;
            proficient: z.ZodBoolean;
            expertise: z.ZodOptional<z.ZodBoolean>;
            bonus: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        }, {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        }>;
        survival: z.ZodObject<{
            ability: z.ZodEnum<["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"]>;
            proficient: z.ZodBoolean;
            expertise: z.ZodOptional<z.ZodBoolean>;
            bonus: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        }, {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        acrobatics: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        animalHandling: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        arcana: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        athletics: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        deception: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        history: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        insight: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        intimidation: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        investigation: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        medicine: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        nature: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        perception: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        performance: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        persuasion: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        religion: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        sleightOfHand: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        stealth: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        survival: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
    }, {
        acrobatics: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        animalHandling: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        arcana: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        athletics: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        deception: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        history: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        insight: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        intimidation: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        investigation: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        medicine: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        nature: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        perception: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        performance: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        persuasion: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        religion: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        sleightOfHand: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        stealth: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        survival: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
    }>;
    equipment: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        quantity: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        id: string;
        quantity: number;
    }, {
        id: string;
        quantity: number;
    }>, "many">;
    features: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        source: z.ZodString;
        description: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        name: string;
        source: string;
        description: string;
    }, {
        name: string;
        source: string;
        description: string;
    }>, "many">;
    spellcasting: z.ZodOptional<z.ZodObject<{
        ability: z.ZodEnum<["intelligence", "wisdom", "charisma"]>;
        spellSaveDC: z.ZodNumber;
        spellAttackBonus: z.ZodNumber;
        spellSlots: z.ZodArray<z.ZodObject<{
            level: z.ZodNumber;
            total: z.ZodNumber;
            used: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            level: number;
            total: number;
            used: number;
        }, {
            level: number;
            total: number;
            used: number;
        }>, "many">;
        spells: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            prepared: z.ZodOptional<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            prepared?: boolean | undefined;
        }, {
            id: string;
            prepared?: boolean | undefined;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        ability: "intelligence" | "wisdom" | "charisma";
        spellSaveDC: number;
        spellAttackBonus: number;
        spellSlots: {
            level: number;
            total: number;
            used: number;
        }[];
        spells: {
            id: string;
            prepared?: boolean | undefined;
        }[];
    }, {
        ability: "intelligence" | "wisdom" | "charisma";
        spellSaveDC: number;
        spellAttackBonus: number;
        spellSlots: {
            level: number;
            total: number;
            used: number;
        }[];
        spells: {
            id: string;
            prepared?: boolean | undefined;
        }[];
    }>>;
    biography: z.ZodObject<{
        appearance: z.ZodOptional<z.ZodString>;
        backstory: z.ZodOptional<z.ZodString>;
        personalityTraits: z.ZodOptional<z.ZodString>;
        ideals: z.ZodOptional<z.ZodString>;
        bonds: z.ZodOptional<z.ZodString>;
        flaws: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        appearance?: string | undefined;
        backstory?: string | undefined;
        personalityTraits?: string | undefined;
        ideals?: string | undefined;
        bonds?: string | undefined;
        flaws?: string | undefined;
    }, {
        appearance?: string | undefined;
        backstory?: string | undefined;
        personalityTraits?: string | undefined;
        ideals?: string | undefined;
        bonds?: string | undefined;
        flaws?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    name: string;
    species: string;
    classes: {
        name: string;
        level: number;
        hitDiceType: "d6" | "d8" | "d10" | "d12";
        subclass?: string | undefined;
    }[];
    background: string;
    alignment: "lawful good" | "neutral good" | "chaotic good" | "lawful neutral" | "true neutral" | "chaotic neutral" | "lawful evil" | "neutral evil" | "chaotic evil";
    experiencePoints: number;
    proficiencyBonus: number;
    armorClass: number;
    initiative: number;
    speed: number;
    hitPoints: {
        maximum: number;
        current: number;
        temporary?: number | undefined;
    };
    hitDice: {
        type: "d6" | "d8" | "d10" | "d12";
        current: number;
        total: number;
    };
    abilities: {
        strength: {
            score: number;
            modifier: number;
            savingThrow: {
                proficient: boolean;
                bonus: number;
            };
        };
        dexterity: {
            score: number;
            modifier: number;
            savingThrow: {
                proficient: boolean;
                bonus: number;
            };
        };
        constitution: {
            score: number;
            modifier: number;
            savingThrow: {
                proficient: boolean;
                bonus: number;
            };
        };
        intelligence: {
            score: number;
            modifier: number;
            savingThrow: {
                proficient: boolean;
                bonus: number;
            };
        };
        wisdom: {
            score: number;
            modifier: number;
            savingThrow: {
                proficient: boolean;
                bonus: number;
            };
        };
        charisma: {
            score: number;
            modifier: number;
            savingThrow: {
                proficient: boolean;
                bonus: number;
            };
        };
    };
    skills: {
        acrobatics: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        animalHandling: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        arcana: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        athletics: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        deception: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        history: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        insight: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        intimidation: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        investigation: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        medicine: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        nature: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        perception: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        performance: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        persuasion: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        religion: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        sleightOfHand: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        stealth: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        survival: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
    };
    equipment: {
        id: string;
        quantity: number;
    }[];
    features: {
        name: string;
        source: string;
        description: string;
    }[];
    biography: {
        appearance?: string | undefined;
        backstory?: string | undefined;
        personalityTraits?: string | undefined;
        ideals?: string | undefined;
        bonds?: string | undefined;
        flaws?: string | undefined;
    };
    spellcasting?: {
        ability: "intelligence" | "wisdom" | "charisma";
        spellSaveDC: number;
        spellAttackBonus: number;
        spellSlots: {
            level: number;
            total: number;
            used: number;
        }[];
        spells: {
            id: string;
            prepared?: boolean | undefined;
        }[];
    } | undefined;
}, {
    name: string;
    species: string;
    classes: {
        name: string;
        level: number;
        hitDiceType: "d6" | "d8" | "d10" | "d12";
        subclass?: string | undefined;
    }[];
    background: string;
    alignment: "lawful good" | "neutral good" | "chaotic good" | "lawful neutral" | "true neutral" | "chaotic neutral" | "lawful evil" | "neutral evil" | "chaotic evil";
    experiencePoints: number;
    proficiencyBonus: number;
    armorClass: number;
    initiative: number;
    speed: number;
    hitPoints: {
        maximum: number;
        current: number;
        temporary?: number | undefined;
    };
    hitDice: {
        type: "d6" | "d8" | "d10" | "d12";
        current: number;
        total: number;
    };
    abilities: {
        strength: {
            score: number;
            modifier: number;
            savingThrow: {
                proficient: boolean;
                bonus: number;
            };
        };
        dexterity: {
            score: number;
            modifier: number;
            savingThrow: {
                proficient: boolean;
                bonus: number;
            };
        };
        constitution: {
            score: number;
            modifier: number;
            savingThrow: {
                proficient: boolean;
                bonus: number;
            };
        };
        intelligence: {
            score: number;
            modifier: number;
            savingThrow: {
                proficient: boolean;
                bonus: number;
            };
        };
        wisdom: {
            score: number;
            modifier: number;
            savingThrow: {
                proficient: boolean;
                bonus: number;
            };
        };
        charisma: {
            score: number;
            modifier: number;
            savingThrow: {
                proficient: boolean;
                bonus: number;
            };
        };
    };
    skills: {
        acrobatics: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        animalHandling: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        arcana: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        athletics: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        deception: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        history: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        insight: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        intimidation: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        investigation: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        medicine: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        nature: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        perception: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        performance: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        persuasion: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        religion: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        sleightOfHand: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        stealth: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        survival: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
    };
    equipment: {
        id: string;
        quantity: number;
    }[];
    features: {
        name: string;
        source: string;
        description: string;
    }[];
    biography: {
        appearance?: string | undefined;
        backstory?: string | undefined;
        personalityTraits?: string | undefined;
        ideals?: string | undefined;
        bonds?: string | undefined;
        flaws?: string | undefined;
    };
    spellcasting?: {
        ability: "intelligence" | "wisdom" | "charisma";
        spellSaveDC: number;
        spellAttackBonus: number;
        spellSlots: {
            level: number;
            total: number;
            used: number;
        }[];
        spells: {
            id: string;
            prepared?: boolean | undefined;
        }[];
    } | undefined;
}>;
export type ICharacter = z.infer<typeof characterSchema>;
export declare const characterJsonSchema: z.ZodObject<{
    name: z.ZodString;
    species: z.ZodString;
    classes: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        level: z.ZodNumber;
        subclass: z.ZodOptional<z.ZodString>;
        hitDiceType: z.ZodEnum<["d6", "d8", "d10", "d12"]>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        level: number;
        hitDiceType: "d6" | "d8" | "d10" | "d12";
        subclass?: string | undefined;
    }, {
        name: string;
        level: number;
        hitDiceType: "d6" | "d8" | "d10" | "d12";
        subclass?: string | undefined;
    }>, "many">;
    background: z.ZodString;
    alignment: z.ZodEnum<["lawful good", "neutral good", "chaotic good", "lawful neutral", "true neutral", "chaotic neutral", "lawful evil", "neutral evil", "chaotic evil"]>;
    experiencePoints: z.ZodNumber;
    proficiencyBonus: z.ZodNumber;
    armorClass: z.ZodNumber;
    initiative: z.ZodNumber;
    speed: z.ZodNumber;
    hitPoints: z.ZodObject<{
        maximum: z.ZodNumber;
        current: z.ZodNumber;
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
    hitDice: z.ZodObject<{
        total: z.ZodNumber;
        current: z.ZodNumber;
        type: z.ZodEnum<["d6", "d8", "d10", "d12"]>;
    }, "strip", z.ZodTypeAny, {
        type: "d6" | "d8" | "d10" | "d12";
        current: number;
        total: number;
    }, {
        type: "d6" | "d8" | "d10" | "d12";
        current: number;
        total: number;
    }>;
    abilities: z.ZodObject<{
        strength: z.ZodObject<{
            score: z.ZodNumber;
            modifier: z.ZodNumber;
            savingThrow: z.ZodObject<{
                proficient: z.ZodBoolean;
                bonus: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                proficient: boolean;
                bonus: number;
            }, {
                proficient: boolean;
                bonus: number;
            }>;
        }, "strip", z.ZodTypeAny, {
            score: number;
            modifier: number;
            savingThrow: {
                proficient: boolean;
                bonus: number;
            };
        }, {
            score: number;
            modifier: number;
            savingThrow: {
                proficient: boolean;
                bonus: number;
            };
        }>;
        dexterity: z.ZodObject<{
            score: z.ZodNumber;
            modifier: z.ZodNumber;
            savingThrow: z.ZodObject<{
                proficient: z.ZodBoolean;
                bonus: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                proficient: boolean;
                bonus: number;
            }, {
                proficient: boolean;
                bonus: number;
            }>;
        }, "strip", z.ZodTypeAny, {
            score: number;
            modifier: number;
            savingThrow: {
                proficient: boolean;
                bonus: number;
            };
        }, {
            score: number;
            modifier: number;
            savingThrow: {
                proficient: boolean;
                bonus: number;
            };
        }>;
        constitution: z.ZodObject<{
            score: z.ZodNumber;
            modifier: z.ZodNumber;
            savingThrow: z.ZodObject<{
                proficient: z.ZodBoolean;
                bonus: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                proficient: boolean;
                bonus: number;
            }, {
                proficient: boolean;
                bonus: number;
            }>;
        }, "strip", z.ZodTypeAny, {
            score: number;
            modifier: number;
            savingThrow: {
                proficient: boolean;
                bonus: number;
            };
        }, {
            score: number;
            modifier: number;
            savingThrow: {
                proficient: boolean;
                bonus: number;
            };
        }>;
        intelligence: z.ZodObject<{
            score: z.ZodNumber;
            modifier: z.ZodNumber;
            savingThrow: z.ZodObject<{
                proficient: z.ZodBoolean;
                bonus: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                proficient: boolean;
                bonus: number;
            }, {
                proficient: boolean;
                bonus: number;
            }>;
        }, "strip", z.ZodTypeAny, {
            score: number;
            modifier: number;
            savingThrow: {
                proficient: boolean;
                bonus: number;
            };
        }, {
            score: number;
            modifier: number;
            savingThrow: {
                proficient: boolean;
                bonus: number;
            };
        }>;
        wisdom: z.ZodObject<{
            score: z.ZodNumber;
            modifier: z.ZodNumber;
            savingThrow: z.ZodObject<{
                proficient: z.ZodBoolean;
                bonus: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                proficient: boolean;
                bonus: number;
            }, {
                proficient: boolean;
                bonus: number;
            }>;
        }, "strip", z.ZodTypeAny, {
            score: number;
            modifier: number;
            savingThrow: {
                proficient: boolean;
                bonus: number;
            };
        }, {
            score: number;
            modifier: number;
            savingThrow: {
                proficient: boolean;
                bonus: number;
            };
        }>;
        charisma: z.ZodObject<{
            score: z.ZodNumber;
            modifier: z.ZodNumber;
            savingThrow: z.ZodObject<{
                proficient: z.ZodBoolean;
                bonus: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                proficient: boolean;
                bonus: number;
            }, {
                proficient: boolean;
                bonus: number;
            }>;
        }, "strip", z.ZodTypeAny, {
            score: number;
            modifier: number;
            savingThrow: {
                proficient: boolean;
                bonus: number;
            };
        }, {
            score: number;
            modifier: number;
            savingThrow: {
                proficient: boolean;
                bonus: number;
            };
        }>;
    }, "strip", z.ZodTypeAny, {
        strength: {
            score: number;
            modifier: number;
            savingThrow: {
                proficient: boolean;
                bonus: number;
            };
        };
        dexterity: {
            score: number;
            modifier: number;
            savingThrow: {
                proficient: boolean;
                bonus: number;
            };
        };
        constitution: {
            score: number;
            modifier: number;
            savingThrow: {
                proficient: boolean;
                bonus: number;
            };
        };
        intelligence: {
            score: number;
            modifier: number;
            savingThrow: {
                proficient: boolean;
                bonus: number;
            };
        };
        wisdom: {
            score: number;
            modifier: number;
            savingThrow: {
                proficient: boolean;
                bonus: number;
            };
        };
        charisma: {
            score: number;
            modifier: number;
            savingThrow: {
                proficient: boolean;
                bonus: number;
            };
        };
    }, {
        strength: {
            score: number;
            modifier: number;
            savingThrow: {
                proficient: boolean;
                bonus: number;
            };
        };
        dexterity: {
            score: number;
            modifier: number;
            savingThrow: {
                proficient: boolean;
                bonus: number;
            };
        };
        constitution: {
            score: number;
            modifier: number;
            savingThrow: {
                proficient: boolean;
                bonus: number;
            };
        };
        intelligence: {
            score: number;
            modifier: number;
            savingThrow: {
                proficient: boolean;
                bonus: number;
            };
        };
        wisdom: {
            score: number;
            modifier: number;
            savingThrow: {
                proficient: boolean;
                bonus: number;
            };
        };
        charisma: {
            score: number;
            modifier: number;
            savingThrow: {
                proficient: boolean;
                bonus: number;
            };
        };
    }>;
    skills: z.ZodObject<{
        acrobatics: z.ZodObject<{
            ability: z.ZodEnum<["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"]>;
            proficient: z.ZodBoolean;
            expertise: z.ZodOptional<z.ZodBoolean>;
            bonus: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        }, {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        }>;
        animalHandling: z.ZodObject<{
            ability: z.ZodEnum<["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"]>;
            proficient: z.ZodBoolean;
            expertise: z.ZodOptional<z.ZodBoolean>;
            bonus: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        }, {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        }>;
        arcana: z.ZodObject<{
            ability: z.ZodEnum<["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"]>;
            proficient: z.ZodBoolean;
            expertise: z.ZodOptional<z.ZodBoolean>;
            bonus: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        }, {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        }>;
        athletics: z.ZodObject<{
            ability: z.ZodEnum<["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"]>;
            proficient: z.ZodBoolean;
            expertise: z.ZodOptional<z.ZodBoolean>;
            bonus: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        }, {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        }>;
        deception: z.ZodObject<{
            ability: z.ZodEnum<["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"]>;
            proficient: z.ZodBoolean;
            expertise: z.ZodOptional<z.ZodBoolean>;
            bonus: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        }, {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        }>;
        history: z.ZodObject<{
            ability: z.ZodEnum<["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"]>;
            proficient: z.ZodBoolean;
            expertise: z.ZodOptional<z.ZodBoolean>;
            bonus: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        }, {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        }>;
        insight: z.ZodObject<{
            ability: z.ZodEnum<["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"]>;
            proficient: z.ZodBoolean;
            expertise: z.ZodOptional<z.ZodBoolean>;
            bonus: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        }, {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        }>;
        intimidation: z.ZodObject<{
            ability: z.ZodEnum<["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"]>;
            proficient: z.ZodBoolean;
            expertise: z.ZodOptional<z.ZodBoolean>;
            bonus: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        }, {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        }>;
        investigation: z.ZodObject<{
            ability: z.ZodEnum<["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"]>;
            proficient: z.ZodBoolean;
            expertise: z.ZodOptional<z.ZodBoolean>;
            bonus: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        }, {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        }>;
        medicine: z.ZodObject<{
            ability: z.ZodEnum<["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"]>;
            proficient: z.ZodBoolean;
            expertise: z.ZodOptional<z.ZodBoolean>;
            bonus: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        }, {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        }>;
        nature: z.ZodObject<{
            ability: z.ZodEnum<["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"]>;
            proficient: z.ZodBoolean;
            expertise: z.ZodOptional<z.ZodBoolean>;
            bonus: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        }, {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        }>;
        perception: z.ZodObject<{
            ability: z.ZodEnum<["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"]>;
            proficient: z.ZodBoolean;
            expertise: z.ZodOptional<z.ZodBoolean>;
            bonus: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        }, {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        }>;
        performance: z.ZodObject<{
            ability: z.ZodEnum<["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"]>;
            proficient: z.ZodBoolean;
            expertise: z.ZodOptional<z.ZodBoolean>;
            bonus: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        }, {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        }>;
        persuasion: z.ZodObject<{
            ability: z.ZodEnum<["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"]>;
            proficient: z.ZodBoolean;
            expertise: z.ZodOptional<z.ZodBoolean>;
            bonus: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        }, {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        }>;
        religion: z.ZodObject<{
            ability: z.ZodEnum<["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"]>;
            proficient: z.ZodBoolean;
            expertise: z.ZodOptional<z.ZodBoolean>;
            bonus: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        }, {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        }>;
        sleightOfHand: z.ZodObject<{
            ability: z.ZodEnum<["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"]>;
            proficient: z.ZodBoolean;
            expertise: z.ZodOptional<z.ZodBoolean>;
            bonus: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        }, {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        }>;
        stealth: z.ZodObject<{
            ability: z.ZodEnum<["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"]>;
            proficient: z.ZodBoolean;
            expertise: z.ZodOptional<z.ZodBoolean>;
            bonus: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        }, {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        }>;
        survival: z.ZodObject<{
            ability: z.ZodEnum<["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"]>;
            proficient: z.ZodBoolean;
            expertise: z.ZodOptional<z.ZodBoolean>;
            bonus: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        }, {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        acrobatics: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        animalHandling: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        arcana: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        athletics: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        deception: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        history: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        insight: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        intimidation: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        investigation: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        medicine: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        nature: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        perception: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        performance: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        persuasion: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        religion: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        sleightOfHand: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        stealth: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        survival: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
    }, {
        acrobatics: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        animalHandling: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        arcana: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        athletics: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        deception: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        history: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        insight: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        intimidation: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        investigation: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        medicine: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        nature: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        perception: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        performance: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        persuasion: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        religion: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        sleightOfHand: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        stealth: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        survival: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
    }>;
    equipment: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        quantity: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        id: string;
        quantity: number;
    }, {
        id: string;
        quantity: number;
    }>, "many">;
    features: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        source: z.ZodString;
        description: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        name: string;
        source: string;
        description: string;
    }, {
        name: string;
        source: string;
        description: string;
    }>, "many">;
    spellcasting: z.ZodOptional<z.ZodObject<{
        ability: z.ZodEnum<["intelligence", "wisdom", "charisma"]>;
        spellSaveDC: z.ZodNumber;
        spellAttackBonus: z.ZodNumber;
        spellSlots: z.ZodArray<z.ZodObject<{
            level: z.ZodNumber;
            total: z.ZodNumber;
            used: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            level: number;
            total: number;
            used: number;
        }, {
            level: number;
            total: number;
            used: number;
        }>, "many">;
        spells: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            prepared: z.ZodOptional<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            prepared?: boolean | undefined;
        }, {
            id: string;
            prepared?: boolean | undefined;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        ability: "intelligence" | "wisdom" | "charisma";
        spellSaveDC: number;
        spellAttackBonus: number;
        spellSlots: {
            level: number;
            total: number;
            used: number;
        }[];
        spells: {
            id: string;
            prepared?: boolean | undefined;
        }[];
    }, {
        ability: "intelligence" | "wisdom" | "charisma";
        spellSaveDC: number;
        spellAttackBonus: number;
        spellSlots: {
            level: number;
            total: number;
            used: number;
        }[];
        spells: {
            id: string;
            prepared?: boolean | undefined;
        }[];
    }>>;
    biography: z.ZodObject<{
        appearance: z.ZodOptional<z.ZodString>;
        backstory: z.ZodOptional<z.ZodString>;
        personalityTraits: z.ZodOptional<z.ZodString>;
        ideals: z.ZodOptional<z.ZodString>;
        bonds: z.ZodOptional<z.ZodString>;
        flaws: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        appearance?: string | undefined;
        backstory?: string | undefined;
        personalityTraits?: string | undefined;
        ideals?: string | undefined;
        bonds?: string | undefined;
        flaws?: string | undefined;
    }, {
        appearance?: string | undefined;
        backstory?: string | undefined;
        personalityTraits?: string | undefined;
        ideals?: string | undefined;
        bonds?: string | undefined;
        flaws?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    name: string;
    species: string;
    classes: {
        name: string;
        level: number;
        hitDiceType: "d6" | "d8" | "d10" | "d12";
        subclass?: string | undefined;
    }[];
    background: string;
    alignment: "lawful good" | "neutral good" | "chaotic good" | "lawful neutral" | "true neutral" | "chaotic neutral" | "lawful evil" | "neutral evil" | "chaotic evil";
    experiencePoints: number;
    proficiencyBonus: number;
    armorClass: number;
    initiative: number;
    speed: number;
    hitPoints: {
        maximum: number;
        current: number;
        temporary?: number | undefined;
    };
    hitDice: {
        type: "d6" | "d8" | "d10" | "d12";
        current: number;
        total: number;
    };
    abilities: {
        strength: {
            score: number;
            modifier: number;
            savingThrow: {
                proficient: boolean;
                bonus: number;
            };
        };
        dexterity: {
            score: number;
            modifier: number;
            savingThrow: {
                proficient: boolean;
                bonus: number;
            };
        };
        constitution: {
            score: number;
            modifier: number;
            savingThrow: {
                proficient: boolean;
                bonus: number;
            };
        };
        intelligence: {
            score: number;
            modifier: number;
            savingThrow: {
                proficient: boolean;
                bonus: number;
            };
        };
        wisdom: {
            score: number;
            modifier: number;
            savingThrow: {
                proficient: boolean;
                bonus: number;
            };
        };
        charisma: {
            score: number;
            modifier: number;
            savingThrow: {
                proficient: boolean;
                bonus: number;
            };
        };
    };
    skills: {
        acrobatics: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        animalHandling: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        arcana: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        athletics: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        deception: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        history: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        insight: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        intimidation: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        investigation: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        medicine: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        nature: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        perception: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        performance: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        persuasion: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        religion: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        sleightOfHand: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        stealth: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        survival: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
    };
    equipment: {
        id: string;
        quantity: number;
    }[];
    features: {
        name: string;
        source: string;
        description: string;
    }[];
    biography: {
        appearance?: string | undefined;
        backstory?: string | undefined;
        personalityTraits?: string | undefined;
        ideals?: string | undefined;
        bonds?: string | undefined;
        flaws?: string | undefined;
    };
    spellcasting?: {
        ability: "intelligence" | "wisdom" | "charisma";
        spellSaveDC: number;
        spellAttackBonus: number;
        spellSlots: {
            level: number;
            total: number;
            used: number;
        }[];
        spells: {
            id: string;
            prepared?: boolean | undefined;
        }[];
    } | undefined;
}, {
    name: string;
    species: string;
    classes: {
        name: string;
        level: number;
        hitDiceType: "d6" | "d8" | "d10" | "d12";
        subclass?: string | undefined;
    }[];
    background: string;
    alignment: "lawful good" | "neutral good" | "chaotic good" | "lawful neutral" | "true neutral" | "chaotic neutral" | "lawful evil" | "neutral evil" | "chaotic evil";
    experiencePoints: number;
    proficiencyBonus: number;
    armorClass: number;
    initiative: number;
    speed: number;
    hitPoints: {
        maximum: number;
        current: number;
        temporary?: number | undefined;
    };
    hitDice: {
        type: "d6" | "d8" | "d10" | "d12";
        current: number;
        total: number;
    };
    abilities: {
        strength: {
            score: number;
            modifier: number;
            savingThrow: {
                proficient: boolean;
                bonus: number;
            };
        };
        dexterity: {
            score: number;
            modifier: number;
            savingThrow: {
                proficient: boolean;
                bonus: number;
            };
        };
        constitution: {
            score: number;
            modifier: number;
            savingThrow: {
                proficient: boolean;
                bonus: number;
            };
        };
        intelligence: {
            score: number;
            modifier: number;
            savingThrow: {
                proficient: boolean;
                bonus: number;
            };
        };
        wisdom: {
            score: number;
            modifier: number;
            savingThrow: {
                proficient: boolean;
                bonus: number;
            };
        };
        charisma: {
            score: number;
            modifier: number;
            savingThrow: {
                proficient: boolean;
                bonus: number;
            };
        };
    };
    skills: {
        acrobatics: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        animalHandling: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        arcana: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        athletics: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        deception: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        history: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        insight: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        intimidation: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        investigation: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        medicine: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        nature: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        perception: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        performance: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        persuasion: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        religion: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        sleightOfHand: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        stealth: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
        survival: {
            proficient: boolean;
            bonus: number;
            ability: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
            expertise?: boolean | undefined;
        };
    };
    equipment: {
        id: string;
        quantity: number;
    }[];
    features: {
        name: string;
        source: string;
        description: string;
    }[];
    biography: {
        appearance?: string | undefined;
        backstory?: string | undefined;
        personalityTraits?: string | undefined;
        ideals?: string | undefined;
        bonds?: string | undefined;
        flaws?: string | undefined;
    };
    spellcasting?: {
        ability: "intelligence" | "wisdom" | "charisma";
        spellSaveDC: number;
        spellAttackBonus: number;
        spellSlots: {
            level: number;
            total: number;
            used: number;
        }[];
        spells: {
            id: string;
            prepared?: boolean | undefined;
        }[];
    } | undefined;
}>;
//# sourceMappingURL=character.d.mts.map