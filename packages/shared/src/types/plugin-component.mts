import { z } from 'zod';

/**
 * Interface for plugin component lifecycle hooks and configuration
 */
export interface IPluginComponent {
  // Component identification
  readonly id: string;
  readonly name: string;

  // Debug mode flag
  isDebugMode: boolean;

  // Lifecycle hooks
  onMount(container: HTMLElement): Promise<void>;
  onUnmount(): Promise<void>;
  onUpdate(data: Record<string, any>): Promise<void>;

  // Render method
  render(data?: Record<string, any>): Promise<void>;

  // Form validation and data transformation
  validateForm(data: unknown): z.SafeParseReturnType<unknown, unknown>;
  translateFormData(data: unknown): Record<string, unknown>;

  // Optional debug methods
  enableDebugMode?(): void;
  disableDebugMode?(): void;
} 