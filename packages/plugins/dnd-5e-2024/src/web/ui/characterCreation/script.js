// Character creation form handlers for D&D 5e

// Initialize form with default values
export function initForm(container, initialData = {}, onSubmit, onCancel) {
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
    ...initialData
  };

  // Set up event listeners
  const form = container.querySelector('#character-form');
  const cancelButton = container.querySelector('#cancel-button');
  const saveButton = container.querySelector('#save-button');
  
  if (form) {
    // Handle ability score changes and update modifiers
    const abilityInputs = form.querySelectorAll('input[name^="abilities."]');
    abilityInputs.forEach(input => {
      input.addEventListener('change', updateAbilityModifiers);
    });
    
    // Handle class selection to update HP calculation
    const classSelect = form.querySelector('#character-class');
    const levelInput = form.querySelector('#character-level');
    const constitutionInput = form.querySelector('#ability-con');
    
    if (classSelect && levelInput && constitutionInput) {
      [classSelect, levelInput, constitutionInput].forEach(el => {
        el.addEventListener('change', () => {
          calculateHitPoints(
            classSelect.value,
            parseInt(levelInput.value || 1, 10),
            parseInt(constitutionInput.value || 10, 10)
          );
        });
      });
    }
    
    // Handle form submission
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      
      // Collect form data
      const formData = new FormData(form);
      const characterData = {
        name: formData.get('name'),
        race: formData.get('race'),
        class: formData.get('class'),
        level: parseInt(formData.get('level'), 10),
        alignment: formData.get('alignment'),
        background: formData.get('background'),
        abilities: {
          strength: parseInt(formData.get('abilities.strength'), 10),
          dexterity: parseInt(formData.get('abilities.dexterity'), 10),
          constitution: parseInt(formData.get('abilities.constitution'), 10),
          intelligence: parseInt(formData.get('abilities.intelligence'), 10),
          wisdom: parseInt(formData.get('abilities.wisdom'), 10),
          charisma: parseInt(formData.get('abilities.charisma'), 10)
        },
        hitPoints: {
          maximum: parseInt(formData.get('hitPoints.maximum'), 10)
        }
      };
      
      // Call the onSubmit callback with collected data
      if (typeof onSubmit === 'function') {
        onSubmit(characterData);
      }
    });
  }
  
  // Handle cancel button
  if (cancelButton) {
    cancelButton.addEventListener('click', () => {
      if (typeof onCancel === 'function') {
        onCancel();
      }
    });
  }
  
  // Initialize ability modifiers
  updateAbilityModifiers();
  
  // Calculate initial hit points based on default values
  if (defaultData.class) {
    calculateHitPoints(
      defaultData.class,
      defaultData.level,
      defaultData.abilities.constitution
    );
  }
  
  // Return methods to interact with the form
  return {
    getFormData: () => {
      const formData = new FormData(form);
      return {
        name: formData.get('name'),
        race: formData.get('race'),
        class: formData.get('class'),
        level: parseInt(formData.get('level'), 10),
        alignment: formData.get('alignment'),
        background: formData.get('background'),
        abilities: {
          strength: parseInt(formData.get('abilities.strength'), 10),
          dexterity: parseInt(formData.get('abilities.dexterity'), 10),
          constitution: parseInt(formData.get('abilities.constitution'), 10),
          intelligence: parseInt(formData.get('abilities.intelligence'), 10),
          wisdom: parseInt(formData.get('abilities.wisdom'), 10),
          charisma: parseInt(formData.get('abilities.charisma'), 10)
        },
        hitPoints: {
          maximum: parseInt(formData.get('hitPoints.maximum'), 10)
        }
      };
    },
    setFormData: (data) => {
      Object.entries(data).forEach(([key, value]) => {
        const input = form.querySelector(`[name="${key}"]`);
        if (input) {
          input.value = value;
        } else if (typeof value === 'object') {
          Object.entries(value).forEach(([subKey, subValue]) => {
            const subInput = form.querySelector(`[name="${key}.${subKey}"]`);
            if (subInput) {
              subInput.value = subValue;
            }
          });
        }
      });
      
      updateAbilityModifiers();
      
      if (data.class) {
        calculateHitPoints(
          data.class,
          data.level,
          data.abilities.constitution
        );
      }
    },
    reset: () => {
      form.reset();
      updateAbilityModifiers();
    }
  };
  
  // Helper function to update ability modifiers
  function updateAbilityModifiers() {
    const abilityInputs = form.querySelectorAll('input[name^="abilities."]');
    abilityInputs.forEach(input => {
      const abilityScore = parseInt(input.value, 10) || 10;
      const modifier = Math.floor((abilityScore - 10) / 2);
      const modifierDisplay = modifier >= 0 ? `+${modifier}` : `${modifier}`;
      
      // Find the corresponding modifier element
      const ability = input.name.split('.')[1];
      const modEl = container.querySelector(`#mod-${ability.substring(0, 3)}`);
      if (modEl) {
        modEl.textContent = modifierDisplay;
      }
    });
  }
  
  // Calculate hit points based on class and level
  function calculateHitPoints(characterClass, level, constitution) {
    if (!characterClass || !level) return;
    
    const constitutionModifier = Math.floor((constitution - 10) / 2);
    const hpInput = form.querySelector('#hp-max');
    
    if (hpInput) {
      let baseHitDie = 8; // Default
      
      // Set hit die based on class
      switch (characterClass) {
        case 'barbarian':
          baseHitDie = 12;
          break;
        case 'fighter':
        case 'paladin':
        case 'ranger':
          baseHitDie = 10;
          break;
        case 'sorcerer':
        case 'wizard':
          baseHitDie = 6;
          break;
        default:
          baseHitDie = 8;
      }
      
      // First level gets max hit die + con modifier
      // Additional levels get average hit die + con modifier
      const firstLevelHP = baseHitDie + constitutionModifier;
      const averageHitDie = Math.ceil((baseHitDie / 2) + 0.5);
      const additionalLevelsHP = (level - 1) * (averageHitDie + constitutionModifier);
      
      const totalHP = Math.max(1, firstLevelHP + additionalLevelsHP);
      hpInput.value = totalHP;
    }
  }
} 