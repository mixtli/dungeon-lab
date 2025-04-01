// Character Creation UI module for D&D 5e
import { PluginComponent } from '@dungeon-lab/shared/base/plugin-component.mjs';
import { IPluginAPI } from '@dungeon-lab/shared/types/plugin-api.mjs';
import { z } from 'zod';
import template from './template.hbs?raw';
import styles from './styles.css?raw';
import { registerHelpers } from './helpers.js';
import { CharacterCreationFormData } from './formSchema.mjs';

// Import document helpers
import { registerDocumentHelpers } from '../../helpers/document-helpers.mjs';

// Import shared types from the plugin
import { ICharacterClass } from '../../../shared/types/character-class.mjs';
import { IBackground, ISpecies } from '../../../shared/types/vttdocument.mjs';

// Import the document cache service
import { getClass } from '../../document-cache.mjs';

// Define component state interface
interface CharacterCreationState {
  formData: {
    class?: Partial<CharacterCreationFormData['class']>;
    origin?: Partial<CharacterCreationFormData['origin']>;
    abilities?: Partial<CharacterCreationFormData['abilities']>;
    details?: Partial<CharacterCreationFormData['details']>;
    equipment?: Partial<CharacterCreationFormData['equipment']>;
  };
  currentPage: string;
  validationErrors: Record<string, string[]>;
  isValid: boolean;
  // Additional fields for data that doesn't belong in the form schema
  name?: string;
  // Document cache fields
  classDocument: ICharacterClass | null;
  speciesDocument: ISpecies | null;
  backgroundDocument: IBackground | null;
}

/**
 * Character Creation Component for D&D 5e
 * Handles the creation of new characters with a form-based interface
 */
export class CharacterCreationComponent extends PluginComponent {
  private state: CharacterCreationState = {
    formData: { 
      class: { },
      origin: { }
    },
    currentPage: 'class-page',
    validationErrors: {},
    isValid: false,
    classDocument: null,
    speciesDocument: null,
    backgroundDocument: null
  };

  // Form element
  form: HTMLFormElement | null = null;
  
  constructor(api: IPluginAPI) {
    super('characterCreation', 'D&D 5e Character Creation', api);
    console.log('CharacterCreationComponent constructor called');
    this.registerHelpers();
  }

  protected getTemplate(): string {
    return template;
  }

  async onMount(container: HTMLElement): Promise<void> {
    console.log('CharacterCreationComponent mounting');
    await super.onMount(container);
    
    if (this.container) {
      console.log('Container exists, setting up form handlers');
      this.form = this.container.closest('form');
      
      // Set up initial event handlers
      this.setupEventHandlers();
      
      console.log('Form handlers set up');
      
      // Render the initial state
      this.render(this.getState());
    } else {
      console.error('Container element not found on mount');
    }
  }

  protected getStyles(): string {
    return styles;
  }

  /**
   * Set up all event handlers for the form
   * This method needs to be called after each render to ensure handlers are attached
   */
  private setupEventHandlers(): void {
    if (!this.form || !this.container) {
      console.error('Form or container not available for event handlers');
      return;
    }
    
    console.log('Setting up event handlers');
    
    // Remove any existing listeners (not actually needed with our approach, but good practice)
    this.form.removeEventListener('change', this.handleFormChange);
    this.form.removeEventListener('click', this.handleFormClick);
    
    // Add our consolidated listeners
    this.form.addEventListener('change', this.handleFormChange.bind(this));
    this.form.addEventListener('click', this.handleFormClick.bind(this));
    
    // Set up ability score controls (these have special handling)
    this.setupAbilityScoreControls();
  }
  
  /**
   * Set up special controls for ability scores
   */
  private setupAbilityScoreControls(): void {
    if (!this.form) return;
    
    // Set up point buy buttons
    const pointBuyButtons = this.form.querySelectorAll('.point-buy-controls button');
    pointBuyButtons.forEach(button => {
      button.addEventListener('click', this.handlePointBuyClick.bind(this));
    });
    
    // Set up roll button
    const rollButton = this.form.querySelector('#roll-abilities-btn');
    if (rollButton) {
      rollButton.addEventListener('click', this.handleRollAbilities.bind(this));
    }
  }
  
