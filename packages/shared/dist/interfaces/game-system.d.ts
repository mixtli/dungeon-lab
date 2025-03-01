/**
 * Game System Plugin interface
 * This interface defines the structure of a game system plugin
 */
export interface GameSystem {
    id: string;
    name: string;
    version: string;
    description?: string;
    author?: string;
    website?: string;
    actorTypes: GameSystemActorType[];
    itemTypes: GameSystemItemType[];
    createdAt: Date;
    updatedAt: Date;
}
/**
 * Game System Actor Type interface
 * This interface defines the structure of an actor type in a game system
 */
export interface GameSystemActorType {
    id: string;
    name: string;
    description?: string;
    dataSchema: Record<string, unknown>;
    uiComponent?: string;
}
/**
 * Game System Item Type interface
 * This interface defines the structure of an item type in a game system
 */
export interface GameSystemItemType {
    id: string;
    name: string;
    description?: string;
    dataSchema: Record<string, unknown>;
    uiComponent?: string;
}
/**
 * Game System Plugin Registration interface
 * This interface defines the data needed to register a new game system plugin
 */
export interface GameSystemRegistration {
    name: string;
    version: string;
    description?: string;
    author?: string;
    website?: string;
    actorTypes: Omit<GameSystemActorType, 'id'>[];
    itemTypes: Omit<GameSystemItemType, 'id'>[];
}
