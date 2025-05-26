# Chatbot Integration System Design Document

## Overview

This document outlines the design for integrating external chatbots into the main DungeonLab application as chat participants. This system will allow Game Masters to add any compatible chatbot (D&D 5e, Pathfinder, homebrew systems, etc.) to their campaigns. Chatbots will appear as special system users that can respond to direct messages and mentions in game session chats, providing rules assistance and other game-specific support to players and game masters.

The initial implementation will include the existing GM Assistant (D&D 5e rules chatbot) as the first supported bot, but the architecture is designed to support multiple game systems and custom chatbots.

## Current State

The GM Assistant currently exists as a standalone Python application (`ai-workflows/src/gm_assistant/`) that:
- Uses LangChain with Ollama for local LLM processing
- Maintains a Chroma vector database of D&D 5e SRD content
- Provides a command-line interface for querying D&D rules
- Supports conversation memory for contextual responses
- Now includes a FastAPI service interface (Task 1 completed)

This will serve as the reference implementation and first chatbot in the new system.

## Goals

### Primary Goals
1. **Generic Chatbot Integration**: Support any chatbot that implements the standard API interface
2. **Campaign-Specific Bots**: Allow GMs to add/configure chatbots per campaign
3. **Multiple Communication Modes**: Support both direct messages and @mentions in group chats
4. **Consistent User Experience**: Leverage existing chat infrastructure and UI patterns
5. **Reliable Service**: Graceful degradation when chatbot services are unavailable
6. **Extensible Architecture**: Easy addition of new game systems and custom chatbots

### Secondary Goals
1. **Performance**: Reasonable response times (< 30 seconds for complex queries)
2. **Context Awareness**: Maintain conversation context within chat sessions
3. **Access Control**: Respect existing authentication and session permissions
4. **Monitoring**: Health checks and error reporting for chatbot services
5. **Bot Management**: Easy configuration, testing, and management of chatbots
6. **Multi-System Support**: Support for different game systems (D&D 5e, Pathfinder, etc.)

## Architecture Overview

### High-Level Design

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web Client    │    │  Express Server │    │   Chatbot       │
│                 │    │                 │    │   Services      │
│ ┌─────────────┐ │    │ ┌─────────────┐ │    │ ┌─────────────┐ │
│ │ Chat        │ │◄──►│ │ Chat Socket │ │    │ │ D&D 5e Bot  │ │
│ │ Component   │ │    │ │ Handler     │ │    │ │ (FastAPI)   │ │
│ └─────────────┘ │    │ └─────────────┘ │    │ └─────────────┘ │
│ ┌─────────────┐ │    │        │        │    │ ┌─────────────┐ │
│ │ Bot Config  │ │    │ ┌─────────────┐ │    │ │ Pathfinder  │ │
│ │ UI          │ │◄──►│ │ Chatbot     │ │◄──►│ │ Bot         │ │
│ └─────────────┘ │    │ │ Service     │ │    │ └─────────────┘ │
│                 │    │ └─────────────┘ │    │ ┌─────────────┐ │
│                 │    │        │        │    │ │ Custom Bot  │ │
│                 │    │ ┌─────────────┐ │    │ │ (3rd Party) │ │
│                 │    │ │ Bot Config  │ │    │ └─────────────┘ │
│                 │    │ │ API         │ │    │                 │
│                 │    │ └─────────────┘ │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Communication Flow

1. **User sends message** → Web Client → Socket.IO → Express Server
2. **Message routing** → Chat Socket Handler processes message
3. **Bot detection** → Chatbot Service detects relevant messages for configured bots
4. **Bot processing** → HTTP request to appropriate chatbot service
5. **Response routing** → Back through Socket.IO to appropriate chat room(s)

### Bot Management Flow

1. **GM configures bot** → Bot Config UI → Express Server → Database
2. **Bot registration** → Chatbot Service validates and registers bot
3. **Health monitoring** → Periodic health checks to registered bots
4. **Campaign association** → Bots are linked to specific campaigns

## Detailed Design

### 1. Chatbot API Standard

#### 1.1 Standard Chatbot Interface

All chatbots must implement a standardized API interface to be compatible with DungeonLab:

**Required Endpoints**:
- `GET /health` - Health check
- `GET /status` - Detailed status and capabilities
- `POST /chat` - Main chat endpoint
- `POST /chat/session/{session_id}` - Session-aware chat
- `POST /chat/session/{session_id}/clear` - Clear session memory

#### 1.2 Reference Implementation (D&D 5e Bot)

**Location**: `ai-workflows/src/gm_assistant/api.py`

**Key Components**:
- FastAPI application with async support
- Conversation session management
- Health monitoring endpoints
- D&D 5e specific knowledge base
- Streaming response support (future)

#### 1.3 Standard API Endpoints

```python
# Health and status (Required)
GET  /health                    # Service health check
GET  /status                    # Detailed service status with capabilities

# Chat functionality (Required)
POST /chat                      # Single message processing
POST /chat/session/{session_id} # Session-aware chat

# Session management (Required)
POST /chat/session/{session_id}/clear  # Clear session memory

# Optional endpoints
POST /chat/stream              # Streaming responses (future)
GET  /chat/sessions             # List active sessions
GET  /capabilities             # Bot capabilities and metadata
```

#### 1.4 Standard Request/Response Schemas

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

