const path = require('path')
process.env.TS_NODE_PROJECT = path.resolve('test/tsconfig.json')
process.env.NODE_ENV = 'development'

global.oclif = global.oclif || {}
global.oclif.columns = 80

// Minimal test helper for unit tests
module.exports = {
  // Basic test utilities can be added here
}
