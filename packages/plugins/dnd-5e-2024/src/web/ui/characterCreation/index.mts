// Character Creation UI module for D&D 5e
import { PluginComponent } from '@dungeon-lab/shared/base/plugin-component.mjs';
import { IPluginAPI } from '@dungeon-lab/shared/types/plugin-api.mjs';
import { z } from 'zod';
/**
 * @param { CharacterCreationState } context
 */
import template from './template.hbs?raw';
import styles from './styles.css?raw';
import { registerHelpers } from './helpers.mjs';
import { CharacterCreationFormData, PartialCharacterCreationFormData } from './formSchema.mjs';

// Import document helpers
import { registerDocumentHelpers } from '../../helpers/document-helpers.mjs';

// Import shared types from the plugin
import { ICharacterClassDocument } from '../../../shared/types/character-class.mjs';
import { IBackgroundDocument, ISpeciesDocument } from '../../../shared/types/vttdocument.mjs';

// Import the document cache service
import { getClass, getDocumentById } from '../../document-cache.mjs';
import {merge} from 'ts-deepmerge'


// Define component state interface
interface CharacterCreationState {
  formData: PartialCharacterCreationFormData;
  currentPage: string;
  validationErrors: Record<string, string[]>;
  isValid: boolean;
  // Document cache fields
  classDocument: ICharacterClassDocument | null;
  speciesDocument: ISpeciesDocument | null;
  backgroundDocument: IBackgroundDocument | null;
}

/**
 * Character Creation Component for D&D 5e
 * Handles the creation of new characters with a form-based interface
 */
