// Character Creation UI module for D&D 5e
import { PluginComponent } from '@dungeon-lab/shared/base/plugin-component.mjs';
import { IPluginAPI } from '@dungeon-lab/shared/types/plugin-api.mjs';
import { z } from 'zod';
/**
 * @param { CharacterCreationState } context
 */
import template from './template.hbs?raw';
import styles from './styles.css?raw';
import { registerHelpers } from '../../../web/helpers/handlebars.mjs';
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

import { ICharacterData } from '../../../shared/types/character.mjs';

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

//interface PartialCharacterCreationState extends Partial<CharacterCreationState> {}

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
      this.render(this.getState()) ;
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
    this.updateState({ formData: partialUpdate as PartialCharacterCreationFormData });

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
    this.render(this.getState() as unknown as Record<string, unknown>);
  }


  private handleClassChange() {
    const foo = this.state
    console.log('foo', foo);
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
      formData: { class: { name: classDoc?.name || '' } }
    });
    console.log('Class document updated:', this.state.classDocument);
  }

  private handleSpeciesChange() {
    const speciesId = this.state.formData.origin?.species?.id;
    if (!speciesId) {
      this.updateState({
        speciesDocument: null
      });
      return;
    }

    const speciesDoc = getDocumentById('species', speciesId);
    this.state.speciesDocument = null;
    this.updateState({ 
      speciesDocument: speciesDoc as ISpeciesDocument,
      formData: { origin: { species: { name: speciesDoc?.name || '', id: speciesId } } }
    });
    console.log('Species document updated:', this.state.speciesDocument);
  }

  private handleBackgroundChange(): void {
    const backgroundId = this.state.formData.origin?.background?.id;
    if (!backgroundId) {
      this.updateState({
        backgroundDocument: null
      });
      return;
    }

    const backgroundDoc = getDocumentById('background', backgroundId);
    this.state.backgroundDocument = null;
    this.updateState({ 
      backgroundDocument: backgroundDoc as IBackgroundDocument,
      formData: { origin: { background: { name: backgroundDoc?.name, id: backgroundId } } }
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
    
    // Reset scores with default values for all abilities
    formData.abilities = {
      method,
      availableScores,
      pointsRemaining: 27,
      strength: '',
      dexterity: '',
      constitution: '',
      intelligence: '',
      wisdom: '',
      charisma: ''
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
    const oldValue = this.state.formData.abilities?.[ability as keyof typeof this.state.formData.abilities] as string || undefined;
    
    console.log('Ability score changed:', ability, 'from', oldValue, 'to', newValue);
    
    // If there was a previous value, add it back to available scores
    if (oldValue) {
      // Check if it's already in the available scores
        abilities.availableScores!.push(parseInt(oldValue, 10));
        // Keep scores sorted in descending order
        abilities.availableScores!.sort((a, b) => b! - a!);
        console.log(`Added ${oldValue} back to available scores:`, abilities.availableScores);
    }
    
    // If a new value was selected, remove it from available scores
    if (newValue) {
      abilities.availableScores = abilities.availableScores!.filter(score => score !== newValue);
      console.log(`Removed ${newValue} from available scores:`, abilities.availableScores);
    }
    
    // Update the ability score
    if (newValue) {
      (abilities as Record<string, unknown>)[ability] = newValue;
    } else {
      delete (abilities as Record<string, unknown>)[ability];
    }
    
    formData.abilities = abilities;
    
    // Update component state
    this.updateState({formData: formData});
    
    // Render with updated state
    this.render(this.getState() as unknown as Record<string, unknown>);
  }
  
  /**
   * Handle point buy button clicks
   */
  private handlePointBuyClick(_event: Event): void {
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
   * Validate a specific page of the form
   */
  private validatePage(pageId: string): boolean {
    let isValid = true;
    const errors: Record<string, string[]> = {};
    
    // Get the current form data
    const formData = this.getFormData();
    
    // Create a validation schema based on the page
    let pageSchema: z.ZodType<unknown>;
    let dataToValidate: Record<string, unknown> = {};
    
    if (pageId === 'class-page') {
      // For the class page, validate the class object
      pageSchema = z.object({ class: characterCreationFormSchema.shape.class });
      dataToValidate = { class: formData.class };
    } 
    else if (pageId === 'origin-page') {
      // For the origin page, validate the origin object
      pageSchema = z.object({ origin: characterCreationFormSchema.shape.origin });
      dataToValidate = { origin: formData.origin };
    }
    else if (pageId === 'abilities-page') {
      // For the abilities page, validate the abilities object and ensure all ability scores are set
      pageSchema = z.object({ abilities: characterCreationFormSchema.shape.abilities });
      dataToValidate = { abilities: formData.abilities };
    }
    else if (pageId === 'details-page') {
      // For the details page, validate the details object
      pageSchema = z.object({ details: characterCreationFormSchema.shape.details });
      dataToValidate = { details: formData.details };
    }
    else {
      // Unknown page, return true
      this.updateState({
        validationErrors: {},
        isValid: true
      });
      return true;
    }
    
    // Validate the data against the schema
    const result = pageSchema.safeParse(dataToValidate);
    
    if (!result.success) {
      // Convert Zod errors to our format
      const formattedErrors: Record<string, string[]> = {};
      
      result.error.errors.forEach(err => {
        const path = err.path.join('.');
        if (!formattedErrors[path]) {
          formattedErrors[path] = [];
        }
        formattedErrors[path].push(err.message);
      });
      
      // Merge with any existing errors
      Object.assign(errors, formattedErrors);
      isValid = false;
    }
    
    // Store validation results in state
    this.updateState({
      validationErrors: errors,
      isValid: isValid
    });
    
    // Display validation errors to the user
    this.displayValidationErrors(errors);
    
    return isValid;
  }
  
  /**
   * Display validation errors to the user
   */
  private displayValidationErrors(errors: Record<string, string[]>): void {
    // First, clear any existing error messages
    if (this.container) {
      const existingErrorMessages = this.container.querySelectorAll('.validation-error');
      existingErrorMessages.forEach(elem => elem.remove());
    }
    
    // If there are no errors, nothing more to do
    if (Object.keys(errors).length === 0) return;
    
    // Create and show an error summary at the top of the current page
    const currentPage = this.container?.querySelector('.form-page.active');
    if (!currentPage) return;
    
    // Create a summary error message
    const errorSummary = document.createElement('div');
    errorSummary.className = 'validation-error error-summary';
    errorSummary.innerHTML = '<h4>Please fix the following errors:</h4><ul></ul>';
    
    const errorList = errorSummary.querySelector('ul');
    if (!errorList) return;
    
    // Add styles to the error summary
    errorSummary.style.backgroundColor = '#fff0f0';
    errorSummary.style.border = '1px solid #dc3545';
    errorSummary.style.borderRadius = '4px';
    errorSummary.style.padding = '10px 15px';
    errorSummary.style.marginBottom = '20px';
    errorSummary.style.color = '#dc3545';
    
    // Add specific error messages
    let errorCount = 0;
    for (const [field, messages] of Object.entries(errors)) {
      for (const message of messages) {
        errorCount++;
        const listItem = document.createElement('li');
        listItem.textContent = `${field}: ${message}`;
        errorList.appendChild(listItem);
        
        // Also add inline error message near the field if possible
        const fieldName = field.split('.').pop() || field;
        const fieldElement = this.container?.querySelector(`[name="${field}"]`) || 
                             this.container?.querySelector(`[name$=".${fieldName}"]`);
        
        if (fieldElement) {
          const fieldParent = fieldElement.closest('.form-group') || fieldElement.parentElement;
          
          if (fieldParent) {
            const inlineError = document.createElement('div');
            inlineError.className = 'validation-error field-error';
            inlineError.textContent = `${field}: ${message}`;
            inlineError.style.color = '#dc3545';
            inlineError.style.fontSize = '0.875rem';
            inlineError.style.marginTop = '5px';
            
            // Add error styling to the field
            (fieldElement as HTMLElement).style.borderColor = '#dc3545';
            
            // Add the error message after the field
            fieldParent.appendChild(inlineError);
          }
        }
      }
    }
    
    // If there are errors, insert the summary at the top of the page
    if (errorCount > 0) {
      currentPage.insertBefore(errorSummary, currentPage.firstChild);
      
      // Scroll to the top of the page to show the error summary
      window.scrollTo({
        top: currentPage.getBoundingClientRect().top + window.scrollY - 20,
        behavior: 'smooth'
      });
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

  serializeForm(form: HTMLFormElement): CharacterCreationFormData {
    const formData = new FormData(form);
    const flatData: Record<string, unknown> = {};
    for (const key of formData.keys()) {
      const target = form.querySelector(`[name="${key}"]`) as HTMLInputElement;
      if (target) {
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
            flatData[target.name] = formData.get(key);
          }
        } else {
          flatData[target.name] = formData.get(key);
        }
      }
    }
    
    const res = unflatten(flatData);
    console.log(res)
    return res as CharacterCreationFormData
  }

  /**
   * Validates form data against the character creation schema
   */
  validateForm(form: HTMLFormElement): z.SafeParseReturnType<unknown, unknown> {
    return characterCreationFormSchema.safeParse(this.serializeForm(form));
  }

  /**
   * Translates form data into the full character schema format
   */
  translateFormData(formData: CharacterCreationFormData): ICharacterData {
    // Calculate ability modifiers
    const abilities = {
      strength: {
        score: parseInt(formData.abilities.strength, 10),
        modifier: Math.floor((parseInt(formData.abilities.strength, 10) - 10) / 2),
        savingThrow: {
          proficient: this.state.classDocument?.data?.savingthrows?.includes('strength') || false,
          bonus: 0 // Will be calculated below
        }
      },
      dexterity: {
        score: parseInt(formData.abilities.dexterity, 10),
        modifier: Math.floor((parseInt(formData.abilities.dexterity, 10) - 10) / 2),
        savingThrow: {
          proficient: this.state.classDocument?.data?.savingthrows?.includes('dexterity') || false,
          bonus: 0
        }
      },
      constitution: {
        score: parseInt(formData.abilities.constitution, 10),
        modifier: Math.floor((parseInt(formData.abilities.constitution, 10) - 10) / 2),
        savingThrow: {
          proficient: this.state.classDocument?.data?.savingthrows?.includes('constitution') || false,
          bonus: 0
        }
      },
      intelligence: {
        score: parseInt(formData.abilities.intelligence, 10),
        modifier: Math.floor((parseInt(formData.abilities.intelligence, 10) - 10) / 2),
        savingThrow: {
          proficient: this.state.classDocument?.data?.savingthrows?.includes('intelligence') || false,
          bonus: 0
        }
      },
      wisdom: {
        score: parseInt(formData.abilities.wisdom, 10),
        modifier: Math.floor((parseInt(formData.abilities.wisdom, 10) - 10) / 2),
        savingThrow: {
          proficient: this.state.classDocument?.data?.savingthrows?.includes('wisdom') || false,
          bonus: 0
        }
      },
      charisma: {
        score: parseInt(formData.abilities.charisma, 10),
        modifier: Math.floor((parseInt(formData.abilities.charisma, 10) - 10) / 2),
        savingThrow: {
          proficient: this.state.classDocument?.data?.savingthrows?.includes('charisma') || false,
          bonus: 0
        }
      }
    };

    // Standard proficiency bonus for level 1
    const proficiencyBonus = 2;

    // Calculate saving throw bonuses
    for (const ability of Object.keys(abilities) as Array<keyof typeof abilities>) {
      abilities[ability].savingThrow.bonus = abilities[ability].modifier + 
        (abilities[ability].savingThrow.proficient ? proficiencyBonus : 0);
    }

    // Get class data
    const classData = {
      name: formData.class.name,
      level: 1,
      hitDiceType: (this.state.classDocument?.data?.hitdie || 'd8') as 'd6' | 'd8' | 'd10' | 'd12'
    };

    // Calculate hit points
    const constitutionModifier = abilities.constitution.modifier;
    const hitDiceValue = parseInt(classData.hitDiceType.substring(1), 10);
    const maxHitPoints = hitDiceValue + constitutionModifier;

    // Get alignment (convert from form format with hyphens to character format with spaces)
    const alignment = formData.details.alignment.replace('-', ' ') as
      'lawful good' | 'neutral good' | 'chaotic good' |
      'lawful neutral' | 'true neutral' | 'chaotic neutral' |
      'lawful evil' | 'neutral evil' | 'chaotic evil';

    // Get features based on class, species, and background
    const features: Array<{name: string, description: string, source: string}> = [];
    
    // Add class features
    if (this.state.classDocument?.data?.features) {
      // Handle features - iterate over each level
      Object.entries(this.state.classDocument.data.features).forEach(([level, levelFeatures]) => {
        // Only include level 1 features
        if (parseInt(level, 10) <= 1) {
          // Process each feature in this level
          levelFeatures.forEach((feature: unknown) => {
            features.push({
              name: (feature as {name: string}).name,
              description: (feature as {description: string}).description || '',
              source: `${formData.class.name} Class`
            });
          });
        }
      });
    }

    // Add species features
    if (this.state.speciesDocument?.data?.traits) {
      this.state.speciesDocument.data.traits.forEach((t: unknown) => {
        features.push({
          name: (t as {name: string}).name,
          description: (t as {description: string}).description || '',
          source: `${formData.origin.species.name} Species`
        });
      });
    }

    // Add background features
    const backgroundDoc = this.state.backgroundDocument?.data;
    if (backgroundDoc) {
      // Add general background description as a feature
      features.push({
        name: `${formData.origin.background.name} Background`,
        description: backgroundDoc.description || '',
        source: formData.origin.background.name
      });
    }

    // Compile equipment items
    const equipment: Array<{id: string, quantity: number}> = [];
    
    // Add class equipment
    // TODO: Add code to process class equipment selections when available
    
    // Add background equipment
    // TODO: Add code to process background equipment
    
    // Add purchased items
    if (formData.equipment?.purchasedItems) {
      formData.equipment.purchasedItems.forEach(item => {
        // This is a simplification - in reality, you'd need to map purchased items to actual item IDs
        equipment.push({
          id: item.name, // Using name as ID for now
          quantity: item.quantity
        });
      });
    }

    // Character data object according to the schema
    const characterData = {
      name: formData.name || 'New Character',
      species: formData.origin.species.name,
      background: formData.origin.background.name,
      classes: [classData],
      alignment,
      
      // Core stats
      experiencePoints: 0,
      proficiencyBonus,
      armorClass: 10 + abilities.dexterity.modifier, // Base AC calculation
      initiative: abilities.dexterity.modifier,
      speed: this.state.speciesDocument?.data?.speed || 30,
      
      hitPoints: {
        maximum: maxHitPoints,
        current: maxHitPoints
      },
      
      hitDice: {
        total: 1,
        current: 1,
        type: classData.hitDiceType
      },
      
      abilities,
      equipment,
      features,
      
      // Biography
      biography: {
        personalityTraits: formData.details.personalityTraits || '',
        ideals: formData.details.ideals || '',
        bonds: formData.details.bonds || '',
        flaws: formData.details.flaws || '',
        backstory: formData.details.backstory || '',
        appearance: [
          formData.details.age ? `Age: ${formData.details.age}` : '',
          formData.details.height ? `Height: ${formData.details.height}` : '',
          formData.details.weight ? `Weight: ${formData.details.weight}` : '',
          formData.details.eyes ? `Eyes: ${formData.details.eyes}` : '',
          formData.details.hair ? `Hair: ${formData.details.hair}` : '',
          formData.details.skin ? `Skin: ${formData.details.skin}` : ''
        ].filter(Boolean).join(', ')
      }
    };
    return characterData

    // Build the final ICharacter object (IActor & { data: ICharacterData })
    // return {
    //   name: formData.name || 'New Character',
    //   type: 'character',
    //   gameSystemId: 'dnd-5e-2024',
    //   description: formData.details.backstory?.substring(0, 100) || '',
    //   data: characterData,
    //   // These fields are required by IActor but will be filled in by the server
    //   createdBy: '',
    //   updatedBy: ''
    // } as ICharacter; // Use type assertion since we know the server will set these fields
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
  getFormData(): PartialCharacterCreationFormData {
    return this.state.formData as PartialCharacterCreationFormData;
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
    const state = sessionStorage.getItem('actorCreationState');
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
    sessionStorage.setItem('actorCreationState', JSON.stringify(this.state));
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