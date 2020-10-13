/* eslint-disable no-unused-vars */
const {expect, test} = require('@oclif/test')
const {cli} = require('cli-ux')
const {AuthHandler} = require('../../src/util/auth-handler')
const Configstore  = require('configstore')
const config = new Configstore('contentstack_cli')
const sinon = require('sinon')
const {assert} = require('chai')

describe('auth:logout', () => {
  describe('Logging out from contentstack', () => {
    // eslint-disable-next-line no-undef
    before(function () {
      config.set('authtoken', 'blt12434')
      config.set('email', 'something')
    })
    test
    .stub(AuthHandler.prototype, 'logout', sinon.stub().callsFake(function () {
      return Promise.resolve()
    }))
    .stub(cli, 'confirm', () => async () => 'yes')
    .stdout()
    .command(['auth:logout'])
    .it('should runs auth:logout successfully and removes key from config', ctx => {
      const authtoken = config.get('authtoken')
      const email = config.get('email')
      assert.isUndefined(authtoken, 'no authtoken defined')
      assert.isUndefined(email, 'no email defined')
      expect(ctx.stdout).to.contain('Logging out from Contentstack...\nYou have logged out from Contentstack successfully!\n')
    })
  })
  describe('Logging out from contentstack with failure', () => {
    let error = new Error('You are not logged in.')
    test
    .stub(AuthHandler.prototype, 'logout', sinon.stub().callsFake(function () {
      return Promise.reject(error)
    }))
    .stub(cli, 'confirm', () => async () => 'yes')
    .stdout()
    .command(['auth:logout'])
    .it('Even not logged in should show success and remove authtoken and email if exists', ctx => {
      const authtoken = config.get('authtoken')
      const email = config.get('email')
      assert.isUndefined(authtoken, 'no authtoken defined')
      assert.isUndefined(email, 'no email defined')
      expect(ctx.stdout).to.contain('Logging out from Contentstack...\nYou have logged out from Contentstack successfully!\n')
    })
  })
})
