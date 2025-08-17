/**
 * Shared types for action handlers
 */

export interface ActionHandlerResult {
  success: boolean;
  error?: {
    code: string;
    message: string;
  };
}