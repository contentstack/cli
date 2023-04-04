import { describe, it, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import { stub, assert } from 'sinon';
import MergeCommand from '../../../../../src/commands/cm/branches/merge';
import { cliux } from '@contentstack/cli-utilities';

describe('Merge Command', () => {
  let successMessageStub;
  let successMessageStub2;
  beforeEach(function () {
    successMessageStub = stub(cliux, 'print');
    successMessageStub2 = stub(cliux, 'inquire');
  });
  afterEach(function () {
    successMessageStub.restore();
  });
  it('Without flags, should display running message', async function () {
    await MergeCommand.run([]);
    assert.calledWith(successMessageStub, 'Running merge command');
    assert.calledWith(successMessageStub2, { type: 'input', message: 'ENTER_API_KEY', name: 'stack-api-key' });
  });
});

// commands
