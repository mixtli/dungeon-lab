<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue';
import { SVG, Svg } from '@svgdotjs/svg.js';
import '@svgdotjs/svg.panzoom.js';
import { useMapStore } from '../../stores/map.mjs';
import { useEncounterStore } from '../../stores/encounter.mjs';
import { storeToRefs } from 'pinia';

const { width, height } = defineProps<{
  width: number;
  height: number;
}>();

const mapStore = useMapStore();
const encounterStore = useEncounterStore();
const { currentEncounter } = storeToRefs(encounterStore);

const svgContainer = ref<HTMLDivElement | null>(null);
const draw = ref<Svg | null>(null);
const gridCells = ref<any[]>([]);
const isExpanded = ref(false);
const containerWidth = ref(800);
const aspectRatio = width / height;
const svgWidth = round(containerWidth.value);
const svgHeight = round(containerWidth.value / aspectRatio);

// Watch for changes in the encounter's map
watch(
  () => currentEncounter.value?.mapId,
  async newMapId => {
    if (newMapId && typeof newMapId === 'string') {
      await loadMap(newMapId);
    }
  },
  { immediate: true }
);

// Load and render the map
async function loadMap(mapId: string) {
  try {
    await mapStore.fetchMap(mapId);
    if (mapStore.currentMap && svgContainer.value) {
      renderMap();
      // Update grid cells if available
      if (currentEncounter.value && 'map' in currentEncounter.value) {
        const encounter = currentEncounter.value as { map?: { cells?: any[] } };
        if (encounter.map?.cells) {
          gridCells.value = encounter.map.cells;
        }
      }
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

  const { gridColumns, gridRows, image } = mapStore.currentMap;
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
  if (image.url) {
    console.log('Loading map image:', image.url); // Debug log
    mapGroup.image(image.url).size(totalGridWidth, totalGridHeight);
  }

  // Create grid cells
  const gridGroup = mapGroup.group().attr('class', 'grid');

  for (let row = 0; row < gridRows; row++) {
    for (let col = 0; col < gridColumns; col++) {
      const cell = gridGroup
        .rect(cellSize, cellSize)
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
    panning: true,
  });

  // Add viewbox update handler
  draw.value.on('zoom', () => {
    const box = draw.value!.viewbox();
    draw.value!.viewbox(round(box.x), round(box.y), round(box.width), round(box.height));
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
  <div class="map-grid" ref="gridContainer">
    <svg :width="svgWidth" :height="svgHeight" viewBox="0 0 100 100" class="border border-gray-300">
      <!-- Grid lines -->
      <g>
        <!-- Vertical lines -->
        <line
          v-for="x in 10"
          :key="`v-${x}`"
          :x1="x * 10"
          :y1="0"
          :x2="x * 10"
          :y2="100"
          stroke="#ddd"
          stroke-width="0.5"
        />
        <!-- Horizontal lines -->
        <line
          v-for="y in 10"
          :key="`h-${y}`"
          :x1="0"
          :y1="y * 10"
          :x2="100"
          :y2="y * 10"
          stroke="#ddd"
          stroke-width="0.5"
        />
      </g>
    </svg>
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
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5 text-white/70"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              d="M3 3a1 1 0 000 2h11v11a1 1 0 002 0V5a2 2 0 00-2-2H3zM19 17a1 1 0 01-1 1H5a2 2 0 01-2-2V7a1 1 0 012 0v9h13a1 1 0 011 1z"
            />
          </svg>
        </button>
      </div>
    </div>
  </Teleport>
</template>
