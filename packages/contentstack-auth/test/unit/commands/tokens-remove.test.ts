import { expect } from 'chai';
import * as sinon from 'sinon';
import { configHandler } from '@contentstack/cli-utilities';
import TokensRemoveCommand from '../../../src/commands/auth/tokens/remove';
import { cliux } from '@contentstack/cli-utilities';

// Check for PREPACK_MODE - GitHub workflows set NODE_ENV=PREPACK_MODE during setup
const isPrepackMode = process.env.NODE_ENV === 'PREPACK_MODE';

const config = configHandler;
const configKeyTokens = 'tokens';
const token1Alias = 'test-token-remove-command';

function resetConfig() {
  config.delete(`${configKeyTokens}.${token1Alias}`);
  config.delete(`${configKeyTokens}.${token1Alias}2`);
}

describe('Tokens Remove Command', () => {
  beforeEach(function () {
    resetConfig();
    // Use correct token structure: { token, apiKey, type }
    config.set(`${configKeyTokens}.${token1Alias}`, {
      token: 'test-token-1',
      apiKey: 'test-api-key-1',
      type: 'management',
    });
  });

  afterEach(() => {
    resetConfig();
    sinon.restore();
  });

  it('Remove the token with alias, should remove the token', async function () {
    await TokensRemoveCommand.run(['-a', token1Alias]);
    expect(Boolean(config.get(`${configKeyTokens}.${token1Alias}`))).to.be.false;
  });

  it('Remove the token with invalid alias, should list the table', async function () {
    // Skip this test in PREPACK_MODE - config handler uses in-memory store that doesn't persist properly
    if (isPrepackMode) {
      this.skip();
      return;
    }
    const inquireStub = sinon.stub(cliux, 'inquire').resolves([]);
    await TokensRemoveCommand.run(['-a', 'invalid-test-tokens-remove']);
    expect(inquireStub.calledOnce).to.be.true;
  });

  it('Selectes multiple token, remove all the selected tokens', async function () {
    // Skip this test in PREPACK_MODE - config handler uses in-memory store that doesn't persist properly
    if (isPrepackMode) {
      this.skip();
      return;
    }
    // Use correct token structure: { token, apiKey, type }
    config.set(`${configKeyTokens}.${token1Alias}`, {
      token: 'test-token-1',
      apiKey: 'test-api-key-1',
      type: 'management',
    });
    config.set(`${configKeyTokens}.${token1Alias}2`, {
      token: 'test-token-2',
      apiKey: 'test-api-key-2',
      type: 'management',
    });

    // The inquire stub should return the full token option string format: "alias: token : apiKey: type"
    // Note: no space before the colon before type when there's no environment
    const tokenOption1 = `${token1Alias}: test-token-1 : test-api-key-1: management`;
    const tokenOption2 = `${token1Alias}2: test-token-2 : test-api-key-2: management`;
    const inquireStub = sinon.stub(cliux, 'inquire').resolves([tokenOption1, tokenOption2]);
    await TokensRemoveCommand.run([]);
    expect(inquireStub.called).to.be.true;
    expect(Boolean(config.get(`${configKeyTokens}.${token1Alias}`))).to.be.false;
    expect(Boolean(config.get(`${configKeyTokens}.${token1Alias}2`))).to.be.false;
  });
});
