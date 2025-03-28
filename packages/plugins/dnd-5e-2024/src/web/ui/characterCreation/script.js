// Character creation form JavaScript

// Function to set up event handlers for the character creation form
export function setupFormHandlers(container, component) {
  console.log('Setting up form handlers');
  
  // Find the parent form element
  const form = container.closest('form');
  if (!form) {
    console.error('No parent form element found for container');
    return;
  }

  // Helper function to check if an element is or is inside a radio button
  function getRadioTarget(element) {
    // Check if it's a radio input
    if (element.type === 'radio') {
      return element;
    }
    
    // Check if it's a label with a 'for' attribute
    if (element.tagName === 'LABEL' && element.getAttribute('for')) {
      const radioId = element.getAttribute('for');
      return document.getElementById(radioId);
    }
    
    // Check if the click was inside a label (which might not have a 'for' attribute)
    const parentLabel = element.closest('label');
    if (parentLabel) {
      // Find the first radio input inside this label
      const radioInsideLabel = parentLabel.querySelector('input[type="radio"]');
      if (radioInsideLabel) {
        return radioInsideLabel;
      }
      
      // If no radio inside, check if the label has a 'for' attribute
      if (parentLabel.getAttribute('for')) {
        const radioId = parentLabel.getAttribute('for');
        return document.getElementById(radioId);
      }
    }
    
    return null;
  }

  // Set up direct click handler for equipment radio buttons
  document.addEventListener('click', function(event) {
    // Log all clicks to help debug
    console.log('Click event:', event.target, 'Type:', event.target.type, 'Tag:', event.target.tagName);
    
    const radioTarget = getRadioTarget(event.target);
    console.log('Radio target resolved to:', radioTarget);
    
    if (radioTarget && radioTarget.name === 'class.selectedEquipment') {
      console.log('Equipment selection clicked:', radioTarget.id, radioTarget.value);
      
      // Get the form that contains this radio button
      const clickedForm = radioTarget.closest('form');
      console.log('Clicked form:', clickedForm, 'Our form:', form, 'Same form check:', clickedForm === form);
      
      if (!clickedForm || clickedForm !== form) {
        // This radio is not in our form, ignore it
        console.log('Skipping - not in our form');
        return;
      }
      
      // Select this radio and deselect others in the same group
      const allRadios = form.querySelectorAll(`input[name="${radioTarget.name}"]`);
      console.log('All radio buttons in group:', allRadios);
      
      allRadios.forEach(radio => {
        const oldState = radio.checked;
        radio.checked = (radio === radioTarget);
        console.log(`Radio ${radio.id}: ${oldState} -> ${radio.checked}`);
      });
      
      // Update the component data directly since we have the component reference
      if (!component.currentData.class) {
        component.currentData.class = {};
      }
      
      const oldEquipment = component.currentData.class.selectedEquipment;
      component.currentData.class.selectedEquipment = radioTarget.value;
      console.log(`Updated equipment selection: ${oldEquipment} -> ${radioTarget.value}`);
      
      // Trigger a re-render of the component
      console.log('Re-rendering component with updated data');
      component.render(component.currentData);
    }
  });

  // Single change event handler for the entire form
  form.addEventListener('change', (event) => {
    console.log('Form change event detected', event.target);
    
    // Skip processing for radio buttons related to equipment - these are handled by the click handler
    if (event.target.type === 'radio' && event.target.name === 'class.selectedEquipment') {
      console.log('Skipping change event for equipment radio button - handled by click handler');
      return;
    }
    
    // Skip processing for checkboxes related to skills - these are handled by their own handler
    if (event.target.type === 'checkbox' && event.target.name === 'class.selectedSkills') {
      console.log('Skipping change event for skill checkbox - handled by their own handler');
      return;
    }
    
    console.log('Target name:', event.target.name);
    console.log('Target value:', event.target.value);
    
    // Get all form data
    const formData = new FormData(form);
    const data = {};
    
    console.log('Raw form data entries:');
    for (const [key, value] of formData.entries()) {
      console.log(`  ${key}: ${value}`);
    }
    
    // Convert FormData to a structured object
    const seenKeys = new Set();
    
    for (const [key, value] of formData.entries()) {
      // Handle nested properties using dot notation (e.g., "class.name")
      const parts = key.split('.');
      let current = data;
      
      console.log(`Processing form field: ${key} = ${value}`);
      
      for (let i = 0; i < parts.length - 1; i++) {
        current[parts[i]] = current[parts[i]] || {};
        current = current[parts[i]];
      }
      
      // Handle multiple values for same key (e.g., checkboxes)
      const lastKey = parts[parts.length - 1];
      
      // For checkboxes with same name, we need to collect all values as an array
      if (key.endsWith('selectedSkills') || key.endsWith('selectedTools')) {
        const fullKey = key; // Store the full key for tracking
        
        if (!seenKeys.has(fullKey)) {
          // First time seeing this checkbox group, initialize as array
          current[lastKey] = [];
          seenKeys.add(fullKey);
        }
        
        current[lastKey].push(value);
        console.log(`Added to array: ${lastKey} = ${value}`);
      } else if (current[lastKey]) {
        // For non-checkbox fields with duplicate names
        if (!Array.isArray(current[lastKey])) {
          current[lastKey] = [current[lastKey]];
        }
        current[lastKey].push(value);
        console.log(`Added to array: ${lastKey} = ${value}`);
      } else {
        // For regular single-value fields
        current[lastKey] = value;
        console.log(`Set value: ${lastKey} = ${value}`);
      }
    }
    
    // Special handling for 'class.selectedSkills' to preserve existing selections
    if (component.currentData.class?.selectedSkills && 
        (!data.class?.selectedSkills || !data.class.selectedSkills.length)) {
      // If skills were previously selected but not in this update, preserve them
      if (!data.class) data.class = {};
      data.class.selectedSkills = component.currentData.class.selectedSkills;
      console.log('Preserved existing selected skills:', data.class.selectedSkills);
    }
    
    console.log('Structured form data:', data);
    
    // If this is a class selection, log more info
    if (data.class && data.class.name) {
      console.log('Class selection detected:', data.class.name);
    }
    
    // Update the component's data and trigger a re-render
    if (component) {
      const newData = {
        ...component.currentData,
        ...data
      };
      console.log('Previous component data:', component.currentData);
      console.log('New component data:', newData);
      component.currentData = newData;
      component.render(component.currentData);
    } else {
      console.error('Component not available for update');
    }
  });

  // Special handler for skill checkboxes
  form.addEventListener('click', (event) => {
    // Check if it's a checkbox for skills
    if (event.target.type === 'checkbox' && event.target.name === 'class.selectedSkills') {
      console.log('Skill checkbox clicked:', event.target);
      
      // Get the value of the clicked checkbox
      const skillValue = event.target.value;
      // Get the current list of selected skills from the component data
      const selectedSkills = component.currentData.class?.selectedSkills || [];
      
      // Update the selected skills based on checked state
      if (event.target.checked) {
        // Add the skill if not already included
        if (!selectedSkills.includes(skillValue)) {
          selectedSkills.push(skillValue);
          console.log(`Added ${skillValue} to selected skills`);
        }
      } else {
        // Remove the skill if it was checked before
        const index = selectedSkills.indexOf(skillValue);
        if (index !== -1) {
          selectedSkills.splice(index, 1);
          console.log(`Removed ${skillValue} from selected skills`);
        }
      }
      
      // Update the component's data with modified skills
      if (!component.currentData.class) {
        component.currentData.class = {};
      }
      component.currentData.class.selectedSkills = selectedSkills;
      
      console.log('Updated selected skills:', component.currentData.class.selectedSkills);
      
      // Trigger a re-render to update checkbox states and disabled status
      component.render(component.currentData);
    }
  });

  // Make the entire choice-option div clickable for radio button selection
  document.addEventListener('click', function(event) {
    // Check if the click is on or within a choice-option div
    const choiceOption = event.target.closest('.choice-option');
    if (!choiceOption) return;
    
    // Ensure the choice-option is in our form
    if (!form.contains(choiceOption)) return;
    
    // Find the radio button inside this div
    const radioButton = choiceOption.querySelector('input[type="radio"][name="class.selectedEquipment"]');
    if (!radioButton) return;
    
    // Only proceed if we didn't click on the radio button directly
    // (that case is handled by the other click handler)
    if (event.target !== radioButton && !event.target.matches('label[for="' + radioButton.id + '"]')) {
      console.log('Choice option div clicked, triggering radio button:', radioButton.id);
      
      // Create and dispatch a click event on the radio button
      const clickEvent = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        view: window
      });
      
      radioButton.dispatchEvent(clickEvent);
    }
  });
}

