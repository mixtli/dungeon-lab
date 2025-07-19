import { defineComponent, ref, computed, h } from 'vue';

/**
 * Shared UI component library for plugins
 */

/**
 * Plugin button component with consistent styling
 */
export const PluginButton = defineComponent({
  name: 'PluginButton',
  
  props: {
    variant: {
      type: String as () => 'primary' | 'secondary' | 'danger' | 'ghost',
      default: 'primary'
    },
    size: {
      type: String as () => 'sm' | 'md' | 'lg',
      default: 'md'
    },
    disabled: {
      type: Boolean,
      default: false
    },
    loading: {
      type: Boolean,
      default: false
    },
    icon: {
      type: String,
      default: ''
    },
    type: {
      type: String as () => 'button' | 'submit' | 'reset',
      default: 'button'
    }
  },
  
  emits: {
    'click': (event: MouseEvent) => true
  },
  
  setup(props, { emit, slots }) {
    const buttonClasses = computed(() => {
      const base = 'inline-flex items-center justify-center font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';
      
      const variants = {
        primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
        secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500',
        danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
        ghost: 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:ring-gray-500'
      };
      
      const sizes = {
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-4 py-2 text-sm',
        lg: 'px-6 py-3 text-base'
      };
      
      const disabled = props.disabled || props.loading ? 'opacity-50 cursor-not-allowed' : '';
      
      return `${base} ${variants[props.variant]} ${sizes[props.size]} ${disabled}`;
    });
    
    const handleClick = (event: MouseEvent) => {
      if (!props.disabled && !props.loading) {
        emit('click', event);
      }
    };
    
    return () => {
      const children = [];
      
      if (props.loading) {
        children.push(
          h('svg', {
            class: 'animate-spin -ml-1 mr-2 h-4 w-4',
            fill: 'none',
            viewBox: '0 0 24 24'
          }, [
            h('circle', {
              class: 'opacity-25',
              cx: '12',
              cy: '12',
              r: '10',
              stroke: 'currentColor',
              'stroke-width': '4'
            }),
            h('path', {
              class: 'opacity-75',
              fill: 'currentColor',
              d: 'M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z'
            })
          ])
        );
      }
      
      if (props.icon && !props.loading) {
        children.push(
          h('span', { class: 'mr-2' }, props.icon)
        );
      }
      
      if (slots.default) {
        children.push(slots.default());
      }
      
      return h('button', {
        type: props.type,
        class: buttonClasses.value,
        disabled: props.disabled || props.loading,
        onClick: handleClick
      }, children);
    };
  }
});

/**
 * Plugin input component with validation
 */
export const PluginInput = defineComponent({
  name: 'PluginInput',
  
  props: {
    modelValue: {
      type: [String, Number],
      default: ''
    },
    type: {
      type: String as () => 'text' | 'number' | 'email' | 'password' | 'search',
      default: 'text'
    },
    placeholder: {
      type: String,
      default: ''
    },
    label: {
      type: String,
      default: ''
    },
    error: {
      type: String,
      default: ''
    },
    disabled: {
      type: Boolean,
      default: false
    },
    required: {
      type: Boolean,
      default: false
    },
    min: {
      type: Number,
      default: undefined
    },
    max: {
      type: Number,
      default: undefined
    },
    step: {
      type: Number,
      default: undefined
    }
  },
  
  emits: {
    'update:modelValue': (value: string | number) => true,
    'blur': (event: FocusEvent) => true,
    'focus': (event: FocusEvent) => true
  },
  
  setup(props, { emit }) {
    const inputId = ref(`plugin-input-${Math.random().toString(36).substr(2, 9)}`);
    
    const inputClasses = computed(() => {
      const base = 'block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm';
      const error = props.error ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : '';
      const disabled = props.disabled ? 'bg-gray-100 cursor-not-allowed' : '';
      
      return `${base} ${error} ${disabled}`;
    });
    
    const handleInput = (event: Event) => {
      const target = event.target as HTMLInputElement;
      const value = props.type === 'number' ? Number(target.value) : target.value;
      emit('update:modelValue', value);
    };
    
    return () => {
      const children = [];
      
      if (props.label) {
        const labelChildren: any[] = [props.label];
        if (props.required) {
          labelChildren.push(h('span', { class: 'text-red-500 ml-1' }, '*'));
        }
        children.push(
          h('label', {
            for: inputId.value,
            class: 'block text-sm font-medium text-gray-700'
          }, labelChildren)
        );
      }
      
      children.push(
        h('input', {
          id: inputId.value,
          type: props.type,
          value: props.modelValue,
          placeholder: props.placeholder,
          disabled: props.disabled,
          required: props.required,
          min: props.min,
          max: props.max,
          step: props.step,
          class: inputClasses.value,
          onInput: handleInput,
          onBlur: (e: FocusEvent) => emit('blur', e),
          onFocus: (e: FocusEvent) => emit('focus', e)
        })
      );
      
      if (props.error) {
        children.push(
          h('p', { class: 'text-sm text-red-600' }, props.error)
        );
      }
      
      return h('div', { class: 'space-y-1' }, children);
    };
  }
});

