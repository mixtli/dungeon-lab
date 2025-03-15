// Character Creation UI module for D&D 5e
// @ts-ignore - Ignore missing type definitions for local JS modules
import { initForm } from './script.js';
// @ts-ignore - Ignore missing type definitions for local JS modules
import { registerHelpers } from './helpers.js';
/**
 * Initialize the character creation UI
 * @param container - The container element where the UI will be rendered
 * @param api - The plugin API provided by the container
 * @param data - Initial data for the form
 * @returns - Optional cleanup function
 */
export function init(container, api, data = {}) {
    console.log('Initializing D&D 5e character creation UI');
    if (!container) {
        console.error('Container element is null or undefined');
        throw new Error('Container element is required');
    }
    // Set default values for form data to prevent null/undefined errors
    const defaultData = {
        name: '',
        race: '',
        class: '',
        level: 1,
        alignment: '',
        background: '',
        abilities: {
            strength: 10,
            dexterity: 10,
            constitution: 10,
            intelligence: 10,
            wisdom: 10,
            charisma: 10
        },
        hitPoints: {
            maximum: 10
        },
        ...data
    };
    // Register any Handlebars helpers we need
    try {
        // @ts-ignore - Handlebars is added to window by the main application
        if (window.Handlebars) {
            // @ts-ignore - Handlebars is added to window by the main application
            registerHelpers(window.Handlebars);
        }
        else {
            console.warn('Handlebars not found on window object');
        }
    }
    catch (error) {
        console.error('Error registering Handlebars helpers:', error);
    }
    let formControls = { cleanup: () => { } };
    // Initialize the form with our API
    try {
        formControls = initForm(container, defaultData, 
        // Submit handler - use the API to submit the form data
        (formData) => {
            try {
                api.submit(formData);
            }
            catch (error) {
                console.error('Error calling submit API:', error);
            }
        }, 
        // Cancel handler - use the API to cancel
        () => {
            try {
                api.cancel();
            }
            catch (error) {
                console.error('Error calling cancel API:', error);
            }
        });
    }
    catch (error) {
        console.error('Error initializing form:', error);
        throw error;
    }
    // Return a cleanup function
    return () => {
        console.log('Cleaning up D&D 5e character creation UI');
        if (formControls && typeof formControls.cleanup === 'function') {
            try {
                formControls.cleanup();
            }
            catch (error) {
                console.error('Error during form cleanup:', error);
            }
        }
    };
}
/**
 * Validate the character data
 * @param characterData - The character data to validate
 * @returns - Validation result with success flag and optional errors
 */
export function validateCharacter(characterData) {
    // This would contain validation logic
    const errors = [];
    // Basic validation
    if (!characterData.name) {
        errors.push('Character name is required');
    }
    if (!characterData.race) {
        errors.push('Race is required');
    }
    if (!characterData.class) {
        errors.push('Class is required');
    }
    return {
        success: errors.length === 0,
        errors
    };
}
/**
 * Export all the functions we want to make available
 */
export { initForm, registerHelpers };
// Define a default export for backwards compatibility
export default {
    init,
    validateCharacter
};
//# sourceMappingURL=index.mjs.map