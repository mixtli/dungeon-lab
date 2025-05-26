# GM Assistant Integration Design Document

## Overview

This document outlines the design for integrating the existing GM Assistant (D&D 5e rules chatbot) into the main DungeonLab application as a chat participant. The GM Assistant will appear as a special system user that can respond to direct messages and mentions in game session chats, providing D&D rules assistance to players and game masters.

## Current State

The GM Assistant currently exists as a standalone Python application (`ai-workflows/src/gm_assistant/`) that:
- Uses LangChain with Ollama for local LLM processing
- Maintains a Chroma vector database of D&D 5e SRD content
- Provides a command-line interface for querying D&D rules
- Supports conversation memory for contextual responses

## Goals

### Primary Goals
1. **Seamless Chat Integration**: GM Assistant appears as a chat participant alongside users and characters
2. **Multiple Communication Modes**: Support both direct messages and @mentions in group chats
3. **Consistent User Experience**: Leverage existing chat infrastructure and UI patterns
4. **Reliable Service**: Graceful degradation when AI service is unavailable
5. **Scalable Architecture**: Foundation for adding more AI assistants in the future

### Secondary Goals
1. **Performance**: Reasonable response times (< 30 seconds for complex queries)
2. **Context Awareness**: Maintain conversation context within chat sessions
3. **Access Control**: Respect existing authentication and session permissions
4. **Monitoring**: Health checks and error reporting for the AI service

## Architecture Overview

### High-Level Design

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web Client    │    │  Express Server │    │  GM Assistant   │
│                 │    │                 │    │   FastAPI       │
│ ┌─────────────┐ │    │ ┌─────────────┐ │    │ ┌─────────────┐ │
│ │ Chat        │ │◄──►│ │ Chat Socket │ │    │ │ LangChain   │ │
│ │ Component   │ │    │ │ Handler     │ │    │ │ + Ollama    │ │
│ └─────────────┘ │    │ └─────────────┘ │    │ └─────────────┘ │
│                 │    │        │        │    │        │        │
│                 │    │ ┌─────────────┐ │    │ ┌─────────────┐ │
│                 │    │ │ GM Assistant│ │◄──►│ │ Chroma      │ │
│                 │    │ │ Service     │ │    │ │ Vector DB   │ │
│                 │    │ └─────────────┘ │    │ └─────────────┘ │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Communication Flow

1. **User sends message** → Web Client → Socket.IO → Express Server
2. **Message routing** → Chat Socket Handler processes message
3. **AI detection** → GM Assistant Service detects relevant messages
4. **AI processing** → HTTP request to FastAPI GM Assistant
5. **Response routing** → Back through Socket.IO to appropriate chat room(s)

## Detailed Design

### 1. GM Assistant FastAPI Service

#### 1.1 Service Architecture

**Location**: `ai-workflows/src/gm_assistant/api.py`

**Key Components**:
- FastAPI application with async support
- Conversation session management
- Health monitoring endpoints
- Streaming response support (future)

#### 1.2 API Endpoints

```python
# Health and status
GET  /health                    # Service health check
GET  /status                    # Detailed service status

# Chat functionality  
POST /chat                      # Single message processing
POST /chat/stream              # Streaming responses (future)
POST /chat/session/{session_id} # Session-aware chat

# Management
POST /chat/session/{session_id}/clear  # Clear session memory
GET  /chat/sessions             # List active sessions
```

#### 1.3 Request/Response Schemas

```python
# Chat Request
{
  "message": "What are spell slots?",
  "session_id": "game-session-123",  # Optional
  "user_id": "user-456",             # Optional
  "context": {                       # Optional
    "game_session_id": "session-123",
    "character_level": 5,
    "character_class": "wizard"
  }
}

# Chat Response
{
  "response": "Spell slots are...",
  "success": true,
  "processing_time": 2.3,
  "sources": [                       # Optional
    {
      "title": "Player's Handbook",
      "page": 201,
      "section": "Spellcasting"
    }
  ],
  "session_id": "game-session-123"
}

# Error Response
{
  "success": false,
  "error": "Service temporarily unavailable",
  "error_code": "SERVICE_UNAVAILABLE",
  "retry_after": 30
}
```

#### 1.4 Session Management

- **Session Isolation**: Each game session maintains separate conversation memory
- **Memory Persistence**: Conversation context persists for the duration of game sessions
- **Cleanup**: Automatic cleanup of inactive sessions after configurable timeout

### 2. Express Server Integration

#### 2.1 GM Assistant Service Layer

**Location**: `packages/server/src/features/gm-assistant/`

**Files**:
- `service.mts` - HTTP client for FastAPI service
- `chat-handler.mts` - Socket.IO message processing
- `types.mts` - TypeScript interfaces
- `config.mts` - Configuration management

