import { expect } from 'chai';
import { stub, restore } from 'sinon';
import { cliux, configHandler } from '@contentstack/cli-utilities';
import ProxySetCommand from '../../../src/commands/config/set/proxy';
import ProxyGetCommand from '../../../src/commands/config/get/proxy';
import ProxyRemoveCommand from '../../../src/commands/config/remove/proxy';

describe('Proxy Commands', () => {
  let errorMessage: string | undefined;
  let tableData: unknown[] | undefined;

  beforeEach(() => {
    errorMessage = undefined;
    tableData = undefined;
    stub(cliux, 'print').callsFake(() => {});
    stub(cliux, 'table').callsFake((_headers: unknown, data: unknown[]) => {
      tableData = data;
    });
    stub(cliux, 'error').callsFake((msg: string) => {
      errorMessage = msg;
    });
  });

  afterEach(() => {
    restore();
  });

  describe('Set Proxy Command', () => {
    it('should set proxy config with valid host and port', async () => {
      configHandler.delete('proxy');
      await ProxySetCommand.run(['--host', '127.0.0.1', '--port', '3128', '--protocol', 'http']);
      const proxy = configHandler.get('proxy');
      expect(proxy).to.not.be.undefined;
      expect(proxy?.host).to.equal('127.0.0.1');
      expect(proxy?.port).to.equal(3128);
      expect(proxy?.protocol).to.equal('http');
    });

    it('should reject empty host', async () => {
      await ProxySetCommand.run(['--host', '  ', '--port', '3128', '--protocol', 'http']);
      expect(errorMessage).to.include('Invalid host');
    });
  });

  describe('Get Proxy Command', () => {
    it('should display proxy config when set', async () => {
      configHandler.set('proxy', {
        host: 'proxy.example.com',
        port: 8080,
        protocol: 'https',
        auth: { username: 'user', password: 'pass' },
      });
      await ProxyGetCommand.run([]);
      expect(tableData).to.be.an('array');
      expect(tableData?.length).to.be.greaterThan(0);
    });

    it('should not throw when no proxy config', async () => {
      configHandler.delete('proxy');
      await ProxyGetCommand.run([]);
    });
  });

  describe('Remove Proxy Command', () => {
    it('should remove proxy config', async () => {
      configHandler.set('proxy', { host: '127.0.0.1', port: 3128, protocol: 'http' });
      await ProxyRemoveCommand.run([]);
      expect(configHandler.get('proxy')).to.be.undefined;
    });
  });
});
