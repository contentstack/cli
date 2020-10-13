const {expect, test} = require('@oclif/test')
const Configstore  = require('configstore')
const config = new Configstore('contentstack_cli')

describe('whoami', () => {
  // eslint-disable-next-line no-undef
  before(function () {
    config.set('email', 'ninja@something.com')
  })

  test
  .stdout()
  .command(['whoami'])
  .it('runs whoami', ctx => {
    expect(ctx.stdout).to.contain('You are currently logged in with email: ninja@something.com')
  })

  //eslint-disable-next-line no-undef
  afterEach(function () {
    config.delete('email')
  })

  test
  .stdout()
  .command(['whoami'])
  .it('whoami should shows error when not logged in', ctx => {
    expect(ctx.stdout).to.contain('You are not logged in. Please login with command $ csdx auth:login')
  })
})
