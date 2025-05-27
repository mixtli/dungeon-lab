import { computed, type Ref } from 'vue';
import type { 
  Mention, 
  MentionSuggestion, 
  MentionMatch, 
  ParsedMessage 
} from '@dungeon-lab/shared/types/chat.mjs';

export interface ChatContext {
  id: string;
  name: string;
  type: 'campaign' | 'user' | 'actor' | 'bot';
  participantId?: string;
}

export function useMentions(chatContexts: Ref<ChatContext[]>) {
  const mentionSuggestions = computed((): MentionSuggestion[] => {
    return chatContexts.value
      .filter((context: ChatContext) => context.type !== 'campaign') // Exclude campaign room from mentions
      .map((context: ChatContext) => ({
        id: context.id,
        name: context.name,
        type: context.type as 'user' | 'actor' | 'bot',
        participantId: context.participantId || context.id,
        displayName: context.name,
        icon: getIconForType(context.type)
      }));
  });

  function getIconForType(type: string): string {
    switch (type) {
      case 'user': return 'user';
      case 'actor': return 'character';
      case 'bot': return 'robot';
      default: return 'user';
    }
  }

  function findMentionSuggestions(query: string): MentionSuggestion[] {
    if (!query.trim()) return mentionSuggestions.value;
    
    const lowerQuery = query.toLowerCase();
    return mentionSuggestions.value.filter(suggestion =>
      suggestion.name.toLowerCase().includes(lowerQuery)
    );
  }

  function parseMentions(content: string): ParsedMessage {
    const mentions: Mention[] = [];
    
    // Match @mentions with optional quotes for names with spaces
    // Supports: @name, @"name with spaces", @'name with spaces'
    const mentionRegex = /@(?:"([^"]+)"|'([^']+)'|(\S+))/g;
    let match;
    
    while ((match = mentionRegex.exec(content)) !== null) {
      const mentionText = match[1] || match[2] || match[3]; // Get the captured group
      const startIndex = match.index;
      const endIndex = match.index + match[0].length;
      
      // Find matching participant (case-insensitive)
      const participant = mentionSuggestions.value.find(suggestion =>
        suggestion.name.toLowerCase() === mentionText.toLowerCase()
      );
      
      if (participant) {
        mentions.push({
          id: `mention-${mentions.length}`,
          name: participant.name,
          type: participant.type,
          participantId: participant.participantId,
          startIndex,
          endIndex
        });
      }
    }
    
    return {
      content,
      mentions,
      hasMentions: mentions.length > 0
    };
  }

  function extractMentionMatches(content: string, cursorPosition: number): MentionMatch[] {
    const matches: MentionMatch[] = [];
    
    // Find @mentions before cursor position
    const beforeCursor = content.substring(0, cursorPosition);
    const mentionRegex = /@(\w*)$/; // Match incomplete @mention at end
    const match = beforeCursor.match(mentionRegex);
    
    if (match) {
      const query = match[1];
      const startIndex = match.index!;
      const suggestions = findMentionSuggestions(query);
      
      suggestions.forEach(suggestion => {
        matches.push({
          mention: `@${suggestion.name}`,
          participant: suggestion,
          startIndex,
          endIndex: cursorPosition
        });
      });
    }
    
    return matches;
  }

  function replaceMentionInContent(
    content: string, 
    startIndex: number, 
    endIndex: number, 
    replacement: string
  ): { content: string; newCursorPosition: number } {
    const before = content.substring(0, startIndex);
    const after = content.substring(endIndex);
    const newContent = before + replacement + after;
    const newCursorPosition = startIndex + replacement.length;
    
    return {
      content: newContent,
      newCursorPosition
    };
  }

  function highlightMentions(content: string): string {
    const parsed = parseMentions(content);
    if (!parsed.hasMentions) return content;
    
    let highlightedContent = content;
    let offset = 0;
    
    // Sort mentions by start index to process them in order
    const sortedMentions = [...parsed.mentions].sort((a, b) => a.startIndex - b.startIndex);
    
    sortedMentions.forEach(mention => {
      const startIndex = mention.startIndex + offset;
      const endIndex = mention.endIndex + offset;
      const originalText = highlightedContent.substring(startIndex, endIndex);
      const highlightedText = `<span class="mention mention-${mention.type}" data-participant-id="${mention.participantId}">${originalText}</span>`;
      
      highlightedContent = 
        highlightedContent.substring(0, startIndex) + 
        highlightedText + 
        highlightedContent.substring(endIndex);
      
      offset += highlightedText.length - originalText.length;
    });
    
    return highlightedContent;
  }

  return {
    mentionSuggestions,
    findMentionSuggestions,
    parseMentions,
    extractMentionMatches,
    replaceMentionInContent,
    highlightMentions
  };
} 