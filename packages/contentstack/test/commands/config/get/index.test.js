const {expect, test} = require('@oclif/test')
const sinon = require('sinon')
const {Command} = require('@contentstack/cli-command')
const Configstore = require('configstore')
const config = require('../../../mockdata/config.js')

// expected outputs for different cases
const getConfigSuccess = require('../../../expected-outputs/get-config-success.js')
const getConfigKeyDoesntExist = require('../../../expected-outputs/get-config-failure.js')
const getConfigPluginKeySuccessfully = require('../../../expected-outputs/get-config-plugin-success.js')
const getConfigPluginObjectSuccessfully = require('../../../expected-outputs/get-config-object-success.js')

describe('test get config method', () => {
  test
  .stdout()
  .stub(Configstore.prototype, 'get', key => config[key])
  .stub(Command.prototype, 'region', () => {
    return {name: 'dummy'}
  })
  .command(['config:get', '--key', 'one'])
  .it('successfully get the config for the given key', ctx => {
    expect(ctx.stdout).to.equal(getConfigSuccess)
  })

  test
  .stdout()
  .command(['config:get', '--key', 'something'])
  .catch(error => {
    expect(error.message).to.equal(getConfigKeyDoesntExist)
  })
  .it('fail to get the config for the given key')

  test
  .stdout()
  .stub(Configstore.prototype, 'get', key => config[key])
  .stub(Command.prototype, 'region', () => {
    return {name: 'dummy'}
  })
  .command(['config:get', '--key', 'pirates', '--plugin', 'pirates'])
  .it('get config for the given key from a plugin', ctx => {
    expect(ctx.stdout).to.equal(getConfigPluginKeySuccessfully)
  })

  test
  .stdout()
  .stub(Configstore.prototype, 'get', key => config[key])
  .stub(Command.prototype, 'region', () => {
    return {name: 'dummy'}
  })
  .command(['config:get', '--key', 'plugins'])
  .it('get config for the given key, when value is an object', ctx => {
    expect(ctx.stdout).to.equal(getConfigPluginObjectSuccessfully)
  })
})
