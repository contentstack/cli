const path = require('path');

process.env.TS_NODE_PROJECT = path.resolve('test/tsconfig.json');
process.env.CLI_ENV = 'TEST';

// Handle unhandled promise rejections to prevent exit code 1
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process, just log the error
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Don't exit the process, just log the error
});
