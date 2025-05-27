// Chat-related types for mentions and notifications

export interface Mention {
  id: string;
  name: string;
  type: 'user' | 'actor' | 'bot';
  participantId: string;
  startIndex: number;
  endIndex: number;
}

export interface MentionSuggestion {
  id: string;
  name: string;
  type: 'user' | 'actor' | 'bot';
  participantId: string;
  displayName: string;
  icon?: string;
}

export interface NotificationState {
  hasUnread: boolean;
  hasMention: boolean;
  lastNotificationTime?: Date;
  unreadCount?: number;
}

export interface ChatContextNotification {
  contextId: string;
  contextType: 'campaign' | 'user' | 'actor' | 'bot';
  notification: NotificationState;
}

export interface MentionMatch {
  mention: string;
  participant: MentionSuggestion;
  startIndex: number;
  endIndex: number;
}

export interface ParsedMessage {
  content: string;
  mentions: Mention[];
  hasMentions: boolean;
} 