import { defineComponent, ref, computed, onMounted } from 'vue';
import type { PluginContext } from '../types/plugin.mjs';
import type { 
  GameMechanic, 
  DiceResult, 
  InitiativeResult, 
  AttackResult, 
  DamageResult,
  CharacterData 
} from '../types/mechanics-registry.mjs';

/**
 * Props for mechanics components
 */
export interface MechanicsProps {
  /** Plugin context */
  context: PluginContext;
  
  /** Mechanic type to use */
  mechanicType: string;
  
  /** Input parameters for the mechanic */
  parameters?: Record<string, unknown>;
  
  /** Component configuration */
  config?: MechanicsConfig;
}

/**
 * Mechanics component configuration
 */
export interface MechanicsConfig {
  /** Show detailed results */
  showDetails?: boolean;
  
  /** Auto-execute on mount */
  autoExecute?: boolean;
  
  /** Allow re-rolling */
  allowReroll?: boolean;
  
  /** Visual theme */
  theme?: 'default' | 'compact' | 'detailed';
  
  /** Animation settings */
  animations?: {
    enabled: boolean;
    duration: number;
    type: 'bounce' | 'fade' | 'slide';
  };
}

/**
 * Mechanics component events
 */
export interface MechanicsEmits {
  /** Emitted when mechanic is executed */
  'execute': [mechanicType: string, parameters: Record<string, unknown>];
  
  /** Emitted when result is available */
  'result': [result: MechanicResult];
  
  /** Emitted when execution fails */
  'error': [error: string];
  
  /** Emitted when mechanic is reset */
  'reset': [];
}

/**
 * Generic mechanic result
 */
export interface MechanicResult {
  type: string;
  success: boolean;
  data: DiceResult | InitiativeResult | AttackResult | DamageResult | Record<string, unknown>;
  timestamp: Date;
  parameters: Record<string, unknown>;
}

/**
 * Base mechanics component for handling game mechanics
 */
export const BaseMechanics = defineComponent({
  name: 'BaseMechanics',
  
  props: {
    context: {
      type: Object as () => PluginContext,
      required: true
    },
    mechanicType: {
      type: String,
      required: true
    },
    parameters: {
      type: Object as () => Record<string, unknown>,
      default: () => ({})
    },
    config: {
      type: Object as () => MechanicsConfig,
      default: () => ({})
    }
  },
  
  emits: {
    'execute': (mechanicType: string, parameters: Record<string, unknown>) => true,
    'result': (result: MechanicResult) => true,
    'error': (error: string) => true,
    'reset': () => true
  },
  
  setup(props, { emit }) {
    // Reactive state
    const loading = ref(false);
    const result = ref<MechanicResult | null>(null);
    const error = ref<string | null>(null);
    const executionHistory = ref<MechanicResult[]>([]);
    
    // Computed properties
    const mechanic = computed(() => {
      return props.context.store.get<GameMechanic>(`mechanic:${props.mechanicType}`);
    });
    
    const canExecute = computed(() => {
      return mechanic.value && !loading.value;
    });
    
    const hasResult = computed(() => {
      return result.value !== null;
    });
    
    const canReroll = computed(() => {
      return props.config.allowReroll !== false && hasResult.value && !loading.value;
    });
    
    // Lifecycle
    onMounted(() => {
      if (props.config.autoExecute) {
        executeMechanic();
      }
    });
    
    // Methods
    const executeMechanic = async () => {
      if (!canExecute.value) {
        const errorMsg = !mechanic.value 
          ? `Mechanic '${props.mechanicType}' not found`
          : 'Cannot execute mechanic while loading';
        
        error.value = errorMsg;
        emit('error', errorMsg);
        return;
      }
      
      try {
        loading.value = true;
        error.value = null;
        
        emit('execute', props.mechanicType, props.parameters);
        
        // Execute the mechanic based on its type
        const mechanicResult = await executeSpecificMechanic(
          mechanic.value!,
          props.mechanicType,
          props.parameters
        );
        
        const fullResult: MechanicResult = {
          type: props.mechanicType,
          success: true,
          data: mechanicResult as Record<string, unknown> | InitiativeResult | DiceResult | AttackResult | DamageResult,
          timestamp: new Date(),
          parameters: { ...props.parameters }
        };
        
        result.value = fullResult;
        executionHistory.value.push(fullResult);
        
        emit('result', fullResult);
        
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        error.value = errorMessage;
        emit('error', errorMessage);
        
        const failureResult: MechanicResult = {
          type: props.mechanicType,
          success: false,
          data: { error: errorMessage },
          timestamp: new Date(),
          parameters: { ...props.parameters }
        };
        
        result.value = failureResult;
        
      } finally {
        loading.value = false;
      }
    };
    
    const resetMechanic = () => {
      result.value = null;
      error.value = null;
      emit('reset');
    };
    
    const reroll = () => {
      if (canReroll.value) {
        executeMechanic();
      }
    };
    
    // Helper function to execute specific mechanic types
    const executeSpecificMechanic = async (
      mechanic: GameMechanic,
      type: string,
      parameters: Record<string, unknown>
    ): Promise<unknown> => {
      switch (type) {
        case 'dice':
          if ('roll' in mechanic && typeof mechanic.roll === 'function') {
            const expression = parameters.expression as string || '1d20';
            return mechanic.roll(expression);
          }
          break;
          
        case 'initiative':
          if ('rollInitiative' in mechanic && typeof mechanic.rollInitiative === 'function') {
            const character = parameters.character as CharacterData;
            return mechanic.rollInitiative(character);
          }
          break;
          
        case 'attack':
          if ('rollAttack' in mechanic && typeof mechanic.rollAttack === 'function') {
            const attacker = parameters.attacker as CharacterData;
            const weapon = parameters.weapon;
            const target = parameters.target as CharacterData | undefined;
            return (mechanic as any).rollAttack(attacker, weapon, target);
          }
          break;
          
        case 'damage':
          if ('rollDamage' in mechanic && typeof mechanic.rollDamage === 'function') {
            const attacker = parameters.attacker as CharacterData;
            const weapon = parameters.weapon;
            const target = parameters.target as CharacterData | undefined;
            return (mechanic as any).rollDamage(attacker, weapon, target);
          }
          break;
          
        case 'spell':
          if ('castSpell' in mechanic && typeof mechanic.castSpell === 'function') {
            const spell = parameters.spell;
            const caster = parameters.caster as CharacterData;
            const target = parameters.target as CharacterData | undefined;
            return (mechanic as any).castSpell(spell, caster, target);
          }
          break;
          
        default:
          // Generic execution for custom mechanics
          if ('execute' in mechanic && typeof mechanic.execute === 'function') {
            return (mechanic as any).execute(parameters);
          }
      }
      
      throw new Error(`Mechanic type '${type}' not supported by ${mechanic.id}`);
    };
    
    return {
      // State
      loading,
      result,
      error,
      executionHistory,
      
      // Computed
      mechanic,
      canExecute,
      hasResult,
      canReroll,
      
      // Methods
      executeMechanic,
      resetMechanic,
      reroll
    };
  }
});

