'use strict'

const {match} = require('assert')

const {execute, constants} = require('../setup')
const path = require('path')
const {migration, filePathArg, migrationPath} = constants
const nockBack = require('nock').back
const {expect, test} = require('@oclif/test')
const {cli} = require('cli-ux')
const Configstore = require('configstore')
const config = new Configstore('contentstack_cli')
const {assert} = require('chai')
const sinon = require('sinon')
const ContentTypeService = require('../../src/services/content-types')
const {createContentType} = require('../setup/mocks')

describe('Create content type from migration script', () => {
  nockBack.fixtures = path.join(__dirname, '__nock-fixtures__')
  nockBack.setMode('record')
  describe('Create content type with passing options as arguments', () => {
    nockBack('create-content-type.json', nockDone => {
      test
      .stdout()
      .command(['cm:migration', '-n', './test/setup/examples/create-ct/create-ct-opts.js', '-A', '-k', 'bltd8f5f521adc4b5b3'])
      .it('Should create content type', ctx => {
        expect(ctx.stdout).to.contain('Successfully added content type: foo3')
        nockDone()
      })
    })

    nockBack('update-content-type.json', nockDone => {
      test
      .stdout()
      .command(['cm:migration', '-n', './test/setup/examples/edit-ct/edit-ct.success.js', '-A', '-k', 'bltd8f5f521adc4b5b3'])
      .it('Should update content type', ctx => {
        expect(ctx.stdout).to.contain('Successfully updated content type: foo3\n')
        nockDone()
      })
    })

    nockBack('update-content-type.json', nockDone => {
      test
      .stdout()
      .command(['cm:migration', '-n', './test/setup/examples/edit-ct/edit-ct.success.js', '-A', '-k', 'bltd8f5f521adc4b5b3'])
      .it('Should update content type', ctx => {
        expect(ctx.stdout).to.contain('Successfully updated content type: foo3\n')
        nockDone()
      })
    })

    nockBack('delete-content-type.json', nockDone => {
      test
      .stdout()
      .command(['cm:migration', '-n', './test/setup/examples/edit-ct/delete-ct.js', '-A', '-k', 'bltd8f5f521adc4b5b3'])
      .it('Should delete content type', ctx => {
        expect(ctx.stdout).to.contain('Successfully executed task: Deleting content type\n')
        nockDone()
      })
    })
  })

  describe.only('should show error for misspelled properties', () => {
    test
    .stdout()
    .command(['cm:migration', '-n', `${migrationPath}/create-ct/create-ct-misspelled-props.js`, '-A', '-k', 'bltd8f5f521adc4b5b3'])
    .it('Should show error message for invalid prop set', async ctx =>  {
      expect(ctx.stdout).to.contains('Line 4: description is missing.\n2: \n,3: module.exports = async ({migration, stackSDKInstance}) => {\n4:   const foo = migration.createContentType(\'foo\', {\n5:     title: \'foo\',\n,6:     deshcripshion: \'sample desc\',\n\nMigration unsuccessful\n')
    })

    test
    .stdout()
    .command(['cm:migration', '-n', `${migrationPath}/create-ct/create-ct-misspelled.js`, '-A', '-k', 'bltd8f5f521adc4b5b3'])
    .it('Should show error message for invalid function call', async ctx =>  {
      expect(ctx.stdout).to.contains('Line 10: data_tyep is not a valid function\n 8:   foo.createField(\'title\')\n, 9:   .display_name(\'Title\')\n10:   .data_tyep(\'text\')\n11:   .mandatory(true)\n,12: \n\nMigration unsuccessful\n')
    })

    nockBack('missing-required-field.json', nockDone => {
      test
      .stdout()
      .command(['cm:migration', '-n', `${migrationPath}/edit-field/missing-required-fields.js`, '-A', '-k', 'bltd8f5f521adc4b5b3'])
      .it('Should show error message for invalid function call', async ctx =>  {
        expect(ctx.stdout).to.contains('asdfads')
        nockDone()
      })
    })
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
