/**
 * Convert any value to lowercase string
 * @param value Value to convert to lowercase
 * @returns Lowercase string
 */
export function toLowercase(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'string') {
    return value.toLowerCase();
  }
  return String(value).toLowerCase();
}

/**
 * Clean 5etools rule text by removing markup and source references
 * @param text Text to clean
 * @returns Cleaned text
 */
export function cleanRuleText(text: string): string {
  if (typeof text !== 'string') {
    return '';
  }
  
  // Handle {@variantrule text|source} pattern
  text = text.replace(/{@variantrule ([^}|]+)\|[^}]+}/g, '$1');
  
  // Handle {@condition text|source} pattern
  text = text.replace(/{@condition ([^}|]+)\|[^}]+}/g, '$1');
  
  // Handle {@sense text|source} pattern
  text = text.replace(/{@sense ([^}|]+)\|[^}]+}/g, '$1');
  
  // Handle {@spell text|source} pattern
  text = text.replace(/{@spell ([^}|]+)\|[^}]+}/g, '$1');
  
  // Handle {@action text|source} pattern
  text = text.replace(/{@action ([^}|]+)\|[^}]+}/g, '$1');
  
  // Handle {@dc num} pattern
  text = text.replace(/{@dc (\d+)}/g, 'DC $1');
  
  // Handle {@damage d4} pattern
  text = text.replace(/{@damage ([^}]+)}/g, '$1');
  
  // Handle {@skill skill|source} pattern
  text = text.replace(/{@skill ([^}|]+)\|[^}]+}/g, '$1');
  
  // Handle any other {@something text|source} pattern
  text = text.replace(/{@\w+ ([^}|]+)\|[^}]+}/g, '$1');
  
  // Handle simple {@something text} pattern (no source)
  text = text.replace(/{@\w+ ([^}]+)}/g, '$1');
  
  return text;
}

/**
 * Extract plain text from entry objects that might be nested
 * @param entries Array of entry objects or strings
 * @returns Extracted text as a string
 */
export function extractTextFromEntries(entries: unknown[]): string {
  if (!entries || !Array.isArray(entries)) {
    return '';
  }
  
  return entries
    .filter(entry => typeof entry === 'string' || (typeof entry === 'object' && entry && ('entries' in entry || 'items' in entry)))
    .map(entry => {
      if (typeof entry === 'string') {
        return cleanRuleText(entry);
      } else if (typeof entry === 'object' && entry && 'entries' in entry) {
        // Handle nested entries
        return extractTextFromEntries((entry as { entries: unknown }).entries as unknown[]);
      } else if (typeof entry === 'object' && entry && 'items' in entry) {
        // Handle lists
        return extractTextFromEntries(((entry as { items: unknown[] }).items).map((item: unknown) => 
          typeof item === 'string' ? item : 
          (typeof item === 'object' && item && 'entries' in item ? (item as { entries: unknown }).entries : 
           typeof item === 'object' && item && 'entry' in item ? (item as { entry: unknown }).entry : '')
        ));
      }
      return '';
    })
    .join(' ');
}

/**
 * Normalize a size code to our schema's size enum
 * @param size Size code (S, M, L, etc.)
 * @returns Normalized size (tiny, small, medium, large, huge)
 */
export function normalizeSize(size: string[]): 'tiny' | 'small' | 'medium' | 'large' | 'huge' {
  if (!size || !Array.isArray(size)) {
    return 'medium';
  }
  
  // Convert to lowercase and map to our schema's size enum
  const sizes = size.map(s => toLowercase(s));
  
  if (sizes.includes('m')) {
    return 'medium';
  } else if (sizes.includes('s')) {
    return 'small';
  } else if (sizes.includes('l')) {
    return 'large';
  } else if (sizes.includes('t')) {
    return 'tiny';
  } else if (sizes.includes('h')) {
    return 'huge';
  }
  
  return 'medium'; // Default
}

/**
 * Normalize skill proficiencies from 5etools format
 * @param skillsData Array of skill objects
 * @returns Array of skill names
 */
export function normalizeSkillProficiencies(skillsData: unknown[]): string[] {
  if (!skillsData || !Array.isArray(skillsData)) {
    return [];
  }
  
  const skills: string[] = [];
  
  for (const skillItem of skillsData) {
    if (typeof skillItem === 'object' && skillItem !== null) {
      // Skills are objects where keys are skill names and values are true
      Object.keys(skillItem).forEach(skill => {
        if ((skillItem as Record<string, unknown>)[skill] === true) {
          skills.push(toLowercase(skill));
        }
      });
    }
  }
  
  return skills;
}

/**
 * Normalize tool proficiencies from 5etools format
 * @param toolsData Array of tool objects
 * @returns Array of tool names
 */
export function normalizeToolProficiencies(toolsData: unknown[]): string[] {
  if (!toolsData || !Array.isArray(toolsData)) {
    return [];
  }
  
  const tools: string[] = [];
  
  for (const toolItem of toolsData) {
    if (typeof toolItem === 'object' && toolItem !== null) {
      // Tools are objects where keys are tool names and values are true
      Object.keys(toolItem).forEach(tool => {
        if ((toolItem as Record<string, unknown>)[tool] === true) {
          tools.push(toLowercase(tool));
        }
      });
    }
  }
  
  return tools;
}

/**
 * Extract abilities from 5etools ability data
 * @param abilityData Array of ability objects
 * @returns Array of ability names
 */