  /**
   * Handle form change events in a consolidated way
   */
  private async handleFormChange(event: Event): Promise<void> {
    const target = event.target as HTMLInputElement | HTMLSelectElement;
    if (!target || !target.name) return;
    
    console.log('Form change:', target.name, target.value);

    // Handle class selection change
    if (target.name === 'class.name' && target.value) {
      try {
        // Fetch the class document using the document cache
        const classDoc = await getClass(target.value, this.api);
        this.state.classDocument = classDoc as ICharacterClass;
        console.log('Class document updated:', this.state.classDocument);
      } catch (error) {
        console.error('Error fetching class document:', error);
        this.state.classDocument = null;
      }
    }
    
    // Process the form data
    const formData = new FormData(this.form!);
    const flatData: Record<string, string | string[]> = {};
    
    // Process form data, handling arrays correctly
    for (const [key, value] of formData.entries()) {
      if (key.endsWith('selectedSkills') || key.endsWith('selectedTools') || key.endsWith('selectedAbilityBoosts')) {
        if (!flatData[key]) {
          flatData[key] = [];
        }
        (flatData[key] as string[]).push(value as string);
      } else {
        flatData[key] = value as string;
      }
    }
    
    // Unflatten the data
    const data = unflatten(flatData, { object: true }) as Partial<CharacterCreationFormData>;
    
    console.log('Unflattened form data:', data);
    
    // Simply replace the entire formData state with the new data
    this.state.formData = data;
    
    console.log('Form data updated:', this.state.formData);
    console.log('this.state', this.state);
    console.log('Form state:', this.getState());
    
    // Trigger a re-render 
    this.render(this.getState());
    
    // Re-attach event handlers after render
    this.setupEventHandlers();
  }
  
  /**
   * Handle form click events in a consolidated way
   */
  private handleFormClick(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target) return;
    
