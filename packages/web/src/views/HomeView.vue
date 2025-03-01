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
            <div class="icon-wrapper mb-4">
              <el-icon :size="48"><Document /></el-icon>
            </div>
            <h3 class="text-xl font-semibold mb-2">Character Management</h3>
            <p>Create and manage characters for various game systems. Track stats, inventory, and abilities with ease.</p>
          </div>
          
          <div class="feature-card">
            <div class="icon-wrapper mb-4">
              <el-icon :size="48"><Monitor /></el-icon>
            </div>
            <h3 class="text-xl font-semibold mb-2">Virtual Game Table</h3>
            <p>Play with friends using our interactive game table. Move tokens, roll dice, and share maps in real-time.</p>
          </div>
          
          <div class="feature-card">
            <div class="icon-wrapper mb-4">
              <el-icon :size="48"><Connection /></el-icon>
            </div>
            <h3 class="text-xl font-semibold mb-2">Plugin System</h3>
            <p>Support for multiple game systems through our flexible plugin architecture. Play D&D, Pathfinder, and more!</p>
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

.icon-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 80px;
  color: var(--el-color-primary);
}
</style> 