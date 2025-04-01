import { IPluginComponent } from '../types/plugin-component.mjs';
import type { IPluginAPI } from '../types/plugin-api.mjs';
import Handlebars from 'handlebars';
import { z } from 'zod';
import H from 'just-handlebars-helpers';

// Import Handlebars types from the actual package
import type { TemplateDelegate, RuntimeOptions } from 'handlebars';

/**
 * Base class for plugin components
 * Provides default implementations for lifecycle hooks and debugging
 */
export abstract class PluginComponent implements IPluginComponent {
  public readonly id: string;
  public readonly name: string;
  protected readonly api: IPluginAPI;
  protected container: HTMLElement | null = null;
  private _isDebugMode = false;
  private compiledTemplate: TemplateDelegate | null = null;
  protected readonly handlebars: typeof Handlebars;

  constructor(id: string, name: string, api: IPluginAPI) {
    this.id = id;
    this.name = name;
    this.api = api;
    
    // Create a new instance of Handlebars for this component
    this.handlebars = Handlebars.create();
    
    // Register just-handlebars-helpers
    H.registerHelpers(this.handlebars);
  }

  get isDebugMode(): boolean {
    return this._isDebugMode;
  }

  set isDebugMode(value: boolean) {
    this._isDebugMode = value;
    if (value) {
      this.enableDebugMode?.();
    } else {
      this.disableDebugMode?.();
    }
  }

  /**
   * Called when the component is mounted
   * @param container The container element to mount the component in
   */
  async onMount(container: HTMLElement): Promise<void> {
    this.container = container;
    if (this.isDebugMode) {
      console.log(`[${this.name}] Component mounted`, {
        id: this.id,
        container
      });
    }
    await this.render();
  }

  /**
   * Called when the component is unmounted
   */
  async onUnmount(): Promise<void> {
    if (this.container) {
      // Clean up any event listeners or resources
      this.container.innerHTML = '';
      this.container = null;
    }
    // Clear compiled template
    this.compiledTemplate = null;
    if (this.isDebugMode) {
      console.log(`[${this.name}] Component unmounted`, {
        id: this.id
      });
    }
  }

  /**
   * Called when the component's data is updated
   * @param data The updated data
   */
  async onUpdate(data: Record<string, any>): Promise<void> {
    if (this.isDebugMode) {
      console.log(`[${this.name}] Component updated`, {
        id: this.id,
        data
      });
    }
    await this.render(data);
  }

  /**
   * Enable debug mode for this component
   */
  public enableDebugMode(): void {
    console.log(`[${this.name}] Debug mode enabled`, {
      id: this.id
    });
  }

  /**
   * Disable debug mode for this component
   */
  public disableDebugMode(): void {
    console.log(`[${this.name}] Debug mode disabled`, {
      id: this.id
    });
  }

  /**
   * Get the template content
   * Must be implemented by derived classes to provide the Handlebars template
   */
  protected abstract getTemplate(): string;

  /**
   * Get the stylesheet content
   * Must be implemented by derived classes to provide the CSS
   */
  protected abstract getStyles(): string;

  private compileTemplate() {
      if (!this.compiledTemplate) {
        const template = this.getTemplate();
        if (this.isDebugMode) {
          console.log(`[${this.name}] Compiling template`, {
            id: this.id,
            template: template.substring(0, 100) + '...' // Log first 100 chars
          });
        }
        this.compiledTemplate = this.handlebars.compile(template);
      }
  }

  /**
   * Render the component with the given data
   * @param data Data to use for rendering
   */
  public async render(data: Record<string, any> = {}): Promise<void> {
    console.log('Rendering component', {
      id: this.id,
      data
    });
    if (!this.container) {
      throw new Error('Cannot render: component not mounted');
    }

    try {
      this.compileTemplate();

      // Add or update styles
      const styles = this.getStyles();
      let styleElement = document.getElementById(`${this.id}-styles`);
      if (!styleElement) {
        styleElement = document.createElement('style');
        styleElement.id = `${this.id}-styles`;
        document.head.appendChild(styleElement);
      }
      styleElement.textContent = styles;

      // Render template with data
      const rendered = this.compiledTemplate(data);
      this.container.innerHTML = rendered;

      if (this.isDebugMode) {
        console.log(`[${this.name}] Rendered template`, {
          id: this.id,
          data
        });
      }
    } catch (error) {
      console.error(`[${this.name}] Error rendering:`, error);
      throw error;
    }
  }

  /**
   * Validate form data - default implementation always returns success
   * Override in derived classes for specific validation logic
   * @param data The data to validate
   * @returns A zod SafeParseReturnType indicating validation success or failure
   */
  validateForm(data: unknown): z.SafeParseReturnType<unknown, unknown> {
    // Default implementation always returns success with the original data
    return {
      success: true,
      data
    } as z.SafeParseReturnType<unknown, unknown>;
  }

  /**
   * Transform form data - default implementation returns input unchanged
   * Override in derived classes for specific transformation logic
   * @param data The form data to transform
   * @returns Transformed data as a record
   */
  translateFormData(data: unknown): Record<string, unknown> {
    // Default implementation returns data as is (if it's a record)
    // or an empty object if it's not a record
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      return data as Record<string, unknown>;
    }
    
    // Return empty object for non-record inputs
    return {};
  }

  /**
   * Register common Handlebars helpers
   * Can be extended by derived classes to register additional helpers
   */
  protected registerCommonHelpers(): void {
    // Using just-handlebars-helpers
  }
} 