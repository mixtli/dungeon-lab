<template>
  <svg
    :class="className"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      v-if="name === 'check'"
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
      d="M5 13l4 4L19 7"
    />
    <path
      v-else-if="name === 'arrow-left'"
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
      d="M15 19l-7-7 7-7"
    />
    <path
      v-else-if="name === 'arrow-right'"
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
      d="M9 5l7 7-7 7"
    />
    <path
      v-else-if="name === 'info'"
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    />
    <path
      v-else-if="name === 'alert-circle'"
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    />
    <!-- Fallback -->
    <circle
      v-else
      cx="12"
      cy="12"
      r="10"
      stroke-width="2"
    />
  </svg>
</template>

<script setup lang="ts">
interface Props {
  name: string;
  className?: string;
}

withDefaults(defineProps<Props>(), {
  className: 'w-6 h-6'
});
</script>