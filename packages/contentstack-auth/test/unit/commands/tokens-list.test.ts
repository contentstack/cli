import { expect } from 'chai';
import * as sinon from 'sinon';
import { configHandler } from '@contentstack/cli-utilities';
import TokensListCommand from '../../../src/commands/auth/tokens/index';
import { cliux } from '@contentstack/cli-utilities';

const config = configHandler;
const configKeyTokens = 'tokens';

function resetConfig() {
  config.delete(`${configKeyTokens}.test-token-list-command`);
  config.delete(`${configKeyTokens}.test-token-list-command2`);
}

describe('Tokens List Command', () => {
  before(function () {
    resetConfig();
    config.set(`${configKeyTokens}.test-token-list-command`, { name: 'test1' });
    config.set(`${configKeyTokens}.test-token-list-command2`, { name: 'test2' });
  });

  after(() => {
    resetConfig();
  });

  it('Runs the command, should lists the tokens', async function () {
    const tableStub = sinon.stub(cliux, 'table').callsFake((tokens) => {
      expect(tokens).to.have.length.greaterThan(0);
    });
    await TokensListCommand.run([]);
    tableStub.restore();
  });
  it('Runs the command with no tokens stored, prints empty table', async function () {
    resetConfig();
    const tableStub = sinon.stub(cliux, 'table').callsFake((tokens) => {
      expect(tokens).to.have.length(0);
    });
    await TokensListCommand.run([]);
    tableStub.restore();
  });
});