export class CharacterCreationComponent extends PluginComponent {
  private state: CharacterCreationState = {
    formData: {},
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
      
      // Set up one-time form event handlers
      this.setupFormHandlers();
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
   * Set up form-level event handlers that only need to be attached once
   * These handlers are for elements that exist outside our component template
   */
  private setupFormHandlers(): void {
    if (!this.form) {
      console.error('Form not available for event handlers');
      return;
    }
    
    console.log('Setting up form-level handlers');
    
    // Add our consolidated form listeners
    this.form.addEventListener('change', this.handleFormChange.bind(this));
    this.form.addEventListener('click', this.handleFormClick.bind(this));
  }

  /**
   * Set up handlers for elements within our template
   * These need to be reattached after each render
   */
  protected setupTemplateHandlers(): void {
    if (!this.container) {
      console.error('Container not available for template handlers');
      return;
    }
    
    console.log('Setting up template-specific handlers');
    
    // Set up ability score controls (these have special handling)
    this.setupAbilityScoreControls();

    // Set up skill proficiency handlers
    const skillCheckboxes = this.container.querySelectorAll('.skill-checkbox');
    skillCheckboxes.forEach(checkbox => {
      checkbox.addEventListener('change', this.handleSkillProficiencyChange.bind(this));
    });
  }

  /**
   * Set up special controls for ability scores
   * These are within our template and need to be reattached after each render
   */
  private setupAbilityScoreControls(): void {
    if (!this.container) return;
    
    // Set up point buy buttons
    const pointBuyButtons = this.container.querySelectorAll('.point-buy-controls button');
    pointBuyButtons.forEach(button => {
      button.addEventListener('click', this.handlePointBuyClick.bind(this));
    });
    
    // Set up roll button
    const rollButton = this.container.querySelector('#roll-abilities-btn');
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
    
    console.log('handleFormChange', target.name, target.value);
    
    // Process the form data
    const data = this.readFormData();
    
    // Simply replace the entire formData state with the new data
    this.updateState({ formData: data });

    // Handle class selection change after state is updated
    if (target.name === 'class.id' && target.value) {
      this.handleClassChange();
    }

    // Handle species selection change after state is updated
    if (target.name === 'origin.species.id' && target.value) {
      this.handleSpeciesChange();
    }

    // Handle background selection change after state is updated
    if (target.name === 'origin.background.id' && target.value) {
      this.handleBackgroundChange();
    }

    // Re-render the template with updated data
    this.render(this.getState());
  }

  private readFormData() {
    const formData = new FormData(this.form!);
    const flatData: Record<string, string | string[]> = {};

    // Process form data, handling arrays correctly
    for (const [key, value] of formData.entries()) {
      flatData[key] = value as string;
    }
    console.log('Flattened form data:', flatData);

    // Unflatten the data
    const data = unflatten(flatData) as Partial<CharacterCreationFormData>;

    // Clean up arrays by removing null values
    if (data.class?.selectedSkills) {
      data.class.selectedSkills = data.class.selectedSkills.filter(Boolean);
    }
    if (data.origin?.selectedAbilityBoosts) {
      data.origin.selectedAbilityBoosts = data.origin.selectedAbilityBoosts.filter(Boolean);
    }
    if (data.origin?.selectedLanguages) {
      data.origin.selectedLanguages = data.origin.selectedLanguages.filter(Boolean);
    }

    console.log('Unflattened and cleaned form data:', data);
    return data;
  }

  private handleClassChange() {
    const classId = this.state.formData.class?.id;
    if (!classId) {
      this.state.classDocument = null;
      return;
    }

    const classDoc = getClass(classId);
    this.state.classDocument = null;
    this.updateState({ 
      classDocument: classDoc as ICharacterClassDocument,
      formData: { class: { name: classDoc?.name } }
    });
    console.log('Class document updated:', this.state.classDocument);
  }

  private handleSpeciesChange() {
    const speciesId = this.state.formData.origin?.species.id;
    if (!speciesId) {
      this.state.speciesDocument = null;
      return;
    }

    const speciesDoc = getDocumentById('species', speciesId);
    this.state.speciesDocument = null;
    this.updateState({ 
      speciesDocument: speciesDoc as ISpeciesDocument,
      formData: { origin: { species: { name: speciesDoc?.name } } }
    });
    console.log('Species document updated:', this.state.speciesDocument);
  }

  private handleBackgroundChange(): void {
    const backgroundId = this.state.formData.origin?.background.id;
    if (!backgroundId) {
      this.state.backgroundDocument = null;
      return;
    }

    const backgroundDoc = getDocumentById('background', backgroundId);
    this.state.backgroundDocument = null;
    this.updateState({ 
      backgroundDocument: backgroundDoc as IBackgroundDocument
    });
    console.log('Background document updated:', this.state.backgroundDocument);
  }

  private handleNavigation(event: Event): void {
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
  }
  
  /**
   * Handle form click events in a consolidated way
   */
  private handleFormClick(event: Event): void {
    console.log('handleFormClick', event.target);
    this.handleNavigation(event);
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
        // Validate class page data using zod schema
        const classSchema = characterCreationFormSchema.shape.class.required()
        const classResult = classSchema.safeParse(this.state.formData.class);
        
        if (!classResult.success) {
          // Get first error message
          const error = classResult.error.errors[0];
          alert(error.message);
          return false;
        }
        return true;

      case 'origin-page':
        // Validate origin page data using zod schema
        const originSchema = characterCreationFormSchema.shape.origin.required();
        const originResult = originSchema.safeParse(this.state.formData.origin);
        
        if (!originResult.success) {
          const error = originResult.error.errors[0];
          alert(error.message);
          return false;
        }
        return true;

      case 'abilities-page':
        // Validate abilities page data using zod schema
        const abilitiesSchema = characterCreationFormSchema.shape.abilities.required();
        const abilitiesResult = abilitiesSchema.safeParse(this.state.formData.abilities);
        
        if (!abilitiesResult.success) {
          const error = abilitiesResult.error.errors[0];
          alert(error.message);
          return false;
        }
        return true;

      case 'details-page':
        // Validate details page data using zod schema
        const detailsSchema = characterCreationFormSchema.shape.details.required();
        const detailsResult = detailsSchema.safeParse(this.state.formData.details);
        
        if (!detailsResult.success) {
          const error = detailsResult.error.errors[0];
          alert(error.message);
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
        name: formData.class!.name,
        level: 1,
        hitDiceType: this.state.classDocument?.data?.hitdie || 'd8'
      }],
      // Other fields will be added in subsequent steps
    };
  }
  
  /**
   * Called after component is rendered
   */
  afterRender(): void {
    // Only reattach handlers for elements within our template
    this.setupTemplateHandlers();
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
    this.updateState({currentPage: page});
  }
  
  /**
   * Get the current state
   */
  getState(): CharacterCreationState {
    const state = sessionStorage.getItem('characterCreationState');
    if (state) {
      this.state = JSON.parse(state) as CharacterCreationState;
    }
    return this.state;
  }
  updateState(state: Partial<CharacterCreationState>): void {
    this.state = merge.withOptions({mergeArrays: false }, this.state, state) as CharacterCreationState;
    sessionStorage.setItem('characterCreationState', JSON.stringify(this.state));
  }

  /**
   * Handle skill proficiency selection changes
   * Enforces the maximum number of selections based on class proficiency choices
   */
  private handleSkillProficiencyChange(event: Event): void {
    console.log('handleSkillProficiencyChange called');
    const checkbox = event.target as HTMLInputElement;
    if (!checkbox || !this.state.classDocument) return;

    const skillChoices = this.state.classDocument.data.proficiencies?.skills || [];
    const choiceRule = skillChoices.find(choice => choice.type === 'choice');
    
    if (!choiceRule) return;

    // Get currently selected skills
    const selectedSkills = this.state.formData.class?.selectedSkills || [];
    
    if (checkbox.checked) {
      // If trying to select more than allowed, prevent the selection
      if (selectedSkills.length >= choiceRule.count) {
        event.preventDefault();
        checkbox.checked = false;
        return;
      }
      
      // Check if the skill is in the allowed options
      if (!choiceRule.options.includes(checkbox.value)) {
        event.preventDefault();
        checkbox.checked = false;
        return;
      }
    }

    // Update the form data through the existing change handler
    // This will trigger handleFormChange which will update the state
    //const changeEvent = new Event('change', { bubbles: true });
    //checkbox.dispatchEvent(changeEvent);
  }
}

// Import the flat package for unflattening form data
import { unflatten } from 'flat';
// Import our form schema
import { characterCreationFormSchema } from './formSchema.mjs';

// Export the component class
export default CharacterCreationComponent;