/**
 * Plugin select component
 */
export const PluginSelect = defineComponent({
  name: 'PluginSelect',
  
  props: {
    modelValue: {
      type: [String, Number],
      default: ''
    },
    options: {
      type: Array as () => Array<{ value: string | number; label: string; disabled?: boolean }>,
      required: true
    },
    label: {
      type: String,
      default: ''
    },
    placeholder: {
      type: String,
      default: 'Select an option'
    },
    error: {
      type: String,
      default: ''
    },
    disabled: {
      type: Boolean,
      default: false
    },
    required: {
      type: Boolean,
      default: false
    }
  },
  
  emits: {
    'update:modelValue': (value: string | number) => true,
    'change': (value: string | number) => true
  },
  
  setup(props, { emit }) {
    const selectId = ref(`plugin-select-${Math.random().toString(36).substr(2, 9)}`);
    
    const selectClasses = computed(() => {
      const base = 'block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm';
      const error = props.error ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : '';
      const disabled = props.disabled ? 'bg-gray-100 cursor-not-allowed' : '';
      
      return `${base} ${error} ${disabled}`;
    });
    
    const handleChange = (event: Event) => {
      const target = event.target as HTMLSelectElement;
      const value = target.value;
      emit('update:modelValue', value);
      emit('change', value);
    };
    
    return () => {
      const children = [];
      
      if (props.label) {
        const labelChildren: any[] = [props.label];
        if (props.required) {
          labelChildren.push(h('span', { class: 'text-red-500 ml-1' }, '*'));
        }
        children.push(
          h('label', {
            for: selectId.value,
            class: 'block text-sm font-medium text-gray-700'
          }, labelChildren)
        );
      }
      
      const selectChildren = [];
      
      if (props.placeholder) {
        selectChildren.push(
          h('option', { value: '', disabled: true }, props.placeholder)
        );
      }
      
      selectChildren.push(...props.options.map((option) =>
        h('option', {
          key: option.value,
          value: option.value,
          disabled: option.disabled
        }, option.label)
      ));
      
      children.push(
        h('select', {
          id: selectId.value,
          value: props.modelValue,
          disabled: props.disabled,
          required: props.required,
          class: selectClasses.value,
          onChange: handleChange
        }, selectChildren)
      );
      
      if (props.error) {
        children.push(
          h('p', { class: 'text-sm text-red-600' }, props.error)
        );
      }
      
      return h('div', { class: 'space-y-1' }, children);
    };
  }
});

/**
 * Plugin card component
 */
export const PluginCard = defineComponent({
  name: 'PluginCard',
  
  props: {
    title: {
      type: String,
      default: ''
    },
    description: {
      type: String,
      default: ''
    },
    padding: {
      type: String as () => 'none' | 'sm' | 'md' | 'lg',
      default: 'md'
    },
    shadow: {
      type: String as () => 'none' | 'sm' | 'md' | 'lg',
      default: 'md'
    },
    border: {
      type: Boolean,
      default: true
    }
  },
  
  setup(props, { slots }) {
    const cardClasses = computed(() => {
      const base = 'bg-white rounded-lg';
      
      const shadows = {
        none: '',
        sm: 'shadow-sm',
        md: 'shadow-md',
        lg: 'shadow-lg'
      };
      
      const paddings = {
        none: '',
        sm: 'p-3',
        md: 'p-4',
        lg: 'p-6'
      };
      
      const border = props.border ? 'border border-gray-200' : '';
      
      return `${base} ${shadows[props.shadow]} ${paddings[props.padding]} ${border}`;
    });
    
    return () => {
      const children = [];
      
      if (props.title || props.description) {
        const headerChildren = [];
        
        if (props.title) {
          headerChildren.push(
            h('h3', { class: 'text-lg font-medium text-gray-900 mb-2' }, props.title)
          );
        }
        
        if (props.description) {
          headerChildren.push(
            h('p', { class: 'text-sm text-gray-600' }, props.description)
          );
        }
        
        children.push(
          h('div', { class: 'mb-4' }, headerChildren)
        );
      }
      
      if (slots.default) {
        children.push(slots.default());
      }
      
      return h('div', { class: cardClasses.value }, children);
    };
  }
});

