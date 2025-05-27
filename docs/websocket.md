# WebSocket Architecture

DungeonLab uses Socket.io for real-time communication between the web client and server. This enables synchronized game state, real-time chat, and collaborative features.

## Connection Flow

1. **Client Connection**
   - The web client connects to the websocket server on startup using a Vue composable
   - Connection is established at `/socket.io/` endpoint
   - Authentication is handled via session cookies

2. **Session Management**
   - Users can only join one game session at a time
   - When joining a session:
     1. `currentGameSession` is set in Pinia store
     2. Client emits `join-session` event with session ID
     3. Server validates user authorization for the session
     4. Server calls `socket.join(sessionId)` to add user to room

## Message Patterns

### Room-based Messages
For messages that should be broadcast to all users in a game session:

1. Client sends message with room context
2. Server validates room authorization
3. Server processes any server-side logic
4. Server broadcasts to room using `socket.to(roomId).emit(event, data)`

**Example Events:**
- `chat-message`: Chat messages within a session
- `actor-update`: Character/NPC updates
- `map-update`: Map changes
- `initiative-update`: Combat initiative changes

### Direct Messages
For messages between client and server without room broadcasting:

1. Client sends message to server
2. Server processes the message
3. Server responds directly to the client via callback or direct emit

**Example Events:**
- `get-user-data`: Fetch user profile
- `validate-action`: Validate a game action
- `error`: Error notifications

## Event Naming Convention

- Use kebab-case for event names
- Prefix with feature area when appropriate (e.g., `chat-`, `map-`, `combat-`)
- Use descriptive names that indicate the action

## Authentication & Authorization

- WebSocket connections inherit session authentication from HTTP
- Room authorization is checked on every room-based operation
- Users are automatically removed from rooms when they disconnect

## Error Handling

- Server emits `error` events for validation failures
- Client should handle connection failures and implement reconnection logic
- Room authorization failures result in disconnection from the room

## Implementation Notes

- Uses Socket.io v4.x
- Client implementation in `packages/web/src/composables/useSocket.ts`
- Server implementation in `packages/server/src/websocket/`
- Room management handled by Socket.io's built-in room system
