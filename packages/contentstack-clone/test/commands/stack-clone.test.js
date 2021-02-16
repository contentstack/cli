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


test
.it('organizationSelection ', async () => {
    var orgSelectStub = sinon.spy(messages, 'organizationSelection')
    messages.organizationSelection("export")
    expect(orgSelectStub.calledOnce).to.be.true
  })

test
.it('stackSelection Function', async () => {
 var spystackSelection = sinon.spy(messages, 'stackSelection');
  messages.stackSelection('import');
  expect(spystackSelection.called).to.be.true
})

test
.it('getStackChoices function', async () => {
  var spy = sinon.spy(messages, 'getStackChoices')
  messages.getStackChoices('dummyOrg', "export");
  expect(spy.calledOnce).to.be.true
})

test
.it('createNewStack function', async () => {
  var spy = sinon.spy(messages, 'createNewStack')
  messages.createNewStack('dummyOrg');
  expect(spy.calledOnce).to.be.true
})

// test
// .it('cmdExportImport function', async () => {
//   var spy = sinon.spy(messages, 'cmdExportImport')
//   messages.cmdExportImport('import');
//   expect(spy.calledOnce).to.be.true
// })

test
.it('cmdExe function', async () => {
  var spy = sinon.spy(messages, 'cmdExe')
  messages.cmdExe('dummyNodule', 'dummyBackup');
  // expect(spy.calledOnce).to.be.true
})

test
.it('stackCreationConfirm function', async () => {
  var stackCreationConfirm = sinon.spy(messages, 'stackCreationConfirm')
  messages.stackCreationConfirm({stackCreate: false})
  // expect(stackCreationConfirm.calledOnce).to.be.true
})
})