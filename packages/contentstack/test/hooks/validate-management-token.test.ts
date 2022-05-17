import { expect } from 'chai';
import * as sinon from 'sinon';
import { configHandler } from '@contentstack/cli-utilities';
import validateManagementToken from '../../src/hooks/custom/validate-management-token';
import { CLIError } from '../../src/utils';

const config = configHandler
describe('Validate management token hook', function () {
  before(function () {
    config.set('tokens.mToken', 'testmtoken');
    config.delete('tmTokenNotExist');
  });
  it('Valid token, successfull', async function () {
    const result = await validateManagementToken({ alias: 'mToken' });
    expect(result).to.be.true;
  });
  it('validate token which is not existing, throw error', async function () {
    let result;
    try {
      result = await validateManagementToken({ alias: 'mTokenNotExist' });
    } catch (error) {
      result = error;
    }
    expect(result).instanceOf(CLIError);
  });
});