/**
 * Set up basic navigation for the character creation form
 */
export function setupNavigation(container) {
  console.log('Setting up navigation');
  if (!container) {
    console.error('No container provided for navigation setup');
    return;
  }

  const form = container.closest('form');
  if (!form) {
    console.error('No parent form element found for navigation');
    return;
  }

  // Handle navigation through click events on the form
  form.addEventListener('click', (event) => {
    const target = event.target;
    
    // Handle next/back button clicks
    if (target.matches('.next-button, .back-button')) {
      event.preventDefault();
      
      const currentPage = form.querySelector('.form-page.active');
      if (!currentPage) return;
      
      const isNext = target.matches('.next-button');
      const adjacentPage = isNext ? 
        currentPage.nextElementSibling : 
        currentPage.previousElementSibling;
      
      if (adjacentPage && adjacentPage.matches('.form-page')) {
        // If moving forward, validate the current page
        if (isNext && !validatePage(form, currentPage.id)) {
          return;
        }
        
        // Update active page
        currentPage.classList.remove('active');
        adjacentPage.classList.add('active');
        
        // Update step indicators
        const steps = form.querySelectorAll('.form-steps .step');
        const currentIndex = Array.from(form.querySelectorAll('.form-page')).indexOf(currentPage);
        
        steps.forEach((step, index) => {
          if (isNext) {
            if (index === currentIndex) {
              step.classList.add('completed');
              step.classList.remove('active');
            } else if (index === currentIndex + 1) {
              step.classList.add('active');
            }
          } else {
            if (index === currentIndex) {
              step.classList.remove('active', 'completed');
            } else if (index === currentIndex - 1) {
              step.classList.add('active');
              step.classList.remove('completed');
            }
          }
        });
        
        // Scroll to top
        window.scrollTo(0, 0);
      }
    }
  });
}

