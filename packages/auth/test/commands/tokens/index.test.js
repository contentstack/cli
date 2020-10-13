const {expect, test} = require('@oclif/test')
const Configstore  = require('configstore')
const config = new Configstore('contentstack_cli')

// function mockPrompt(arg, returns) {
//   return cli.prompt.withArgs(arg).returns(new Promise(function (resolve) {
//     resolve(returns)
//   }))
// }

describe('auth:tokens', () => {
  describe('auth:tokens positive', () => {
    // eslint-disable-next-line no-undef
    before(function () {
      config.delete('tokens')
      config.set('tokens', {firstAlias: {token: 'dummyToken',
        apiKey: 'blt123',
        type: 'management'}, secondAlias: {token: 'dummySecToken',
        apiKey: '***REMOVED***',
        environment: 'development',
        type: 'delivery'},
      })
    })
    test
    .stdout()
    .command(['auth:tokens'])
    .it('should list all the tokens in tabular format', ctx => {
      expect(ctx.stdout).to.equal(`Alias       Token         Apikey  Environment Type       
firstAlias  dummyToken    blt123  -           management 
secondAlias dummySecToken ***REMOVED*** development delivery   
`)
    })
  })

  describe('auth:tokens negative', () => {
    // eslint-disable-next-line no-undef
    before(function () {
      config.delete('tokens')
    })
    test
    .stdout()
    .command(['auth:tokens'])
    .it('should list all the tokens in tabular format', ctx => {
      expect(ctx.stdout).to.equal('No tokens are added. Use auth:tokens:add command to add tokens.\n')
    })
  })
})

