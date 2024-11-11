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
const username = process.env.ENCRYPTION_KEY ? crypto.decrypt(process.env.USERNAME) : process.env.USERNAME
const password = process.env.ENCRYPTION_KEY ? crypto.decrypt(process.env.PASSWORD) : process.env.PASSWORD

describe('contentstack-auth plugin test', () => {
  let exitStub: sinon.SinonStub | undefined;
  let inquireStub: sinon.SinonStub | undefined;
  beforeEach(() => {
    messageHandler.init({ messageFilePath });
    exitStub = Sinon.stub(process, 'exit');
  });
  afterEach(() => {
    messageHandler.init({ messageFilePath: '' });
    if (exitStub && exitStub.restore) {
      exitStub.restore();
    }
    if (inquireStub && inquireStub.restore) {
      inquireStub.restore();
    }
  });

  describe('Check auth:login command with wrong credentials', () => {
    beforeEach(() => {
      // Stub CliUx.inquire for wrong credentials
      inquireStub = Sinon.stub(CliUx, 'inquire').callsFake(async (inquire) => {
        switch (inquire.name) {
          case 'username':
            return username;
          case 'password':
            return 'WrongPassword@12345%$#@!';
        }
      });
    });

    fancy.stdout({ print: PRINT_LOGS || false }).it('Login should fail due to wrong credentials.!', async () => {
      const { stdout } = await runCommand(['auth:login'], { root: process.cwd() });
      expect(stdout).to.be.includes(
        'Login Error\nLooks like your email or password is invalid. Please try again or reset your password.',
      );
    });
  });
  describe('Check auth:login command with correct credentials.', () => {
    beforeEach(() => {
      inquireStub = Sinon.stub(CliUx, 'inquire').callsFake(async (inquire) => {
        switch (inquire.name) {
          case 'username':
            return username;
          case 'password':
            return password;
        }
      });
    });
    fancy.stdout({ print: PRINT_LOGS || false }).it('Login should succeed.!', async () => {
      const { stdout } = await runCommand(['auth:login'], { root: process.cwd() });
      expect(stdout).to.a('string').includes('Successfully logged in!!');
    });
  });
  describe('Check auth:login command with --username, --password flags and wrong credentials', () => {
    fancy.stdout({ print: PRINT_LOGS || false }).it('Login should fail due to wrong credentials.!', async () => {
      const { stdout } = await runCommand(
        ['auth:login', `--username=${username}`, '--password=WrongPassword@12345%$#@!'],
        { root: process.cwd() },
      );
      expect(stdout)
        .to.a('string')
        .includes(
          'Login Error\nLooks like your email or password is invalid. Please try again or reset your password.',
        );
    });
  });

  describe('Check auth:logout command', () => {
    beforeEach(() => {
      inquireStub = Sinon.stub().callsFake(async () => 'Yes');
    });
    fancy.stdout({ print: PRINT_LOGS || false }).it('Logout should succeed.!', async () => {
      const { stdout } = await runCommand(['auth:logout', '--yes'], { root: process.cwd() });
      expect(stdout).to.a('string').includes('Successfully logged out');
    });
  });

  describe('Check auth:login command with --username, --password flags', () => {
    fancy.stdout({ print: PRINT_LOGS || false }).it('Login should succeed!', async () => {
      const { stdout } = await runCommand(['auth:login', `-u=${username}`, `-p=${password}`], { root: process.cwd() });
      expect(stdout).to.a('string').includes('Successfully logged in!!');
    });
  });

  describe('Test whoami command', () => {
    let mail;
    before(async () => {
      mail = await Helper.run();
    });
    after(() => {
      mail = '';
    });
    fancy.stdout({ print: PRINT_LOGS || false }).it('shows user email who logged in', async () => {
      const { stdout } = await runCommand(['whoami'], { root: process.cwd() });
      expect(stdout).to.equal(`You are currently logged in with email\n${mail}\n`);
    });
  });
});