    // Handle navigation buttons
    if (target.matches('.next-button, .back-button')) {
      event.preventDefault();
      
      const currentPage = this.form!.querySelector('.form-page.active');
      if (!currentPage) return;
      
      const isNext = target.matches('.next-button');
      const adjacentPage = isNext ? 
        currentPage.nextElementSibling : 
        currentPage.previousElementSibling;
      
      if (adjacentPage && adjacentPage.matches('.form-page')) {
        // If moving forward, validate the current page
        if (isNext && !this.validatePage(currentPage.id)) {
          return;
        }
        
        // Update active page
        currentPage.classList.remove('active');
        adjacentPage.classList.add('active');
        
        // Update component state with new page
        this.setCurrentPage(adjacentPage.id);
        
        // Update step indicators
        const steps = this.form!.querySelectorAll('.form-steps .step');
        const currentIndex = Array.from(this.form!.querySelectorAll('.form-page')).indexOf(currentPage);
        
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
    
    // Handle equipment selection
    const radioInput = target.closest('input[type="radio"]') as HTMLInputElement | null;
    const label = target.closest('label') as HTMLLabelElement | null;
    let radioButton: HTMLInputElement | null = null;
    
    if (radioInput && radioInput.name === 'class.selectedEquipment') {
      radioButton = radioInput;
    } else if (label && label.control instanceof HTMLInputElement && 
               label.control.type === 'radio' && 
               label.control.name === 'class.selectedEquipment') {
      radioButton = label.control;
    }
    
    if (radioButton) {
      const formData = this.getFormData();
      if (!formData.class) {
        formData.class = { name: '' };
      }
      
      formData.class.selectedEquipment = radioButton.value as 'A' | 'B';
      this.updateFormData(formData);
      
      // Render with updated state
      this.render(this.getState());
      
      // Re-attach event handlers
      this.setupEventHandlers();
      
      // Prevent default only if not clicking directly on the radio
      if (target !== radioButton) {
        event.preventDefault();
      }
    }
  }
  
  /**
   * Handle point buy button clicks
   */
  private handlePointBuyClick(event: Event): void {
    const button = event.currentTarget as HTMLElement;
    const ability = button.dataset.ability;
    const isPlus = button.classList.contains('btn-plus');
    
    if (!ability || !this.form) return;
    
    const input = this.form.querySelector(`input[name="abilities.pointbuy.${ability}"]`) as HTMLInputElement;
    const pointsRemainingElem = this.form.querySelector('#points-remaining');
    
    if (!input || !pointsRemainingElem) return;
    
    const currentValue = parseInt(input.value, 10) || 8;
    const currentPoints = parseInt(pointsRemainingElem.textContent || '27', 10);
    
    if (isPlus && currentValue < 15) {
      // Calculate cost to increase
      const costToIncrease = this.getPointBuyCost(currentValue + 1) - this.getPointBuyCost(currentValue);
      
      if (currentPoints >= costToIncrease) {
        input.value = (currentValue + 1).toString();
        pointsRemainingElem.textContent = (currentPoints - costToIncrease).toString();
        
        // Update ability modifier
        this.updateAbilityModifier(ability, currentValue + 1);
        
        // Update form data
        const formData = this.getFormData();
        if (!formData.abilities) {
          formData.abilities = {
            method: 'pointbuy',
            pointsRemaining: currentPoints - costToIncrease,
            pointbuy: {} as any
          };
        }
        
        // Ensure abilities.pointbuy exists
        if (!formData.abilities.pointbuy) {
          formData.abilities.pointbuy = {} as any;
        }
        
        // Update the specific ability score
        (formData.abilities.pointbuy as any)[ability] = currentValue + 1;
        
        // Update component state
        this.updateFormData(formData);
        
        // Render with updated state
        this.render(this.getState());
        
        // Re-attach event handlers
        this.setupEventHandlers();
      }
    } else if (!isPlus && currentValue > 8) {
      // Calculate points refunded
      const pointsRefunded = this.getPointBuyCost(currentValue) - this.getPointBuyCost(currentValue - 1);
      
      input.value = (currentValue - 1).toString();
      pointsRemainingElem.textContent = (currentPoints + pointsRefunded).toString();
      
      // Update ability modifier
      this.updateAbilityModifier(ability, currentValue - 1);
      
      // Update form data
      const formData = this.getFormData();
      if (!formData.abilities) {
        formData.abilities = {
          method: 'pointbuy',
          pointsRemaining: currentPoints + pointsRefunded,
          pointbuy: {} as any
        };
      }
      
      // Ensure abilities.pointbuy exists
      if (!formData.abilities.pointbuy) {
        formData.abilities.pointbuy = {} as any;
      }
      
      // Update the specific ability score
      (formData.abilities.pointbuy as any)[ability] = currentValue - 1;
      
      // Update component state
      this.updateFormData(formData);
      
      // Render with updated state
      this.render(this.getState());
      
      // Re-attach event handlers
      this.setupEventHandlers();
    }
  }
  
  /**
   * Handle rolling ability scores
   */
  private handleRollAbilities(): void {
    const abilities = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
    const rollHistory: string[] = [];
    const rollData: Record<string, number> = {};
    
    abilities.forEach(ability => {
      // Roll 4d6, drop lowest
      const rolls = Array(4).fill(0).map(() => Math.floor(Math.random() * 6) + 1);
      rolls.sort((a, b) => b - a);
      
      // Sum top 3 dice
      const sum = rolls.slice(0, 3).reduce((total, val) => total + val, 0);
      
      // Store for form data
      rollData[ability] = sum;
      
      // Update input if it exists
      const input = this.form?.querySelector(`input[name="abilities.roll.${ability}"]`) as HTMLInputElement | undefined;
      if (input) {
        input.value = sum.toString();
      }
      
      // Update ability modifier
      this.updateAbilityModifier(ability, sum);
      
      // Add to roll history
      rollHistory.push(`${ability}: [${rolls.join(', ')}] => ${sum}`);
    });
    
    // Update roll history display
    const rollHistoryElem = this.form?.querySelector('#roll-history');
    if (rollHistoryElem) {
      rollHistoryElem.innerHTML = rollHistory.map(roll => `<div>${roll}</div>`).join('');
    }
    
    // Update form data
    const formData = this.getFormData();
    if (!formData.abilities) {
      formData.abilities = {
        method: 'roll',
        pointsRemaining: 0,
        roll: rollData as any
      };
    } else {
      // Update existing abilities object
      formData.abilities.method = 'roll';
      formData.abilities.roll = rollData as any;
    }
    
    // Update component state
    this.updateFormData(formData);
    
    // Render with updated state
    this.render(this.getState());
    
    // Re-attach event handlers
    this.setupEventHandlers();
  }
  
  /**
   * Update the ability modifier display
   */
  private updateAbilityModifier(ability: string, score: number): void {
    if (!this.form) return;
    
    const modifierElem = this.form.querySelector(`select[name="abilities.standard.${ability}"]`)
      ?.closest('.ability-box')
      ?.querySelector('.ability-modifier');
      
    if (!modifierElem) return;
    
    const modifier = Math.floor((score - 10) / 2);
    const formattedModifier = modifier >= 0 ? `+${modifier}` : modifier.toString();
    
    modifierElem.textContent = `Modifier: ${formattedModifier}`;
  }
  
  /**
   * Get the point buy cost for a specific ability score
   */
  private getPointBuyCost(score: number): number {
    if (score <= 8) return 0;
    if (score <= 13) return score - 8;
    if (score === 14) return 7;
    if (score === 15) return 9;
    return 0;
  }
  

  /**
   * Validate the current page
   */
  private validatePage(pageId: string): boolean {
    console.log(`Validating page: ${pageId}`);
    if (!this.form) return true;
    
    switch (pageId) {
      case 'class-page':
        // Check if class is selected
        const classSelect = this.form.querySelector('select[name="class.name"]') as HTMLSelectElement;
        if (!classSelect || !classSelect.value) {
          alert('Please select a class before continuing.');
          return false;
        }
        
        // If class has skill choices, check if enough skills are selected
        const skillCheckboxes = this.form.querySelectorAll('input[name="class.selectedSkills"]:checked');
        const skillChoicesText = this.form.querySelector('.skill-section p');
        
        if (skillChoicesText) {
          const match = skillChoicesText.textContent?.match(/Choose (\d+) from/);
          if (match) {
            const requiredSkills = parseInt(match[1], 10);
            if (skillCheckboxes.length !== requiredSkills) {
              alert(`Please select exactly ${requiredSkills} skills.`);
              return false;
            }
          }
        }
        
        // If class has equipment choices, check if an option is selected
        const equipmentRadios = this.form.querySelectorAll('input[name="class.selectedEquipment"]:checked');
        if (this.form.querySelector('.equipment-choice') && equipmentRadios.length === 0) {
          alert('Please select an equipment option.');
          return false;
        }
        
        return true;
        
      case 'origin-page':
        // Check if species and background are selected
        const speciesSelect = this.form.querySelector('#character-species') as HTMLSelectElement;
        const backgroundSelect = this.form.querySelector('#character-background') as HTMLSelectElement;
        
        if (!speciesSelect || !speciesSelect.value) {
          alert('Please select a species before continuing.');
          return false;
        }
        
        if (!backgroundSelect || !backgroundSelect.value) {
          alert('Please select a background before continuing.');
          return false;
        }
        
        // Check if ability boosts are selected
        const abilityBoostCheckboxes = this.form.querySelectorAll('input[name="origin.selectedAbilityBoosts"]:checked');
        const boostPlusTwo = this.form.querySelector('select[name="origin.bonusPlusTwo"]') as HTMLSelectElement;
        const boostPlusOne = this.form.querySelector('select[name="origin.bonusPlusOne"]') as HTMLSelectElement;
        
        const hasTripleBoosts = abilityBoostCheckboxes.length === 3;
        const hasPlusTwoPlusOne = boostPlusTwo && boostPlusTwo.value && boostPlusOne && boostPlusOne.value;
        
        if (!hasTripleBoosts && !hasPlusTwoPlusOne) {
          alert('Please select your ability score boosts.');
          return false;
        }
        
        return true;
        
      case 'abilities-page':
        // Check if ability scores are set based on selected method
        const methodRadios = this.form.querySelectorAll('input[name="abilities.method"]:checked');
        if (!methodRadios.length) {
          alert('Please select an ability score method.');
          return false;
        }
        
        const method = (methodRadios[0] as HTMLInputElement).value;
        
        if (method === 'standard') {
          // Check if all standard array values are assigned
          const standardSelects = this.form.querySelectorAll('select[name^="abilities.standard."]');
          const selectedValues = Array.from(standardSelects)
            .map(select => (select as HTMLSelectElement).value)
            .filter(Boolean);
          
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
        const alignmentRadios = this.form.querySelectorAll('input[name="details.alignment"]:checked');
        if (!alignmentRadios.length) {
          alert('Please select an alignment.');
          return false;
        }
        
        return true;
        
      default:
        return true;
    }
  }

  protected registerHelpers(): void {
    
    // Register standard helpers
    registerHelpers(this.handlebars);
    
    // Register document helpers for the cache
    registerDocumentHelpers(this.handlebars);
    
    // Add custom helpers for accessing documents
    this.handlebars.registerHelper('getClassDocument', () => {
      return this.state.classDocument;
    });
    
    this.handlebars.registerHelper('getSpeciesDocument', () => {
      return this.state.speciesDocument;
    });
    
    this.handlebars.registerHelper('getBackgroundDocument', () => {
      return this.state.backgroundDocument;
    });
  }

  /**
   * Validates form data against the character creation schema
   */
  validateForm(data: unknown): z.SafeParseReturnType<unknown, unknown> {
    return characterCreationFormSchema.safeParse(data);
  }

  /**
   * Translates form data into the full character schema format
   */
  translateFormData(formData: CharacterCreationFormData): Record<string, unknown> {
    return {
      classes: [{
        name: formData.class.name,
        level: 1,
        hitDiceType: this.state.classDocument?.hitdie || 'd8'
      }],
      // Other fields will be added in subsequent steps
    };
  }
  
  /**
   * Called after component is rendered
   */
  afterRender(): void {
    // Reattach event handlers after each render
    this.setupEventHandlers();
  }
  
  /**
   * Update the form data with new data
   * Only used for direct programmatic updates to form data
   */
  updateFormData(data: Partial<CharacterCreationFormData>): void {
    // For programmatic updates, we'll still need to handle partial updates
    // but we'll use a simpler approach
    this.state.formData = {
      ...this.state.formData,
      ...data
    };
    
    // For nested objects like class, origin, etc., manually merge them
    if (data.class && this.state.formData.class) {
      this.state.formData.class = {
        ...this.state.formData.class,
        ...data.class
      };
    }
    
    if (data.origin && this.state.formData.origin) {
      this.state.formData.origin = {
        ...this.state.formData.origin,
        ...data.origin
      };
    }
    
    if (data.abilities && this.state.formData.abilities) {
      this.state.formData.abilities = {
        ...this.state.formData.abilities,
        ...data.abilities
      };
      
      // Handle sub-objects within abilities
      if (data.abilities.pointbuy && this.state.formData.abilities.pointbuy) {
        this.state.formData.abilities.pointbuy = {
          ...this.state.formData.abilities.pointbuy,
          ...data.abilities.pointbuy
        };
      }
      
      if (data.abilities.standard && this.state.formData.abilities.standard) {
        this.state.formData.abilities.standard = {
          ...this.state.formData.abilities.standard,
          ...data.abilities.standard
        };
      }
      
      if (data.abilities.roll && this.state.formData.abilities.roll) {
        this.state.formData.abilities.roll = {
          ...this.state.formData.abilities.roll,
          ...data.abilities.roll
        };
      }
    }
    
    if (data.details && this.state.formData.details) {
      this.state.formData.details = {
        ...this.state.formData.details,
        ...data.details
      };
    }
    
    if (data.equipment && this.state.formData.equipment) {
      this.state.formData.equipment = {
        ...this.state.formData.equipment,
        ...data.equipment
      };
    }
    
    console.log('Form data updated programmatically:', this.state.formData);
  }

  /**
   * Get the current form data
   */
  getFormData(): Partial<CharacterCreationFormData> {
    return this.state.formData as Partial<CharacterCreationFormData>;
  }
  
  /**
   * Set the current page
   */
  setCurrentPage(page: string): void {
    this.state.currentPage = page;
  }
  
  /**
   * Get the current state
   */
  getState(): CharacterCreationState {
    return this.state;
  }
}

// Import the flat package for unflattening form data
import { unflatten } from 'flat';
// Import our form schema
import { characterCreationFormSchema } from './formSchema.mjs';

// Export the component class
export default CharacterCreationComponent;

