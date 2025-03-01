/**
 * Base Actor interface for all game systems
 * This interface defines the common properties that all actors should have
 * Game system plugins can extend this interface to add system-specific properties
 */
export interface Actor {
    id: string;
    name: string;
    type: string;
    img?: string;
    description?: string;
    gameSystemId: string;
    data: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
    createdBy: string;
    updatedBy: string;
}
/**
 * Actor creation data interface
 * This interface defines the data needed to create a new actor
 */
export interface ActorCreateData {
    name: string;
    type: string;
    img?: string;
    description?: string;
    gameSystemId: string;
    data: Record<string, unknown>;
}
/**
 * Actor update data interface
 * This interface defines the data needed to update an existing actor
 */
export interface ActorUpdateData {
    name?: string;
    type?: string;
    img?: string;
    description?: string;
    data?: Record<string, unknown>;
}
