<template>
  <div class="plugin-container-wrapper">
    <!-- Plugin content isolation layer -->
    <div 
      class="plugin-content"
      :style="containerStyle"
    >
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  width?: number | string;
  height?: number | string;
  backgroundColor?: string;
}>();

// Convert dimensions to consistent units (pixels)
const containerStyle = computed(() => {
  const width = typeof props.width === 'number' ? `${props.width}px` : props.width || '100%';
  const height = typeof props.height === 'number' ? `${props.height}px` : props.height || '100%';
  const backgroundColor = props.backgroundColor || '#ffffff';
  
  return {
    width,
    height,
    backgroundColor,
  };
});
</script>

<style scoped>
.plugin-container-wrapper {
  /* Ensure plugin container doesn't inherit styles */
  position: relative;
  display: block;
  width: fit-content;
  height: fit-content;
  
  /* Create a containing block for the plugin */
  contain: layout style paint;
  isolation: isolate;
  
  /* Round corners and shadow for visual appeal */
  border-radius: 8px;
  box-shadow: 0 10px 25px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  overflow: hidden;
}

.plugin-content {
  /* CSS Reset for plugin content */
  /* Reset box model */
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  
  /* Reset typography */
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  font-size: 14px;
  font-weight: normal;
  line-height: 1.5;
  color: #000000;
  text-align: left;
  text-decoration: none;
  text-transform: none;
  letter-spacing: normal;
  
  /* Reset layout */
  position: relative;
  display: block;
  width: fit-content;
  height: fit-content;
  min-width: 0;
  min-height: 0;
  max-width: none;
  max-height: none;
  
  /* Reset borders and background */
  border: none;
  outline: none;
  background: transparent;
  
  /* Reset positioning */
  top: auto;
  right: auto;
  bottom: auto;
  left: auto;
  z-index: auto;
  
  /* Reset transforms and animations */
  transform: none;
  transition: none;
  animation: none;
  
  /* Reset flex and grid */
  flex: none;
  flex-basis: auto;
  flex-direction: row;
  flex-wrap: nowrap;
  justify-content: flex-start;
  align-items: stretch;
  align-content: stretch;
  order: 0;
  
  /* Reset table */
  border-collapse: separate;
  border-spacing: 0;
  caption-side: top;
  empty-cells: show;
  table-layout: auto;
  
  /* Reset list styles */
  list-style: none;
  
  /* Reset form elements */
  appearance: none;
  resize: none;
  
  /* Reset misc */
  opacity: 1;
  visibility: visible;
  overflow: visible;
  white-space: normal;
  word-wrap: normal;
  word-break: normal;
  cursor: auto;
  user-select: text;
  
  /* Ensure plugins can't escape this container */
  contain: layout style;
  overflow: auto;
}

/* Reset common element styles within the plugin container */
.plugin-content * {
  box-sizing: border-box;
}

.plugin-content *:before,
.plugin-content *:after {
  box-sizing: border-box;
}

/* Reset headings */
.plugin-content h1,
.plugin-content h2,
.plugin-content h3,
.plugin-content h4,
.plugin-content h5,
.plugin-content h6 {
  margin: 0;
  padding: 0;
  font-size: inherit;
  font-weight: inherit;
  line-height: inherit;
}

/* Reset paragraphs and text elements */
.plugin-content p,
.plugin-content span,
.plugin-content div,
.plugin-content section,
.plugin-content article,
.plugin-content aside,
.plugin-content nav,
.plugin-content header,
.plugin-content footer,
.plugin-content main {
  margin: 0;
  padding: 0;
}

/* Reset lists */
.plugin-content ul,
.plugin-content ol,
.plugin-content li {
  margin: 0;
  padding: 0;
  list-style: none;
}

/* Reset forms */
.plugin-content input,
.plugin-content textarea,
.plugin-content select,
.plugin-content button {
  margin: 0;
  padding: 0;
  border: none;
  background: transparent;
  font: inherit;
  color: inherit;
}

/* Reset tables */
.plugin-content table,
.plugin-content tr,
.plugin-content td,
.plugin-content th {
  margin: 0;
  padding: 0;
  border: none;
  border-spacing: 0;
}

/* Reset images and media */
.plugin-content img,
.plugin-content video,
.plugin-content audio,
.plugin-content canvas,
.plugin-content svg {
  margin: 0;
  padding: 0;
  border: none;
  vertical-align: baseline;
}
</style>