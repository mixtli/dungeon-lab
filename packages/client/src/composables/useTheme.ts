import { ref, watch } from 'vue';
import { usePreferredDark, useStorage } from '@vueuse/core';

export function useTheme() {
  const preferredDark = usePreferredDark();
  const colorMode = useStorage('dungeon-lab-color-mode', 'auto');
  
  const isDarkMode = ref(false);
  
  function updateTheme() {
    isDarkMode.value = 
      colorMode.value === 'auto' 
        ? preferredDark.value 
        : colorMode.value === 'dark';
    
    // Update document classes
    if (isDarkMode.value) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }
  
  function toggleTheme() {
    colorMode.value = isDarkMode.value ? 'light' : 'dark';
  }
  
  function setTheme(theme: 'light' | 'dark' | 'auto') {
    colorMode.value = theme;
  }
  
  // Watch for changes
  watch([preferredDark, colorMode], updateTheme, { immediate: true });
  
  return {
    isDarkMode,
    colorMode,
    toggleTheme,
    setTheme,
  };
} 