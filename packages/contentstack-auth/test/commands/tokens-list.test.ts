import { expect } from 'chai';
import * as sinon from 'sinon';
import * as Configstore from 'configstore';
import TokensListCommand from '../../src/commands/auth/tokens/index';
import { cliux } from '../../src/utils';

const config = new Configstore('contentstack_cli');

describe('Tokens List Command', () => {
  const configKeyTokens = 'tokens';

  before(function () {
    config.clear();
    config.set(`${configKeyTokens}.test-token-list-command`, { name: 'test1' });
    config.set(`${configKeyTokens}.test-token-list-command2`, { name: 'test2' });
  });

  after(() => {
    config.clear();
  });

  it('Runs the command, should lists the tokens', async function () {
    const tableStub = sinon.stub(cliux, 'table').callsFake((tokens) => {
      expect(tokens).to.have.length.greaterThan(0);
    });
    await TokensListCommand.run([]);
    tableStub.restore();
  });
  it('Runs the command with no tokens stored, prints empty table', async function () {
    config.clear();
    const tableStub = sinon.stub(cliux, 'table').callsFake((tokens) => {
      expect(tokens).to.have.length(0);
    });
    await TokensListCommand.run([]);
    tableStub.restore();
  });
});
