const {expect, test} = require('@oclif/test')
const {cli} = require('cli-ux')
const {AuthHandler} = require('../../src/util/auth-handler')
const Configstore  = require('configstore')
const config = new Configstore('contentstack_cli')
const {assert} = require('chai')
const sinon = require('sinon')
const Messages = require('../../src/util/messages')
const messages = new Messages('login').msgs

describe('auth:login', () => {
  // eslint-disable-next-line no-undef

  describe('auth:login : Login Failure', () => {
    let promptIndex = 0
    let promptMock = () => {
      let prompts = ['ninad.hatkar@something.com', '1234']
      let prompt = prompts[promptIndex]
      promptIndex++
      return prompt
    }

    // eslint-disable-next-line no-undef
    beforeEach(() => {
      promptIndex = 0
    })

    let error = new Error('{"status":422,"statusText":"Unprocessable Entity","request":{"url":"/user-session","method":"post","data":"{\\"user\\":{\\"email\\":\\"asasdfa\\",\\"password\\":\\"asdf\\"}}","headers":{"Accept":"application/json, text/plain, */*","Content-Type":"application/json;charset=utf-8","X-User-Agent":"contentstack-management-javascript/0.0.1","User-Agent":"sdk contentstack-management-javascript/0.0.1; platform node.js/v12.14.0; os macOS/18.7.0;","Content-Length":46}},"errorMessage":"Looks like your email or password is invalid. Please try again or reset your password.","errorCode":104,"errors":{"auth":["Looks like your email or password is invalid. Please try again or reset your password."]}}')
    test
    .stub(AuthHandler.prototype, 'login', sinon.stub().callsFake(function () {
      return Promise.reject(error)
    }))
    .stub(cli, 'prompt', () => async () => promptMock())
    .stdout()
    .command(['auth:login'])
    .it('Should fail to login', ctx => {
      expect(ctx.stdout).to.contain('Looks like your email or password is invalid. Please try again or reset your password.')
    })

    let error2 = new Error('Something went wrong.')
    test
    .stub(AuthHandler.prototype, 'login', sinon.stub().callsFake(function () {
      return Promise.reject(error2)
    }))
    .stub(cli, 'prompt', () => async () => promptMock())
    .stdout()
    .command(['auth:login'])
    .it('Should fail to login with internal error', ctx => {
      expect(ctx.stdout).to.contain('Something went wrong.')
    })
  })

  describe('auth:login : Login successfully', () => {
    let promptIndex = 0
    let promptMock = () => {
      let prompts = ['ninad.hatkar@something.com', '1234']
      let prompt = prompts[promptIndex]
      promptIndex++
      return prompt
    }
    // eslint-disable-next-line no-undef
    beforeEach(() => {
      config.delete('authtoken')
      config.delete('email')
    })

    test
    .stub(AuthHandler.prototype, 'login', sinon.stub().callsFake(function () {
      return Promise.resolve({email: 'ninad.hatkar@something.com', authtoken: '***REMOVED***'})
    }))
    .stub(cli, 'prompt', () => async () => promptMock())
    .stdout()
    .command(['auth:login'])
    .it('should login successfully and save config', ctx => {
      assert.equal(config.get('authtoken'), '***REMOVED***')
      assert.equal(config.get('email'), 'ninad.hatkar@something.com')
      expect(ctx.stdout).to.contain(messages.msgLoginSuccess)
    })

    test
    .stub(AuthHandler.prototype, 'login', sinon.stub().callsFake(function () {
      return Promise.resolve({email: 'ninad.hatkar@something.com', authtoken: '***REMOVED***'})
    }))
    .stub(cli, 'prompt', () => async () => '1234')
    .stdout()
    .command(['auth:login', '-u', 'ninad.hatkar@contentstack.com'])
    .it('Should login successfully and save config', ctx => {
      assert.equal(config.get('authtoken'), '***REMOVED***')
      assert.equal(config.get('email'), 'ninad.hatkar@something.com')
      expect(ctx.stdout).to.contain(messages.msgLoginSuccess)
    })
  })
})
