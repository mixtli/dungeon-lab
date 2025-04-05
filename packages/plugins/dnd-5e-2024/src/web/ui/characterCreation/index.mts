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

// Import the flat package for unflattening form data
import { unflatten } from 'flat';
// Import our form schema
import { characterCreationFormSchema } from './formSchema.mjs';

import { deepPartial } from './formSchema.mjs'

const fooSchema = z.object({
  a: z.object({
    b: z.number(),
    c: z.number()
  }),
  d: z.object({e: z.number(), f: z.number()})
})
const partialFooSchema = deepPartial(fooSchema)
type PartialFoo = z.infer<typeof partialFooSchema>
const foo: PartialFoo = { 'a': { 'b': 1, 'c': 2 }, 'd': { 'e': 3 } }
const bar: PartialFoo = { 'd': undefined }
const result = merge(foo, bar)
console.log(result)


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
   * Handle form change events in a consolidated way
   */
  private async handleFormChange(event: Event): Promise<void> {
    const target = event.target as HTMLInputElement | HTMLSelectElement;
    if (!target || !target.name) return;
    
    const formData = new FormData(this.form!);

    console.log('handleFormChange', target.name, target.value);
    
    // Create a partial update with just the changed field
    const flatData: Record<string, string | string[]> = {};
    
    if (target.type === 'select-multiple')  {
      const selectedValues= formData.getAll(target.name);
      flatData[target.name] = selectedValues as string[];
    } else if (target.type === 'checkbox') {
      // We need to check if the target has a parent with the class 'checkbox-group'
      const parent = target.closest('.checkbox-group');
      if (parent) {
        const selectedValues= formData.getAll(target.name);
        flatData[target.name] = selectedValues as string[];
      } else {
        flatData[target.name] = target.value;
      }
    } else {
      flatData[target.name] = target.value;
    }
    
    // Unflatten to get a nested structure with only the changed field
    const partialUpdate = unflatten(flatData);
    console.log('Partial update:', partialUpdate);
    
    // Update state with just the changed field
    this.updateState({ formData: partialUpdate });

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
      if(key == 'origin.selectedLanguages') {
        console.log('origin.selectedLanguages', value)
        // if not already an array, make it one
        if(!Array.isArray(flatData[key])) {
          flatData[key] = [flatData[key] as string];
        }
        // if the value is not already in the array, add it
        if(!(flatData[key] as string[]).includes(value as string)) {
          (flatData[key] as string[]).push(value as string);
        }
      } else {
        flatData[key] = value as (string | string[]);
      }
    }
    console.log('Flattened form data:', flatData);

    // Unflatten the data
    const data = unflatten(flatData) as Partial<CharacterCreationFormData>;

    // Clean up arrays by removing null values
    if (data.class?.selectedSkills) {
      data.class.selectedSkills = data.class.selectedSkills.filter(Boolean);
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
      this.updateState({
        classDocument: null
      })
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
      formData: { origin: { species: { name: speciesDoc?.name, id: speciesId } } }
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

  /**
   * Handle form click events in a consolidated way
   */
  private handleFormClick(event: Event): void {
    console.log('handleFormClick', event.target);
    this.handleNavigation(event);
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
    
    // Set up method select change handling
    const methodSelect = this.container.querySelector('#ability-method');
    if (methodSelect) {
      methodSelect.addEventListener('change', this.handleAbilityMethodChange.bind(this));
    }
    
    // Set up ability score selects
    const abilitySelects = this.container.querySelectorAll('.ability-select');
    abilitySelects.forEach(select => {
      select.addEventListener('change', this.handleAbilityScoreChange.bind(this));
    });
  }

  /**
   * Handle ability method change
   */
  private handleAbilityMethodChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const method = select.value as 'standard' | 'pointbuy' | 'roll';
    
    console.log('Ability method changed to:', method);
    
    // Generate ability scores based on selected method
    this.generateAbilityScores(method);
  }
  
  /**
   * Generate ability scores based on the selected method
   */
  private generateAbilityScores(method: 'standard' | 'pointbuy' | 'roll'): void {
    let availableScores: number[] = [];
    
    if (method === 'standard') {
      // Standard array: 15, 14, 13, 12, 10, 8
      availableScores = [15, 14, 13, 12, 10, 8];
    } else if (method === 'roll') {
      // Roll 4d6, drop lowest for each score
      availableScores = Array(6).fill(0).map(() => {
        const rolls = Array(4).fill(0).map(() => Math.floor(Math.random() * 6) + 1);
        rolls.sort((a, b) => b - a);
        return rolls.slice(0, 3).reduce((sum, roll) => sum + roll, 0);
      });
      // Sort in descending order
      availableScores.sort((a, b) => b - a);
    }
    
    // Update form data
    const formData = this.getFormData();
    
    // Reset scores - clear any existing ability scores
    formData.abilities = {
      method,
      availableScores,
      pointsRemaining: 27
    };
    console.log('generateAbilityScores: Form data updated:', formData);
    // Update component state
    this.updateState({formData: formData});
    
    // Render with updated state
    this.render(this.getState());
  }
  
  /**
   * Handle ability score selection change
   */
  private handleAbilityScoreChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const ability = select.name.split('.').pop() || '';
    const newValue = select.value ? parseInt(select.value, 10) : null;
    
    // Get the current form data and abilities
    const formData = this.getFormData();
    if (!formData.abilities) return;
    
    // Make a copy of the abilities to work with
    const abilities = { ...formData.abilities };
    
    // Get the old value if it exists from the state (not formData, which might not have the current value)
    const oldValue = this.state.formData.abilities?.[ability as keyof typeof this.state.formData.abilities] as number | undefined;
    
    console.log('Ability score changed:', ability, 'from', oldValue, 'to', newValue);
    
    // If there was a previous value, add it back to available scores
    if (oldValue) {
      // Check if it's already in the available scores
        abilities.availableScores.push(oldValue);
        // Keep scores sorted in descending order
        abilities.availableScores.sort((a, b) => b - a);
        console.log(`Added ${oldValue} back to available scores:`, abilities.availableScores);
    }
    
    // If a new value was selected, remove it from available scores
    if (newValue) {
      abilities.availableScores = abilities.availableScores.filter(score => score !== newValue);
      console.log(`Removed ${newValue} from available scores:`, abilities.availableScores);
    }
    
    // Update the ability score
    if (newValue) {
      (abilities as any)[ability] = newValue;
    } else {
      delete (abilities as any)[ability];
    }
    
    formData.abilities = abilities;
    
    // Update component state
    this.updateState({formData: formData});
    
    // Render with updated state
    this.render(this.getState());
  }
  
  /**
   * Handle point buy button clicks
   */
  private handlePointBuyClick(event: Event): void {
    // This method is being replaced with new ability score handling
    console.log('Point buy will be implemented later');
  }
  
  /**
   * Handle rolling ability scores
   */
  private handleRollAbilities(): void {
    // Generate ability scores using the roll method
    this.generateAbilityScores('roll');
  }
  
  /**
   * Update the ability modifier display
   */
  private updateAbilityModifier(ability: string, score: number): void {
    if (!this.form) return;
    
    const modifierElem = this.form.querySelector(`select[name="abilities.${ability}"]`)
      ?.closest('.ability-box')
      ?.querySelector('.ability-modifier');
      
    if (!modifierElem) return;
    
    const modifier = Math.floor((score - 10) / 2);
    const formattedModifier = modifier >= 0 ? `+${modifier}` : modifier.toString();
    
    modifierElem.innerHTML = `<span class="modifier-bubble">${formattedModifier}</span>`;
  }
  
  
  /**
   * Validate a specific page of the form
   */
  private validatePage(pageId: string): boolean {
    let isValid = true;
    const errors: Record<string, string[]> = {};
    
    // Validation logic specific to each page
    if (pageId === 'class-page') {
      if (!this.state.formData.class?.id) {
        errors['class.id'] = ['Please select a class.'];
        isValid = false;
      }
    } 
    else if (pageId === 'origin-page') {
      if (!this.state.formData.origin?.species?.id) {
        errors['origin.species.id'] = ['Please select a species.'];
        isValid = false;
      }
      
      if (!this.state.formData.origin?.background?.id) {
        errors['origin.background.id'] = ['Please select a background.'];
        isValid = false;
      }
    }
    else if (pageId === 'abilities-page') {
      const abilities = this.state.formData.abilities;
      
      if (!abilities) {
        errors['abilities.method'] = ['Please select an ability score method.'];
        isValid = false;
      } else {
        const abilityNames = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
        const missingAbilities = abilityNames.filter(ability => 
          !(abilities as any)[ability]
        );
        
        if (missingAbilities.length > 0) {
          errors['abilities'] = [`Please assign scores to all abilities: ${missingAbilities.join(', ')}.`];
          isValid = false;
        }
      }
    }
    
    // Store validation results in state
    this.updateState({
      validationErrors: errors,
      isValid: isValid
    });
    
    return isValid;
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
    console.log('before merge', this.state);
    console.log('state to merge', state);
    console.trace();
    this.state = merge.withOptions({mergeArrays: false }, this.state, state) as CharacterCreationState;
    console.log('after merge', this.state);
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

// Export the component class
export default CharacterCreationComponent;