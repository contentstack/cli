const {expect, test} = require('@oclif/test') 
const assets = require('chai')
const {CloneHandler, client} = require('../../src/lib/util/clone-handler')
const sinon = require('sinon')
let config = require('../dummyConfig/index')
let inquirer = require('inquirer')
const messages = new CloneHandler(config)

describe('stack Clone Test', () => {
test
.stub(CloneHandler.prototype, 'organizationSelection', sinon.stub().callsFake(function () {
  return Promise.resolve()
}))
.stdout()
.command(['cm:stack-clone'])
.it('OrganizationList', ctx => {
})

test
  .it('cloneTypeSelection function', async () => {
    var spy = sinon.stub(inquirer, 'prompt')
    messages.cloneTypeSelection()
    // expect(spy.calledOnce).to.be.true
  })

  describe('stack Clone Test', () => {
  test
.it('start function', async () => {
  var spy = sinon.spy(messages, 'start')
  messages.start();
  expect(spy.calledOnce).to.be.true
})
})

test
.it('createNewStack function', async () => {
  var spy = sinon.spy(messages, 'createNewStack')
  messages.createNewStack('dummyOrg');
  expect(spy.calledOnce).to.be.true
})
})