export function normalizeAbilities(abilityData: unknown[]): string[] {
  if (!abilityData || !Array.isArray(abilityData)) {
    return [];
  }
  
  const abilities: string[] = [];
  
  for (const abilityItem of abilityData) {
    if (typeof abilityItem === 'object' && abilityItem !== null) {
      const item = abilityItem as Record<string, unknown>;
      if (item.choose && typeof item.choose === 'object' && item.choose &&
          'weighted' in item.choose && typeof item.choose.weighted === 'object' && item.choose.weighted &&
          'from' in item.choose.weighted && Array.isArray(item.choose.weighted.from)) {
        // Add all abilities from weighted choices
        item.choose.weighted.from.forEach((ability: unknown) => {
          if (typeof ability === 'string') {
            abilities.push(toLowercase(ability));
          }
        });
      } else if (item.choose && typeof item.choose === 'object' && item.choose && 'from' in item.choose && Array.isArray((item.choose as { from: unknown }).from)) {
        // Add abilities from simple choices
        ((item.choose as { from: unknown[] }).from).forEach((ability: unknown) => {
          if (typeof ability === 'string') {
            abilities.push(toLowercase(ability));
          }
        });
      }
    }
  }
  
  return [...new Set(abilities)]; // Remove duplicates
}

/**
 * Process a spell list, extracting just the spell names
 * @param spellList Spell list from 5etools data
 * @returns Array of spell names
 */
export function processSpellList(spellList: unknown): string[] {
  if (!spellList) return [];
  
  const spells: string[] = [];
  
  if (Array.isArray(spellList)) {
    // Direct array of spells
    spellList.forEach(spell => {
      if (typeof spell === 'string') {
        // Extract just the spell name, removing source and other annotations
        const spellName = spell.split('|')[0].split('#')[0].trim();
        spells.push(toLowercase(spellName));
      } else if (typeof spell === 'object' && spell && 'choose' in spell) {
        // For entries with 'choose', we can't determine exact spells,
        // so add a note about choosing from a list
        spells.push(`choose a spell from ${spell.choose}`);
      }
    });
  } else if (typeof spellList === 'object') {
    // Nested structure with levels
    Object.keys(spellList as Record<string, unknown>).forEach(level => {
      const levelSpells = (spellList as Record<string, unknown>)[level];
      if (Array.isArray(levelSpells)) {
        levelSpells.forEach(spell => {
          if (typeof spell === 'string') {
            const spellName = spell.split('|')[0].split('#')[0].trim();
            spells.push(toLowercase(spellName));
          }
        });
      } else if (typeof levelSpells === 'object' && levelSpells && '_' in levelSpells) {
        // Handle complex structures like {"_": [{"choose": "level=0|class=Wizard"}]}
        const levelSpellsWithUnder = levelSpells as { _: unknown[] };
        if (Array.isArray(levelSpellsWithUnder._)) {
          levelSpellsWithUnder._.forEach((item: unknown) => {
            if (typeof item === 'object' && item && 'choose' in item) {
              spells.push(`choose a spell from ${(item as { choose: string }).choose}`);
            }
          });
        }
      }
    });
  }
  
  return spells;
}

/**
 * Extract and normalize spell data from 5etools additionalSpells
 * @param spellData Array of spell objects
 * @returns Structured spell data
 */
export function extractSpells(spellData: unknown[]): Array<{
  name?: string;
  cantrips: string[];
  spells: Array<{ level: number; spells: string[] }>;
}> {
  if (!spellData || !Array.isArray(spellData)) {
    return [];
  }
  
  return spellData.map(spellEntry => {
    const result: {
      name?: string;
      cantrips: string[];
      spells: Array<{ level: number; spells: string[] }>;
    } = {
      name: (typeof spellEntry === 'object' && spellEntry && 'name' in spellEntry && typeof (spellEntry as { name: unknown }).name === 'string') ? toLowercase((spellEntry as { name: string }).name) : undefined,
      cantrips: [],
      spells: []
    };
    
    // Process known spells (usually cantrips)
    if (typeof spellEntry === 'object' && spellEntry && 'known' in spellEntry && typeof (spellEntry as { known: unknown }).known === 'object' && (spellEntry as { known: unknown }).known) {
      const knownData = (spellEntry as { known: Record<string, unknown> }).known;
      if ('1' in knownData) {
        const knownSpells = processSpellList(knownData['1']);
        result.cantrips = knownSpells;
      }
    }
    
    // Process innate spells by level
    if (typeof spellEntry === 'object' && spellEntry && 'innate' in spellEntry && typeof (spellEntry as { innate: unknown }).innate === 'object' && (spellEntry as { innate: unknown }).innate) {
      const innateData = (spellEntry as { innate: Record<string, unknown> }).innate;
      Object.keys(innateData).forEach(level => {
        const levelNum = parseInt(level);
        if (!isNaN(levelNum)) {
          const levelSpells: string[] = [];
          const levelData = innateData[level];
          
          // Process spells that can be cast daily
          if (typeof levelData === 'object' && levelData && 'daily' in levelData && typeof (levelData as { daily: unknown }).daily === 'object' && (levelData as { daily: unknown }).daily) {
            const dailyData = (levelData as { daily: Record<string, unknown> }).daily;
            Object.keys(dailyData).forEach(times => {
              levelSpells.push(...processSpellList(dailyData[times]));
            });
          }
          
          if (levelSpells.length > 0) {
            result.spells.push({
              level: levelNum,
              spells: levelSpells
            });
          }
        }
      });
    }
    
    return result;
  });
} 