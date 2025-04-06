// Character Sheet UI module for D&D 5e
import { PluginComponent } from '@dungeon-lab/shared/base/plugin-component.mjs';
import { IPluginAPI } from '@dungeon-lab/shared/types/plugin-api.mjs';
import template from './template.hbs?raw';
import styles from './styles.css?raw';
import { registerHelpers } from '../../../web/helpers/handlebars.mjs';
import { ICharacter } from '../../../shared/types/character.mjs';

// Define component state interface
interface CharacterSheetState {
  character: ICharacter | null;
  isEditing: boolean;
  isDirty: boolean;
  activeTab: string;
}

/**
 * Character Sheet Component for D&D 5e
 * Displays and allows editing of character data
 */
export class CharacterSheetComponent extends PluginComponent {
  private state: CharacterSheetState = {
    character: null,
    isEditing: false,
    isDirty: false,
    activeTab: 'abilities'
  };

  constructor(api: IPluginAPI) {
    super('characterSheet', 'D&D 5e Character Sheet', api);
    console.log('CharacterSheetComponent constructor called');
    this.registerHelpers();
  }

  protected getTemplate(): string {
    return template;
  }

  protected getStyles(): string {
    return styles;
  }

  async onMount(container: HTMLElement): Promise<void> {
    console.log('CharacterSheetComponent mounting');
    await super.onMount(container);
  }

  async onUpdate(data: Record<string, any>): Promise<void> {
    console.log('CharacterSheetComponent updating with data:', data);
    
    // Update our component state with the character data
    if (data.character) {
      this.updateState({
        character: data.character
      });
    }
    
    await super.onUpdate(this.getState());
  }

  /**
   * Set up template-specific event handlers
   * This is called after each render
   */
  protected setupTemplateHandlers(): void {
    if (!this.container) return;

    // Set up tab navigation
    const tabButtons = this.container.querySelectorAll('.tab-button');
    tabButtons.forEach(button => {
      button.addEventListener('click', this.handleTabChange.bind(this));
    });

    // Set up edit mode toggle
    const editButton = this.container.querySelector('#edit-mode-toggle');
    if (editButton) {
      editButton.addEventListener('click', this.toggleEditMode.bind(this));
    }

    // Set up save button
    const saveButton = this.container.querySelector('#save-changes');
    if (saveButton) {
      saveButton.addEventListener('click', this.saveChanges.bind(this));
    }

    // Set up form fields change listeners
    const formFields = this.container.querySelectorAll('input, select, textarea');
    formFields.forEach(field => {
      field.addEventListener('change', this.handleFieldChange.bind(this));
    });
  }

  /**
   * Handle tab changes
   */
  private handleTabChange(event: Event): void {
    const target = event.target as HTMLElement;
    const tabId = target.dataset.tab;
    if (!tabId) return;

    this.updateState({ activeTab: tabId });
    this.render(this.getState());
  }

  /**
   * Toggle edit mode
   */
  private toggleEditMode(): void {
    this.updateState({ isEditing: !this.state.isEditing });
    this.render(this.getState());
  }

  /**
   * Handle field changes and mark the form as dirty
   */
  private handleFieldChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (!target || !target.name) return;
    
    this.updateState({ isDirty: true });
    
    // TODO: Update the character data based on field changes
    console.log('Field changed:', target.name, target.value);
  }

  /**
   * Save changes to the character
   */
  private async saveChanges(): Promise<void> {
    if (!this.state.character || !this.state.isDirty) return;
    
    try {
      // TODO: Implement saving logic via the API
      // await this.api.updateActor(this.state.character.id, this.state.character);
      
      this.updateState({ isDirty: false, isEditing: false });
      this.render(this.getState());
      
      console.log('Changes saved');
    } catch (error) {
      console.error('Failed to save changes:', error);
    }
  }

  /**
   * Register Handlebars helpers
   */
  protected registerHelpers(): void {
    // Register the shared helpers
    registerHelpers(this.handlebars);
    
    // Register component-specific helpers
    this.handlebars.registerHelper('isActiveTab', (tabId: string) => {
      return tabId === this.state.activeTab;
    });
    
    this.handlebars.registerHelper('modifierValue', (score: number) => {
      const modifier = Math.floor((score - 10) / 2);
      return modifier >= 0 ? `+${modifier}` : modifier;
    });
  }

  /**
   * Update component state
   */
  private updateState(newState: Partial<CharacterSheetState>): void {
    this.state = { ...this.state, ...newState };
  }

  /**
   * Get current state for rendering
   */
  private getState(): CharacterSheetState {
    return this.state;
  }
}

// Export the component class
export default CharacterSheetComponent; 