#### 2.2 Service Implementation

```typescript
export class GMAssistantService {
  private baseUrl: string;
  private timeout: number;
  private retryAttempts: number;

  async sendMessage(request: ChatRequest): Promise<ChatResponse>
  async isHealthy(): Promise<boolean>
  async getServiceStatus(): Promise<ServiceStatus>
  async clearSession(sessionId: string): Promise<void>
}
```

#### 2.3 Chat Handler Integration

**Message Detection Logic**:
1. **Direct Messages**: `recipient.id === 'gm-assistant'`
2. **Mentions**: Message contains `@gm assistant` or `@assistant`
3. **Question Patterns**: Messages ending with `?` in game sessions (configurable)

**Response Routing**:
- **Direct messages**: Reply privately to sender
- **Mentions in rooms**: Reply to the room
- **Error handling**: Graceful fallback messages

#### 2.4 Socket Handler Updates

```typescript
// Enhanced chat socket handler
function chatSocketHandler(socket: Socket) {
  socket.on('chat', async (metadata, message) => {
    // Existing message routing
    const roomName = `${metadata.recipient.type}:${metadata.recipient.id}`;
    socket.to(roomName).emit('chat', metadata, message);

    // GM Assistant processing (async, non-blocking)
    gmAssistantHandler.handleMessage(socket, metadata, message)
      .catch(error => logger.error('GM Assistant error:', error));
  });
}
```

### 3. Frontend Integration

#### 3.1 Chat Context Updates

**GM Assistant as Chat Participant**:
- Appears in chat sidebar as "GM Assistant"
- Special system user type with distinctive icon/styling
- Available in all game sessions

#### 3.2 UI Enhancements

**Chat Component Updates**:
```typescript
// Add GM Assistant to chat contexts
const contexts: ChatContext[] = [
  {
    id: 'campaign',
    name: 'Campaign Room',
    type: 'campaign'
  },
  {
    id: 'system:gm-assistant',
    name: 'GM Assistant',
    type: 'system',
    participantId: 'gm-assistant',
    icon: 'robot', // Special icon
    description: 'D&D 5e Rules Assistant'
  },
  // ... other contexts
];
```

**Message Styling**:
- Distinctive styling for GM Assistant messages
- Loading indicators during processing
- Error state handling
- Source citations (future enhancement)

#### 3.3 User Experience Features

**Mention Support**:
- Auto-complete for `@gm assistant`
- Visual indication when GM Assistant is mentioned
- Typing indicators during processing

**Help Integration**:
- `/help gm` command for GM Assistant usage
- Quick action buttons for common queries
- Context-aware suggestions

### 4. Data Models and Types

#### 4.1 Shared Types

**Location**: `packages/shared/src/types/gm-assistant.mts`

```typescript
export interface GMAssistantMessage {
  id: string;
  content: string;
  sessionId: string;
  userId?: string;
  timestamp: Date;
  processingTime?: number;
  sources?: MessageSource[];
}

export interface MessageSource {
  title: string;
  page?: number;
  section?: string;
  url?: string;
}

export interface GMAssistantConfig {
  enabled: boolean;
  responseTimeout: number;
  maxRetries: number;
  serviceUrl: string;
  features: {
    directMessages: boolean;
    mentions: boolean;
    autoRespond: boolean;
  };
}
```

#### 4.2 Socket Event Updates

```typescript
// Add to socket events schema
export const serverToClientEvents = z.object({
  // ... existing events
  'gm-assistant:typing': z.function()
    .args(z.object({ sessionId: z.string() }))
    .returns(z.void()),
  'gm-assistant:response': z.function()
    .args(z.object({
      messageId: z.string(),
      response: z.string(),
      processingTime: z.number(),
      sources: z.array(messageSourceSchema).optional()
    }))
    .returns(z.void()),
});
```

### 5. Configuration and Deployment

#### 5.1 Environment Configuration

```bash
# GM Assistant Service
GM_ASSISTANT_ENABLED=true
GM_ASSISTANT_URL=http://localhost:8000
GM_ASSISTANT_TIMEOUT=30000
GM_ASSISTANT_MAX_RETRIES=3

# Ollama Configuration
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_EMBED_MODEL=nomic-embed-text
OLLAMA_LLM_MODEL=llama3

# Feature Flags
GM_ASSISTANT_DIRECT_MESSAGES=true
GM_ASSISTANT_MENTIONS=true
GM_ASSISTANT_AUTO_RESPOND=false
```

#### 5.2 Service Dependencies

**Required Services**:
1. **Ollama**: Local LLM service
2. **Chroma DB**: Vector database (file-based)
3. **FastAPI**: GM Assistant HTTP service
4. **Express**: Main application server