# Bot Capabilities Response
{
  "name": "D&D 5e Assistant",
  "description": "Provides D&D 5th Edition rules assistance",
  "version": "1.0.0",
  "game_systems": ["dnd5e"],
  "features": {
    "conversation_memory": true,
    "source_citations": true,
    "streaming_responses": false
  },
  "supported_languages": ["en"],
  "max_session_duration": 3600,
  "rate_limits": {
    "requests_per_minute": 60,
    "concurrent_sessions": 100
  }
}
```

#### 1.4 Session Management

- **Session Isolation**: Each game session maintains separate conversation memory
- **Memory Persistence**: Conversation context persists for the duration of game sessions
- **Cleanup**: Automatic cleanup of inactive sessions after configurable timeout

### 2. Express Server Integration

#### 2.1 Chatbot Management System

**Location**: `packages/server/src/features/chatbots/`

**Files**:
- `service.mts` - HTTP client for chatbot services
- `chat-handler.mts` - Socket.IO message processing
- `bot-manager.mts` - Bot registration and health monitoring
- `config-api.mts` - Bot configuration REST API
- `types.mts` - TypeScript interfaces
- `models.mts` - Database models for bot configuration

#### 2.2 Database Schema

**Chatbot Configuration Table**:
```sql
CREATE TABLE chatbots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  endpoint_url VARCHAR(500) NOT NULL,
  api_key VARCHAR(255), -- Optional for authenticated bots
  game_system VARCHAR(100),
  enabled BOOLEAN DEFAULT true,
  health_status VARCHAR(50) DEFAULT 'unknown',
  last_health_check TIMESTAMP,
  capabilities JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);
```

#### 2.3 Service Implementation

```typescript
export class ChatbotService {
  private registeredBots: Map<string, ChatbotConfig>;
  private httpClients: Map<string, HttpClient>;

  async sendMessage(botId: string, request: ChatRequest): Promise<ChatResponse>
  async registerBot(config: ChatbotConfig): Promise<void>
  async unregisterBot(botId: string): Promise<void>
  async isHealthy(botId: string): Promise<boolean>
  async getServiceStatus(botId: string): Promise<ServiceStatus>
  async clearSession(botId: string, sessionId: string): Promise<void>
  async getBotCapabilities(botId: string): Promise<BotCapabilities>
  async performHealthCheck(botId: string): Promise<HealthStatus>
}

export class BotManager {
  async loadBotsForCampaign(campaignId: string): Promise<ChatbotConfig[]>
  async addBotToCampaign(campaignId: string, config: ChatbotConfig): Promise<string>
  async removeBotFromCampaign(campaignId: string, botId: string): Promise<void>
  async updateBotConfig(botId: string, config: Partial<ChatbotConfig>): Promise<void>
  async testBotConnection(config: ChatbotConfig): Promise<TestResult>
  async scheduleHealthChecks(): Promise<void>
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

**Chatbots as Chat Participants**:
- Each configured bot appears in chat sidebar with custom name
- Special system user type with distinctive icon/styling
- Available based on campaign configuration
- Multiple bots can be active in a single campaign

#### 3.2 Bot Configuration UI

**Campaign Settings Integration**:
- New "Chatbots" section in campaign settings
- Add/edit/remove bot configurations
- Test bot connections before saving
- Enable/disable bots per campaign
- View bot health status and capabilities

#### 3.3 UI Enhancements

**Chat Component Updates**:
```typescript
// Add configured chatbots to chat contexts
const contexts: ChatContext[] = [
  {
    id: 'campaign',
    name: 'Campaign Room',
    type: 'campaign'
  },
  // Dynamically loaded chatbots for this campaign
  ...campaignChatbots.map(bot => ({
    id: `system:chatbot:${bot.id}`,
    name: bot.name,
    type: 'system',
    participantId: bot.id,
    icon: bot.game_system === 'dnd5e' ? 'dragon' : 'robot',
    description: bot.description,
    gameSystem: bot.game_system,
    healthStatus: bot.health_status
  })),
  // ... other contexts
];
```

**Bot Configuration Component**:
```typescript
interface BotConfigForm {
  name: string;
  description: string;
  endpointUrl: string;
  apiKey?: string;
  gameSystem: string;
  enabled: boolean;
}

const BotConfigModal = () => {
  // Form for adding/editing bot configuration
  // Test connection functionality
  // Validation and error handling
};
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

**Location**: `packages/shared/src/types/chatbots.mts`

```typescript
export interface ChatbotConfig {
  id: string;
  campaignId: string;
  name: string;
  description: string;
  endpointUrl: string;
  apiKey?: string;
  gameSystem: string;
  enabled: boolean;
  healthStatus: 'healthy' | 'unhealthy' | 'unknown';
  lastHealthCheck?: Date;
  capabilities?: BotCapabilities;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface BotCapabilities {
  name: string;
  description: string;
  version: string;
  gameSystem: string[];
  features: {
    conversationMemory: boolean;
    sourceCitations: boolean;
    streamingResponses: boolean;
  };
  supportedLanguages: string[];
  maxSessionDuration: number;
  rateLimits: {
    requestsPerMinute: number;
    concurrentSessions: number;
  };
}

export interface ChatbotMessage {
  id: string;
  content: string;
  sessionId: string;
  botId: string;
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

export interface BotTestResult {
  success: boolean;
  responseTime: number;
  capabilities?: BotCapabilities;
  error?: string;
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
# Chatbot System Configuration
CHATBOTS_ENABLED=true
CHATBOTS_DEFAULT_TIMEOUT=30000
CHATBOTS_MAX_RETRIES=3
CHATBOTS_HEALTH_CHECK_INTERVAL=300000  # 5 minutes
CHATBOTS_MAX_CONCURRENT_REQUESTS=100

# Default D&D 5e Bot Configuration (Optional)
DND5E_BOT_ENABLED=true
DND5E_BOT_URL=http://localhost:8000
DND5E_BOT_NAME="D&D 5e Assistant"

# Feature Flags
CHATBOTS_DIRECT_MESSAGES=true
CHATBOTS_MENTIONS=true
CHATBOTS_AUTO_REGISTER_DEFAULT=true
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