/**
 * Validate form pages
 */
function validatePage(form, pageId) {
  console.log(`Validating page: ${pageId}`);
  
  // Basic validation for each page
  switch (pageId) {
    case 'class-page':
      // Check if class is selected
      const classSelect = form.querySelector('select[name="class.name"]');
      if (!classSelect || !classSelect.value) {
        alert('Please select a class before continuing.');
        return false;
      }
      
      // If class has skill choices, check if enough skills are selected
      const skillCheckboxes = form.querySelectorAll('input[name="class.selectedSkills"]:checked');
      const skillChoicesText = form.querySelector('.skill-section p');
      
      if (skillChoicesText) {
        const match = skillChoicesText.textContent.match(/Choose (\d+) from/);
        if (match) {
          const requiredSkills = parseInt(match[1], 10);
          if (skillCheckboxes.length !== requiredSkills) {
            alert(`Please select exactly ${requiredSkills} skills.`);
            return false;
          }
        }
      }
      
      // If class has equipment choices, check if an option is selected
      const equipmentRadios = form.querySelectorAll('input[name="class.selectedEquipment"]:checked');
      if (form.querySelector('.equipment-choice') && equipmentRadios.length === 0) {
        alert('Please select an equipment option.');
        return false;
      }
      
      return true;
      
    case 'origin-page':
      // Check if species and background are selected
      const speciesSelect = form.querySelector('#character-species');
      const backgroundSelect = form.querySelector('#character-background');
      
      if (!speciesSelect || !speciesSelect.value) {
        alert('Please select a species before continuing.');
        return false;
      }
      
      if (!backgroundSelect || !backgroundSelect.value) {
        alert('Please select a background before continuing.');
        return false;
      }
      
      // Check if ability boosts are selected
      const abilityBoostCheckboxes = form.querySelectorAll('input[name="origin.selectedAbilityBoosts"]:checked');
      const boostPlusTwo = form.querySelector('select[name="origin.bonusPlusTwo"]');
      const boostPlusOne = form.querySelector('select[name="origin.bonusPlusOne"]');
      
      const hasTripleBoosts = abilityBoostCheckboxes.length === 3;
      const hasPlusTwoPlusOne = boostPlusTwo && boostPlusTwo.value && boostPlusOne && boostPlusOne.value;
      
      if (!hasTripleBoosts && !hasPlusTwoPlusOne) {
        alert('Please select your ability score boosts.');
        return false;
      }
      
      return true;
      
    case 'abilities-page':
      // Check if ability scores are set based on selected method
      const methodRadios = form.querySelectorAll('input[name="abilities.method"]:checked');
      if (!methodRadios.length) {
        alert('Please select an ability score method.');
        return false;
      }
      
      const method = methodRadios[0].value;
      
      if (method === 'standard') {
        // Check if all standard array values are assigned
        const standardSelects = form.querySelectorAll('select[name^="abilities.standard."]');
        const selectedValues = Array.from(standardSelects).map(select => select.value).filter(Boolean);
        
        if (selectedValues.length !== 6) {
          alert('Please assign all six ability scores.');
          return false;
        }
        
        // Check for duplicates
        const uniqueValues = new Set(selectedValues);
        if (uniqueValues.size !== 6) {
          alert('Each value in the standard array should be used exactly once.');
          return false;
        }
      }
      
      return true;
      
    case 'details-page':
      // Check if alignment is selected
      const alignmentRadios = form.querySelectorAll('input[name="details.alignment"]:checked');
      if (!alignmentRadios.length) {
        alert('Please select an alignment.');
        return false;
      }
      
      return true;
      
    default:
      return true;
  }
}

