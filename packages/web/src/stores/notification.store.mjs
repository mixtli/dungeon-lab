import { defineStore } from 'pinia';
import { ref } from 'vue';
export const useNotificationStore = defineStore('notification', () => {
    const notifications = ref([]);
    function addNotification(notification) {
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
    function removeNotification(id) {
        notifications.value = notifications.value.filter(n => n.id !== id);
    }
    return {
        notifications,
        addNotification,
        removeNotification,
    };
});
//# sourceMappingURL=notification.store.mjs.map