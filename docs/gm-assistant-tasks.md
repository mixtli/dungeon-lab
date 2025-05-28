# Chatbot Integration System - Implementation Tasks

## Overview

This document outlines the implementation tasks for creating a generic chatbot integration system in DungeonLab. This system will allow Game Masters to add any compatible chatbot to their campaigns as chat participants. Tasks are organized by phase and component, with clear dependencies and acceptance criteria.

The initial implementation includes the existing GM Assistant (D&D 5e) as the reference implementation, but the architecture supports multiple game systems and custom chatbots.

## Phase 1: Core Integration

### Task 1: Convert GM Assistant to FastAPI Service ✅ COMPLETED

**Priority**: High  
**Dependencies**: None  
**Estimated Effort**: 2-3 days

**Description**: Convert the existing Python CLI GM Assistant to a FastAPI web service that implements the standard chatbot API interface.

**Implementation Details**:
- ✅ Create new `ai-workflows/src/gm_assistant/api.py` with FastAPI application
- ✅ Implement health check endpoints (`/health`, `/status`)
- ✅ Create chat endpoint (`POST /chat`) with request/response schemas
- ✅ Add session management for conversation memory
- ✅ Implement proper error handling and logging
- ✅ Add configuration management for Ollama settings
- ✅ Create requirements.txt with FastAPI dependencies
- ✅ Add `/capabilities` endpoint for bot metadata
- ✅ Ensure compliance with standard chatbot API interface

**Acceptance Criteria**:
- [x] FastAPI service starts successfully on port 8000
- [x] Health check endpoint returns 200 status
- [x] Chat endpoint accepts messages and returns D&D rule responses
- [x] Service maintains conversation memory per session
- [x] Proper error responses for invalid requests
- [x] Service can be started/stopped cleanly
- [x] Implements standard chatbot API interface

**Files Created/Modified**:
- ✅ `ai-workflows/src/gm_assistant/api.py` (new)
- ✅ `ai-workflows/src/gm_assistant/requirements.txt` (update)
- ✅ `ai-workflows/src/gm_assistant/config.py` (new)
- ✅ `ai-workflows/src/gm_assistant/start_api.py` (new)
- ✅ `ai-workflows/src/gm_assistant/test_api.py` (new)

---

### Task 2: Create Chatbot Management System in Express ✅ COMPLETED

**Priority**: High  
**Dependencies**: Task 1  
**Estimated Effort**: 3-4 days

**Description**: Create the Express server chatbot management system to handle multiple chatbot services and their configuration.

**Implementation Details**:
- Create `packages/server/src/features/chatbots/` directory structure
- Implement `service.mts` with HTTP client for chatbot communication
- Create `bot-manager.mts` for bot registration and health monitoring
- Implement `config-api.mts` for REST API endpoints
- Create database models in `models.mts`
- Create TypeScript interfaces in `types.mts`
- Implement retry logic and error handling
- Add health check integration for multiple bots
- Create connection pooling for HTTP requests

**Acceptance Criteria**:
- [x] Service can communicate with multiple chatbot services
- [x] Bot registration and configuration management works
- [x] Health checks work for all registered bots
- [x] Database schema supports multiple bots per campaign
- [x] REST API for bot configuration is functional
- [x] Proper error handling for service unavailable scenarios
- [x] Configuration loads from environment variables
- [x] TypeScript types are properly defined

**Files Created/Modified**:
- ✅ `packages/server/src/features/chatbots/service.mts` (new)
- ✅ `packages/server/src/features/chatbots/bot-manager.mts` (new)
- ✅ `packages/server/src/features/chatbots/controller.mts` (new)
- ✅ `packages/server/src/features/chatbots/routes.mts` (new)
- ✅ `packages/server/src/features/chatbots/models.mts` (new)
- ✅ `packages/server/src/features/chatbots/index.mts` (new)
- ✅ `packages/server/src/config/chatbots.config.mts` (new)
- ✅ Database migration for chatbots table (new)

---

### Task 3: Create Shared Types for Chatbot System ✅ COMPLETED

**Priority**: Medium  
**Dependencies**: None  
**Estimated Effort**: 1-2 days

