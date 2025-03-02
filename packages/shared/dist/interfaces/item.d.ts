/**
 * Base Item interface for all game systems
 * This interface defines the common properties that all items should have
 * Game system plugins can extend this interface to add system-specific properties
 */
export interface Item {
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
 * Item creation data interface
 * This interface defines the data needed to create a new item
 */
export interface ItemCreateData {
    name: string;
    type: string;
    img?: string;
    description?: string;
    gameSystemId: string;
    data: Record<string, unknown>;
}
/**
 * Item update data interface
 * This interface defines the data needed to update an existing item
 */
export interface ItemUpdateData {
    name?: string;
    type?: string;
    img?: string;
    description?: string;
    data?: Record<string, unknown>;
}
//# sourceMappingURL=item.d.ts.map