**Startup Sequence**:
1. Ollama service starts
2. GM Assistant FastAPI service initializes
3. Express server starts and connects to GM Assistant
4. Health checks verify all services are ready

### 6. Error Handling and Resilience

#### 6.1 Failure Modes

**GM Assistant Service Unavailable**:
- Graceful degradation with informative messages
- Retry logic with exponential backoff
- Health check monitoring

**Ollama/LLM Failures**:
- Fallback to simple acknowledgment messages
- Service restart capabilities
- Resource monitoring

**Network Issues**:
- Timeout handling
- Connection pooling
- Circuit breaker pattern

#### 6.2 Error Messages

```typescript
const ERROR_MESSAGES = {
  SERVICE_UNAVAILABLE: "I'm currently unavailable. Please try again in a few moments.",
  TIMEOUT: "I'm taking longer than usual to respond. Please try rephrasing your question.",
  PROCESSING_ERROR: "I encountered an error processing your request. Please try again.",
  RATE_LIMITED: "I'm receiving too many requests. Please wait a moment before asking again."
};
```

### 7. Performance Considerations

#### 7.1 Response Time Targets

- **Simple queries**: < 5 seconds
- **Complex queries**: < 30 seconds
- **Health checks**: < 1 second
- **Service startup**: < 60 seconds

#### 7.2 Optimization Strategies

**Caching**:
- Response caching for common queries
- Vector search result caching
- Session memory optimization

**Resource Management**:
- Connection pooling to FastAPI service
- Memory limits for conversation history
- Automatic cleanup of inactive sessions

**Monitoring**:
- Response time metrics
- Error rate tracking
- Resource utilization monitoring

### 8. Security Considerations

#### 8.1 Access Control

- **Authentication**: Leverage existing session authentication
- **Authorization**: Respect game session permissions
- **Rate Limiting**: Prevent abuse and resource exhaustion

#### 8.2 Data Privacy

- **No Persistent Storage**: Conversation memory is session-scoped only
- **No User Data**: GM Assistant doesn't store personal information
- **Audit Logging**: Track usage for debugging and optimization

### 9. Testing Strategy

#### 9.1 Unit Tests

- GM Assistant Service HTTP client
- Message detection and routing logic
- Error handling and fallback scenarios
- Configuration validation

#### 9.2 Integration Tests

- End-to-end chat flow with GM Assistant
- Service health check integration
- Socket.IO event handling
- Frontend chat component integration

#### 9.3 Performance Tests

- Response time under load
- Concurrent user handling
- Memory usage during extended sessions
- Service recovery after failures

### 10. Future Enhancements

#### 10.1 Advanced Features

**Streaming Responses**:
- Real-time response streaming for long answers
- Progressive message updates
- Typing indicators during generation

**Context Awareness**:
- Character sheet integration
- Campaign-specific knowledge
- Session state awareness

**Multi-Modal Support**:
- Image analysis for rule clarifications
- Voice input/output capabilities
- Rich media responses

#### 10.2 Additional AI Assistants

**Framework for Multiple Assistants**:
- Generic AI assistant interface
- Plugin-based assistant system
- Specialized assistants (combat, roleplay, etc.)

**Assistant Marketplace**:
- Community-contributed assistants
- Assistant discovery and installation
- Rating and review system

### 11. Migration and Rollout

#### 11.1 Phased Deployment

**Phase 1**: Core Integration
- FastAPI service conversion
- Basic chat integration
- Direct message support

**Phase 2**: Enhanced Features
- Mention support in group chats
- Improved error handling
- Performance optimization

**Phase 3**: Advanced Capabilities
- Streaming responses
- Context awareness
- Additional AI models

#### 11.2 Rollback Strategy

- Feature flags for quick disable
- Service isolation for safe rollback
- Database migration compatibility
- User communication plan

### 12. Success Metrics

#### 12.1 Technical Metrics

- **Availability**: > 99% uptime
- **Response Time**: 95th percentile < 10 seconds
- **Error Rate**: < 1% of requests
- **User Adoption**: > 50% of active sessions use GM Assistant

#### 12.2 User Experience Metrics

- **User Satisfaction**: Survey feedback
- **Usage Patterns**: Frequency and types of queries
- **Support Reduction**: Decrease in rules-related support requests
- **Session Engagement**: Increased session duration and activity

## Conclusion

This design provides a comprehensive foundation for integrating the GM Assistant into DungeonLab as a first-class chat participant. The architecture maintains separation of concerns, ensures scalability, and provides a solid foundation for future AI assistant features while preserving the existing chat system's reliability and user experience.

The phased approach allows for iterative development and validation, while the robust error handling ensures the system remains stable even when AI services are unavailable. The design aligns with DungeonLab's existing architectural patterns and technical standards, making it a natural extension of the current system. 