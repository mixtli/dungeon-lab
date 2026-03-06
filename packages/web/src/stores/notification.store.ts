import { defineStore } from 'pinia';
import { ref } from 'vue';

export interface Notification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

export const useNotificationStore = defineStore('notification', () => {
  const notifications = ref<Notification[]>([]);

  function addNotification(notification: Omit<Notification, 'id'>) {
    const id = Math.random().toString(36).substring(2);
    const newNotification = {
      ...notification,
      id,
      duration: notification.duration ?? 3000,
    };
    notifications.value.push(newNotification);

    if (newNotification.duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, newNotification.duration);
    }
  }

  function removeNotification(id: string) {
    notifications.value = notifications.value.filter(n => n.id !== id);
  }

  return {
    notifications,
    addNotification,
    removeNotification,
  };
}); 