**Description**: Define shared TypeScript types and schemas for the chatbot system functionality.

**Implementation Details**:
- Create `packages/shared/src/types/chatbots.mts`
- Define interfaces for chatbot configuration, messages, responses
- Add interfaces for bot capabilities and health status
- Add Zod schemas for validation
- Update socket event schemas to include chatbot events
- Export types from shared package index

**Acceptance Criteria**:
- [x] All chatbot system types are properly defined
- [x] Bot configuration and capabilities types are complete
- [x] Zod schemas validate correctly
- [x] Types are exported and accessible from shared package
- [x] Socket event schemas include chatbot events
- [x] No TypeScript compilation errors

**Files Created/Modified**:
- ✅ `packages/shared/src/types/chatbots.mts` (new)
- ✅ `packages/shared/src/schemas/chatbots.schema.mts` (new)
- ✅ `packages/shared/src/types/index.mts` (update)
- ✅ `packages/shared/src/schemas/socket/index.mts` (update)

---

### Task 4: Create Bot Configuration Database Migration ✅ COMPLETED

**Priority**: High  
**Dependencies**: Task 3  
**Estimated Effort**: 1 day

**Description**: Create database migration and models for chatbot configuration storage.

**Implementation Details**:
- Create database migration for chatbots table
- Add indexes for performance (campaign_id, enabled, health_status)
- Create Mongoose/database models
- Add seed data for default D&D 5e bot (optional)
- Update database schema documentation

**Acceptance Criteria**:
- [x] Database migration runs successfully
- [x] Chatbots table created with proper schema
- [x] Foreign key constraints work correctly
- [x] Indexes are created for performance
- [x] Database models are properly typed

**Files Created/Modified**:
- ✅ `packages/server/src/features/chatbots/models.mts` (completed in Task 2)
- ✅ `packages/server/src/features/chatbots/seed.mts` (new - optional seed data)
- ✅ Database indexes added for performance optimization
- ✅ `packages/server/src/features/chatbots/index.mts` (updated exports)

---

### Task 5: Implement Chatbot Chat Handler ✅ COMPLETED

**Priority**: High  
**Dependencies**: Task 2, Task 4  
**Estimated Effort**: 3-4 days

**Description**: Create the chat handler that detects chatbot messages and routes them to appropriate bots.

**Implementation Details**:
- ✅ Create `packages/server/src/features/chatbots/chat-handler.mts`
- ✅ Implement message detection logic (direct messages via `recipient.type === 'bot'`, mentions via `@botname`)
- ✅ Add bot routing based on campaign configuration
- ✅ Add response routing for different message types
- ✅ Integrate with existing socket handler
- ✅ Implement typing indicators during processing
- ✅ Add error handling and fallback messages
- ✅ Support multiple bots per campaign
- ✅ Use dedicated 'bot' participant type (distinct from 'system')

**Acceptance Criteria**:
- [x] Detects direct messages to configured chatbots (`recipient.type === 'bot'`)
- [x] Detects @mentions of chatbots in group chats
- [x] Routes messages to correct bot based on campaign config
- [x] Routes responses correctly (private vs room)
- [x] Shows typing indicators during processing
- [x] Handles errors gracefully with user-friendly messages
- [x] Supports multiple bots in same campaign
- [x] Integrates seamlessly with existing chat flow
- [x] Uses 'bot' participant type distinct from 'system' messages

**Files Created/Modified**:
- ✅ `packages/server/src/features/chatbots/chat-handler.mts` (new)
- ✅ `packages/server/src/features/chat/socket-handler.mts` (update)
- ✅ `packages/shared/src/schemas/socket/index.mts` (update - added 'bot' participant type)
- ✅ `packages/shared/src/types/socket/index.mts` (update - added ChatMetadata type)
- ✅ `packages/web/src/stores/chat.store.mts` (update - added 'bot' type support)
- ✅ `packages/server/src/features/chatbots/index.mts` (update)

---

### Task 6: Create Bot Configuration REST API ✅ COMPLETED

**Priority**: High  
**Dependencies**: Task 4, Task 5  
**Estimated Effort**: 2-3 days

