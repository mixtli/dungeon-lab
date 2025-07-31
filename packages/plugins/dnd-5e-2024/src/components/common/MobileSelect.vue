<template>
  <Listbox :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" :disabled="disabled">
    <div class="relative">
      <ListboxButton
        class="mobile-select-button"
        :class="{
          'mobile-select-button--disabled': disabled,
          'mobile-select-button--error': error
        }"
      >
        <span class="mobile-select-text">
          {{ displayValue || placeholder }}
        </span>
        <ChevronDownIcon class="mobile-select-icon" aria-hidden="true" />
      </ListboxButton>

      <transition
        leave-active-class="transition duration-100 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <ListboxOptions class="mobile-select-options">
          <ListboxOption
            v-slot="{ active, selected }"
            v-for="option in options"
            :key="getOptionValue(option)"
            :value="getOptionValue(option)"
            as="template"
          >
            <li
              class="mobile-select-option"
              :class="{
                'mobile-select-option--active': active,
                'mobile-select-option--selected': selected
              }"
            >
              <span class="mobile-select-option-text">
                {{ getOptionLabel(option) }}
              </span>
              <CheckIcon
                v-if="selected"
                class="mobile-select-check-icon"
                aria-hidden="true"
              />
            </li>
          </ListboxOption>
        </ListboxOptions>
      </transition>
    </div>
  </Listbox>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import {
  Listbox,
  ListboxButton,
  ListboxOptions,
  ListboxOption,
} from '@headlessui/vue';
import { ChevronDownIcon, CheckIcon } from '@heroicons/vue/20/solid';

interface Props {
  modelValue: string | number | null;
  options: Array<any>;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  valueKey?: string;
  labelKey?: string;
}

interface Emits {
  (e: 'update:modelValue', value: string | number | null): void;
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'Select an option...',
  disabled: false,
  error: false,
  valueKey: 'value',
  labelKey: 'label',
});

defineEmits<Emits>();

const getOptionValue = (option: any): string | number => {
  if (typeof option === 'string' || typeof option === 'number') {
    return option;
  }
  return option[props.valueKey];
};

const getOptionLabel = (option: any): string => {
  if (typeof option === 'string' || typeof option === 'number') {
    return String(option);
  }
  return option[props.labelKey];
};

const selectedOption = computed(() => {
  if (!props.modelValue) return null;
  return props.options.find(option => getOptionValue(option) === props.modelValue);
});

const displayValue = computed(() => {
  if (!selectedOption.value) return null;
  return getOptionLabel(selectedOption.value);
});
</script>

<style scoped>
/* Mobile-first select button */
.mobile-select-button {
  @apply relative w-full cursor-pointer rounded-lg bg-white py-3 pl-4 pr-10 text-left border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-gray-700;
  /* Prevent zoom on iOS */
  font-size: 16px;
}

@media (max-width: 640px) {
  .mobile-select-button {
    /* Larger touch targets on mobile */
    @apply py-4 text-lg;
    font-size: 16px !important;
  }
}

.mobile-select-button--disabled {
  @apply bg-gray-100 text-gray-400 cursor-not-allowed;
}

.mobile-select-button--error {
  @apply border-red-300 ring-red-500;
}

.mobile-select-text {
  @apply block truncate;
}

.mobile-select-icon {
  @apply pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 w-5 h-5 text-gray-400;
}

/* Mobile-optimized dropdown */
.mobile-select-options {
  @apply absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none;
}

/* Mobile-specific bottom sheet style */
@media (max-width: 640px) {
  .mobile-select-options {
    /* Full width bottom sheet on mobile */
    @apply fixed inset-x-0 bottom-0 top-auto mt-0 max-h-80 rounded-t-2xl rounded-b-none border-t border-gray-200;
    /* Slide up animation on mobile */
    transform-origin: bottom;
  }
  
  /* Add backdrop for mobile */
  .mobile-select-options::before {
    content: '';
    @apply fixed inset-0 bg-black bg-opacity-25 -z-10;
  }
  
  /* Add handle for mobile bottom sheet */
  .mobile-select-options::after {
    content: '';
    @apply absolute top-2 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-gray-300 rounded-full;
  }
}

.mobile-select-option {
  @apply relative cursor-pointer select-none py-3 pl-4 pr-10 text-gray-900;
}

@media (max-width: 640px) {
  .mobile-select-option {
    /* Larger touch targets on mobile */
    @apply py-4 text-lg;
  }
}

.mobile-select-option--active {
  @apply bg-blue-50 text-blue-900;
}

.mobile-select-option--selected {
  @apply bg-blue-100 font-semibold text-blue-900;
}

.mobile-select-option-text {
  @apply block truncate;
}

.mobile-select-check-icon {
  @apply absolute inset-y-0 right-0 flex items-center pr-4 w-5 h-5 text-blue-600;
}

/* Enhanced mobile animations */
@media (max-width: 640px) {
  /* Slide up from bottom */
  .v-enter-active {
    transition: transform 0.2s ease-out;
  }
  
  .v-enter-from {
    transform: translateY(100%);
  }
  
  .v-enter-to {
    transform: translateY(0);
  }
  
  .v-leave-active {
    transition: transform 0.2s ease-in;
  }
  
  .v-leave-from {
    transform: translateY(0);
  }
  
  .v-leave-to {
    transform: translateY(100%);
  }
}
</style>