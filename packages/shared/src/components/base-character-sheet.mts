import { defineComponent, ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue';
import type { PluginContext } from '../types/plugin.mjs';
import type { CharacterData } from '../types/mechanics-registry.mjs';

/**
 * Props for character sheet components
 */
export interface CharacterSheetProps {
  /** Character data */
  character: CharacterData;
  
  /** Plugin context */
  context: PluginContext;
  
  /** Whether the component is in readonly mode */
  readonly?: boolean;
  
  /** Additional component configuration */
  config?: CharacterSheetConfig;
}

/**
 * Character sheet configuration
 */
export interface CharacterSheetConfig {
  /** Show debug information */
  showDebug?: boolean;
  
  /** Enable auto-save */
  autoSave?: boolean;
  
  /** Auto-save delay in milliseconds */
  autoSaveDelay?: number;
  
  /** Custom validation rules */
  validation?: ValidationRules;
  
  /** UI layout configuration */
  layout?: LayoutConfig;
}

/**
 * Validation rules for character data
 */
export interface ValidationRules {
  /** Required fields */
  required?: string[];
  
  /** Field validators */
  validators?: Record<string, (value: unknown) => string | null>;
  
  /** Cross-field validation */
  crossValidation?: (character: CharacterData) => string[];
}

/**
 * Layout configuration for character sheet
 */
export interface LayoutConfig {
  /** Layout sections to show */
  sections?: string[];
  
  /** Section order */
  sectionOrder?: string[];
  
  /** Custom CSS classes */
  cssClasses?: Record<string, string>;
  
  /** Responsive breakpoints */
  breakpoints?: Record<string, number>;
}

/**
 * Character sheet events
 */
export interface CharacterSheetEmits {
  /** Emitted when character data is updated */
  'update:character': [character: CharacterData];
  
  /** Emitted when a field is changed */
  'field-change': [field: string, value: unknown, oldValue: unknown];
  
  /** Emitted when validation fails */
  'validation-error': [errors: ValidationError[]];
  
  /** Emitted when character is saved */
  'save': [character: CharacterData];
  
  /** Emitted when save fails */
  'save-error': [error: string];
  
  /** Emitted when a dice roll is requested */
  'roll-dice': [rollType: string, data: Record<string, unknown>];
}

/**
 * Validation error
 */
export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

/**
 * Base character sheet component with comprehensive functionality
 */
export const BaseCharacterSheet = defineComponent({
  name: 'BaseCharacterSheet',
  
  props: {
    character: {
      type: Object as () => CharacterData,
      required: true
    },
    context: {
      type: Object as () => PluginContext,
      required: true
    },
    readonly: {
      type: Boolean,
      default: false
    },
    config: {
      type: Object as () => CharacterSheetConfig,
      default: () => ({})
    }
  },
  
  emits: {
    'update:character': (character: CharacterData) => !!character,
    'field-change': (field: string, value: unknown, oldValue: unknown) => !!field,
    'validation-error': (errors: ValidationError[]) => Array.isArray(errors),
    'save': (character: CharacterData) => !!character,
    'save-error': (error: string) => !!error,
    'roll-dice': (rollType: string, data: Record<string, unknown>) => !!rollType && !!data
  },
  
  setup(props, { emit }) {
    // Reactive state
    const loading = ref(false);
    const saving = ref(false);
    const errors = ref<ValidationError[]>([]);
    const isDirty = ref(false);
    const lastSaved = ref<Date | null>(null);
    
    // Local character copy for editing
    const localCharacter = reactive<CharacterData>({ ...props.character });
    
    // Auto-save timer
    let autoSaveTimer: NodeJS.Timeout | null = null;
    
    // Computed properties
    const isValid = computed(() => errors.value.filter(e => e.severity === 'error').length === 0);
    const hasWarnings = computed(() => errors.value.some(e => e.severity === 'warning'));
    const canSave = computed(() => !props.readonly && isDirty.value && isValid.value && !saving.value);
    
    // Watch for external character changes
    watch(() => props.character, (newCharacter) => {
      if (!isDirty.value) {
        Object.assign(localCharacter, newCharacter);
      }
    }, { deep: true });
    
    // Watch for local changes
    watch(localCharacter, (newChar, oldChar) => {
      if (oldChar && JSON.stringify(newChar) !== JSON.stringify(oldChar)) {
        isDirty.value = true;
        validateCharacter();
        
        // Setup auto-save
        if (props.config.autoSave && !props.readonly) {
          setupAutoSave();
        }
      }
    }, { deep: true });
    
    // Lifecycle
    onMounted(() => {
      validateCharacter();
      
      // Set up context event listeners
      const unsubscribes: (() => void)[] = [];
      
      // Listen for save commands
      unsubscribes.push(
        props.context.events.on('character:save', () => saveCharacter())
      );
      
      // Listen for reset commands
      unsubscribes.push(
        props.context.events.on('character:reset', () => resetCharacter())
      );
      
      // Cleanup on unmount
      onUnmounted(() => {
        unsubscribes.forEach(unsub => unsub());
        if (autoSaveTimer) {
          clearTimeout(autoSaveTimer);
        }
      });
    });
    
    // Methods
    const updateField = (field: string, value: unknown) => {
      if (props.readonly) return;
      
      const oldValue = getNestedValue(localCharacter, field);
      setNestedValue(localCharacter, field, value);
      
      (emit as any)('field-change', field, value, oldValue);
    };
    
    const validateCharacter = () => {
      const newErrors: ValidationError[] = [];
      const rules = props.config.validation;
      
      if (rules) {
        // Check required fields
        if (rules.required) {
          for (const field of rules.required) {
            const value = getNestedValue(localCharacter, field);
            if (value === undefined || value === null || value === '') {
              newErrors.push({
                field,
                message: `${field} is required`,
                severity: 'error'
              });
            }
          }
        }
        
        // Run field validators
        if (rules.validators) {
          for (const [field, validator] of Object.entries(rules.validators)) {
            const value = getNestedValue(localCharacter, field);
            const error = validator(value);
            if (error) {
              newErrors.push({
                field,
                message: error,
                severity: 'error'
              });
            }
          }
        }
        
        // Run cross-field validation
        if (rules.crossValidation) {
          const crossErrors = rules.crossValidation(localCharacter);
          newErrors.push(...crossErrors.map(message => ({
            field: 'general',
            message,
            severity: 'error' as const
          })));
        }
      }
      
      errors.value = newErrors;
      
      if (newErrors.length > 0) {
        (emit as any)('validation-error', newErrors);
      }
    };
    
    const saveCharacter = async () => {
      if (!canSave.value) return;
      
      try {
        saving.value = true;
        
        // Update the character through the API
        const savedCharacter = await props.context.api.actors.update(
          localCharacter.id,
          localCharacter
        );
        
        // Update local state
        Object.assign(localCharacter, savedCharacter);
        isDirty.value = false;
        lastSaved.value = new Date();
        
        (emit as any)('save', savedCharacter);
        (emit as any)('update:character', savedCharacter);
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Save failed';
        (emit as any)('save-error', errorMessage);
        throw error;
        
      } finally {
        saving.value = false;
      }
    };
    
    const resetCharacter = () => {
      Object.assign(localCharacter, props.character);
      isDirty.value = false;
      errors.value = [];
      validateCharacter();
    };
    
    const rollDice = (rollType: string, data: Record<string, unknown> = {}) => {
      (emit as any)('roll-dice', rollType, {
        character: localCharacter,
        ...data
      });
    };
    
    const setupAutoSave = () => {
      if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
      }
      
      const delay = props.config.autoSaveDelay || 2000;
      autoSaveTimer = setTimeout(() => {
        if (canSave.value) {
          saveCharacter().catch(error => {
            console.warn('Auto-save failed:', error);
          });
        }
      }, delay);
    };
    
    // Utility functions
    const getNestedValue = (obj: unknown, path: string): unknown => {
      return path.split('.').reduce((current, key) => {
        return current && typeof current === 'object' ? (current as Record<string, unknown>)[key] : undefined;
      }, obj);
    };
    
    const setNestedValue = (obj: Record<string, unknown>, path: string, value: unknown): void => {
      const keys = path.split('.');
      const lastKey = keys.pop()!;
      const target = keys.reduce((current, key) => {
        if (!current[key] || typeof current[key] !== 'object') {
          current[key] = {};
        }
        return current[key] as Record<string, unknown>;
      }, obj);
      target[lastKey] = value;
    };
    
    return {
      // State
      loading,
      saving,
      errors,
      isDirty,
      lastSaved,
      localCharacter,
      
      // Computed
      isValid,
      hasWarnings,
      canSave,
      
      // Methods
      updateField,
      validateCharacter,
      saveCharacter,
      resetCharacter,
      rollDice,
      
      // Utilities
      getNestedValue,
      setNestedValue
    };
  }
});

