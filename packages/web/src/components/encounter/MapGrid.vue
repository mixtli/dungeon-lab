<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch, Teleport } from 'vue';
import { SVG, Svg } from '@svgdotjs/svg.js';
import '@svgdotjs/svg.panzoom.js';
import { useMapStore } from '../../stores/map.mjs';
import { useEncounterStore } from '../../stores/encounter.mjs';
import { storeToRefs } from 'pinia';

const props = defineProps<{
  encounterId: string;
}>();

const mapStore = useMapStore();
const encounterStore = useEncounterStore();
const { currentEncounter } = storeToRefs(encounterStore);

const svgContainer = ref<HTMLDivElement | null>(null);
const draw = ref<Svg | null>(null);
const gridCells = ref<any[]>([]);
const isExpanded = ref(false);

// Watch for changes in the encounter's map
watch(() => currentEncounter.value?.mapId, async (newMapId) => {
  if (newMapId && typeof newMapId === 'string') {
    await loadMap(newMapId);
  }
}, { immediate: true });

// Load and render the map
async function loadMap(mapId: string) {
  try {
    await mapStore.fetchMap(mapId);
    if (mapStore.currentMap && svgContainer.value) {
      renderMap();
    }
  } catch (error) {
    console.error('Failed to load map:', error);
  }
}

// Round number to avoid SVG viewBox errors
function round(num: number): number {
  return Math.round(num * 1000) / 1000;
}

// Render the map with grid
function renderMap() {
  if (!mapStore.currentMap || !svgContainer.value) return;

  const { gridColumns, gridRows, imageUrl, aspectRatio } = mapStore.currentMap;
  console.log('Map data:', mapStore.currentMap); // Debug log

  // Clear previous SVG if it exists
  if (draw.value) {
    draw.value.remove();
  }
  gridCells.value = [];

  // Initialize SVG.js
  draw.value = SVG().addTo(svgContainer.value);

  // Set the SVG dimensions based on container width and aspect ratio
  const containerWidth = svgContainer.value.clientWidth;
  const svgWidth = round(containerWidth);
  const svgHeight = round(containerWidth / aspectRatio);

  // Calculate cell size based on grid dimensions
  const cellSize = round(svgWidth / gridColumns);

  // Calculate total dimensions
  const totalGridWidth = round(cellSize * gridColumns);
  const totalGridHeight = round(cellSize * gridRows);

  // Set initial viewbox and size - make SVG fill container while maintaining aspect ratio
  draw.value
    .size('100%', '100%')
    .viewbox(0, 0, totalGridWidth, totalGridHeight)
    .attr('preserveAspectRatio', 'xMidYMid meet');

  // Create a group for the map and grid
  const mapGroup = draw.value.group();

  // Add the map image as background
  if (imageUrl) {
    console.log('Loading map image:', imageUrl); // Debug log
    const image = mapGroup.image(imageUrl)
      .size(totalGridWidth, totalGridHeight);

    // Handle image load errors
    const imgElement = image.node as SVGImageElement;
    imgElement.addEventListener('error', (error) => {
      console.error('Failed to load map image:', error);
    });
  } else {
    console.error('No image URL provided for map');
  }

  // Create grid cells
  const gridGroup = mapGroup.group().attr('class', 'grid');
  
  for (let row = 0; row < gridRows; row++) {
    for (let col = 0; col < gridColumns; col++) {
      const cell = gridGroup.rect(cellSize, cellSize)
        .move(round(col * cellSize), round(row * cellSize))
        .fill('transparent')
        .stroke({ color: '#666', width: 1, opacity: 0.5 });

      // Store cell reference with its grid coordinates
      gridCells.value.push({
        element: cell,
        row,
        col,
      });

      // Add hover effect
      cell.on('mouseover', () => {
        cell.fill({ opacity: 0.2, color: '#666' });
      });

      cell.on('mouseout', () => {
        cell.fill('transparent');
      });

      // Add click handler for token placement (to be implemented)
      cell.on('click', () => {
        console.log('Cell clicked:', { row, col });
      });
    }
  }

  // Initialize panzoom with rounded values
  draw.value.panZoom({
    zoomMin: 0.5,
    zoomMax: 3,
    zoomFactor: 0.02, // Reduced for smoother zooming
    panning: true
  });

  // Add viewbox update handler
  draw.value.on('zoom', () => {
    const box = draw.value!.viewbox();
    draw.value!.viewbox(
      round(box.x),
      round(box.y),
      round(box.width),
      round(box.height)
    );
  });
}

// Handle window resize
function handleResize() {
  if (mapStore.currentMap) {
    renderMap();
  }
}

// Set up resize observer
onMounted(() => {
  if (svgContainer.value) {
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(svgContainer.value);

    // Clean up on unmount
    onUnmounted(() => {
      resizeObserver.disconnect();
    });
  }
});

// Function to toggle expanded state
function toggleExpanded() {
  isExpanded.value = !isExpanded.value;
  // Need to re-render after state change and animation
  setTimeout(() => {
    renderMap();
  }, 150);
}
</script>

<template>
  <div 
    v-if="!isExpanded"
    ref="svgContainer" 
    class="relative w-full h-full bg-gray-800 overflow-hidden"
  >
    <!-- Expand button -->
    <div class="absolute top-2 right-2 z-10">
      <button
        @click="toggleExpanded"
        class="p-2 rounded-lg bg-black/30 hover:bg-black/50 transition-colors"
        title="Expand map"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-white/70" viewBox="0 0 20 20" fill="currentColor">
          <path d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 11-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12zm-9 7a1 1 0 012 0v1.586l2.293-2.293a1 1 0 111.414 1.414L6.414 15H8a1 1 0 010 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 010-2h1.586l-2.293-2.293a1 1 0 111.414-1.414L15 13.586V12a1 1 0 011-1z" />
        </svg>
      </button>
    </div>
  </div>

  <!-- Teleport expanded view to body -->
  <Teleport to="body" v-if="isExpanded">
    <div 
      ref="svgContainer"
      class="fixed inset-0 w-screen h-screen bg-gray-800 overflow-hidden z-[9999]"
    >
      <!-- Contract button -->
      <div class="absolute top-2 right-2 z-10">
        <button
          @click="toggleExpanded"
          class="p-2 rounded-lg bg-black/30 hover:bg-black/50 transition-colors"
          title="Contract map"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-white/70" viewBox="0 0 20 20" fill="currentColor">
            <path d="M3 3a1 1 0 000 2h11v11a1 1 0 002 0V5a2 2 0 00-2-2H3zM19 17a1 1 0 01-1 1H5a2 2 0 01-2-2V7a1 1 0 012 0v9h13a1 1 0 011 1z" />
          </svg>
        </button>
      </div>
    </div>
  </Teleport>
</template> 