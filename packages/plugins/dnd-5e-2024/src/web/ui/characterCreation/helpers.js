// Helper functions for Handlebars templates

// List of available languages
const LANGUAGES = [
  'abyssal', 'celestial', 'common', 'deep speech', 'draconic', 'dwarvish', 
  'elvish', 'giant', 'gnomish', 'goblin', 'halfling', 'infernal', 
  'orc', 'primordial', 'sylvan', 'undercommon'
];

/**
 * Register Handlebars helpers needed for D&D 5e character creation templates
 * @param {object} Handlebars - The Handlebars instance
 */
export function registerHelpers(Handlebars) {
  // Helper to check if two values are equal
  // Usage: {{#if (eq value1 value2)}}...{{/if}}
  Handlebars.registerHelper('eq', function (value1, value2) {
    //console.log(`Comparing ${value1} and ${value2}: ${value1 === value2}`);
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
    console.log('includes helper called:', { array, value });
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
  
  // Register title case helper
  Handlebars.registerHelper('titleCase', function(str) {
    console.log('titleCase helper called with:', str);
    if (!str) return '';
    return str.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  });

  // Check if a skill selection should be disabled
  Handlebars.registerHelper('isSkillDisabled', function(selectedSkills, maxChoices, currentSkill) {
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
  Handlebars.registerHelper('formatHitDie', function(hitDie) {
    return hitDie ? hitDie.toLowerCase() : 'd8';
  });

  // Group features by level
  Handlebars.registerHelper('groupFeaturesByLevel', function(features) {
    if (!features || !Array.isArray(features)) {
      return {};
    }
    
    // Group features by level
    const featuresByLevel = {};
    
    // Sort features by level
    const sortedFeatures = [...features].sort((a, b) => a.level - b.level);
    
    // Group by level
    sortedFeatures.forEach(feature => {
      const level = feature.level || 1;
      if (!featuresByLevel[level]) {
        featuresByLevel[level] = [];
      }
      featuresByLevel[level].push(feature);
    });
    
    return featuresByLevel;
  });

  // Helper to filter features by level
  // Usage: {{#each (filterFeaturesByLevel features 1)}}...{{/each}}
  Handlebars.registerHelper('filterFeaturesByLevel', function(features, level) {
    if (!features || !Array.isArray(features)) {
      return [];
    }
    
    return features.filter(feature => feature.level === level);
  });

  // Helper to check if an ability boost selection should be disabled
  Handlebars.registerHelper('isBoostDisabled', function(selectedBoosts, maxBoosts) {
    if (!selectedBoosts) return false;
    return selectedBoosts.length >= maxBoosts;
  });

  // Helper to check if a tool selection should be disabled
  Handlebars.registerHelper('isToolDisabled', function(selectedTools, maxTools, currentTool) {
    if (!selectedTools) return false;
    return selectedTools.length >= maxTools && !selectedTools.includes(currentTool);
  });

  // Helper to check if a language selection should be disabled
  Handlebars.registerHelper('isLanguageDisabled', function(selectedLanguages, maxLanguages) {
    if (!selectedLanguages) return false;
    return selectedLanguages.length >= maxLanguages;
  });
  
  // Helper to calculate total gold from class and background equipment choices
  Handlebars.registerHelper('calculateTotalGold', function(classData, originData) {
    let totalGold = 0;
    
    // Add gold from class equipment choice if option B was selected (usually a gold option)
    if (classData && classData.selectedEquipment === 'B' && classData.document && classData.document.equipmentChoices) {
      // Look through all equipment choices for the first one with gold
      classData.document.equipmentChoices.forEach(choice => {
        if (choice.optionB) {
          choice.optionB.forEach(item => {
            if (item.gold) {
              totalGold += parseInt(item.gold, 10);
            } else if (item.value && item.type === 'gold') {
              totalGold += parseInt(item.value, 10);
            }
          });
        }
      });
    }
    
    // Add gold from background equipment choice if gold option was selected
    if (originData && originData.selectedEquipment === 'gold' && 
        originData.backgroundDocument && originData.backgroundDocument.equipment) {
      totalGold += parseInt(originData.backgroundDocument.equipment.gold, 10) || 0;
    }
    
    return totalGold;
  });
  
  // Helper to convert an object to JSON string
  Handlebars.registerHelper('json', function(context) {
    return JSON.stringify(context || {});
  });
  
  // Helper to provide a default value if the primary value is undefined
  Handlebars.registerHelper('default', function(value, defaultValue) {
    return value !== undefined ? value : defaultValue;
  });
  
  // Calculate ability modifier
  Handlebars.registerHelper('getAbilityModifier', function(score) {
    if (score === undefined || score === null || score === '') return '+0';
    
    const abilityScore = parseInt(score, 10);
    if (isNaN(abilityScore)) return '+0';
    
    const modifier = Math.floor((abilityScore - 10) / 2);
    return modifier >= 0 ? `+${modifier}` : `${modifier}`;
  });
  
  // Calculate final ability score including bonuses
  Handlebars.registerHelper('getFinalAbilityScore', function(ability, abilities) {
    if (!abilities) return 10;
    
    let baseScore = 10;
    
    // Get the base score from the selected ability score method
    if (abilities.method === 'standard' && abilities.standard) {
      baseScore = parseInt(abilities.standard[ability], 10) || 10;
    } else if (abilities.method === 'pointbuy' && abilities.pointbuy) {
      baseScore = parseInt(abilities.pointbuy[ability], 10) || 10;
    } else if (abilities.method === 'roll' && abilities.roll) {
      baseScore = parseInt(abilities.roll[ability], 10) || 10;
    }
    
    // Add ability score bonuses from origin (unimplemented)
    // This would add racial bonuses and background bonuses
    
    return baseScore;
  });

  // Make languages available to the template
  Handlebars.registerHelper('languages', function() {
    return LANGUAGES;
  });

  // Helper to get the type of a value
  // Usage: {{typeof value}}
  Handlebars.registerHelper('typeof', function(value) {
    if (value === undefined) return 'undefined';
    if (value === null) return 'null';
    return typeof value;
  });

  // Helper for logical OR operations
  // Usage: {{#if (or value1 value2)}}...{{/if}}
  Handlebars.registerHelper('or', function() {
    const args = Array.prototype.slice.call(arguments, 0, -1);
    return args.some(Boolean);
  });
} 