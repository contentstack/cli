const {expect, test} = require('@oclif/test')
const Configstore = require('configstore')
const config = require('../../../mockdata/config.js')

// expected outputs for different cases
const setSuccess = require('../../../expected-outputs/set-config.success.js')

// set value to a key
test
.stub(Configstore.prototype, 'set', (key, value) => {
  config[key] = value
})
.command(['config:set', '--key', 'something', '--value', 'something'])
.it('set value to a key', ctx => {
  expect(ctx.stdout).to.equal(setSuccess)
})

// set value when a key already exists

// set value to a key within a plugin
// test
// .stdout()
// .stub(Configstore.prototype, 'all', () => config)
// .stub(Configstore.prototype, 'set', (key, value) => {
//   config[key] = value
// })
// .command(['config:set', '--key', 'something', '--value', 'something', '--plugin', 'something'])
// .it('set value to a key', ctx => {
//   debugger
// })
// set value to a key within a plugin when it already exists
// try to set values to keys which are unmodifiable
// try to set values which are not appropriate, for example value for tokens and plugins should always be an object