/**
 * Set up ability score handlers
 */
function setupAbilityScoreHandlers(container) {
  // Set up method selection
  const methodRadios = container.querySelectorAll('input[name="abilities.method"]');
  const abilitySections = container.querySelectorAll('.ability-scores-section');
  
  methodRadios.forEach(radio => {
    radio.addEventListener('change', () => {
      const selectedMethod = radio.value;
      
      // Show the correct section
      abilitySections.forEach(section => {
        section.classList.remove('active');
        if (
          (selectedMethod === 'standard' && section.id === 'standard-array-section') ||
          (selectedMethod === 'pointbuy' && section.id === 'point-buy-section') ||
          (selectedMethod === 'roll' && section.id === 'roll-section')
        ) {
          section.classList.add('active');
        }
      });
    });
  });
  
  // Set up point buy handlers
  const pointBuyButtons = container.querySelectorAll('.point-buy-controls button');
  pointBuyButtons.forEach(button => {
    button.addEventListener('click', () => {
      const ability = button.dataset.ability;
      const isPlus = button.classList.contains('btn-plus');
      const input = container.querySelector(`input[name="abilities.pointbuy.${ability}"]`);
      const pointsRemainingElem = container.querySelector('#points-remaining');
      
      if (!input || !pointsRemainingElem) return;
      
      const currentValue = parseInt(input.value, 10) || 8;
      const currentPoints = parseInt(pointsRemainingElem.textContent, 10) || 27;
      
      if (isPlus && currentValue < 15) {
        // Calculate cost to increase
        const costToIncrease = getPointBuyCost(currentValue + 1) - getPointBuyCost(currentValue);
        
        if (currentPoints >= costToIncrease) {
          input.value = currentValue + 1;
          pointsRemainingElem.textContent = currentPoints - costToIncrease;
          
          // Update ability modifier
          updateAbilityModifier(container, ability, currentValue + 1);
        }
      } else if (!isPlus && currentValue > 8) {
        // Calculate points refunded
        const pointsRefunded = getPointBuyCost(currentValue) - getPointBuyCost(currentValue - 1);
        
        input.value = currentValue - 1;
        pointsRemainingElem.textContent = currentPoints + pointsRefunded;
        
        // Update ability modifier
        updateAbilityModifier(container, ability, currentValue - 1);
      }
    });
  });
  
  // Set up roll button
  const rollButton = container.querySelector('#roll-abilities-btn');
  if (rollButton) {
    rollButton.addEventListener('click', () => {
      const abilities = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
      const rollHistory = [];
      
      abilities.forEach(ability => {
        // Roll 4d6, drop lowest
        const rolls = Array(4).fill(0).map(() => Math.floor(Math.random() * 6) + 1);
        rolls.sort((a, b) => b - a);
        
        // Sum top 3 dice
        const sum = rolls.slice(0, 3).reduce((total, val) => total + val, 0);
        
        // Update input
        const input = container.querySelector(`input[name="abilities.roll.${ability}"]`);
        if (input) {
          input.value = sum;
          
          // Update ability modifier
          updateAbilityModifier(container, ability, sum);
        }
        
        // Add to roll history
        rollHistory.push(`${ability}: [${rolls.join(', ')}] => ${sum}`);
      });
      
      // Update roll history display
      const rollHistoryElem = container.querySelector('#roll-history');
      if (rollHistoryElem) {
        rollHistoryElem.innerHTML = rollHistory.map(roll => `<div>${roll}</div>`).join('');
      }
    });
  }
  
  // Set up standard array selects
  const standardSelects = container.querySelectorAll('select[name^="abilities.standard."]');
  standardSelects.forEach(select => {
    select.addEventListener('change', () => {
      const ability = select.name.split('.').pop();
      const value = parseInt(select.value, 10);
      
      // Update ability modifier
      if (!isNaN(value)) {
        updateAbilityModifier(container, ability, value);
      }
      
      // Update used values display
      updateUsedValues(container);
    });
  });
}

