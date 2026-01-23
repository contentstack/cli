// Test initialization helper
const path = require('path');

process.env.TS_NODE_PROJECT = path.resolve('test/tsconfig.json');
process.env.NODE_ENV = 'test';

// Suppress debug output during tests
process.env.DEBUG = '';