/**
 * Character sheet composable for use in other components
 */
export function useCharacterSheet(
  character: CharacterData,
  context: PluginContext,
  config: CharacterSheetConfig = {}
) {
  const localCharacter = reactive<CharacterData>({ ...character });
  const errors = ref<ValidationError[]>([]);
  const isDirty = ref(false);
  
  const updateField = (field: string, value: unknown) => {
    const keys = field.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      if (!current[key] || typeof current[key] !== 'object') {
        current[key] = {};
      }
      return current[key] as Record<string, unknown>;
    }, localCharacter as Record<string, unknown>);
    target[lastKey] = value;
    isDirty.value = true;
  };
  
  const validateCharacter = (): ValidationError[] => {
    const newErrors: ValidationError[] = [];
    const rules = config.validation;
    
    if (rules?.required) {
      for (const field of rules.required) {
        const value = field.split('.').reduce((current: unknown, key: string) => {
          return current && typeof current === 'object' ? (current as Record<string, unknown>)[key] : undefined;
        }, localCharacter as unknown);
        
        if (value === undefined || value === null || value === '') {
          newErrors.push({
            field,
            message: `${field} is required`,
            severity: 'error'
          });
        }
      }
    }
    
    errors.value = newErrors;
    return newErrors;
  };
  
  return {
    localCharacter,
    errors,
    isDirty,
    updateField,
    validateCharacter
  };
}