/**
 * Plugin loading spinner
 */
export const PluginSpinner = defineComponent({
  name: 'PluginSpinner',
  
  props: {
    size: {
      type: String as () => 'sm' | 'md' | 'lg',
      default: 'md'
    },
    color: {
      type: String as () => 'blue' | 'gray' | 'green' | 'red',
      default: 'blue'
    }
  },
  
  setup(props) {
    const spinnerClasses = computed(() => {
      const sizes = {
        sm: 'h-4 w-4',
        md: 'h-6 w-6',
        lg: 'h-8 w-8'
      };
      
      const colors = {
        blue: 'text-blue-600',
        gray: 'text-gray-600',
        green: 'text-green-600',
        red: 'text-red-600'
      };
      
      return `animate-spin ${sizes[props.size]} ${colors[props.color]}`;
    });
    
    return () => {
      return h('svg', {
        class: spinnerClasses.value,
        fill: 'none',
        viewBox: '0 0 24 24'
      }, [
        h('circle', {
          class: 'opacity-25',
          cx: '12',
          cy: '12',
          r: '10',
          stroke: 'currentColor',
          'stroke-width': '4'
        }),
        h('path', {
          class: 'opacity-75',
          fill: 'currentColor',
          d: 'M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z'
        })
      ]);
    };
  }
});

/**
 * Plugin alert/notification component
 */
export const PluginAlert = defineComponent({
  name: 'PluginAlert',
  
  props: {
    type: {
      type: String as () => 'info' | 'success' | 'warning' | 'error',
      default: 'info'
    },
    title: {
      type: String,
      default: ''
    },
    message: {
      type: String,
      default: ''
    },
    dismissible: {
      type: Boolean,
      default: false
    }
  },
  
  emits: {
    'dismiss': () => true
  },
  
  setup(props, { emit, slots }) {
    const visible = ref(true);
    
    const alertClasses = computed(() => {
      const base = 'rounded-md p-4';
      
      const types = {
        info: 'bg-blue-50 border border-blue-200',
        success: 'bg-green-50 border border-green-200',
        warning: 'bg-yellow-50 border border-yellow-200',
        error: 'bg-red-50 border border-red-200'
      };
      
      return `${base} ${types[props.type]}`;
    });
    
    const textClasses = computed(() => {
      const types = {
        info: 'text-blue-800',
        success: 'text-green-800',
        warning: 'text-yellow-800',
        error: 'text-red-800'
      };
      
      return types[props.type];
    });
    
    const handleDismiss = () => {
      visible.value = false;
      emit('dismiss');
    };
    
    return () => {
      if (!visible.value) return null;
      
      const contentChildren = [];
      
      if (props.title) {
        contentChildren.push(
          h('h3', {
            class: `text-sm font-medium ${textClasses.value} mb-1`
          }, props.title)
        );
      }
      
      if (props.message || slots.default) {
        contentChildren.push(
          h('div', {
            class: `text-sm ${textClasses.value}`
          }, props.message || (slots.default ? slots.default() : ''))
        );
      }
      
      const flexChildren = [
        h('div', { class: 'flex-1' }, contentChildren)
      ];
      
      if (props.dismissible) {
        flexChildren.push(
          h('div', { class: 'ml-3' }, [
            h('button', {
              type: 'button',
              class: `-mx-1.5 -my-1.5 rounded-md p-1.5 inline-flex items-center justify-center ${textClasses.value} hover:bg-opacity-20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent`,
              onClick: handleDismiss
            }, [
              h('span', { class: 'sr-only' }, 'Dismiss'),
              h('svg', {
                class: 'h-3 w-3',
                fill: 'currentColor',
                viewBox: '0 0 20 20'
              }, [
                h('path', {
                  'fill-rule': 'evenodd',
                  d: 'M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z',
                  'clip-rule': 'evenodd'
                })
              ])
            ])
          ])
        );
      }
      
      return h('div', { class: alertClasses.value }, [
        h('div', { class: 'flex' }, flexChildren)
      ]);
    };
  }
});