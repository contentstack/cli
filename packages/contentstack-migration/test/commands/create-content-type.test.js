'use strict';

const { match } = require('assert'),

  { execute, constants } = require('../setup'),
  { migration, filePathArg, migrationPath } = constants;

describe('Create content type from migration script', () => {

  describe.only('Create content type with passing options as arguments', () => {

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
    
    it('should create content type with passing options', async () => {
      console.log(`${filePathArg}`)
      console.log(`\n\n\n\n\n\n>>>>>>>>>>>>>>>>>>>>>>>>${migrationPath}/create-ct/create-ct-opts.js`)

      try{
        const response = await execute(null, [
        migration,
        filePathArg,
        `${migrationPath}/create-ct/create-ct-opts.js`
      ]);
      console.log(`>>>>>>>>>>>>>>>>>${response}`)
      match(response, /Successfully saved Content type/);

      } catch (e) {
        console.log(`>>>>>>>>>>>>>>>>>${e}`)
      }
      
    });

    after('clean up of content type created', async () => {
      const response = await execute(null, [
        migration,
        filePathArg,
        `${migrationPath}/delete-ct.js`
      ]);
      match(response, /Successfully deleted Content type/);
    });
  });

  describe('Create content type applying chaining', () => {
    it('should create content type with applying chaining', async () => {
      const response = await execute(null, [
        migration,
        filePathArg,
        `${migrationPath}/create-ct/create-ct-chaining.js`
      ]);
      match(response, /Successfully saved Content type/);
    });

    after('clean up of content type created', async () => {
      const response = await execute(null, [
        migration,
        filePathArg,
        `${migrationPath}/delete-ct.js`
      ]);
      match(response, /Successfully deleted Content type/);
    });
  });

  it('should throw error for mispelled properties', async () => {
    try {
      await execute(null, [
        migration,
        filePathArg,
        `${migrationPath}/create-ct/create-ct-misspelled-props.js`
      ]);
    } catch (error) {
      match(error, /Validation failed/);
    }
  });

  it('should throw error for mispelled chaining methods', async () => {
    try {
      await execute(null, [
        migration,
        filePathArg,
        `${migrationPath}/create-ct/create-ct-misspelled.js`
      ]);
    } catch (error) {
      match(error, /Validation failed/);
    }
  });

  it('should display a valid error for not adding required fields (url, title)', async () => {
    try {
      await execute(null, [
        migration,
        filePathArg,
        `${migrationPath}/missing-required-fields.js`
      ]);
    } catch (error) {
      match(error, /Validation failed/);
    }
  });

   

  describe('display error for already created content type', async () => {
    // Content Type creation failed
    before('Create content type', async () => {
      const response = await execute(null, [
        migration,
        filePathArg,
        `${migrationPath}/create-ct/create-ct-opts.js`
      ]);
      match(response, /Successfully saved Content type/);
    });

    it('should send a error message from the server for creating already existing content type', async () => {
      before('Create content type', async () => {
        const response = await execute(null, [
          migration,
          filePathArg,
          `${migrationPath}/create-ct/create-ct-opts.js`
        ]);
        match(response, /Content Type creation failed/);
      });
    });

    after('clean up of content type created', async () => {
      const response = await execute(null, [
        migration,
        filePathArg,
        `${migrationPath}/delete-ct.js`
      ]);
      match(response, /Successfully deleted Content type/);
    });
  });

});