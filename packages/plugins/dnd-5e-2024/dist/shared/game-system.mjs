import { characterSchema, weaponSchema, spellSchema } from './types/index.mjs';
export const dnd5e2024GameSystem = {
    actorTypes: [
        {
            name: 'character',
            description: 'Player character',
            dataSchema: characterSchema,
            uiComponent: 'dnd5e2024-character-sheet'
        },
        {
            name: 'npc',
            description: 'Non-player character',
            dataSchema: characterSchema,
            uiComponent: 'dnd5e2024-npc-sheet'
        }
    ],
    itemTypes: [
        {
            name: 'weapon',
            description: 'Weapon item',
            dataSchema: weaponSchema,
            uiComponent: 'dnd5e2024-weapon-sheet'
        },
        {
            name: 'spell',
            description: 'Spell',
            dataSchema: spellSchema,
            uiComponent: 'dnd5e2024-spell-sheet'
        }
    ]
};
//# sourceMappingURL=game-system.mjs.map