**Description**: Create REST API endpoints for managing chatbot configurations.

**Implementation Details**:
- ✅ Create comprehensive REST API in `packages/server/src/features/chatbots/routes.mts`
- ✅ Implement CRUD endpoints for bot configuration
- ✅ Add bot connection testing endpoint
- ✅ Add bot health check endpoints
- ✅ Implement proper authentication and authorization
- ✅ Add validation for bot configurations
- ✅ Add endpoints for bot capabilities retrieval
- ✅ Add OpenAPI documentation for all endpoints

**Acceptance Criteria**:
- [x] CRUD operations for bot configurations work
- [x] Bot connection testing works correctly
- [x] Health check endpoints return proper status
- [x] Authentication and authorization are enforced
- [x] Input validation prevents invalid configurations
- [x] API documentation is complete
- [x] Error handling provides useful feedback

**Files Created/Modified**:
- ✅ `packages/server/src/features/chatbots/routes.mts` (comprehensive REST API)
- ✅ `packages/server/src/features/chatbots/controller.mts` (API controllers)
- ✅ API route registration (completed)
- ✅ OpenAPI documentation (completed)

---

### Task 7: Update Chat Socket Handler Integration ✅ COMPLETED

**Priority**: High  
**Dependencies**: Task 5  
**Estimated Effort**: 1-2 days

**Description**: Integrate chatbot processing into the existing chat socket handler.

**Implementation Details**:
- ✅ Update `packages/server/src/features/chat/socket-handler.mts`
- ✅ Add chatbot handler instantiation
- ✅ Integrate async chatbot processing (non-blocking)
- ✅ Load campaign-specific bot configurations
- ✅ Ensure existing chat functionality remains unchanged
- ✅ Add proper error handling for chatbot failures

**Acceptance Criteria**:
- [x] Chatbot processing doesn't block regular chat
- [x] Existing chat functionality works unchanged
- [x] Chatbot responses appear in correct chat rooms
- [x] Campaign-specific bots are loaded correctly
- [x] Error handling prevents chat system crashes
- [x] Socket events are properly typed
- [x] Multiple bots can operate simultaneously

**Files Created/Modified**:
- ✅ `packages/server/src/features/chat/socket-handler.mts` (updated with chatbot integration)

---

## Phase 2: Frontend Integration

### Task 6: Add Chatbots to Chat Contexts ✅ COMPLETED

**Priority**: High  
**Dependencies**: Task 5  
**Estimated Effort**: 1-2 days

**Description**: Update the frontend chat component to include configured chatbots as chat participants.

**Implementation Details**:
- ✅ Update `packages/web/src/components/chat/ChatComponent.vue`
- ✅ Add configured chatbots to chat contexts list
- ✅ Create special styling for 'bot' participant type (distinct from 'system')
- ✅ Add appropriate icons for different bot types (robot icon for bots)
- ✅ Update chat context switching logic
- ✅ Load campaign-specific bots dynamically via API
- ✅ Create ChatbotsClient for API communication
- ✅ Update API structure to use RESTful query parameters
- ✅ Fix response format validation for external chatbot APIs

**Acceptance Criteria**:
- [x] Configured chatbots appear in chat sidebar
- [x] Have distinctive icon and styling (different from system messages)
- [x] Can be selected as active chat context
- [x] Available based on campaign configuration
- [x] Switching to bot context works correctly
- [x] Multiple bots can be displayed simultaneously

**Files Created/Modified**:
- ✅ `packages/web/src/components/chat/ChatComponent.vue` (updated with bot support)
- ✅ `packages/client/src/chatbots.client.mts` (new API client)
- ✅ `packages/client/src/index.mts` (updated exports)
- ✅ `packages/server/src/features/chatbots/routes.mts` (updated API structure)
- ✅ `packages/server/src/features/chatbots/controller.mts` (updated methods)
- ✅ `packages/server/src/features/chatbots/service.mts` (fixed response validation)
- ✅ `packages/server/src/app.mts` (updated route mounting)

---

### Task 7: Implement Chatbot Message Styling ✅ COMPLETED

**Priority**: Medium  
**Dependencies**: Task 6  
**Estimated Effort**: 1 day

