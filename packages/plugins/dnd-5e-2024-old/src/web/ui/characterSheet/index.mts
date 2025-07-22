// Character Sheet UI module for D&D 5e
import { PluginComponent } from '@dungeon-lab/shared/base/plugin-component.mjs';
import { IPluginAPI } from '@dungeon-lab/shared/types/plugin-api.mjs';
import template from './template.hbs?raw';
import styles from './styles.css?raw';
import { registerHelpers } from '../../../web/helpers/handlebars.mjs';
import { ICharacter } from '../../../shared/types/character.mjs';
import { deepMerge } from '@dungeon-lab/shared/utils/index.mjs';
// Define component state interface
interface CharacterSheetState {
  character: ICharacter | null;
  isEditing: boolean;
  isDirty: boolean;
  activeTab: string;
  pendingChanges: Record<string, unknown>;
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
    activeTab: 'abilities',
    pendingChanges: {}
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

  async onUpdate(data: Record<string, unknown>): Promise<void> {
    console.log('CharacterSheetComponent updating with data:', data);

    // Update our component state with the character data
    if (data.character) {
      this.updateState({
        character: data.character as ICharacter,
        pendingChanges: {} // Reset pending changes when character data is updated
      });
    }

    await super.onUpdate(this.getState() as unknown as Record<string, unknown>);
  }

  /**
   * Set up template-specific event handlers
   * This is called after each render
   */
  protected setupTemplateHandlers(): void {
    if (!this.container) return;

    // Set up tab navigation
    const tabButtons = this.container.querySelectorAll('.tab-button');
    tabButtons.forEach((button) => {
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
    formFields.forEach((field) => {
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
    this.render(this.getState() as unknown as Record<string, unknown>);
  }

  /**
   * Toggle edit mode
   */
  private toggleEditMode(): void {
    this.updateState({ isEditing: !this.state.isEditing });
    this.render(this.getState() as unknown as Record<string, unknown>);
  }

  /**
   * Handle field changes and mark the form as dirty
   */
  private handleFieldChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (!target || !target.name) return;

    // Get the field name and value
    const fieldName = target.name;
    const fieldValue = this.getFieldValue(target);

    // Store the change in the pending changes
    const pendingChanges = { ...this.state.pendingChanges };
    this.setNestedValue(pendingChanges, fieldName, fieldValue);

    this.updateState({
      isDirty: true,
      pendingChanges
    });

    console.log('Field changed:', fieldName, fieldValue);
    console.log('Pending changes:', pendingChanges);
  }

  /**
   * Get field value based on input type
   */
  private getFieldValue(
    field: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
  ): unknown {
    if (field.type === 'checkbox') {
      return (field as HTMLInputElement).checked;
    } else if (field.type === 'number') {
      return field.value ? parseInt(field.value, 10) : 0;
    } else {
      return field.value;
    }
  }

  /**
   * Set a nested value in an object using dot notation path
   */
  private setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
    const keys = path.split('.');
    let current = obj;

    // Traverse the path to the second-to-last key
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      // Create nested objects if they don't exist
      if (!current[key] || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key] as Record<string, unknown>;
    }

    // Set the value at the final key
    const finalKey = keys[keys.length - 1];
    current[finalKey] = value;
  }

  /**
   * Merge pending changes into character data
   */
  private applyPendingChanges(): ICharacter {
    if (!this.state.character) {
      throw new Error('No character data to update');
    }

    // Create a deep copy of the character to avoid mutating the original
    const updatedCharacter = JSON.parse(JSON.stringify(this.state.character)) as ICharacter;

    // Apply each pending change to the character copy
    Object.entries(this.state.pendingChanges).forEach(([key, value]) => {
      if (typeof value === 'object' && value !== null) {
        deepMerge(updatedCharacter, { [key]: value });
      } else {
        // For top-level properties
        (updatedCharacter as Record<string, unknown>)[key] = value;
      }
    });

    return updatedCharacter;
  }

  /**
   * Save changes to the character
   */
  private async saveChanges(): Promise<void> {
    if (!this.state.character || !this.state.isDirty) return;

    try {
      // Apply pending changes to create the updated character data
      const updatedCharacter = this.applyPendingChanges();

      // Make sure we have a character ID
      if (!this.state.character.id) {
        throw new Error('Character ID is missing');
      }
      const { token: _token, avatar: _avatar, ...rest } = updatedCharacter;

      // Send the update to the server via the plugin API
      await this.api.updateActor(this.state.character.id, rest);

      // Update our local state with the saved changes
      this.updateState({
        character: updatedCharacter,
        isDirty: false,
        isEditing: false,
        pendingChanges: {}
      });

      // Re-render with updated state
      this.render(this.getState() as unknown as Record<string, unknown>);

      console.log('Changes saved successfully');
    } catch (error) {
      console.error('error', error);
      console.error('stack', (error as Error).stack);
      console.log('message', (error as Error).message);

      alert('Failed to save changes. Please try again.');
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
