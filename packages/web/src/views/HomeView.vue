<script setup lang="ts">
import { RouterLink } from 'vue-router';
// Home view component
</script>

<template>
  <div class="home-view">
    <div class="hero-section">
      <div class="container mx-auto px-4 py-16 md:py-24">
        <div class="text-center">
          <h1 class="text-4xl md:text-5xl font-bold mb-6">Welcome to Dungeon Lab</h1>
          <p class="text-xl mb-8 max-w-3xl mx-auto">
            The ultimate virtual tabletop for your tabletop role-playing games. Create characters, join games, and embark on epic adventures with friends.
          </p>
          <div class="flex flex-wrap justify-center gap-4">
            <RouterLink to="/register" class="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700">
              Get Started
            </RouterLink>
            <RouterLink to="/login" class="inline-flex items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50">
              Sign In
            </RouterLink>
          </div>
        </div>
      </div>
    </div>

    <div class="features-section py-16 bg-gray-50 dark:bg-gray-800">
      <div class="container mx-auto px-4">
        <h2 class="text-3xl font-bold text-center mb-12">Features</h2>
        
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <!-- Feature Card 1 -->
          <div class="feature-card bg-white dark:bg-gray-700 rounded-lg shadow-lg p-6 flex flex-col">
            <h3 class="text-2xl font-bold mb-4 text-primary-600">Create Your Hero</h3>
            <div class="mb-4 relative aspect-video">
              <img src="/images/features/character-sheet.png" alt="Character Sheet" class="rounded-lg shadow w-full h-full object-cover">
            </div>
            <div class="flex-grow">
              <h4 class="text-xl font-semibold mb-2">Character Creation</h4>
              <p class="mb-4 text-gray-600 dark:text-gray-300">Create and customize characters with our intuitive character builder. Track stats, inventory, and abilities with beautiful digital character sheets.</p>
              <ul class="space-y-2 text-gray-600 dark:text-gray-300">
                <li class="flex items-center">
                  <span class="mr-2">•</span>
                  Support for multiple game systems
                </li>
                <li class="flex items-center">
                  <span class="mr-2">•</span>
                  Automated calculations
                </li>
                <li class="flex items-center">
                  <span class="mr-2">•</span>
                  Digital dice rolling
                </li>
              </ul>
            </div>
          </div>

          <!-- Feature Card 2 -->
          <div class="feature-card bg-white dark:bg-gray-700 rounded-lg shadow-lg p-6 flex flex-col">
            <h3 class="text-2xl font-bold mb-4 text-primary-600">Design Your World</h3>
            <div class="mb-4 relative aspect-video">
              <img src="/images/features/map-builder.png" alt="Map Builder" class="rounded-lg shadow w-full h-full object-cover">
            </div>
            <div class="flex-grow">
              <h4 class="text-xl font-semibold mb-2">Map Builder</h4>
              <p class="mb-4 text-gray-600 dark:text-gray-300">Design intricate dungeons and detailed terrain for your campaigns. Create immersive battle maps with our powerful map editor.</p>
              <ul class="space-y-2 text-gray-600 dark:text-gray-300">
                <li class="flex items-center">
                  <span class="mr-2">•</span>
                  Drag-and-drop placement
                </li>
                <li class="flex items-center">
                  <span class="mr-2">•</span>
                  Dynamic lighting
                </li>
                <li class="flex items-center">
                  <span class="mr-2">•</span>
                  Asset library
                </li>
              </ul>
            </div>
          </div>

          <!-- Feature Card 3 -->
          <div class="feature-card bg-white dark:bg-gray-700 rounded-lg shadow-lg p-6 flex flex-col">
            <h3 class="text-2xl font-bold mb-4 text-primary-600">Master the Battle</h3>
            <div class="mb-4 relative aspect-video">
              <img src="/images/features/encounter.png" alt="Encounter Runner" class="rounded-lg shadow w-full h-full object-cover">
            </div>
            <div class="flex-grow">
              <h4 class="text-xl font-semibold mb-2">Encounter Runner</h4>
              <p class="mb-4 text-gray-600 dark:text-gray-300">Run dynamic combat encounters with integrated initiative tracking, token movement, and automated calculations.</p>
              <ul class="space-y-2 text-gray-600 dark:text-gray-300">
                <li class="flex items-center">
                  <span class="mr-2">•</span>
                  Initiative tracking
                </li>
                <li class="flex items-center">
                  <span class="mr-2">•</span>
                  Status effects
                </li>
                <li class="flex items-center">
                  <span class="mr-2">•</span>
                  Monster integration
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.hero-section {
  background: linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.7)), url('/images/hero-bg.jpg');
  background-size: cover;
  background-position: center;
  color: white;
}

.feature-card {
  transition: transform 0.2s ease-in-out;
}

.feature-card:hover {
  transform: translateY(-4px);
}

.feature-card img {
  transition: transform 0.2s ease-in-out;
}

.feature-card:hover img {
  transform: scale(1.05);
}
</style> 