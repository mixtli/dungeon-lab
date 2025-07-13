<script setup lang="ts">
import { ref, watch } from 'vue';
import { useSwipe } from '@vueuse/core';
import { TrashIcon } from '@heroicons/vue/24/outline';
import type { ICampaign } from '@dungeon-lab/shared/types/index.mjs';

defineProps<{ campaign: ICampaign }>();
defineEmits(['view', 'delete']);

const rowRef = ref(null);
const offsetX = ref(0);
const revealed = ref(false);
const { direction, isSwiping, lengthX } = useSwipe(rowRef, {
  threshold: 30,
  onSwipeEnd(e, dir) {
    if (dir === 'left' && Math.abs(lengthX.value) > 50) {
      offsetX.value = -80;
      revealed.value = true;
    } else {
      offsetX.value = 0;
      revealed.value = false;
    }
  },
  onSwipe() {
    if (direction.value === 'left') {
      offsetX.value = Math.max(-80, -Math.abs(lengthX.value));
    } else if (direction.value === 'right' && revealed.value) {
      offsetX.value = Math.min(0, 80 + lengthX.value);
    }
  },
});
function close() {
  offsetX.value = 0;
  revealed.value = false;
}
watch(isSwiping, (swiping) => {
  if (!swiping && !revealed.value) {
    offsetX.value = 0;
  }
});
</script>

<template>
  <div class="relative w-full overflow-hidden bg-white border-b border-gray-200 last:border-b-0">
    <div
      ref="rowRef"
      class="flex items-center bg-white w-full px-4 py-3 min-h-[56px] transition-transform duration-200 active:bg-gray-50 cursor-pointer"
      :style="{ transform: `translateX(${offsetX}px)` }"
      @click="$emit('view', campaign)"
    >
      <!-- Campaign content -->
      <div class="flex-1 flex items-center justify-between">
        <div class="flex-1 min-w-0">
          <div class="font-medium text-gray-900 truncate text-[17px]">
            {{ campaign.name }}
          </div>
          <div v-if="campaign.description" class="text-sm text-gray-500 truncate mt-1">
            {{ campaign.description }}
          </div>
        </div>
        
        <!-- iOS-style disclosure indicator -->
        <div class="ml-3 flex-shrink-0">
          <svg class="w-3 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M9 5l7 7-7 7"/>
          </svg>
        </div>
      </div>
    </div>
    
    <!-- Delete button revealed on swipe -->
    <button
      v-show="revealed"
      class="absolute right-0 top-0 h-full w-20 bg-red-600 text-white flex items-center justify-center"
      @click.stop="$emit('delete', campaign); close();"
    >
      <TrashIcon class="w-6 h-6" />
    </button>
  </div>
</template> 