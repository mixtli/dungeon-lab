<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router';
import DocumentSheetContainer from '../components/common/DocumentSheetContainer.vue';

const route = useRoute();
const router = useRouter();
const characterId = route.params.id as string;
</script>

<template>
  <div class="character-sheet-standalone">
    <DocumentSheetContainer
      :show="true"
      :document-id="characterId"
      :document-type="'character'"
      :context="'admin'"
      :readonly="false"
      @close="router.push('/')"
    />
  </div>
</template>

<style scoped>
/* Standalone Mode Styles */
.character-sheet-standalone {
  width: 100%;
  min-height: 100%;
  display: flex;
  flex-direction: column;
  background: #f5f5f5;
  overflow: hidden;
}

/* Character Sheet Width Constraints for Standalone Mode */
.character-sheet-standalone :deep(.dnd5e-character-sheet) {
  max-width: 100%;
  width: 100%;
  box-sizing: border-box;
  /* Override the problematic min-width that causes overflow */
  min-width: 0;
}

.character-sheet-standalone :deep(.character-sheet-container) {
  max-width: 100%;
  box-sizing: border-box;
}
</style>