// Character Creation UI module for D&D 5e
import { initForm } from './script.js';
import { registerHelpers } from './helpers.js';

/**
 * Initialize the character creation UI
 * @param {HTMLElement} container - The container element where the UI will be rendered
 * @param {Object} api - The plugin API provided by the container
 * @param {Object} data - Initial data for the form
 * @returns {Function|void} - Optional cleanup function
 */
export function init(container, api, data = {}) {
  console.log('Initializing D&D 5e character creation UI');
  
  // Register any Handlebars helpers we need
  if (window.Handlebars) {
    registerHelpers(window.Handlebars);
  }
  
  // Initialize the form with our API
  const formControls = initForm(
    container, 
    data, 
    // Submit handler - use the API to submit the form data
    (formData) => {
      api.submit(formData);
    },
    // Cancel handler - use the API to cancel
    () => {
      api.cancel();
    }
  );
  
  // Return a cleanup function
  return () => {
    console.log('Cleaning up D&D 5e character creation UI');
    // Any cleanup code specific to this component
  };
}

/**
 * Export all the functions we want to make available
 */
export { initForm, registerHelpers };

// Note: We no longer need to export a default object, as the module itself
// will be used directly in the new plugin architecture 