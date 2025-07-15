import { ref, computed, watch } from 'vue';
import type { 
  NotificationState, 
  ChatContextNotification 
} from '@dungeon-lab/shared/types/chat.mjs';

export interface ChatContext {
  id: string;
  name: string;
  type: 'campaign' | 'user' | 'actor' | 'bot';
  participantId?: string;
}

export function useNotifications() {
  const notifications = ref<Map<string, NotificationState>>(new Map());
  const activeContextId = ref<string | null>(null);

  // Load notifications from localStorage on initialization
  const loadNotifications = () => {
    try {
      const stored = localStorage.getItem('chat-notifications');
      if (stored) {
        const parsed = JSON.parse(stored) as Record<string, {
          hasUnread: boolean;
          hasMention: boolean;
          unreadCount?: number;
          lastNotificationTime?: string;
        }>;
        notifications.value = new Map(Object.entries(parsed).map(([key, value]) => [
          key,
          {
            hasUnread: value.hasUnread || false,
            hasMention: value.hasMention || false,
            unreadCount: value.unreadCount || 0,
            lastNotificationTime: value.lastNotificationTime ? new Date(value.lastNotificationTime) : undefined
          }
        ]));
      }
    } catch (error) {
      console.warn('Failed to load chat notifications from localStorage:', error);
    }
  };

  // Save notifications to localStorage
  const saveNotifications = () => {
    try {
      const toSave = Object.fromEntries(
        Array.from(notifications.value.entries()).map(([key, value]) => [
          key,
          {
            ...value,
            lastNotificationTime: value.lastNotificationTime?.toISOString()
          }
        ])
      );
      localStorage.setItem('chat-notifications', JSON.stringify(toSave));
    } catch (error) {
      console.warn('Failed to save chat notifications to localStorage:', error);
    }
  };

  // Watch for changes and save to localStorage
  watch(notifications, saveNotifications, { deep: true });

  // Initialize notifications
  loadNotifications();

  const getNotificationState = (contextId: string): NotificationState => {
    return notifications.value.get(contextId) || {
      hasUnread: false,
      hasMention: false,
      unreadCount: 0
    };
  };

  const setNotification = (
    contextId: string, 
    type: 'unread' | 'mention', 
    value: boolean,
    incrementCount = false
  ) => {
    const current = getNotificationState(contextId);
    const updated: NotificationState = {
      ...current,
      lastNotificationTime: value ? new Date() : current.lastNotificationTime
    };

    if (type === 'unread') {
      updated.hasUnread = value;
      if (incrementCount && value) {
        updated.unreadCount = (current.unreadCount || 0) + 1;
      } else if (!value) {
        updated.unreadCount = 0;
      }
    } else if (type === 'mention') {
      updated.hasMention = value;
    }

    notifications.value.set(contextId, updated);
  };

  const clearNotifications = (contextId: string) => {
    notifications.value.set(contextId, {
      hasUnread: false,
      hasMention: false,
      unreadCount: 0
    });
  };

  const clearAllNotifications = () => {
    notifications.value.clear();
  };

  const markAsRead = (contextId: string) => {
    clearNotifications(contextId);
  };

  const setActiveContext = (contextId: string | null) => {
    // Clear notifications for the previously active context
    if (activeContextId.value) {
      clearNotifications(activeContextId.value);
    }
    
    activeContextId.value = contextId;
    
    // Clear notifications for the newly active context
    if (contextId) {
      clearNotifications(contextId);
    }
  };

  const addDirectMessageNotification = (contextId: string) => {
    // Don't add notification if this is the active context
    if (contextId === activeContextId.value) return;
    
    setNotification(contextId, 'unread', true, true);
  };

  const addMentionNotification = (contextId: string) => {
    // Don't add notification if this is the active context
    if (contextId === activeContextId.value) return;
    
    setNotification(contextId, 'mention', true);
    setNotification(contextId, 'unread', true, true);
  };

  const hasAnyNotifications = computed(() => {
    return Array.from(notifications.value.values()).some(
      notification => notification.hasUnread || notification.hasMention
    );
  });

  const getNotificationCount = computed(() => {
    return Array.from(notifications.value.values()).reduce(
      (total, notification) => total + (notification.unreadCount || 0),
      0
    );
  });

  const getContextNotifications = (contexts: ChatContext[]): ChatContextNotification[] => {
    return contexts.map(context => ({
      contextId: context.id,
      contextType: context.type,
      notification: getNotificationState(context.id)
    }));
  };

  const hasNotification = (contextId: string): boolean => {
    const state = getNotificationState(contextId);
    return state.hasUnread || state.hasMention;
  };

  const getNotificationClasses = (contextId: string, isActive: boolean): string[] => {
    const state = getNotificationState(contextId);
    const classes: string[] = [];

    if (isActive) {
      classes.push('bg-secondary-100', 'text-secondary-900', 'dark:bg-secondary-800', 'dark:text-secondary-100');
    } else if (state.hasMention) {
      classes.push('bg-error-100', 'text-error-900', 'border-l-4', 'border-error-500', 'dark:bg-error-900', 'dark:text-error-100', 'dark:border-error-400');
    } else if (state.hasUnread) {
      classes.push('bg-accent-50', 'text-accent-900', 'border-l-4', 'border-accent-400', 'dark:bg-accent-900', 'dark:text-accent-100', 'dark:border-accent-500');
    } else {
      classes.push('text-onyx', 'hover:bg-stone-100', 'dark:text-parchment', 'dark:hover:bg-stone-600');
    }

    return classes;
  };

  return {
    notifications,
    activeContextId,
    getNotificationState,
    setNotification,
    clearNotifications,
    clearAllNotifications,
    markAsRead,
    setActiveContext,
    addDirectMessageNotification,
    addMentionNotification,
    hasAnyNotifications,
    getNotificationCount,
    getContextNotifications,
    hasNotification,
    getNotificationClasses
  };
} 