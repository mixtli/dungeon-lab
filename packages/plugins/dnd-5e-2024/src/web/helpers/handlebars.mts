/**
 * Shared Handlebars helpers for D&D 5e UI components
 */
import Handlebars from 'handlebars';

interface Feature {
  level: number;
  [key: string]: unknown;
}

interface FeaturesByLevel {
  [level: number]: Feature[];
}

// Declare a type for the 'this' context in block helpers
type HandlebarsBlockThis = unknown;

/**
 * Register all Handlebars helpers for D&D 5e UI components
 * @param handlebars Handlebars instance to register helpers with
 */
export function registerHelpers(handlebars: typeof Handlebars): void {
  //
  // Character Sheet Helpers
  //

  // Get ability modifier
  handlebars.registerHelper('abilityModifier', function(score: number) {
    const modifier = Math.floor((score - 10) / 2);
    return modifier >= 0 ? `+${modifier}` : modifier;
  });

  // Format proficiency bonus with + sign
  handlebars.registerHelper('formatBonus', function(value: number) {
    return value >= 0 ? `+${value}` : value;
  });

  // Check if a tab should be active
  handlebars.registerHelper('isActive', function(tabId: string, activeTab: string) {
    return tabId === activeTab ? 'active' : '';
  });

  // Get saving throw total
  handlebars.registerHelper('getSavingThrow', function(proficient: boolean, abilityModifier: number, proficiencyBonus: number) {
    const total = abilityModifier + (proficient ? proficiencyBonus : 0);
    return total >= 0 ? `+${total}` : total;
  });

  // Get skill total
  handlebars.registerHelper('getSkillTotal', function(proficient: boolean, abilityModifier: number, proficiencyBonus: number) {
    const total = abilityModifier + (proficient ? proficiencyBonus : 0);
    return total >= 0 ? `+${total}` : total;
  });

  // Format HP as current/max
  handlebars.registerHelper('formatHP', function(current: number, max: number) {
    return `${current}/${max}`;
  });

  // Get total level from classes array
  handlebars.registerHelper('totalLevel', function(classes: Array<{level: number}> | undefined) {
    if (!classes || !Array.isArray(classes)) {
      return 0;
    }
    return classes.reduce((sum, cls) => sum + cls.level, 0);
  });

  // Format class and level string with line breaks
  handlebars.registerHelper('classLevelString', function(classes: Array<{name: string, level: number}> | undefined) {
    if (!classes || !Array.isArray(classes)) {
      return '';
    }
    return classes.map(cls => `${cls.name.charAt(0).toUpperCase() + cls.name.slice(1)} Level ${cls.level}`).join('<br>');
  });

  //
  // Character Creation Helpers
  //

  // Helper to check equality
  handlebars.registerHelper('eq', function(value1: unknown, value2: unknown): boolean {
    return value1 === value2;
  });

  // Helper to calculate ability modifier (alias for abilityModifier)
  handlebars.registerHelper('abilityMod', function(score: number): string {
    const mod = Math.floor((score - 10) / 2);
    return mod >= 0 ? `+${mod}` : `${mod}`;
  });

  // Helper to calculate proficiency bonus
  handlebars.registerHelper('proficiencyBonus', function(level: number): string {
    const bonus = Math.floor((level - 1) / 4) + 2;
    return `+${bonus}`;
  });

  // Helper to check if an array includes a value
  handlebars.registerHelper('includes', function(array: unknown[], value: unknown): boolean {
    return Array.isArray(array) && array.includes(value);
  });

  // Helper to join array elements with a separator
  handlebars.registerHelper('join', function(array: unknown[], separator: string = ', '): string {
    if (!Array.isArray(array)) return '';
    return array.join(separator);
  });

  // Helper to capitalize a string
  handlebars.registerHelper('capitalize', function(str: string): string {
    if (typeof str !== 'string') return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  });

  // Helper to create an array
  handlebars.registerHelper('array', function(...args: unknown[]): unknown[] {
    // Remove the last argument which is the Handlebars options object
    return args.slice(0, -1);
  });

  // Helper to get a default value if the first argument is undefined
  handlebars.registerHelper('default', function(value: unknown, defaultValue: unknown): unknown {
    return value != null ? value : defaultValue;
  });

  // Helper to convert an object to JSON string
  handlebars.registerHelper('json', function(context: unknown): string {
    return JSON.stringify(context, null, 2);
  });

  // Helper to format a number with a sign
  handlebars.registerHelper('formatSign', function (number) {
    if (number === undefined || number === null) return '+0';
    
    const num = parseInt(number, 10);
    return num >= 0 ? `+${num}` : `${num}`;
  });
  
  // Helper to generate an array for iteration
  handlebars.registerHelper('range', function (start, end) {
    const result = [];
    for (let i = start; i <= end; i++) {
      result.push(i);
    }
    return result;
  });
  
  // Helper to concatenate strings
  handlebars.registerHelper('concat', function(...args: unknown[]): string {
    return args.slice(0, -1).join('');
  });
  
  // Helper to convert a string to lowercase
  handlebars.registerHelper('lowercase', function (str) {
    return (str || '').toLowerCase();
  });
  
  // Helper to uppercase a word
  handlebars.registerHelper('uppercase', function(word: unknown): string {
    return (String(word || '')).toUpperCase();
  });
  
  // Helper to get passive perception (10 + perception modifier)
  handlebars.registerHelper('passivePerception', function(perceptionModifier: number): number {
    return 10 + (perceptionModifier || 0);
  });
  
  // Register title case helper
  handlebars.registerHelper('titleCase', function(str: string): string {
    if (!str) return '';
    return str.split(' ')
      .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  });

  // Format hit die (d8, d10, etc.)
  handlebars.registerHelper('formatHitDie', function(hitDie) {
    return hitDie ? hitDie.toLowerCase() : 'd8';
  });

  // Group features by level
  handlebars.registerHelper('groupFeaturesByLevel', function(features: Feature[] | undefined): FeaturesByLevel {
    if (!features || !Array.isArray(features)) {
      return {};
    }
    
    // Group features by level
    const featuresByLevel: FeaturesByLevel = {};
    
    // Sort features by level
    const sortedFeatures = [...features].sort((a, b) => a.level - b.level);
    
    // Group by level
    sortedFeatures.forEach(feature => {
      const level = feature.level || 1;
      featuresByLevel[level] = featuresByLevel[level] || [];
      featuresByLevel[level].push(feature);
    });
    
    return featuresByLevel;
  });

  // Helper to filter features by level
  handlebars.registerHelper('filterFeaturesByLevel', function(features: Feature[] | undefined, level: number): Feature[] {
    if (!features || !Array.isArray(features)) {
      return [];
    }
    
    return features.filter(feature => feature.level === level);
  });

  // Helper to check if a value is an array
  handlebars.registerHelper('isArray', function(value: unknown): boolean {
    return Array.isArray(value);
  });

  // Helper to add numbers
  handlebars.registerHelper('add', function(value1: number, value2: number): number {
    return value1 + value2;
  });

  //
  // Conditional Block Helpers (with typed 'this' context)
  //
  
  // Used for conditional display
  handlebars.registerHelper('ifEquals', function(this: HandlebarsBlockThis, arg1: unknown, arg2: unknown, options: Handlebars.HelperOptions) {
    return arg1 === arg2 ? options.fn(this) : options.inverse(this);
  });
  
  // Check if editing mode is active
  handlebars.registerHelper('editMode', function(this: HandlebarsBlockThis, isEditing: boolean, options: Handlebars.HelperOptions) {
    return isEditing ? options.fn(this) : options.inverse(this);
  });
  
  // Check if a feature is from a specific source
  handlebars.registerHelper('isSource', function(this: HandlebarsBlockThis, source: string, targetSource: string, options: Handlebars.HelperOptions) {
    return source.includes(targetSource) ? options.fn(this) : options.inverse(this);
  });

  // Helper to check if any argument is truthy
  handlebars.registerHelper('or', function(this: HandlebarsBlockThis, ...args: unknown[]) {
    // Get options object
    const options = args.pop() as Handlebars.HelperOptions;
    return args.some(Boolean) ? options.fn(this) : options.inverse(this);
  });
} 