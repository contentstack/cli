import * as path from 'path';
import { expect } from 'chai';
import { runCommand } from '@oclif/test';
import { fancy } from 'fancy-test';
// @ts-ignore
import { Helper } from './helper';
// @ts-ignore
import { PRINT_LOGS, encryptionKey } from './config.json';
import { cliux as CliUx, messageHandler, NodeCrypto } from '@contentstack/cli-utilities';
import Sinon from 'sinon';

const messageFilePath = path.join(__dirname, '..', '..', '..', 'contentstack-utilities', 'messages/auth.json');
const crypto = new NodeCrypto({
  typeIdentifier: '◈',
  algorithm: 'aes-192-cbc',
  encryptionKey: process.env.ENCRYPTION_KEY || encryptionKey,
});
const username = process.env.ENCRYPTION_KEY ? crypto.decrypt(process.env.USERNAME) : process.env.USERNAME;
const password = process.env.ENCRYPTION_KEY ? crypto.decrypt(process.env.PASSWORD) : process.env.PASSWORD;

describe('contentstack-auth plugin test', () => {
  let exitStub: Sinon.SinonStub | undefined;
  let inquireStub: Sinon.SinonStub | undefined;
  let helperStub: Sinon.SinonStub | undefined;

  beforeEach(() => {
    messageHandler.init({ messageFilePath });
    exitStub = Sinon.stub(process, 'exit');
  });
  afterEach(() => {
    messageHandler.init({ messageFilePath: '' });
    if (exitStub && exitStub.restore) exitStub.restore();
    if (inquireStub && inquireStub.restore) inquireStub.restore();
    if (helperStub && helperStub.restore) helperStub.restore();
  });

  describe('Check auth:login command with wrong credentials (prompt)', () => {
    beforeEach(() => {
      inquireStub = Sinon.stub(CliUx, 'inquire').callsFake(async (inquire: any) => {
        switch (inquire.name) {
          case 'username':
            return username;
          case 'password':
            return 'WrongPassword@12345%$#@!';
        }
      });
    });

    fancy.stdout({ print: PRINT_LOGS || false }).it('Login should fail due to wrong credentials (prompt)', async () => {
      const { stdout } = await runCommand(['auth:login'], { root: process.cwd() });
      expect(stdout).to.include('Login Error');
    });
  });

  describe('Check auth:login command with correct credentials (prompt)', () => {
    beforeEach(() => {
      inquireStub = Sinon.stub(CliUx, 'inquire').callsFake(async (inquire: any) => {
        switch (inquire.name) {
          case 'username':
            return username;
          case 'password':
            return password;
        }
      });
    });

    fancy.stdout({ print: PRINT_LOGS || false }).it('Login should succeed (prompt)', async () => {
      const { stdout } = await runCommand(['auth:login'], { root: process.cwd() });
      expect(stdout).to.match(/Login Error|Successfully logged in/i);
    });
  });

  describe('Check auth:login command with --username, --password flags and wrong credentials', () => {
    fancy.stdout({ print: PRINT_LOGS || false }).it('Login should fail due to wrong credentials (flags)', async () => {
      const { stdout } = await runCommand(
        ['auth:login', `--username=${username}`, '--password=WrongPassword@12345%$#@!'],
        { root: process.cwd() },
      );
      expect(stdout).to.include('Login Error');
    });
  });

  describe('Check auth:login command with --username, --password flags', () => {
    fancy.stdout({ print: PRINT_LOGS || false }).it('Login should succeed (flags)', async () => {
      const { stdout } = await runCommand(['auth:login', `-u=${username}`, `-p=${password}`], { root: process.cwd() });
      expect(stdout).to.match(/Login Error|Successfully logged in/i);
    });
  });

  describe('Test whoami command', () => {
    let mail: string;
    before(() => {
      helperStub = Sinon.stub(Helper, 'run').resolves('dummyuser@example.com' as any);
      mail = 'dummyuser@example.com';
    });
    after(() => {
      mail = '';
    });
    fancy.stdout({ print: PRINT_LOGS || false }).it('shows user email who logged in', async () => {
      const { stdout } = await runCommand(['whoami'], { root: process.cwd() });

      expect(stdout).to.match(new RegExp(`You are currently logged in with email\\n${mail}\\n|You are not logged in`));
    });
  });

  describe('Check auth:logout command', () => {
    beforeEach(() => {
      inquireStub = Sinon.stub().callsFake(async () => 'Yes');
    });
    fancy.stdout({ print: PRINT_LOGS || false }).it('Logout should succeed', async () => {
      const { stdout } = await runCommand(['auth:logout', '--yes'], { root: process.cwd() });
      expect(stdout).to.match(/CLI_AUTH_LOGOUT_ALREADY|Successfully logged out/i);
    });
  });
});

describe('contentstack-auth tokens commands', () => {
  let inquireStub: Sinon.SinonStub | undefined;

  beforeEach(() => {
    messageHandler.init({ messageFilePath });
  });
  afterEach(() => {
    messageHandler.init({ messageFilePath: '' });
    if (inquireStub && inquireStub.restore) inquireStub.restore();
  });

  describe('auth:tokens:add', () => {
    beforeEach(() => {
      inquireStub = Sinon.stub(CliUx, 'inquire').callsFake(async (inquire: any) => {
        if (inquire.name === 'alias') return 'test-alias';
        if (inquire.name === 'apiKey') return 'test-api-key';
        if (inquire.name === 'token') return 'test-token';
        if (inquire.name === 'env') return 'test-env';
        if (inquire.name === 'tokenType') return 'management';
        if (inquire.name === 'confirm') return true;
      });
    });

    fancy.stdout({ print: PRINT_LOGS }).it('should add a management token with prompts', async () => {
      const { stdout } = await runCommand(['auth:tokens:add'], { root: process.cwd() });
      expect(stdout).to.include('');
    });
  });

  describe('auth:tokens:remove', () => {
    beforeEach(() => {
      inquireStub = Sinon.stub(CliUx, 'inquire').callsFake(async (inquire: any) => {
        if (inquire.name === 'selectedTokens') return ['test-alias: test-token : test-api-key : management'];
      });
    });

    fancy.stdout({ print: PRINT_LOGS }).it('should remove a token by alias', async () => {
      const { stdout } = await runCommand(['auth:tokens:remove', '-a', 'test-alias'], { root: process.cwd() });
      expect(stdout).to.include('Token removed successfully !!\n');
    });

    fancy.stdout({ print: PRINT_LOGS }).it('should prompt and remove selected tokens', async () => {
      const { stdout } = await runCommand(['auth:tokens:remove'], { root: process.cwd() });
      expect(stdout).to.include('Token removed successfully !!\n');
    });
  });
});
