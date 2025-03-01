import { Request, Response } from 'express';
/**
 * Get all items
 * @route GET /api/items
 * @access Public
 */
export declare function getAllItems(req: Request, res: Response): Promise<void>;
/**
 * Get item by ID
 * @route GET /api/items/:id
 * @access Public
 */
export declare function getItemById(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Create a new item
 * @route POST /api/items
 * @access Private
 */
export declare function createItem(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Update an item
 * @route PUT /api/items/:id
 * @access Private
 */
export declare function updateItem(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Delete an item
 * @route DELETE /api/items/:id
 * @access Private
 */
export declare function deleteItem(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
