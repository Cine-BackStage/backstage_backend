#!/bin/sh

# Start the API server in the background
npm run dev &
API_PID=$!

# Wait longer for the server to fully start
sleep 20

# Run integration tests (non-blocking, in background)
/app/scripts/run-integration-tests.sh &

# Keep the API running regardless of test results
wait $API_PID
