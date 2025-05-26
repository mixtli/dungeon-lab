# GM Assistant Integration - Implementation Tasks

## Overview

This document outlines the implementation tasks for integrating the GM Assistant into DungeonLab as a chat participant. Tasks are organized by phase and component, with clear dependencies and acceptance criteria.

## Phase 1: Core Integration

### Task 1: Convert GM Assistant to FastAPI Service

**Priority**: High  
**Dependencies**: None  
**Estimated Effort**: 2-3 days

**Description**: Convert the existing Python CLI GM Assistant to a FastAPI web service that can be called via HTTP.

**Implementation Details**:
- Create new `ai-workflows/src/gm_assistant/api.py` with FastAPI application
- Implement health check endpoints (`/health`, `/status`)
- Create chat endpoint (`POST /chat`) with request/response schemas
- Add session management for conversation memory
- Implement proper error handling and logging
- Add configuration management for Ollama settings
- Create requirements.txt with FastAPI dependencies

**Acceptance Criteria**:
- [ ] FastAPI service starts successfully on port 8000
- [ ] Health check endpoint returns 200 status
- [ ] Chat endpoint accepts messages and returns D&D rule responses
- [ ] Service maintains conversation memory per session
- [ ] Proper error responses for invalid requests
- [ ] Service can be started/stopped cleanly

**Files to Create/Modify**:
- `ai-workflows/src/gm_assistant/api.py` (new)
- `ai-workflows/src/gm_assistant/requirements.txt` (update)
- `ai-workflows/src/gm_assistant/config.py` (new)

---

### Task 2: Create GM Assistant Service Layer in Express

**Priority**: High  
**Dependencies**: Task 1  
**Estimated Effort**: 2 days

**Description**: Create the Express server service layer to communicate with the FastAPI GM Assistant service.

**Implementation Details**:
- Create `packages/server/src/features/gm-assistant/` directory structure
- Implement `service.mts` with HTTP client for FastAPI communication
- Create TypeScript interfaces in `types.mts`
- Add configuration management in `config.mts`
- Implement retry logic and error handling
- Add health check integration
- Create connection pooling for HTTP requests

**Acceptance Criteria**:
- [ ] Service can successfully communicate with FastAPI GM Assistant
- [ ] Proper error handling for service unavailable scenarios
- [ ] Health checks work correctly
- [ ] Configuration loads from environment variables
- [ ] Retry logic works for failed requests
- [ ] TypeScript types are properly defined

**Files to Create/Modify**:
- `packages/server/src/features/gm-assistant/service.mts` (new)
- `packages/server/src/features/gm-assistant/types.mts` (new)
- `packages/server/src/features/gm-assistant/config.mts` (new)
- `packages/server/src/features/gm-assistant/index.mts` (new)

---

### Task 3: Create Shared Types for GM Assistant

**Priority**: Medium  
**Dependencies**: None  
**Estimated Effort**: 1 day

**Description**: Define shared TypeScript types and schemas for GM Assistant functionality.

**Implementation Details**:
- Create `packages/shared/src/types/gm-assistant.mts`
- Define interfaces for messages, responses, configuration
- Add Zod schemas for validation
- Update socket event schemas to include GM Assistant events
- Export types from shared package index

**Acceptance Criteria**:
- [ ] All GM Assistant types are properly defined
- [ ] Zod schemas validate correctly
- [ ] Types are exported and accessible from shared package
- [ ] Socket event schemas include GM Assistant events
- [ ] No TypeScript compilation errors

**Files to Create/Modify**:
- `packages/shared/src/types/gm-assistant.mts` (new)
- `packages/shared/src/schemas/gm-assistant.schema.mts` (new)
- `packages/shared/src/types/index.mts` (update)
- `packages/shared/src/schemas/socket/index.mts` (update)

---

### Task 4: Implement GM Assistant Chat Handler

**Priority**: High  
**Dependencies**: Task 2, Task 3  
**Estimated Effort**: 2-3 days

**Description**: Create the chat handler that detects GM Assistant messages and processes them.

**Implementation Details**:
- Create `packages/server/src/features/gm-assistant/chat-handler.mts`
- Implement message detection logic (direct messages, mentions)
- Add response routing for different message types
- Integrate with existing socket handler
- Implement typing indicators during processing
- Add error handling and fallback messages
- Create constants for GM Assistant ID and name

**Acceptance Criteria**:
- [ ] Detects direct messages to GM Assistant
- [ ] Detects @mentions of GM Assistant in group chats
- [ ] Routes responses correctly (private vs room)
- [ ] Shows typing indicators during processing
- [ ] Handles errors gracefully with user-friendly messages
- [ ] Integrates seamlessly with existing chat flow

**Files to Create/Modify**:
- `packages/server/src/features/gm-assistant/chat-handler.mts` (new)
- `packages/server/src/features/chat/socket-handler.mts` (update)

---

### Task 5: Update Chat Socket Handler Integration

**Priority**: High  
**Dependencies**: Task 4  
**Estimated Effort**: 1 day

**Description**: Integrate GM Assistant processing into the existing chat socket handler.

