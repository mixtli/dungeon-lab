// Helper functions for Handlebars templates

interface AbilityScores {
  method: 'standard' | 'pointbuy' | 'roll';
  standard?: { [K in string]: number };
  pointbuy?: { [K in string]: number };
  roll?: { [K in string]: number };
}

interface Equipment {
  choices?: Array<{
    items?: Array<{
      cost?: number;
    }>;
  }>;
}

interface CharacterData {
  [key: string]: unknown;
  abilities?: AbilityScores;
}

interface Feature {
  level: number;
  [key: string]: unknown;
}

interface FeaturesByLevel {
  [level: number]: Feature[];
}

/**
 * Register Handlebars helpers needed for D&D 5e character creation templates
 * @param {object} handlebars - The Handlebars instance
 */
export function registerHelpers(handlebars: typeof Handlebars): void {
  // Helper to check equality
  // Usage: {{#if (eq value1 value2)}}...{{/if}}
  handlebars.registerHelper('eq', function(value1: any, value2: any): boolean {
    return value1 === value2;
  });

  // Helper to calculate ability modifier
  // Usage: {{abilityMod score}}
  handlebars.registerHelper('abilityMod', function(score: number): string {
    const mod = Math.floor((score - 10) / 2);
    return mod >= 0 ? `+${mod}` : `${mod}`;
  });

  // Helper to calculate proficiency bonus
  // Usage: {{proficiencyBonus level}}
  handlebars.registerHelper('proficiencyBonus', function(level: number): string {
    const bonus = Math.floor((level - 1) / 4) + 2;
    return `+${bonus}`;
  });

  // Helper to check if an array includes a value
  // Usage: {{#if (includes array value)}}...{{/if}}
  handlebars.registerHelper('includes', function(array: any[], value: any): boolean {
    return Array.isArray(array) && array.includes(value);
  });

  // Helper to join array elements with a separator
  // Usage: {{join array ", "}}
  handlebars.registerHelper('join', function(array: any[], separator: string = ', '): string {
    if (!Array.isArray(array)) return '';
    return array.join(separator);
  });

  // Helper to capitalize a string
  // Usage: {{capitalize string}}
  handlebars.registerHelper('capitalize', function(str: string): string {
    if (typeof str !== 'string') return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  });

  // Helper to create an array
  // Usage: {{#each (array "one" "two" "three")}}...{{/each}}
  handlebars.registerHelper('array', function(...args: any[]): any[] {
    // Remove the last argument which is the Handlebars options object
    return args.slice(0, -1);
  });

  // Helper to get a default value if the first argument is undefined
  // Usage: {{default value defaultValue}}
  handlebars.registerHelper('default', function(value: any, defaultValue: any): any {
    return value != null ? value : defaultValue;
  });

  // Helper to convert an object to JSON string
  // Usage: {{json object}}
  handlebars.registerHelper('json', function(context: any): string {
    return JSON.stringify(context, null, 2);
  });

  // Helper to format a number with a sign
  // Usage: {{formatSign number}}
  handlebars.registerHelper('formatSign', function (number) {
    if (number === undefined || number === null) return '+0';
    
    const num = parseInt(number, 10);
    return num >= 0 ? `+${num}` : `${num}`;
  });
  
  // Helper to generate an array for iteration
  // Usage: {{#each (range 1 20)}}...{{/each}}
  handlebars.registerHelper('range', function (start, end) {
    const result = [];
    for (let i = start; i <= end; i++) {
      result.push(i);
    }
    return result;
  });
  
  // Helper to concatenate strings
  // Usage: {{concat string1 string2 string3}}
  handlebars.registerHelper('concat', function () {
    const args = Array.prototype.slice.call(arguments, 0, -1);
    return args.join('');
  });
  
  // Helper to convert a string to lowercase
  // Usage: {{lowercase string}}
  handlebars.registerHelper('lowercase', function (str) {
    return (str || '').toLowerCase();
  });
  
  // Helper to uppercase a word
  // Usage: {{uppercase word}}
  handlebars.registerHelper('uppercase', function(this: unknown, word: unknown): string {
    return (String(word || '')).toUpperCase();
  });
  
  // Helper to get passive perception (10 + perception modifier)
  // Usage: {{passivePerception perceptionModifier}}
  handlebars.registerHelper('passivePerception', function(perceptionModifier: number): number {
    return 10 + (perceptionModifier || 0);
  });
  
  // Register title case helper
  handlebars.registerHelper('titleCase', function(str: string): string {
    console.log('titleCase helper called with:', str);
    if (!str) return '';
    return str.split(' ')
      .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  });

  // Check if a skill selection should be disabled
  handlebars.registerHelper('isSkillDisabled', function(selectedSkills, maxChoices, currentSkill) {
    console.log('isSkillDisabled helper called:', { selectedSkills, maxChoices, currentSkill });
    
    // If no skills are selected yet or currentSkill is not defined, nothing should be disabled
    if (!selectedSkills || !currentSkill) {
      return false;
    }
    
    // Ensure selectedSkills is treated as an array
    const skillsArray = Array.isArray(selectedSkills) ? selectedSkills : [selectedSkills];
    
    // If maxChoices is not defined or invalid, default to 2
    const choicesLimit = typeof maxChoices === 'number' && maxChoices > 0 ? maxChoices : 2;
    console.log(`Checking if skill should be disabled. Selected: ${skillsArray.length}, Max: ${choicesLimit}, Current: ${currentSkill}`);
    
    // A skill should be disabled if:
    // 1. The maximum number of choices has been reached
    // 2. AND this particular skill is not already selected
    const isAlreadySelected = skillsArray.includes(currentSkill);
    const maxReached = skillsArray.length >= choicesLimit;
    
    const result = maxReached && !isAlreadySelected;
    console.log(`Skill ${currentSkill} disabled: ${result} (Already selected: ${isAlreadySelected}, Max reached: ${maxReached})`);
    
    return result;
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
  // Usage: {{#each (filterFeaturesByLevel features 1)}}...{{/each}}
  handlebars.registerHelper('filterFeaturesByLevel', function(features: Feature[] | undefined, level: number): Feature[] {
    if (!features || !Array.isArray(features)) {
      return [];
    }
    
    return features.filter(feature => feature.level === level);
  });

  // Helper to check if an ability boost selection should be disabled
  handlebars.registerHelper('isBoostDisabled', function(selectedBoosts, maxBoosts) {
    if (!selectedBoosts) return false;
    return selectedBoosts.length >= maxBoosts;
  });

  // Helper to check if a tool selection should be disabled
  handlebars.registerHelper('isToolDisabled', function(selectedTools, maxTools, currentTool) {
    if (!selectedTools) return false;
    return selectedTools.length >= maxTools && !selectedTools.includes(currentTool);
  });

  // Helper to check if a language selection should be disabled
  handlebars.registerHelper('isLanguageDisabled', function(selectedLanguages, maxLanguages) {
    if (!selectedLanguages) return false;
    return selectedLanguages.length >= maxLanguages;
  });
  
  // Helper to calculate total gold from equipment choices
  // Usage: {{calculateTotalGold equipment}}
  handlebars.registerHelper('calculateTotalGold', function(equipment: Equipment): number {
    let totalGold = 0;
    if (equipment?.choices) {
      equipment.choices.forEach(choice => {
        if (choice.items) {
          choice.items.forEach(item => {
            totalGold += item.cost || 0;
          });
        }
      });
    }
    return totalGold;
  });
  
  // Helper to get the type of a value
  // Usage: {{typeof value}}
  handlebars.registerHelper('typeof', function(value: any): string {
    return typeof value;
  });

  // Helper to check if any argument is truthy
  // Usage: {{#if (or arg1 arg2 arg3)}}...{{/if}}
  handlebars.registerHelper('or', function(...args: any[]): boolean {
    // Remove the last argument which is the Handlebars options object
    args.pop();
    return args.some(Boolean);
  });

  // Helper to get final ability score
  // Usage: {{getFinalAbilityScore 'strength' character}}
  handlebars.registerHelper('getFinalAbilityScore', function(ability: string, character: CharacterData): number {
    const abilities = character.abilities;
    if (!abilities) return 10;

    const { method, standard, pointbuy, roll } = abilities;

    const scores = {
      standard,
      pointbuy,
      roll
    }[method];

    return scores?.[ability] ?? 10;
  });

  // Helper to find an item in an array by property value
  // Usage: {{#with (find array "propertyName" value)}}...{{/with}}
  handlebars.registerHelper('find', function(array: any[], property: string, value: any): any {
    if (!array || !Array.isArray(array)) return null;
    return array.find(item => item[property] === value);
  });

  // Helper to check if a value is an array
  // Usage: {{#if (isArray value)}}...{{/if}}
  handlebars.registerHelper('isArray', function(value: any): boolean {
    return Array.isArray(value);
  });

  // Helper to add numbers
  // Usage: {{add value1 value2}}
  handlebars.registerHelper('add', function(value1: number, value2: number): number {
    return value1 + value2;
  });
} 