<script setup lang="ts">
import { ref, computed, nextTick, watch, onMounted, onUnmounted } from 'vue';
import { useMentions, type ChatContext } from '../../composables/useMentions.mjs';
import type { MentionSuggestion } from '@dungeon-lab/shared/types/chat.mjs';

interface Props {
  modelValue: string;
  placeholder?: string;
  chatContexts: ChatContext[];
  disabled?: boolean;
}

interface Emits {
  (e: 'update:modelValue', value: string): void;
  (e: 'submit'): void;
  (e: 'keydown', event: KeyboardEvent): void;
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'Type your message...',
  disabled: false
});

const emit = defineEmits<Emits>();

const inputRef = ref<HTMLInputElement>();
const suggestionsRef = ref<HTMLElement>();
const showSuggestions = ref(false);
const selectedSuggestionIndex = ref(-1);
const cursorPosition = ref(0);

const { 
  findMentionSuggestions, 
  replaceMentionInContent 
} = useMentions(computed(() => props.chatContexts));

// Current mention being typed
const currentMention = ref<{
  query: string;
  startIndex: number;
  endIndex: number;
} | null>(null);

// Filtered suggestions based on current mention
const filteredSuggestions = computed((): MentionSuggestion[] => {
  if (!currentMention.value) return [];
  return findMentionSuggestions(currentMention.value.query);
});

// Handle input changes
const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const value = target.value;
  cursorPosition.value = target.selectionStart || 0;
  
  emit('update:modelValue', value);
  updateMentionState(value, cursorPosition.value);
};

// Update mention state based on cursor position
const updateMentionState = (content: string, cursor: number) => {
  const beforeCursor = content.substring(0, cursor);
  const mentionMatch = beforeCursor.match(/@(\w*)$/);
  
  if (mentionMatch) {
    currentMention.value = {
      query: mentionMatch[1],
      startIndex: mentionMatch.index!,
      endIndex: cursor
    };
    showSuggestions.value = true;
    selectedSuggestionIndex.value = -1;
  } else {
    currentMention.value = null;
    showSuggestions.value = false;
    selectedSuggestionIndex.value = -1;
  }
};

// Handle cursor position changes
const handleSelectionChange = () => {
  if (!inputRef.value) return;
  cursorPosition.value = inputRef.value.selectionStart || 0;
  updateMentionState(props.modelValue, cursorPosition.value);
};

// Handle key navigation in suggestions
const handleKeyDown = (event: KeyboardEvent) => {
  if (!showSuggestions.value || filteredSuggestions.value.length === 0) {
    if (event.key === 'Enter') {
      emit('submit');
    }
    emit('keydown', event);
    return;
  }

  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault();
      selectedSuggestionIndex.value = Math.min(
        selectedSuggestionIndex.value + 1,
        filteredSuggestions.value.length - 1
      );
      scrollToSelectedSuggestion();
      break;
      
    case 'ArrowUp':
      event.preventDefault();
      selectedSuggestionIndex.value = Math.max(selectedSuggestionIndex.value - 1, -1);
      scrollToSelectedSuggestion();
      break;
      
    case 'Enter':
    case 'Tab':
      event.preventDefault();
      if (selectedSuggestionIndex.value >= 0) {
        selectSuggestion(filteredSuggestions.value[selectedSuggestionIndex.value]);
      } else if (filteredSuggestions.value.length > 0) {
        selectSuggestion(filteredSuggestions.value[0]);
      }
      break;
      
    case 'Escape':
      event.preventDefault();
      showSuggestions.value = false;
      selectedSuggestionIndex.value = -1;
      break;
      
    default:
      emit('keydown', event);
  }
};

// Select a suggestion
const selectSuggestion = (suggestion: MentionSuggestion) => {
  if (!currentMention.value) return;
  
  const mentionText = suggestion.name.includes(' ') 
    ? `@"${suggestion.name}"` 
    : `@${suggestion.name}`;
  
  const { content, newCursorPosition } = replaceMentionInContent(
    props.modelValue,
    currentMention.value.startIndex,
    currentMention.value.endIndex,
    mentionText + ' '
  );
  
  emit('update:modelValue', content);
  showSuggestions.value = false;
  selectedSuggestionIndex.value = -1;
  currentMention.value = null;
  
  // Set cursor position after the mention
  nextTick(() => {
    if (inputRef.value) {
      inputRef.value.setSelectionRange(newCursorPosition, newCursorPosition);
      inputRef.value.focus();
    }
  });
};

// Scroll to selected suggestion
const scrollToSelectedSuggestion = () => {
  nextTick(() => {
    if (!suggestionsRef.value) return;
    
    const selectedElement = suggestionsRef.value.children[selectedSuggestionIndex.value] as HTMLElement;
    if (selectedElement) {
      selectedElement.scrollIntoView({ block: 'nearest' });
    }
  });
};

// Handle clicks outside to close suggestions
const handleClickOutside = (event: Event) => {
  if (!inputRef.value?.contains(event.target as Node) && 
      !suggestionsRef.value?.contains(event.target as Node)) {
    showSuggestions.value = false;
  }
};

// Get icon for suggestion type
const getIconForType = (type: string) => {
  switch (type) {
    case 'user': return '👤';
    case 'actor': return '🎭';
    case 'bot': return '🤖';
    default: return '👤';
  }
};

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
  if (inputRef.value) {
    inputRef.value.addEventListener('selectionchange', handleSelectionChange);
  }
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
  if (inputRef.value) {
    inputRef.value.removeEventListener('selectionchange', handleSelectionChange);
  }
});

// Watch for external value changes
watch(() => props.modelValue, (newValue) => {
  if (inputRef.value && inputRef.value.value !== newValue) {
    updateMentionState(newValue, cursorPosition.value);
  }
});

// Focus method for parent components
const focus = () => {
  inputRef.value?.focus();
};

defineExpose({
  focus
});
</script>

<template>
  <div class="relative">
    <!-- Input Field -->
    <input
      ref="inputRef"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      @input="handleInput"
      @keydown="handleKeyDown"
      @click="handleSelectionChange"
      type="text"
      class="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
    />
    
    <!-- Mention Suggestions Dropdown -->
    <div
      v-if="showSuggestions && filteredSuggestions.length > 0"
      ref="suggestionsRef"
      class="absolute bottom-full left-0 right-0 mb-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto z-50"
    >
      <div
        v-for="(suggestion, index) in filteredSuggestions"
        :key="suggestion.id"
        @click="selectSuggestion(suggestion)"
        :class="[
          'px-3 py-2 cursor-pointer flex items-center gap-2 text-sm',
          index === selectedSuggestionIndex
            ? 'bg-blue-100 text-blue-900'
            : 'hover:bg-gray-100'
        ]"
      >
        <span class="text-lg">{{ getIconForType(suggestion.type) }}</span>
        <div class="flex-1">
          <div class="font-medium">{{ suggestion.name }}</div>
          <div class="text-xs text-gray-500 capitalize">{{ suggestion.type }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Custom scrollbar for suggestions */
.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style> 