**Description**: Create distinctive styling for chatbot messages in the chat interface.

**Implementation Details**:
- ✅ Update chat message rendering in ChatComponent
- ✅ Add special styling for 'bot' participant type messages (distinct from 'system')
- ✅ Implement loading indicators during bot processing
- ✅ Add error state styling for failed bot responses
- ✅ Create consistent visual identity for AI responses
- ✅ Ensure clear distinction between bot and system messages

**Acceptance Criteria**:
- [x] Bot messages have distinctive appearance (different from system messages)
- [x] Loading indicators show during processing ("D&D 5e Assistant is thinking...")
- [x] Error states are clearly visible (⚠️ error messages with distinctive styling)
- [x] Styling is consistent with design system
- [x] Messages are clearly identifiable as AI responses
- [x] Clear visual distinction between 'bot' and 'system' message types

**Files Created/Modified**:
- ✅ `packages/web/src/components/chat/ChatComponent.vue` (updated with bot message styling, typing indicators, and error handling)

**Implementation Summary**:
- **Bot Message Detection**: Implemented `isBotMessage()` and `isSystemMessage()` functions to properly identify message types
- **Distinctive Styling**: Bot messages use blue-purple gradient background with border styling, distinct from system messages (yellow background)
- **Typing Indicators**: Added "is thinking..." indicators that appear during bot processing
- **Error State Styling**: Error messages display with warning icons (⚠️) and distinctive red styling
- **Visual Identity**: Bot messages are clearly identifiable with robot icons and consistent styling
- **Socket Event Handling**: Added proper handling for `chatbot:typing` and `chatbot:typing-stop` events

---

### Task 8: Add Universal Mention Support and Notification System ✅ COMPLETED

**Priority**: Medium  
**Dependencies**: Task 7  
**Estimated Effort**: 3-4 days

**Description**: Implement comprehensive @mention functionality for all participants (users, actors, bots) and add notification highlighting system for direct messages and mentions.

**Implementation Details**:
- ✅ **Universal Mention Support**:
  - ✅ Add auto-complete for all chat participants when typing @ in message input
  - ✅ Use case-insensitive matching against sidebar display names
  - ✅ Support mentions for users, actors, and bots
  - ✅ Implement mention detection and highlighting in messages
  - ✅ Create mention parsing logic for all participant types
  - ✅ Support various mention formats (@name, @"name with spaces", etc.)

- ✅ **Structured Mention Data System**:
  - ✅ Implement structured mention data instead of text parsing
  - ✅ Add mention schema to socket events
  - ✅ Extract mentions on frontend and send as structured data
  - ✅ Update server to use structured mention data for bot detection
  - ✅ Eliminate format compatibility issues between frontend and server

- ✅ **Bot Integration**:
  - ✅ Bot mentions trigger bot responses correctly using structured data
  - ✅ Character mentions work for all participant types
  - ✅ Reliable mention detection without regex parsing issues

**Acceptance Criteria**:
- [x] Auto-complete suggests all available participants when typing @
- [x] Case-insensitive matching works for all participant names
- [x] Mentions are visually highlighted in message input and chat
- [x] Bots respond to mentions in group chats using structured mention data
- [x] Structured mention data sent from client to server
- [x] Server uses structured data instead of text parsing
- [x] UI provides clear feedback for mentions and notifications
- [x] Supports various mention formats and participant name variations
- [x] No format compatibility issues between frontend (`@"Bot Name"`) and server

**Files Created/Modified**:
- ✅ `packages/shared/src/schemas/socket/index.mts` (updated - added mention schema and updated metadata)
- ✅ `packages/web/src/stores/chat.store.mts` (updated - added mention extraction and structured data)
- ✅ `packages/server/src/features/chatbots/chat-handler.mts` (updated - use structured mention data)
- ✅ `packages/web/src/components/chat/ChatComponent.vue` (updated - mention autocomplete and highlighting)
- ✅ `packages/web/src/components/chat/MentionInput.vue` (existing - mention autocomplete component)
- ✅ `packages/web/src/composables/useMentions.mts` (existing - mention detection and parsing)
- ✅ `packages/web/src/composables/useNotifications.mts` (existing - notification state management)
- ✅ `packages/shared/src/types/chat.mts` (existing - mention and notification types)

