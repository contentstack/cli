import * as path from 'path';
import { expect, test } from '@oclif/test';
// @ts-ignore
import { Helper } from './helper';
// @ts-ignore
import { PRINT_LOGS, encryptionKey } from './config.json';
import { cliux as CliUx, messageHandler, NodeCrypto } from '@contentstack/cli-utilities';

const messageFilePath = path.join(__dirname, '..', '..', '..', 'contentstack-utilities', 'messages/auth.json');
const crypto = new NodeCrypto({
  typeIdentifier: '◈',
  algorithm: 'aes-192-cbc',
  encryptionKey: process.env.ENCRYPTION_KEY || encryptionKey
});
const username = process.env.ENCRYPTION_KEY ? crypto.decrypt(process.env.USERNAME) : process.env.USERNAME
const password = process.env.ENCRYPTION_KEY ? crypto.decrypt(process.env.PASSWORD) : process.env.PASSWORD

describe('contentstack-auth plugin test', () => {
  beforeEach(() => {
    messageHandler.init({ messageFilePath });
  });
  afterEach(() => {
    messageHandler.init({ messageFilePath: '' });
  });

  describe('Check auth:login command with wrong credentials', () => {
    test
      // @ts-ignore
      .stub(CliUx, 'inquire', async (inquire) => {
        switch (inquire.name) {
          case 'username':
            return username;
          case 'password':
            return 'WrongPassword@12345%$#@!'; // NOTE forcing wrong password
        }
      })
      .stdout({ print: PRINT_LOGS || false })
      .command(['auth:login'])
      .it('Login should fail due to wrong credentials.!', (ctx) => {
        expect(ctx.stdout).to.a('string').includes('Login Error\nLooks like your email or password is invalid');
      });
  });

  describe('Check auth:login command with --username, --password flags and wrong credentials', () => {
    test
      .stdout({ print: PRINT_LOGS || false })
      .command(['auth:login', `--username=${username}`, '--password=WrongPassword@12345%$#@!'])
      .it('Login should fail due to wrong credentials.!', (ctx) => {
        expect(ctx.stdout).to.a('string').includes('Login Error\nLooks like your email or password is invalid');
      });
  });

  describe('Check auth:login command with correct credentials.', () => {
    test
      // @ts-ignore
      .stub(CliUx, 'inquire', async (inquire) => {
        switch (inquire.name) {
          case 'username':
            return username;
          case 'password':
            return password;
        }
      })
      .stdout({ print: PRINT_LOGS || false })
      .command(['auth:login'])
      .it('Login should succeed.!', (ctx) => {
        expect(ctx.stdout).to.a('string').includes('Successfully logged in!!');
      });
  });

  describe('Check auth:logout command', () => {
    test
      .stub(CliUx, 'inquire', async () => 'Yes')
      .stdout({ print: PRINT_LOGS || false })
      .command(['auth:logout'])
      .it('Logout should succeed.!', (ctx) => {
        expect(ctx.stdout).to.a('string').includes('Successfully logged out');
      });
  });

  describe('Check auth:login command with --username, --password flags', () => {
    test
      .stdout({ print: PRINT_LOGS || false })
      .command(['auth:login', `-u=${username}`, `-p=${password}`])
      .it('Login should succeed!', (ctx) => {
        expect(ctx.stdout).to.a('string').includes('Successfully logged in!!');
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
    test
      .stdout({ print: PRINT_LOGS || false })
      .command(['whoami'])
      .it('shows user email who logged in', (ctx) => {
        expect(ctx.stdout).to.equal(`You are currently logged in with email\n${mail}\n`);
      });
  });
});
