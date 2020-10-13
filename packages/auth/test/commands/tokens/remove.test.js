const {expect, test} = require('@oclif/test')
const Configstore  = require('configstore')
const config = new Configstore('contentstack_cli')
const {assert} = require('chai')
const inquirer = require('inquirer')

describe('auth:tokens:remove', () => {
  // eslint-disable-next-line no-unused-vars
  let backup = {}
  // eslint-disable-next-line no-undef
  describe('Removes tokens successfully', () => {
    // eslint-disable-next-line no-undef
    beforeEach(function () {
      config.set('tokens.removeToken', {
        token: 'blt1234',
        apiKey: 'authtokenblt123',
        type: 'management',
      })
      backup = inquirer.prompt
      // eslint-disable-next-line no-unused-vars
      inquirer.prompt = questions => Promise.resolve({selectedTokens: ['removeToken: blt1234 : authtokenblt123: management']})
    })

    test
    .command(['auth:tokens:remove'])
    .it('should remove selected token from config', () => {
      let token = config.get('tokens.removeToken')
      assert.equal(token, undefined)
    })

    test
    .command(['auth:tokens:remove', '-a', 'removeToken'])
    // eslint-disable-next-line no-unused-vars
    .it('should runs auth:tokens:remove with command line argument and remove token from config', ctx => {
      let token = config.get('tokens.removeToken')
      assert.equal(token, undefined)
    })
  })

  describe('Fail auth:tokens:remove', () => {
    // eslint-disable-next-line no-undef
    before(() => {
      config.delete('tokens')
    })
    test
    .stdout()
    .command(['auth:tokens:remove', '-a', 'removeToken'])
    .it('Should show error message as token does not exits', ctx => {
      expect(ctx.stdout).to.equal('No tokens are added yet.\n')
    })
  })

  describe('Exit without selection', () => {
    // eslint-disable-next-line no-undef
    before(() => {
      config.set('tokens.removeToken', {
        token: 'blt1234',
        apiKey: 'authtokenblt123',
        type: 'management',
      })
      // eslint-disable-next-line no-unused-vars
      inquirer.prompt = questions => Promise.resolve({selectedTokens: []})
    })

    test
    .stdout()
    .command(['auth:tokens:remove'])
    .it('Should exit without removing the token', ctx => {
      let mToken = config.get('tokens.removeToken')
      expect(mToken.token).to.equal('blt1234')
    })
    // eslint-disable-next-line no-undef
    after(() => {
      config.delete('tokens')
    })
  })
})