/**
 * Update the ability modifier display
 */
function updateAbilityModifier(container, ability, score) {
  const modifierElem = container.querySelector(`select[name="abilities.standard.${ability}"]`)
    ?.closest('.ability-box')
    ?.querySelector('.ability-modifier');
    
  if (!modifierElem) return;
  
  const modifier = Math.floor((score - 10) / 2);
  const formattedModifier = modifier >= 0 ? `+${modifier}` : modifier;
  
  modifierElem.textContent = `Modifier: ${formattedModifier}`;
}

/**
 * Update the used values display for standard array
 */
function updateUsedValues(container) {
  const usedValuesContainer = container.querySelector('.used-values');
  if (!usedValuesContainer) return;
  
  const standardSelects = container.querySelectorAll('select[name^="abilities.standard."]');
  const selectedValues = Array.from(standardSelects)
    .map(select => select.value)
    .filter(Boolean);
  
  // Create HTML for used values
  const usedValuesHTML = selectedValues
    .map(value => `<span class="used-value">${value}</span>`)
    .join('');
  
  usedValuesContainer.innerHTML = usedValuesHTML;
}

/**
 * Get the point buy cost for a specific ability score
 */
function getPointBuyCost(score) {
  if (score <= 8) return 0;
  if (score <= 13) return score - 8;
  if (score === 14) return 7;
  if (score === 15) return 9;
  return 0;
}

/**
 * Set up equipment option handlers
 */
function setupEquipmentOptionHandlers(container) {
  const equipmentRadios = container.querySelectorAll('input[name="class.selectedEquipment"]');
  if (equipmentRadios.length === 0) return;
  
  console.log('Setting up equipment selection handlers');
  
  equipmentRadios.forEach(radio => {
    radio.addEventListener('change', () => {
      const selectedOption = radio.value;
      console.log('Selected equipment option:', selectedOption);
      
      // Custom event to be handled by the component
      const customEvent = new CustomEvent('equipmentSelected', {
        detail: { selectedEquipment: selectedOption }
      });
      container.dispatchEvent(customEvent);
    });
  });
}

/**
 * Set up background equipment selection handlers
 */
function setupBackgroundEquipmentHandlers(container) {
  const equipmentRadios = container.querySelectorAll('input[name="origin.selectedEquipment"]');
  if (equipmentRadios.length === 0) return;
  
  console.log('Setting up background equipment handlers');
  
  equipmentRadios.forEach(radio => {
    radio.addEventListener('change', () => {
      const selectedOption = radio.value;
      console.log('Selected background equipment option:', selectedOption);
      
      // Custom event to be handled by the component
      const customEvent = new CustomEvent('backgroundEquipmentSelected', {
        detail: { selectedEquipment: selectedOption }
      });
      container.dispatchEvent(customEvent);
    });
  });
} 