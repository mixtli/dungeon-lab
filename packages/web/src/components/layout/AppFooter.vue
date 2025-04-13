<script setup lang="ts">
const currentYear = new Date().getFullYear();
</script>

<template>
  <footer class="bg-white dark:bg-gray-800 shadow-inner py-6">
    <div class="container mx-auto px-4">
      <div class="flex flex-col md:flex-row justify-between items-center">
        <div class="mb-4 md:mb-0">
          <p class="text-sm text-gray-600 dark:text-gray-400">
            &copy; {{ currentYear }} Dungeon Lab. All rights reserved.
          </p>
        </div>
        <div class="flex space-x-6">
          <a
            href="#"
            class="text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400"
          >
            <span class="sr-only">GitHub</span>
            <span class="i-simple-icons-github w-5 h-5"></span>
          </a>
          <a
            href="#"
            class="text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400"
          >
            <span class="sr-only">Twitter</span>
            <span class="i-simple-icons-twitter w-5 h-5"></span>
          </a>
          <a
            href="#"
            class="text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400"
          >
            <span class="sr-only">Discord</span>
            <span class="i-simple-icons-discord w-5 h-5"></span>
          </a>
        </div>
      </div>
    </div>
  </footer>
</template>
