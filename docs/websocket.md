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
     4. Server calls `socket.join(`session:${sessionId}`)` to add user to session room

## Message Patterns

### Session-based Messages
All real-time messages are broadcast within game session rooms:

1. Client sends message with `sessionId` included in event data
2. Server validates session authorization (checks if user is in session)
3. Server processes any server-side logic
4. Server broadcasts to session room using `socket.to(`session:${sessionId}`).emit(event, data)`

**Example Events:**
- `chat-message`: Chat messages within a session
- `token:move`: Token movement in encounters
- `token:create`: Token creation
- `token:update`: Token property updates
- `token:delete`: Token removal

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
- Session authorization is checked on every session-based operation
- Users are automatically removed from session rooms when they disconnect
- Authorization is simplified: users must be members of the game session (participantIds) or be the game master

## Error Handling

- Server emits callback responses with success/error status for token operations
- Client should handle connection failures and implement reconnection logic
- Session authorization failures result in error callbacks and potential disconnection

## Implementation Notes

- Uses Socket.io v4.x
- Client implementation uses Pinia stores for socket management
- Server implementation in `packages/server/src/websocket/` and feature-specific handlers
- Session room management handled by Socket.io's built-in room system
- No encounter-specific rooms - all real-time events use session rooms