**Implementation Summary**:
- **Structured Mention System**: Replaced unreliable text parsing with structured mention data sent from client to server
- **Universal Autocomplete**: Implemented mention autocomplete for all participants (users, actors, bots) with case-insensitive matching
- **Bot Integration Fix**: Resolved critical issue where bot mentions weren't being forwarded due to format mismatches
- **Reliable Detection**: Server now uses structured mention data instead of regex parsing, eliminating edge cases
- **Performance Improvement**: Faster mention processing without complex text parsing on server
- **Type Safety**: Added proper TypeScript interfaces and schemas for mention data
- **Verified Working**: Tested end-to-end functionality with successful bot responses to mentions

---

## Phase 3: Enhanced Features

### Task 9: Implement Typing Indicators ✅ COMPLETED

**Priority**: Medium  
**Dependencies**: Task 4  
**Estimated Effort**: 1-2 days

**Description**: Add typing indicators to show when GM Assistant is processing a request.

**Implementation Details**:
- ✅ Add typing indicator socket events to server
- ✅ Implement typing indicator display in frontend
- ✅ Show "GM Assistant is typing..." during processing
- ✅ Handle timeout scenarios for long-running requests
- ✅ Integrate with existing typing indicator system

**Acceptance Criteria**:
- [x] Typing indicator appears when GM Assistant is processing
- [x] Indicator disappears when response is received
- [x] Handles timeout scenarios gracefully
- [x] Consistent with existing typing indicators
- [x] Works in both direct messages and group chats

**Files Created/Modified**:
- ✅ `packages/server/src/features/chatbots/chat-handler.mts` (implemented in Task 5)
- ✅ `packages/web/src/components/chat/ChatComponent.vue` (implemented in Task 7)
- ✅ `packages/shared/src/schemas/socket/index.mts` (implemented in Task 7)

**Implementation Summary**:
- **Typing Indicators**: Implemented as part of Task 7 - "is thinking..." indicators appear during bot processing
- **Socket Events**: Added proper handling for `chatbot:typing` and `chatbot:typing-stop` events
- **Visual Feedback**: Three dots appear in sidebar when bot is processing messages
- **Timeout Handling**: Indicators automatically clear when responses are received or timeout
- **Integration**: Works seamlessly with existing chat typing indicator system
- **Cross-Context**: Functions correctly in both direct messages and group chat mentions

---

### Task 10: Add Configuration and Environment Setup ✅ COMPLETED

**Priority**: High  
**Dependencies**: Task 1, Task 2  
**Estimated Effort**: 1 day

**Description**: Implement comprehensive configuration management for chatbot system.

**Implementation Details**:
- ✅ Add environment variables for chatbot system configuration
- ✅ Create database-driven bot configuration per campaign
- ✅ Add configuration validation via Zod schemas
- ✅ Implement graceful degradation when services are unavailable
- ✅ Create REST API for bot management and configuration

**Acceptance Criteria**:
- [x] System-level configuration options are implemented via environment variables
- [x] Bot-specific configuration is managed via database and REST API
- [x] Configuration validation is implemented via Zod schemas
- [x] Bots can be enabled/disabled per campaign via database
- [x] Graceful degradation when bot services are unavailable
- [x] Configuration errors are properly validated and reported

**Files Created/Modified**:
- ✅ `packages/server/src/config/index.mts` (updated with chatbot configuration)
- ✅ `packages/shared/src/schemas/chatbots.schema.mts` (configuration validation)
- ✅ `packages/server/src/features/chatbots/routes.mts` (REST API for configuration)
- ✅ `packages/server/src/features/chatbots/models.mts` (database schema)
- ✅ `packages/server/src/features/chatbots/controller.mts` (configuration management)

**Implementation Summary**:
- **System Configuration**: Environment variables for timeouts, retries, health checks, and concurrent requests
- **Bot Configuration**: Database-driven per-campaign bot configuration via REST API
- **Validation**: Comprehensive Zod schema validation for all configuration data
- **Management**: Full CRUD operations for bot configuration through REST API
- **Error Handling**: Proper validation and error reporting for configuration issues
- **Architecture**: Separation between system-level config (env vars) and bot-specific config (database)

