// Global teardown - runs once after all test suites
module.exports = async () => {
  const server = global.__TEST_SERVER__;

  if (server) {
    return new Promise((resolve) => {
      server.close(() => {
        console.log('✓ Global test server closed');
        resolve();
      });
    });
  }
};
