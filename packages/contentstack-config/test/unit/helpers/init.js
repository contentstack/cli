const path = require('path');

process.env.TS_NODE_PROJECT = path.resolve('test/tsconfig.json');
process.env.CLI_ENV = 'TEST';
