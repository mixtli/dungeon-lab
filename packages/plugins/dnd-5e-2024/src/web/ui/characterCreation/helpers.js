// Helper functions for Handlebars templates

/**
 * Register Handlebars helpers needed for D&D 5e character creation templates
 * @param {object} Handlebars - The Handlebars instance
 */
export function registerHelpers(Handlebars) {
  // Helper to check if two values are equal
  // Usage: {{#if (eq value1 value2)}}...{{/if}}
  Handlebars.registerHelper('eq', function (value1, value2) {
    return value1 === value2;
  });
  
  // Helper to display ability modifiers
  // Usage: {{abilityMod score}}
  Handlebars.registerHelper('abilityMod', function (score) {
    if (score === undefined || score === null) return '+0';
    
    const modifier = Math.floor((score - 10) / 2);
    return modifier >= 0 ? `+${modifier}` : `${modifier}`;
  });
  
  // Helper to determine proficiency bonus based on level
  // Usage: {{proficiencyBonus level}}
  Handlebars.registerHelper('proficiencyBonus', function (level) {
    if (!level) return '+2';
    
    const profBonus = Math.floor(2 + ((level - 1) / 4));
    return `+${profBonus}`;
  });
  
  // Helper to check if a value is in an array
  // Usage: {{#if (includes array value)}}...{{/if}}
  Handlebars.registerHelper('includes', function (array, value) {
    if (!array || !Array.isArray(array)) return false;
    return array.includes(value);
  });
  
  // Helper to format a number with a sign
  // Usage: {{formatSign number}}
  Handlebars.registerHelper('formatSign', function (number) {
    if (number === undefined || number === null) return '+0';
    
    const num = parseInt(number, 10);
    return num >= 0 ? `+${num}` : `${num}`;
  });
  
  // Helper to generate an array for iteration
  // Usage: {{#each (range 1 20)}}...{{/each}}
  Handlebars.registerHelper('range', function (start, end) {
    const result = [];
    for (let i = start; i <= end; i++) {
      result.push(i);
    }
    return result;
  });
  
  // Helper to concatenate strings
  // Usage: {{concat string1 string2 string3}}
  Handlebars.registerHelper('concat', function () {
    const args = Array.prototype.slice.call(arguments, 0, -1);
    return args.join('');
  });
  
  // Helper to convert a string to lowercase
  // Usage: {{lowercase string}}
  Handlebars.registerHelper('lowercase', function (str) {
    return (str || '').toLowerCase();
  });
  
  // Helper to convert a string to uppercase
  // Usage: {{uppercase string}}
  Handlebars.registerHelper('uppercase', function (str) {
    return (str || '').toUpperCase();
  });
  
  // Helper to capitalize first letter of a string
  // Usage: {{capitalize string}}
  Handlebars.registerHelper('capitalize', function (str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  });
  
  // Helper to get passive perception (10 + perception modifier)
  // Usage: {{passivePerception abilities.wisdom perceptionProficient}}
  Handlebars.registerHelper('passivePerception', function (wisdom, isProficient, level) {
    if (wisdom === undefined) return 10;
    
    const wisdomMod = Math.floor((wisdom - 10) / 2);
    const profBonus = isProficient ? Math.floor(2 + ((level - 1) / 4)) : 0;
    
    return 10 + wisdomMod + profBonus;
  });
} 