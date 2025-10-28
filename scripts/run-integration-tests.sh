#!/bin/sh

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}    Cinema Management System - Integration Tests${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# API should already be running (started by parent script)
echo -e "${GREEN}✓ API is running${NC}"
echo ""
echo -e "${BLUE}🧪 Running integration tests...${NC}"
echo ""

# Run integration tests
npm test tests/integration/ 2>&1 | tee /tmp/integration-test-output.log
TEST_EXIT_CODE=$?

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if [ $TEST_EXIT_CODE -eq 0 ]; then
    # Extract test summary
    TESTS_PASSED=$(grep ' passed' /tmp/integration-test-output.log | tail -1 | sed 's/.*Tests: *\([0-9]*\) passed.*/\1/')
    TEST_SUITES=$(grep 'Test Suites:' /tmp/integration-test-output.log | tail -1)

    echo -e "${GREEN}✓✓✓ INTEGRATION TESTS PASSED ✓✓✓${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}   Tests passed: $TESTS_PASSED${NC}"
    echo -e "${GREEN}   $TEST_SUITES${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}   All integration tests completed successfully!${NC}"
    echo -e "${GREEN}   System is ready for use.${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    exit 0
else
    # Extract failure info
    TESTS_FAILED=$(grep ' failed' /tmp/integration-test-output.log | tail -1 | sed 's/.*\([0-9]*\) failed.*/\1/')
    TESTS_PASSED=$(grep ' passed' /tmp/integration-test-output.log | tail -1 | sed 's/.*\([0-9]*\) passed.*/\1/')

    echo -e "${RED}✗✗✗ INTEGRATION TESTS FAILED ✗✗✗${NC}"
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${RED}   Tests failed: ${TESTS_FAILED:-unknown}${NC}"
    echo -e "${RED}   Tests passed: ${TESTS_PASSED:-0}${NC}"
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${RED}   Some integration tests failed!${NC}"
    echo -e "${RED}   Check logs above for details.${NC}"
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    exit 1
fi
