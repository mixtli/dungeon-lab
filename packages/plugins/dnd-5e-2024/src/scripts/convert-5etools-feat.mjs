/**
 * Converts a 5eTools feat to our internal format
 * @param {Object} feat - The 5eTools feat object
 * @returns {Object} - The converted feat object matching our schema
 */
export function convert5eToolsFeat(feat) {
  // Map category codes to full names
  const categoryMap = {
    'G': 'General',
    'F': 'Fighting Style',
    'O': 'Origin',
    'E': 'Epic Boon'
  };

  // Map ability abbreviations to full names
  const abilityMap = {
    'str': 'strength',
    'dex': 'dexterity',
    'con': 'constitution',
    'int': 'intelligence',
    'wis': 'Wisdom',
    'cha': 'Charisma'
  };
  
  // Process ability options for ability GRANTED by the feat
  const processAbility = () => {
    if (!feat.ability) return undefined;

    // Check if ability contains a "choose" field for ability choices
    if (Array.isArray(feat.ability) && feat.ability.length > 0 && feat.ability[0].choose) {
      const choiceFrom = feat.ability[0].choose.from.map(ability => abilityMap[ability] || ability);
      return [{
        choice: {
          from: choiceFrom,
          count: feat.ability[0].choose.count || 1
        }
      }];
    }
    else if (feat.ability.choose) {
      const choiceFrom = feat.ability.choose.from.map(ability => abilityMap[ability] || ability);
      return [{
        choice: {
          from: choiceFrom,
          count: feat.ability.choose.count || 1
        }
      }];
    }
    
    // Handle standard ability score requirements
    return Object.entries(feat.ability).reduce((acc, [key, value]) => {
      acc[abilityMap[key] || key] = value;
      return acc;
    }, {});
  };

  // Extract ability information - abilities GRANTED by the feat
  const abilityData = processAbility();

  // Process prerequisites which could be in array format
  const processPrerequisites = () => {
    if (!feat.prerequisite) return undefined;
    
    const prerequisites = {
      ability: undefined,
      race: undefined,
      class: undefined,
      level: undefined,
      spellcasting: undefined,
      other: undefined
    };
    
    // Handle array format prerequisites
    if (Array.isArray(feat.prerequisite)) {
      for (const prereq of feat.prerequisite) {
        // Handle level
        if (prereq.level) {
          prerequisites.level = prereq.level;
        }
        
        // Handle ability
        if (prereq.ability) {
          prerequisites.ability = Object.entries(prereq.ability).reduce((acc, [key, value]) => {
            acc[abilityMap[key] || key] = value;
            return acc;
          }, {});
        }
        
        // Handle race
        if (prereq.race) {
          prerequisites.race = Array.isArray(prereq.race) ? 
            prereq.race.map(r => r.name || r) : 
            [prereq.race.name || prereq.race];
        }
        
        // Handle class
        if (prereq.class) {
          prerequisites.class = Array.isArray(prereq.class) ? 
            prereq.class.map(c => c.name || c) : 
            [prereq.class.name || prereq.class];
        }
        
        // Handle spellcasting
        if (prereq.spellcasting || prereq.spellcasting2020) {
          prerequisites.spellcasting = true;
        }
        
        // Handle other requirements
        if (prereq.other) {
          prerequisites.other = prereq.other;
        }
      }
    } else {
      // Handle object format prerequisites
      if (feat.prerequisite.ability) {
        prerequisites.ability = Object.entries(feat.prerequisite.ability).reduce((acc, [key, value]) => {
          acc[abilityMap[key] || key] = value;
          return acc;
        }, {});
      }
      
      if (feat.prerequisite.race) {
        prerequisites.race = Array.isArray(feat.prerequisite.race) ? 
          feat.prerequisite.race.map(r => r.name || r) : 
          [feat.prerequisite.race.name || feat.prerequisite.race];
      }
      
      if (feat.prerequisite.class) {
        prerequisites.class = Array.isArray(feat.prerequisite.class) ? 
          feat.prerequisite.class.map(c => c.name || c) : 
          [feat.prerequisite.class.name || feat.prerequisite.class];
      }
      
      if (feat.prerequisite.level) {
        prerequisites.level = feat.prerequisite.level;
      }
      
      if (feat.prerequisite.spellcasting || feat.prerequisite.spellcasting2020) {
        prerequisites.spellcasting = true;
      }
      
      if (feat.prerequisite.other) {
        prerequisites.other = feat.prerequisite.other;
      }
    }
    
    // Return prerequisites if any field is defined
    return Object.values(prerequisites).some(v => v !== undefined) ? prerequisites : undefined;
  };
  
  // Get prerequisites
  const prerequisites = processPrerequisites();

  // Get description from the first string entry if available
  const description = feat.entries && feat.entries[0] && typeof feat.entries[0] === 'string' ? 
    feat.entries[0] : 
    'No description available';

  // Convert entries to benefits, skipping the first entry if it's the description
  const benefits = [];
  if (Array.isArray(feat.entries)) {
    // Start at index 1 if the first entry is a string and used as description
    const startIndex = (typeof feat.entries[0] === 'string') ? 1 : 0;
    
    for (let i = startIndex; i < feat.entries.length; i++) {
      const entry = feat.entries[i];
      
      if (typeof entry === 'string') {
        benefits.push({
          name: '',
          description: entry
        });
      } else if (entry.type === 'list') {
        entry.items.forEach(item => {
          benefits.push({
            name: item.name || '',
            description: item.entry || item
          });
        });
      } else if (entry.name && entry.entries) {
        benefits.push({
          name: entry.name,
          description: Array.isArray(entry.entries) ? entry.entries.join('\n') : entry.entries
        });
      }
    }
  }

  const result = {
    name: feat.name,
    description,
    category: categoryMap[feat.category] || feat.category || undefined,
    prerequisites,
    benefits
  };
  
  // Add ability field if present
  if (Array.isArray(abilityData)) {
    result.ability = abilityData;
  }
  console.log(result)
  
  return result;
} 