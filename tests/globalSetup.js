// Global setup - runs once before all test suites
const app = require('../src/server');

module.exports = async () => {
  // Use port 3002 for tests to avoid conflict with dev server on 3000
  const PORT = 3002;

  return new Promise((resolve, reject) => {
    const server = app.listen(PORT, () => {
      console.log(`✓ Global test server started on port ${PORT}`);
      // Store server in global so teardown can access it
      global.__TEST_SERVER__ = server;
      resolve();
    }).on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`Port ${PORT} is in use, assuming server already running`);
        resolve();
      } else {
        reject(err);
      }
    });
  });
};
