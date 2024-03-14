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
    // var spy = sinon.stub(inquirer, 'prompt')
    messages.cloneTypeSelection()
   // expect(spy.calledOnce).to.be.true
  })


test
  .it('getStack function', async () => {
    var spy = sinon.stub(messages, 'getStack')
    messages.getStack()
    expect(spy.calledOnce).to.be.true
  })


test
  .it('cmdExport function', async () => {
    // var spy = sinon.spy(messages, 'cmdExport')
    messages.cmdExport();
   // expect(spy.calledOnce).to.be.true
  })

test
  .it('start function', async () => {
    messages.start();
   // expect(spy.calledOnce).to.be.true
  })  
  
test
  .it('cmdImport function', async () => {
    var spy = sinon.spy(messages, 'cmdImport')
    messages.cmdImport();
    expect(spy.calledOnce).to.be.true
  })   

test
.it('createNewStack function', async () => {
  var spy = sinon.spy(messages, 'createNewStack')
  messages.createNewStack('dummyOrg');
  expect(spy.calledOnce).to.be.true
})
})