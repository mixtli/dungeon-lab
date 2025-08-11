# Encounter handling

I believe that we should never change the encounter state via the REST API.  
I think the workflow should be something like this:

1. User creates an encounter using the existing interface (via REST).  
It starts in the "stopped" state.
2. User must join a game session
3. User presses "Start Encounter" button
4. User's client sends a gameAction:request as always.  With a type of 'start-encounter' or
   somthing along those lines.  It contains the encounter id in the payload.
5. The server forwards it to the GM client via gameAction:forward as always.
6. The GM client uses its action handler to handle it.  The handler should:
7. Send an event to the server (encounter:start) with the encounter id.
8. The server changes the state of the encounter to 'in_progress'.
9. The server queries the full encounter from mongo and returns it in the socket.io callback
10. The GM client then sends gameAction:update to replace the gameState.currentEncounter with the encounter data.
11. And everything from there happens as it normally does.   Server updates the mongo game state and broadcasts gameState:updated

The start button should only appear if there is no currentEncounter in the game state and the state is 'stopped'.

Now, for the stop workflow, it's very similar except the server will update the encounter mongo object from the gameState.currentEncounter 
1. User presses stop encounter
2. User client sends gameAction:request with something like 'stop-encounter' and the encounter id.
3. yada dada, it makes it to the GM client
4. The GM client send encounter:stop message to server.
5. Server reads the currentEncounter data from the current gameState.
6. Server overwrites the encounter data in mongo with the current encounter data.
7. Server sets the state on the encounter to 'stopped'
8. Server sends success callback
9. GM client then sends a gameState:update message to set currentEncounter to null.
10. Normal workflow completes, clients get updated.


The point of all this is that encounters "happen" during sessions.  And during a session, the encounter state is kept as part of the game state.  So when we start an encounter, we need to initialize the game state, but when we stop an encounter, we need to sync our changes back to the encounter and clear the game state.

The other point is that we want to follow our existing architectural principles such as GM authority.  See docs/architecture/*.md.  Much of this is already implemented.  We have an action handler that is run by the GM, a state update mechanism that must be adhered to, etc.