**Implementation Details**:
- Update `packages/server/src/features/chat/socket-handler.mts`
- Add GM Assistant handler instantiation
- Integrate async GM Assistant processing (non-blocking)
- Ensure existing chat functionality remains unchanged
- Add proper error handling for GM Assistant failures

**Acceptance Criteria**:
- [ ] GM Assistant processing doesn't block regular chat
- [ ] Existing chat functionality works unchanged
- [ ] GM Assistant responses appear in correct chat rooms
- [ ] Error handling prevents chat system crashes
- [ ] Socket events are properly typed

**Files to Create/Modify**:
- `packages/server/src/features/chat/socket-handler.mts` (update)

---

## Phase 2: Frontend Integration

### Task 6: Add GM Assistant to Chat Contexts

**Priority**: High  
**Dependencies**: Task 5  
**Estimated Effort**: 1-2 days

**Description**: Update the frontend chat component to include GM Assistant as a chat participant.

**Implementation Details**:
- Update `packages/web/src/components/chat/ChatComponent.vue`
- Add GM Assistant to chat contexts list
- Create special styling for system user type
- Add robot icon for GM Assistant
- Update chat context switching logic
- Ensure GM Assistant appears in all game sessions

**Acceptance Criteria**:
- [ ] GM Assistant appears in chat sidebar
- [ ] Has distinctive icon and styling
- [ ] Can be selected as active chat context
- [ ] Available in all game sessions
- [ ] Switching to GM Assistant context works correctly

**Files to Create/Modify**:
- `packages/web/src/components/chat/ChatComponent.vue` (update)

---

### Task 7: Implement GM Assistant Message Styling

**Priority**: Medium  
**Dependencies**: Task 6  
**Estimated Effort**: 1 day

**Description**: Create distinctive styling for GM Assistant messages in the chat interface.

**Implementation Details**:
- Update chat message rendering in ChatComponent
- Add special styling for system messages from GM Assistant
- Implement loading indicators during GM Assistant processing
- Add error state styling for failed GM Assistant responses
- Create consistent visual identity for AI responses

**Acceptance Criteria**:
- [ ] GM Assistant messages have distinctive appearance
- [ ] Loading indicators show during processing
- [ ] Error states are clearly visible
- [ ] Styling is consistent with design system
- [ ] Messages are clearly identifiable as AI responses

**Files to Create/Modify**:
- `packages/web/src/components/chat/ChatComponent.vue` (update)
- `packages/web/src/assets/styles/chat.css` (update or create)

---

### Task 8: Add Mention Support and Auto-complete

**Priority**: Medium  
**Dependencies**: Task 7  
**Estimated Effort**: 2 days

**Description**: Implement @mention functionality for GM Assistant in group chats.

**Implementation Details**:
- Add auto-complete for `@gm assistant` in message input
- Implement mention detection and highlighting
- Add visual indicators when GM Assistant is mentioned
- Create mention parsing logic
- Update message input component with mention support

**Acceptance Criteria**:
- [ ] Auto-complete suggests GM Assistant when typing @
- [ ] Mentions are visually highlighted in input
- [ ] GM Assistant responds to mentions in group chats
- [ ] Mention parsing works correctly
- [ ] UI provides clear feedback for mentions

**Files to Create/Modify**:
- `packages/web/src/components/chat/ChatComponent.vue` (update)
- `packages/web/src/components/chat/MentionInput.vue` (new)
- `packages/web/src/composables/useMentions.mts` (new)

---

## Phase 3: Enhanced Features

### Task 9: Implement Typing Indicators

**Priority**: Medium  
**Dependencies**: Task 4  
**Estimated Effort**: 1-2 days

**Description**: Add typing indicators to show when GM Assistant is processing a request.

**Implementation Details**:
- Add typing indicator socket events to server
- Implement typing indicator display in frontend
- Show "GM Assistant is typing..." during processing
- Handle timeout scenarios for long-running requests
- Integrate with existing typing indicator system

**Acceptance Criteria**:
- [ ] Typing indicator appears when GM Assistant is processing
- [ ] Indicator disappears when response is received
- [ ] Handles timeout scenarios gracefully
- [ ] Consistent with existing typing indicators
- [ ] Works in both direct messages and group chats

**Files to Create/Modify**:
- `packages/server/src/features/gm-assistant/chat-handler.mts` (update)
- `packages/web/src/components/chat/ChatComponent.vue` (update)
- `packages/shared/src/schemas/socket/index.mts` (update)

---

### Task 10: Add Configuration and Environment Setup

**Priority**: High  
**Dependencies**: Task 1, Task 2  
**Estimated Effort**: 1 day

**Description**: Implement comprehensive configuration management for GM Assistant feature.

**Implementation Details**:
- Add environment variables for GM Assistant configuration
- Create feature flags for enabling/disabling functionality
- Add configuration validation
- Implement graceful degradation when service is disabled
- Create documentation for configuration options

**Acceptance Criteria**:
- [ ] All configuration options are documented
- [ ] Environment variables are properly validated
- [ ] Feature can be disabled via configuration
- [ ] Graceful degradation when service is unavailable
- [ ] Configuration errors are clearly reported

**Files to Create/Modify**:
- `packages/server/src/config/gm-assistant.config.mts` (new)
- `.env.example` (update)
- `README.md` (update)

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