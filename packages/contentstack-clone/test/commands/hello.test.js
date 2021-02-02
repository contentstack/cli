const {expect, test} = require('@oclif/test')
const {CloneHandler} = require('../../src/lib/util/clone-handler')
const sinon = require('sinon')
let config = require('../dummyConfig/index')


describe('hello', async () => {
  // let cloneHandler = new CloneHandler(config)
  
  test
  .stub(CloneHandler.prototype, 'organizationSelection', sinon.stub().callsFake(function () {
  }))
  .stdout()
  .command(['cm:stack-clone'])
  .it('OrganizationList', ctx => {
    expect(ctx.stdout).to.equal()
  })

  // test
  // .stub(cloneHandler, 'stackSelection', sinon.stub().callsFake(function () {
  //   return Promise.resolve()
  // }))
  // .stdout()
  // // .command(['cm:stack-clone'])
  // .it('stackList Details', ctx => {
  //   expect(ctx.stdout).to.equal()
  // })
})
