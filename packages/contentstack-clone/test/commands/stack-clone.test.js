const {expect, test} = require('@oclif/test')
const assert = require('chai')
const {CloneHandler, client} = require('../../src/lib/util/clone-handler')
const sinon = require('sinon')
let config = require('../dummyConfig/index')
let inquirer = require('inquirer')


const messages = new CloneHandler(config)

let questions = [{
  type: 'list',
  name: 'Organization',
  message: 'Choose Organization ...',
  choices: ["Rohit Personal", "Rahul"],
}]

describe('stack Clone Test', () => {

  beforeEach(() => {
    sinon.reset();
  });

  test
  .stub(CloneHandler.prototype, 'organizationSelection', sinon.stub().callsFake(function () {
    return Promise.resolve()
  }))
  .stdout()
  .command(['cm:stack-clone'])
  .it('OrganizationList', ctx => {
    expect(ctx.stdout).to.contain("Stack clone successfully")
  })


test
  .it('organizationSelection function', async () => {
    console.log("Helloo friends+++++++", sinon.stub(inquirer, 'prompt').onCall(0).resolves({ Organization: "Rohit Personal" }));
    // var spy = sinon.spy(messages, 'organizationSelection')
    // const inquirerStub = sinon.stub(inquirer, 'prompt');
    // inquirerStub.withArgs(questions).resolves({Organization:"Rohit Personal"})
    // messages.organizationSelection('export');
    expect(inquirer, 'prompt').to.equal({Organization:"Rohit Personal"});
    // expect(spy.calledOnce).to.be.true
})

// test
// .it('should equal test', () => {
//   const inquirerStub = sinon.stub(inquirer, 'prompt');
//   inquirerStub.withArgs(question).resolves({
//     prToOpen: 'pr-url-1'
//   });
//   messages.organizationSelection().then(answers => answers.email.should.equal('test'))
// })


// test
// .it('stackSelection Function', async () => {
//   var spy = sinon.spy(messages, 'stackSelection')
//   messages.stackSelection('import');
//   expect(spy.calledOnce).to.be.true
// })

// test
// .it('createNewStack function', async () => {
//   var spy = sinon.spy(messages, 'createNewStack')
//   messages.createNewStack('dummyOrg');
//   expect(spy.calledOnce).to.be.true
// })

// test
// .it('cmdExportImport function', async () => {
//   // var mock = sinon.mock(messages)
//   // var expectations = mock.expects("inquirer")
//   // expectations.exactly(1)
//   // messages.cmdExportImport('dummyOrg');
//   // mock.verify();
//   var spy = sinon.spy(messages, 'cmdExportImport')
//   messages.cmdExportImport('dummyOrg');
//   messages.cmdExportImport('export');
//   messages.cmdExportImport('import');
//   expect(spy.calledThrice).to.be.true
// })

// test
// .it('cmdExe function', async () => {
//   var spy = sinon.spy(messages, 'cmdExe')
//   messages.cmdExe('dummyNodule', 'dummyBackup');
//   messages.cmdExe('dummyNodule');
//   expect(spy.calledTwice).to.be.true
// })


// test
// .it('cloneTypeSelection function', async () => {
//   var spy = sinon.stub(messages, 'cloneTypeSelection').callsFake(function () {
//     return Promise.resolve()
//   })
//   expect(spy.calledOnce).to.be.true
// })
})
