#!/bin/sh

# Start the API server in the background
node packages/server/dist/index.js &
SERVER_PID=$!

# Serve the static client
serve -s packages/client/dist -l 3000 &
CLIENT_PID=$!

# If either process exits, shut down the other
trap "kill $SERVER_PID $CLIENT_PID 2>/dev/null" EXIT

# Wait for both
wait $SERVER_PID $CLIENT_PID
