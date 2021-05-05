const {test} = require('@oclif/test')
const {cli} = require('cli-ux')
const Configstore  = require('configstore')
const config = new Configstore('contentstack_cli')
const {assert} = require('chai')

// function mockPrompt(arg, returns) {
//   return cli.prompt.withArgs(arg).returns(new Promise(function (resolve) {
//     resolve(returns)
//   }))
// }

describe('auth:tokens:add', () => {
  let promptIndex = 0
  let promptMock = () => {
    let prompts = ['myalias', 'blt1234', 'authtokenblt123', 'development']
    let prompt = prompts[promptIndex]
    promptIndex++
    return prompt
  }

  describe('Adding delivery token', () => {
    promptIndex = 0
    // eslint-disable-next-line no-undef
    before(function () {
      config.delete('tokens')
    })

    // eslint-disable-next-line no-undef
    beforeEach(() => {
      promptIndex = 0
    })

    test
    .stub(cli, 'prompt', () => async () => promptMock())
    .command(['auth:tokens:add', '-d'])
    // eslint-disable-next-line no-unused-vars
    .it('should runs auth:tokens:add successfully', ctx => {
      let managementTokens = config.get('tokens.myalias')
      assert.equal(managementTokens.token, 'authtokenblt123')
      assert.equal(managementTokens.environment, 'development')
      assert.equal(managementTokens.apiKey, 'blt1234')
      assert.equal(managementTokens.type, 'delivery')
    })

    test
    .stub(cli, 'prompt', () => async () => promptMock())
    .stub(cli, 'confirm', () => async () => 'yes')
    .command(['auth:tokens:add', '-d'])
    .it('should runs auth:tokens:add successfully when alias already exits with given name', () => {
      let managementTokens = config.get('tokens.myalias')
      assert.equal(managementTokens.token, 'authtokenblt123')
      assert.equal(managementTokens.environment, 'development')
      assert.equal(managementTokens.apiKey, 'blt1234')
      assert.equal(managementTokens.type, 'delivery')
    })

    test
    .stub(cli, 'prompt', () => async () => 'blt1234')
    .command(['auth:tokens:add', '-d', '-a', 'myalias', '-k', 'blt1234', '-t', 'authtokenblt123', '-f', '-e', 'development'])
    // eslint-disable-next-line no-unused-vars
    .it('should runs auth:tokens:add with command line argument', ctx => {
      let managementTokens = config.get('tokens.myalias')
      assert.equal(managementTokens.token, 'authtokenblt123')
      assert.equal(managementTokens.environment, 'development')
      assert.equal(managementTokens.apiKey, 'blt1234')
      assert.equal(managementTokens.type, 'delivery')
    })

    // eslint-disable-next-line no-undef
    after(function () {
      config.delete('tokens')
    })
  })

  describe('Adding management token', () => {
    // eslint-disable-next-line no-undef
    before(function () {
      config.delete('tokens')
    })

    // eslint-disable-next-line no-undef
    beforeEach(() => {
      promptIndex = 0
    })

    test
    .stub(cli, 'prompt', () => async () => promptMock())
    .command(['auth:tokens:add'])
    // eslint-disable-next-line no-unused-vars
    .it('should runs auth:tokens:add successfully', ctx => {
      let managementTokens = config.get('tokens.myalias')
      assert.equal(managementTokens.token, 'authtokenblt123')
      assert.equal(managementTokens.apiKey, 'blt1234')
      assert.equal(managementTokens.type, 'management')
    })

    test
    .stub(cli, 'prompt', () => async () => promptMock())
    .stub(cli, 'confirm', () => async () => 'yes')
    .command(['auth:tokens:add', '-m'])
    .stdout()
    // eslint-disable-next-line no-unused-vars
    .it('should runs auth:tokens:add successfully with management token flag true', ctx => {
      let managementTokens = config.get('tokens.myalias')
      assert.equal(managementTokens.token, 'authtokenblt123')
      assert.equal(managementTokens.apiKey, 'blt1234')
      assert.equal(managementTokens.type, 'management')
      // expect(ctx.stdout).to.contain('"myalias" token replaced successfully!')
    })

    test
    .stub(cli, 'prompt', () => async () => promptMock())
    .stub(cli, 'confirm', () => async () => 'yes')
    .command(['auth:tokens:add'])
    .it('should runs auth:tokens:add successfully when alias already exits with given name', () => {
      let managementTokens = config.get('tokens.myalias')
      assert.equal(managementTokens.token, 'authtokenblt123')
      assert.equal(managementTokens.apiKey, 'blt1234')
      assert.equal(managementTokens.type, 'management')
    })

    test
    .stub(cli, 'prompt', () => async () => 'blt1234')
    .command(['auth:tokens:add', '-a', 'myalias', '-k', 'blt1234', '-t', 'authtokenblt123', '-f'])
    // eslint-disable-next-line no-unused-vars
    .it('should runs auth:tokens:add with command line argument', ctx => {
      let managementTokens = config.get('tokens.myalias')
      assert.equal(managementTokens.token, 'authtokenblt123')
      assert.equal(managementTokens.apiKey, 'blt1234')
      assert.equal(managementTokens.type, 'management')
    })

    // eslint-disable-next-line no-undef
    after(function () {
      config.delete('tokens')
    })
  })
})
