'use strict'

const {match} = require('assert')

const {execute, constants} = require('../setup')
const {migration, filePathArg, migrationPath} = constants

describe('Edit content type from migration script', () => {
  describe('Allow editing existing content type', () => {
    before('Create a content type', async () => {
      const response = await execute(null, [
        migration,
        filePathArg,
        `${migrationPath}/create-ct/create-ct-opts`,
      ])
      match(response, /Successfully saved Content type/)
    })

    it('should allow editing a existing content type', async () => {
      const response = await execute(null, [
        migration,
        filePathArg,
        `${migrationPath}/edit-ct/edit-ct.success.js`,
      ])
      match(response, /Successfully updated Content type/)
    })

    after('Clean up content type', async () => {
      const response = await execute(null, [
        migration,
        filePathArg,
        `${migrationPath}/delete-ct.js`,
      ])
      match(response, /Successfully deleted Content type/)
    })
  })

  it('should throw an error editing non existent content type', async () => {
    try {
      await execute(null, [
        migration,
        filePathArg,
        `${migrationPath}/edit-ct/edit-ct.failure.js`,
      ])
    } catch (error) {
      match(error, /Validation failed/)
    }
  })

  it('should throw error for misspelled properties while passing options', async () => {
    try {
      await execute(null, [
        migration,
        filePathArg,
        `${migrationPath}/edit-ct/edit-ct-misspelled-props.js`,
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
        `${migrationPath}/edit-ct/edit-ct-misspelled-method.js`,
      ])
    } catch (error) {
      match(error, /Validation failed/)
    }
  })
})
