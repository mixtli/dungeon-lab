<script setup lang="ts">
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
            <el-button type="primary" size="large" @click="$router.push('/auth/register')">
              Get Started
            </el-button>
            <el-button size="large" @click="$router.push('/auth/login')">
              Sign In
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <div class="features-section py-16 bg-gray-50 dark:bg-gray-800">
      <div class="container mx-auto px-4">
        <h2 class="text-3xl font-bold text-center mb-12">Features</h2>
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div class="feature-card">
            <h2 class="text-2xl font-bold mb-4 text-[#3B82F6]">Create Your Hero</h2>
            <div class="feature-image mb-4">
              <img src="/images/features/character-sheet.png" alt="Character Sheet" class="rounded-lg shadow-lg w-full h-48 object-cover">
            </div>
            <h3 class="text-xl font-semibold mb-2 text-gray-900">Character Creation</h3>
            <p class="mb-2 text-gray-900">Create and customize characters with our intuitive character builder. Track stats, inventory, and abilities with beautiful digital character sheets.</p>
            <ul class="text-left list-disc list-inside space-y-1 text-gray-900">
              <li>Support for multiple game systems and rulesets</li>
              <li>Automated stat calculations and modifiers</li>
              <li>Digital dice rolling and skill checks</li>
              <li>Equipment and inventory management</li>
            </ul>
          </div>
          
          <div class="feature-card">
            <h2 class="text-2xl font-bold mb-4 text-[#3B82F6]">Design Your World</h2>
            <div class="feature-image mb-4">
              <img src="/images/features/map-builder.png" alt="Map Builder" class="rounded-lg shadow-lg w-full h-48 object-cover">
            </div>
            <h3 class="text-xl font-semibold mb-2 text-gray-900">Map Builder</h3>
            <p class="mb-2 text-gray-900">Design intricate dungeons and detailed terrain for your campaigns. Create immersive battle maps with our powerful and easy-to-use map editor.</p>
            <ul class="text-left list-disc list-inside space-y-1 text-gray-900">
              <li>Drag-and-drop terrain and object placement</li>
              <li>Extensive library of assets and props</li>
              <li>Dynamic lighting and fog of war</li>
              <li>Grid and measurement tools</li>
            </ul>
          </div>
          
          <div class="feature-card">
            <h2 class="text-2xl font-bold mb-4 text-[#3B82F6]">Master the Battle</h2>
            <div class="feature-image mb-4">
              <img src="/images/features/encounter.png" alt="Encounter Runner" class="rounded-lg shadow-lg w-full h-48 object-cover">
            </div>
            <h3 class="text-xl font-semibold mb-2 text-gray-900">Encounter Runner</h3>
            <p class="mb-2 text-gray-900">Run dynamic combat encounters with integrated initiative tracking, token movement, and automated calculations. Keep the action flowing smoothly.</p>
            <ul class="text-left list-disc list-inside space-y-1 text-gray-900">
              <li>Initiative tracker with turn management</li>
              <li>Automated damage and healing calculations</li>
              <li>Status effect tracking and timers</li>
              <li>Integrated monster stats and abilities</li>
            </ul>
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
  padding: 4rem 0;
}

.feature-card {
  background-color: var(--el-bg-color);
  border-radius: 0.5rem;
  padding: 2rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  text-align: center;
  transition: transform 0.3s ease;
}

.feature-card:hover {
  transform: translateY(-5px);
}

.feature-image img {
  transition: transform 0.3s ease;
}

.feature-card:hover .feature-image img {
  transform: scale(1.05);
}
</style> 