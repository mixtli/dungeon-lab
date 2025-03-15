import { initForm } from './script.js';
import { registerHelpers } from './helpers.js';
/**
 * API interface provided by the container
 */
interface PluginAPI {
    submit: (data: Record<string, any>) => void;
    cancel: () => void;
    [key: string]: any;
}
/**
 * Validation result interface
 */
interface ValidationResult {
    success: boolean;
    errors: string[];
}
/**
 * Initialize the character creation UI
 * @param container - The container element where the UI will be rendered
 * @param api - The plugin API provided by the container
 * @param data - Initial data for the form
 * @returns - Optional cleanup function
 */
export declare function init(container: HTMLElement, api: PluginAPI, data?: Record<string, any>): (() => void) | void;
/**
 * Validate the character data
 * @param characterData - The character data to validate
 * @returns - Validation result with success flag and optional errors
 */
export declare function validateCharacter(characterData: Record<string, any>): ValidationResult;
/**
 * Export all the functions we want to make available
 */
export { initForm, registerHelpers };
declare const _default: {
    init: typeof init;
    validateCharacter: typeof validateCharacter;
};
export default _default;
//# sourceMappingURL=index.d.mts.map