import { z } from 'zod';
import { dnd5e2024GameSystem } from './game-system.mjs';
export function validateActorData(actorType, data) {
    const actorTypeDefinition = dnd5e2024GameSystem.actorTypes.find(type => type.name === actorType);
    if (actorTypeDefinition) {
        return actorTypeDefinition.dataSchema.safeParse(data);
    }
    return { success: false, error: new z.ZodError([{
                code: z.ZodIssueCode.custom,
                path: [],
                message: `Unknown actor type: ${actorType}`
            }]) };
}
export function validateItemData(itemType, data) {
    const itemTypeDefinition = dnd5e2024GameSystem.itemTypes.find(type => type.name === itemType);
    if (itemTypeDefinition) {
        return itemTypeDefinition.dataSchema.safeParse(data);
    }
    return { success: false, error: new z.ZodError([{
                code: z.ZodIssueCode.custom,
                path: [],
                message: `Unknown item type: ${itemType}`
            }]) };
}
//# sourceMappingURL=validation.mjs.map