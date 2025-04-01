<script setup lang="ts">
import { useNotificationStore } from '../../stores/notification.mjs';
import { XMarkIcon } from '@heroicons/vue/24/outline';
import { computed } from 'vue';

const notificationStore = useNotificationStore();

const notifications = computed(() => notificationStore.notifications);

function getNotificationClasses(type: string) {
  const baseClasses = 'flex items-center p-4 mb-4 rounded-lg shadow-lg transform transition-all duration-300';
  switch (type) {
    case 'success':
      return `${baseClasses} bg-green-50 text-green-800 border border-green-200`;
    case 'error':
      return `${baseClasses} bg-red-50 text-red-800 border border-red-200`;
    case 'warning':
      return `${baseClasses} bg-yellow-50 text-yellow-800 border border-yellow-200`;
    case 'info':
    default:
      return `${baseClasses} bg-blue-50 text-blue-800 border border-blue-200`;
  }
}

function getIconClasses(type: string) {
  switch (type) {
    case 'success':
      return 'text-green-500';
    case 'error':
      return 'text-red-500';
    case 'warning':
      return 'text-yellow-500';
    case 'info':
    default:
      return 'text-blue-500';
  }
}
</script>

<template>
  <div class="fixed top-4 right-4 z-50 w-96 space-y-4">
    <TransitionGroup name="notification">
      <div
        v-for="notification in notifications"
        :key="notification.id"
        :class="getNotificationClasses(notification.type)"
      >
        <div class="flex-1">{{ notification.message }}</div>
        <button
          @click="notificationStore.removeNotification(notification.id)"
          class="ml-4 p-1 rounded-full hover:bg-black hover:bg-opacity-10 focus:outline-none"
        >
          <XMarkIcon class="w-5 h-5" :class="getIconClasses(notification.type)" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.notification-enter-active,
.notification-leave-active {
  transition: all 0.3s ease;
}

.notification-enter-from {
  opacity: 0;
  transform: translateX(30px);
}

.notification-leave-to {
  opacity: 0;
  transform: translateX(30px);
}
</style> 