# WebSocket Architecture

1.  The client connects to the websocket server on startup. Use a composable?
2.  User joins a session. They can only join one session at a time.

    1. This sets the currentGameSession in pinia (backed by sessionStore?)
    2. Then it emits join-session(currentGameSession.id)
    3. The server checks authorization
    4. The server calls socket.join(currentGameSession.id)

3.  The client sends a message
    1.  Case 1: Client sends message with a roomm
        1.  Server checks room authorization
        2.  Server handles any server side processing of the message
        3.  Server forwards the message to the room by calling socket.to().emit
    2.  Case 2: Client sends a message without a room
        1. Client sends a message
        2. Server processes the message
        3. Server calls the client callback
