<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  modelValue: string;
  placeholder?: string;
  disabled?: boolean;
  rows?: number;
  error?: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'submit'): void;
}>();

const updateValue = (event: Event) => {
  const target = event.target as HTMLTextAreaElement;
  emit('update:modelValue', target.value);
};

const handleKeyDown = (event: KeyboardEvent) => {
  // Submit on Ctrl+Enter or Cmd+Enter
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    event.preventDefault();
    emit('submit');
  }
};

const computedRows = computed(() => props.rows || 3);
</script>

<template>
  <div class="space-y-2">
    <label v-if="$slots.label" class="block text-sm font-medium text-gray-700">
      <slot name="label">Edit Instructions</slot>
    </label>
    
    <div class="relative">
      <textarea
        :value="modelValue"
        :placeholder="placeholder || 'Enter edit instructions...'"
        :rows="computedRows"
        :disabled="disabled"
        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:bg-gray-100"
        @input="updateValue"
        @keydown="handleKeyDown"
      ></textarea>
      
      <div v-if="$slots.hint" class="mt-1 text-sm text-gray-500">
        <slot name="hint"></slot>
      </div>
      
      <div v-if="error" class="mt-1 text-sm text-red-600">
        {{ error }}
      </div>
    </div>
    
    <div v-if="$slots.default" class="flex justify-end">
      <slot></slot>
    </div>
  </div>
</template> 