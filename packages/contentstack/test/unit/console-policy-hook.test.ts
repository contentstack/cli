import { expect } from 'chai';
import * as sinon from 'sinon';
import { configHandler } from '@contentstack/cli-utilities';
import {
  isConsoleLogEnabled,
  resetConsoleLogPolicy,
} from '@contentstack/cli-utilities/lib/logger/console-policy';
import consolePolicyHook, { resolveConsoleLogPolicy } from '../../src/hooks/init/console-policy';

describe('console-policy init hook', () => {
  let configGetStub: sinon.SinonStub;
  const originalEnv = process.env.CS_CLI_CONSOLE_LOGS;

  /** A fake oclif config shaped like the one the hook receives at init time. */
  function fakeConfig(declared?: boolean, pluginName = '@contentstack/cli-cm-export') {
    return {
      findCommand: (id: string) => (id === 'cm:stacks:export' ? { pluginName } : undefined),
      plugins: new Map([[pluginName, { pjson: { csdxConfig: { showConsoleLogs: declared } } }]]),
    };
  }

  const exportCommand = { id: 'cm:stacks:export' };

  /** `log.showConsoleLogs` as it sits in the user's config file. */
  function userConfig(showConsoleLogs?: boolean) {
    configGetStub.withArgs('log').returns(showConsoleLogs === undefined ? {} : { showConsoleLogs });
  }

  beforeEach(() => {
    delete process.env.CS_CLI_CONSOLE_LOGS;
    configGetStub = sinon.stub(configHandler, 'get');
    userConfig(undefined);
    resetConsoleLogPolicy();
  });

  afterEach(() => {
    sinon.restore();
    resetConsoleLogPolicy();
    if (originalEnv === undefined) delete process.env.CS_CLI_CONSOLE_LOGS;
    else process.env.CS_CLI_CONSOLE_LOGS = originalEnv;
  });

  describe('precedence', () => {
    it('defaults to false — files only', () => {
      expect(resolveConsoleLogPolicy(exportCommand, fakeConfig(undefined))).to.equal(false);
    });

    it('honours a plugin declaring csdxConfig.showConsoleLogs', () => {
      expect(resolveConsoleLogPolicy(exportCommand, fakeConfig(true))).to.equal(true);
    });

    it('honours user config set to true, over a plugin that declares nothing', () => {
      userConfig(true);
      expect(resolveConsoleLogPolicy(exportCommand, fakeConfig(undefined))).to.equal(true);
    });

    it('lets the env var beat user config', () => {
      userConfig(true);
      process.env.CS_CLI_CONSOLE_LOGS = '0';
      expect(resolveConsoleLogPolicy(exportCommand, fakeConfig(undefined))).to.equal(false);
    });

    it('lets the env var beat a plugin declaration', () => {
      process.env.CS_CLI_CONSOLE_LOGS = '1';
      expect(resolveConsoleLogPolicy(exportCommand, fakeConfig(undefined))).to.equal(true);
    });

    ['1', 'true', 'TRUE', ' true '].forEach((value) => {
      it(`reads CS_CLI_CONSOLE_LOGS=${JSON.stringify(value)} as on`, () => {
        process.env.CS_CLI_CONSOLE_LOGS = value;
        expect(resolveConsoleLogPolicy(exportCommand, fakeConfig(undefined))).to.equal(true);
      });
    });

    ['0', 'false', 'FALSE'].forEach((value) => {
      it(`reads CS_CLI_CONSOLE_LOGS=${JSON.stringify(value)} as off`, () => {
        process.env.CS_CLI_CONSOLE_LOGS = value;
        expect(resolveConsoleLogPolicy(exportCommand, fakeConfig(true))).to.equal(false);
      });
    });

    it('ignores an unparseable env var and falls through', () => {
      process.env.CS_CLI_CONSOLE_LOGS = 'maybe';
      expect(resolveConsoleLogPolicy(exportCommand, fakeConfig(true))).to.equal(true);
    });
  });

  // The half of the fix that protects users who already ran `cm:stacks:audit`, which used to
  // persist `log.showConsoleLogs: false` into their config file as a side effect. That value
  // must read as "no opinion", never as an override of a plugin's declaration.
  describe('legacy `false` in user config falls through', () => {
    it('does not override a plugin declaring true', () => {
      userConfig(false);
      expect(resolveConsoleLogPolicy(exportCommand, fakeConfig(true))).to.equal(true);
    });

    it('treats undefined the same way', () => {
      userConfig(undefined);
      expect(resolveConsoleLogPolicy(exportCommand, fakeConfig(true))).to.equal(true);
    });

    it('still leaves force-off available through the env var', () => {
      userConfig(false);
      process.env.CS_CLI_CONSOLE_LOGS = '0';
      expect(resolveConsoleLogPolicy(exportCommand, fakeConfig(true))).to.equal(false);
    });

    it('resolves to the default when nothing declares anything', () => {
      userConfig(false);
      expect(resolveConsoleLogPolicy(exportCommand, fakeConfig(undefined))).to.equal(false);
    });
  });

  describe('degrades quietly', () => {
    // oclif corrects a mistyped id *after* init, so `findCommand` cannot resolve the plugin
    // and its declaration is lost for that one run. Accepted: the invocation is about to be
    // re-dispatched, and a second resolution point is the very thing this hook removes.
    it('falls back without throwing when the command id does not resolve', () => {
      expect(resolveConsoleLogPolicy({ id: 'cm:stacks:exportt' }, fakeConfig(true))).to.equal(false);
    });

    it('still honours the env var for an unresolvable command id', () => {
      process.env.CS_CLI_CONSOLE_LOGS = '1';
      expect(resolveConsoleLogPolicy({ id: 'cm:stacks:exportt' }, fakeConfig(true))).to.equal(true);
    });

    it('survives a missing config, a missing id and a missing plugins map', () => {
      expect(resolveConsoleLogPolicy({}, undefined)).to.equal(false);
      expect(resolveConsoleLogPolicy({ id: 'cm:stacks:export' }, {})).to.equal(false);
      expect(resolveConsoleLogPolicy(exportCommand, { findCommand: () => ({ pluginName: 'nope' }) })).to.equal(false);
    });

    it('survives a configHandler that throws', () => {
      configGetStub.withArgs('log').throws(new Error('unreadable config file'));
      expect(resolveConsoleLogPolicy(exportCommand, fakeConfig(true))).to.equal(true);
    });
  });

  describe('applying the policy', () => {
    it('sets the process-wide policy from the resolved value', () => {
      expect(isConsoleLogEnabled()).to.equal(false);

      consolePolicyHook.call({ config: fakeConfig(true) }, exportCommand);

      expect(isConsoleLogEnabled()).to.equal(true);
    });

    it('leaves the policy off when nothing enables it', () => {
      consolePolicyHook.call({ config: fakeConfig(undefined) }, exportCommand);

      expect(isConsoleLogEnabled()).to.equal(false);
    });
  });
});
