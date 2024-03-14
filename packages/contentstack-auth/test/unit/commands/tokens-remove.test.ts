import { expect } from 'chai';
import * as sinon from 'sinon';
import { configHandler } from '@contentstack/cli-utilities';
import TokensRemoveCommand from '../../../src/commands/auth/tokens/remove';
import { cliux } from '@contentstack/cli-utilities';

const config = configHandler;
const configKeyTokens = 'tokens';
const token1Alias = 'test-token-remove-command';

function resetConfig() {
  config.delete(`${configKeyTokens}.${token1Alias}`);
  config.delete(`${configKeyTokens}.${token1Alias}2`);
}
describe('Tokens Remove Command', () => {
  before(function () {
    resetConfig();
    config.set(`${configKeyTokens}.${token1Alias}`, { name: 'test1' });
  });

  after(() => {
    resetConfig();
  });

  it('Remove the token with alias, should remove the token', async function () {
    await TokensRemoveCommand.run(['-a', token1Alias]);
    expect(Boolean(config.get(`${configKeyTokens}.${token1Alias}`))).to.be.false;
  });
  it('Remove the token with invalid alias, should list the table', async function () {
    config.set(`${configKeyTokens}.${token1Alias}`, { name: 'test1' });
    const inquireStub = sinon.stub(cliux, 'inquire').resolves([]);
    await TokensRemoveCommand.run(['-a', 'invalid-test-tokens-remove']);
    expect(inquireStub.calledOnce).to.be.true;
    inquireStub.restore();
  });
  it('Remove the token without alias, should list the table', async function () {
    const inquireStub = sinon.stub(cliux, 'inquire').resolves([token1Alias]);
    await TokensRemoveCommand.run([]);
    expect(inquireStub.calledOnce).to.be.true;
    expect(Boolean(config.get(`${configKeyTokens}.${token1Alias}`))).to.be.false;
    inquireStub.restore();
  });
  it('Selectes multiple token, remove all the selected tokens', async function () {
    config.set(`${configKeyTokens}.${token1Alias}`, { name: 'test1' });
    config.set(`${configKeyTokens}.${token1Alias}2`, { name: 'test2' });

    const inquireStub = sinon.stub(cliux, 'inquire').resolves([token1Alias, token1Alias + '2']);
    await TokensRemoveCommand.run([]);
    expect(inquireStub.calledOnce).to.be.true;
    expect(Boolean(config.get(`${configKeyTokens}.${token1Alias}`))).to.be.false;
    expect(Boolean(config.get(`${configKeyTokens}.${token1Alias}2`))).to.be.false;
    inquireStub.restore();
  });
});
