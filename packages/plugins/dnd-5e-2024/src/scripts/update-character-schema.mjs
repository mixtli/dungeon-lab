import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFile, readdir, writeFile } from 'fs/promises';

// Get the current file's directory in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Calculate ability modifier based on score
function calculateModifier(score) {
  return Math.floor((score - 10) / 2);
}

async function updateCharacterFiles() {
  try {
    // Path to characters directory
    const charactersDir = join(__dirname, '../../data/characters');
    const characterFiles = await readdir(charactersDir);
    const jsonFiles = characterFiles.filter(file => file.endsWith('.json'));
    console.log(`Found ${jsonFiles.length} character files to update`);
    
    let updated = 0;
    let errors = 0;
    
    // Process each character file
    for (const characterFile of jsonFiles) {
      try {
        // Read character file
        const characterFilePath = join(charactersDir, characterFile);
        const characterData = JSON.parse(await readFile(characterFilePath, 'utf-8'));
        
        // Extract top-level fields
        const { name, description, avatar, token } = characterData;
        
        // Create ability object in the correct format
        const abilities = {
          strength: {
            score: characterData.ability_scores?.str || 10,
            modifier: calculateModifier(characterData.ability_scores?.str || 10),
            savingThrow: {
              proficient: characterData.saving_throws?.str || false,
              bonus: 0
            }
          },
          dexterity: {
            score: characterData.ability_scores?.dex || 10,
            modifier: calculateModifier(characterData.ability_scores?.dex || 10),
            savingThrow: {
              proficient: characterData.saving_throws?.dex || false,
              bonus: 0
            }
          },
          constitution: {
            score: characterData.ability_scores?.con || 10,
            modifier: calculateModifier(characterData.ability_scores?.con || 10),
            savingThrow: {
              proficient: characterData.saving_throws?.con || false,
              bonus: 0
            }
          },
          intelligence: {
            score: characterData.ability_scores?.int || 10,
            modifier: calculateModifier(characterData.ability_scores?.int || 10),
            savingThrow: {
              proficient: characterData.saving_throws?.int || false,
              bonus: 0
            }
          },
          wisdom: {
            score: characterData.ability_scores?.wis || 10,
            modifier: calculateModifier(characterData.ability_scores?.wis || 10),
            savingThrow: {
              proficient: characterData.saving_throws?.wis || false,
              bonus: 0
            }
          },
          charisma: {
            score: characterData.ability_scores?.cha || 10,
            modifier: calculateModifier(characterData.ability_scores?.cha || 10),
            savingThrow: {
              proficient: characterData.saving_throws?.cha || false,
              bonus: 0
            }
          }
        };
        
        // Structure hit points in the correct format
        const hitPoints = {
          maximum: characterData.hit_points?.max || 10,
          current: characterData.hit_points?.current || 10,
          temporary: characterData.hit_points?.temporary || 0
        };
        
        // Create data object with all other fields
        const data = {
          species: characterData.species,
          classes: characterData.classes,
          background: characterData.background,
          alignment: characterData.alignment,
          experiencePoints: characterData.experiencePoints || 0,
          proficiencyBonus: characterData.proficiencyBonus || 2,
          armorClass: characterData.armor_class?.value || 10,
          initiative: characterData.initiative || 0,
          speed: characterData.speed || 30,
          hitPoints,
          hitDice: characterData.hitDice,
          abilities,
          equipment: characterData.equipment || [],
          features: characterData.features || [],
          biography: characterData.biography || {}
        };
        
        // Create new character object with proper structure
        const updatedCharacter = {
          id: characterData.id,
          name,
          description,
          avatar,
          token,
          data
        };
        
        // Write updated character file
        await writeFile(
          characterFilePath,
          JSON.stringify(updatedCharacter, null, 2),
          'utf-8'
        );
        
        console.log(`Updated character: ${name}`);
        updated++;
      } catch (error) {
        console.error(`Error updating character file ${characterFile}:`, error);
        errors++;
      }
    }
    
    // Print update summary
    console.log('\nCharacter Update Summary:');
    console.log(`- Updated: ${updated} character files`);
    console.log(`- Errors: ${errors} character files`);
    
  } catch (error) {
    console.error('Error updating character files:', error);
  }
}

// Run the update
updateCharacterFiles().catch(error => {
  console.error('Failed to update character files:', error);
  process.exit(1);
}); 