/**
 * Dice rolling component
 */
export const DiceRoller = defineComponent({
  name: 'DiceRoller',
  
  props: {
    context: {
      type: Object as () => PluginContext,
      required: true
    },
    expression: {
      type: String,
      default: '1d20'
    },
    label: {
      type: String,
      default: 'Roll'
    },
    modifier: {
      type: Number,
      default: 0
    }
  },
  
  emits: {
    'roll': (result: DiceResult) => true
  },
  
  setup(props, { emit }) {
    const diceResult = ref<DiceResult | null>(null);
    const rolling = ref(false);
    
    const rollDice = async () => {
      const diceSystem = props.context.store.get<GameMechanic>('mechanic:dice');
      if (!diceSystem || !('roll' in diceSystem)) {
        console.error('Dice system not available');
        return;
      }
      
      try {
        rolling.value = true;
        
        let expression = props.expression;
        if (props.modifier !== 0) {
          const sign = props.modifier >= 0 ? '+' : '';
          expression += `${sign}${props.modifier}`;
        }
        
        const result = (diceSystem as any).roll(expression) as DiceResult;
        diceResult.value = result;
        emit('roll', result);
        
      } catch (error) {
        console.error('Dice roll failed:', error);
      } finally {
        rolling.value = false;
      }
    };
    
    return {
      diceResult,
      rolling,
      rollDice
    };
  }
});

/**
 * Initiative roller component
 */
export const InitiativeRoller = defineComponent({
  name: 'InitiativeRoller',
  
  props: {
    context: {
      type: Object as () => PluginContext,
      required: true
    },
    character: {
      type: Object as () => CharacterData,
      required: true
    }
  },
  
  emits: {
    'initiative': (result: InitiativeResult) => true
  },
  
  setup(props, { emit }) {
    const initiativeResult = ref<InitiativeResult | null>(null);
    const rolling = ref(false);
    
    const rollInitiative = async () => {
      const initiativeSystem = props.context.store.get<GameMechanic>('mechanic:initiative');
      if (!initiativeSystem || !('rollInitiative' in initiativeSystem)) {
        console.error('Initiative system not available');
        return;
      }
      
      try {
        rolling.value = true;
        
        const result = (initiativeSystem as any).rollInitiative(props.character) as InitiativeResult;
        initiativeResult.value = result;
        emit('initiative', result);
        
      } catch (error) {
        console.error('Initiative roll failed:', error);
      } finally {
        rolling.value = false;
      }
    };
    
    return {
      initiativeResult,
      rolling,
      rollInitiative
    };
  }
});

/**
 * Mechanics composable for use in other components
 */
export function useMechanics(context: PluginContext) {
  const rollDice = async (expression: string): Promise<DiceResult | null> => {
    const diceSystem = context.store.get<GameMechanic>('mechanic:dice');
    if (!diceSystem || !('roll' in diceSystem)) {
      console.error('Dice system not available');
      return null;
    }
    
    try {
      return (diceSystem as any).roll(expression) as DiceResult;
    } catch (error) {
      console.error('Dice roll failed:', error);
      return null;
    }
  };
  
  const rollInitiative = async (character: CharacterData): Promise<InitiativeResult | null> => {
    const initiativeSystem = context.store.get<GameMechanic>('mechanic:initiative');
    if (!initiativeSystem || !('rollInitiative' in initiativeSystem)) {
      console.error('Initiative system not available');
      return null;
    }
    
    try {
      return (initiativeSystem as any).rollInitiative(character) as InitiativeResult;
    } catch (error) {
      console.error('Initiative roll failed:', error);
      return null;
    }
  };
  
  const getMechanic = (type: string): GameMechanic | undefined => {
    return context.store.get<GameMechanic>(`mechanic:${type}`);
  };
  
  return {
    rollDice,
    rollInitiative,
    getMechanic
  };
}