---

### Task 11: Implement Error Handling and Resilience

**Priority**: High  
**Dependencies**: Task 4, Task 5  
**Estimated Effort**: 2 days

**Description**: Add comprehensive error handling and resilience features.

**Implementation Details**:
- Implement circuit breaker pattern for service calls
- Add exponential backoff for retries
- Create user-friendly error messages
- Add fallback responses when service is unavailable
- Implement request timeout handling
- Add error logging and monitoring

**Acceptance Criteria**:
- [ ] Service failures don't crash the chat system
- [ ] Users receive helpful error messages
- [ ] Automatic retry logic works correctly
- [ ] Circuit breaker prevents cascade failures
- [ ] Comprehensive error logging is in place

**Files to Create/Modify**:
- `packages/server/src/features/gm-assistant/service.mts` (update)
- `packages/server/src/features/gm-assistant/resilience.mts` (new)
- `packages/server/src/features/gm-assistant/errors.mts` (new)

---

### Task 12: Create Documentation and Testing

**Priority**: Medium  
**Dependencies**: All previous tasks  
**Estimated Effort**: 2-3 days

**Description**: Create comprehensive documentation and testing for the GM Assistant integration.

**Implementation Details**:
- Write user documentation for GM Assistant features
- Create developer documentation for the integration
- Write unit tests for service layer
- Create integration tests for chat flow
- Add performance tests for response times
- Document deployment and configuration

**Acceptance Criteria**:
- [ ] User documentation explains how to use GM Assistant
- [ ] Developer documentation covers integration details
- [ ] Unit tests cover core functionality
- [ ] Integration tests verify end-to-end flow
- [ ] Performance tests validate response times
- [ ] Deployment documentation is complete

**Files to Create/Modify**:
- `docs/gm-assistant-user-guide.md` (new)
- `docs/gm-assistant-developer-guide.md` (new)
- `packages/server/src/features/gm-assistant/__tests__/` (new directory)
- `packages/web/src/components/chat/__tests__/` (update)

---

## Additional Considerations

### Environment Setup Tasks

1. **Ollama Service Setup**
   - Ensure Ollama is installed and configured
   - Download required models (nomic-embed-text, llama3)
   - Configure Ollama service startup

2. **Vector Database Setup**
   - Verify Chroma database is properly initialized
   - Ensure D&D 5e content is loaded
   - Test vector search functionality

3. **Service Dependencies**
   - Create startup scripts for all services
   - Add health check monitoring
   - Configure service discovery

### Deployment Tasks

1. **Docker Configuration**
   - Create Dockerfile for FastAPI service
   - Update docker-compose for new service
   - Configure service networking

2. **Production Setup**
   - Configure reverse proxy for FastAPI service
   - Set up monitoring and logging
   - Configure backup and recovery

### Future Enhancement Tasks

1. **Streaming Responses**
   - Implement Server-Sent Events for real-time responses
   - Add progressive message updates
   - Handle streaming errors gracefully

2. **Context Awareness**
   - Integrate with character sheet data
   - Add campaign-specific knowledge
   - Implement session state awareness

3. **Advanced Features**
   - Add source citation display
   - Implement response caching
   - Add analytics and usage tracking

## Success Criteria

The GM Assistant integration will be considered successful when:

- [ ] Users can send direct messages to GM Assistant
- [ ] GM Assistant responds to @mentions in group chats
- [ ] Responses are accurate and helpful for D&D 5e rules
- [ ] System remains stable when AI service is unavailable
- [ ] Response times meet performance targets (< 30 seconds)
- [ ] Integration doesn't impact existing chat functionality
- [ ] User experience is intuitive and seamless

## Risk Mitigation

1. **Service Availability**: Implement graceful degradation and clear error messages
2. **Performance**: Add timeout handling and response time monitoring
3. **User Experience**: Provide clear feedback during processing and error states
4. **System Stability**: Ensure AI service failures don't impact core chat functionality
5. **Resource Usage**: Monitor and limit resource consumption of AI processing 