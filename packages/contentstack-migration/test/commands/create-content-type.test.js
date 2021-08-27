'use strict'

const {match} = require('assert')

const {execute, constants} = require('../setup')
const {migration, filePathArg, migrationPath} = constants

const {expect, test} = require('@oclif/test')
const {cli} = require('cli-ux')
const Configstore = require('configstore')
const config = new Configstore('contentstack_cli')
const {assert} = require('chai')
const sinon = require('sinon')
const ContentTypeService = require('../../src/services/content-types')
const {createContentType} = require('../setup/mocks')
const endPoint = 'https://api.contentstack.io:443'

describe('Create content type from migration script', () => {
  describe('Create content type with passing options as arguments', () => {
    test
    .stdout()
    .nock(endPoint,
      api => api
      .post('/v3/content_types', createContentType.request)
      // user is logged in, return their name
      .reply(201,  createContentType.response)
    )
    .command(['cm:migration', '-n', './test/setup/examples/create-ct/create-ct-opts.js', '-A', '-k', 'bltd8f5f521adc4b5b3'])
    .it('Should create content type', ctx => {
      expect(ctx.stdout).to.contain('Successfully added content type: foo3')
    })

    test
    .stdout()
    .command(['cm:migration', '-n', './test/setup/examples/create-ct/create-ct-opts.js', '-A', '-k', 'bltd8f5f521adc4b5b3'])
    .it('Should create content type', ctx => {
      expect(ctx.stdout).to.contain('Successfully added content type: foo3')
    })
  })

  describe.only('Create content type applying chaining', () => {
    test
    .stdout()
    .command(['cm:migration', '-n', `${migrationPath}/create-ct/create-ct-misspelled-props.js`, '-A', '-k', 'bltd8f5f521adc4b5b3'])
    .catch(err => expect(err.message).to.match(/foo/))
    .it('should throw error for misspelled properties')

    // it('should create content type with applying chaining', async () => {
    //   const response = await execute(null, [
    //     migration,
    //     filePathArg,
    //     `${migrationPath}/create-ct/create-ct-chaining.js`,
    //   ])
    //   match(response, /Successfully saved Content type/)
    // })

    // after('clean up of content type created', async () => {
    //   const response = await execute(null, [
    //     migration,
    //     filePathArg,
    //     `${migrationPath}/delete-ct.js`,
    //   ])
    //   match(response, /Successfully deleted Content type/)
    // })
  })

  it('should throw error for misspelled properties', async () => {
    try {
      await execute(null, [
        migration,
        filePathArg,
        `${migrationPath}/create-ct/create-ct-misspelled-props.js`,
      ])
    } catch (error) {
      match(error, /Validation failed/)
    }
  })

  it('should throw error for misspelled chaining methods', async () => {
    try {
      await execute(null, [
        migration,
        filePathArg,
        `${migrationPath}/create-ct/create-ct-misspelled.js`,
      ])
    } catch (error) {
      match(error, /Validation failed/)
    }
  })

  it('should display a valid error for not adding required fields (url, title)', async () => {
    try {
      await execute(null, [
        migration,
        filePathArg,
        `${migrationPath}/missing-required-fields.js`,
      ])
    } catch (error) {
      match(error, /Validation failed/)
    }
  })

  describe('display error for already created content type', async () => {
    // Content Type creation failed
    before('Create content type', async () => {
      const response = await execute(null, [
        migration,
        filePathArg,
        `${migrationPath}/create-ct/create-ct-opts.js`,
      ])
      match(response, /Successfully saved Content type/)
    })

    it('should send a error message from the server for creating already existing content type', async () => {
      before('Create content type', async () => {
        const response = await execute(null, [
          migration,
          filePathArg,
          `${migrationPath}/create-ct/create-ct-opts.js`,
        ])
        match(response, /Content Type creation failed/)
      })
    })

    after('clean up of content type created', async () => {
      const response = await execute(null, [
        migration,
        filePathArg,
        `${migrationPath}/delete-ct.js`,
      ])
      match(response, /Successfully deleted Content type/)
    })
  })
})
