import SeedCommand from '../../../../src/commands/cm/stacks/seed';
import ContentModelSeeder from '../../../../src/seed/index';
import { isAuthenticated, configHandler, cliux } from '@contentstack/cli-utilities';

// Mock dependencies
jest.mock('../../../../src/seed/index');
jest.mock('@contentstack/cli-utilities', () => ({
  ...jest.requireActual('@contentstack/cli-utilities'),
  isAuthenticated: jest.fn(),
  configHandler: {
    get: jest.fn(),
  },
  cliux: {
    print: jest.fn(),
    loader: jest.fn(),
    error: jest.fn(),
  },
}));

describe('SeedCommand', () => {
  let mockSeeder: jest.Mocked<ContentModelSeeder>;
  let command: SeedCommand;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock ContentModelSeeder
    mockSeeder = {
      run: jest.fn(),
    } as any;

    (ContentModelSeeder as jest.Mock) = jest.fn().mockImplementation(() => mockSeeder);

    // Mock utilities
    (isAuthenticated as jest.Mock) = jest.fn().mockReturnValue(true);
    (configHandler.get as jest.Mock) = jest.fn().mockReturnValue({});
    (cliux.print as jest.Mock) = jest.fn();
    (cliux.loader as jest.Mock) = jest.fn();

    command = new SeedCommand([], {} as any);
    Object.defineProperty(command, 'cdaHost', {
      value: 'https://cdn.contentstack.io',
      writable: true,
      configurable: true,
    });
    Object.defineProperty(command, 'cmaHost', {
      value: 'https://api.contentstack.io',
      writable: true,
      configurable: true,
    });
  });

  describe('run', () => {
    it('should successfully run seed command with all flags', async () => {
      const flags = {
        repo: 'user/repo',
        org: 'org-123',
        'stack-api-key': undefined,
        'stack-name': 'New Stack',
        'fetch-limit': '50',
        yes: undefined,
        alias: undefined,
        locale: 'en-us',
      };

      jest.spyOn(command as any, 'parse').mockResolvedValue({
        flags,
      } as any);

      mockSeeder.run.mockResolvedValue({ api_key: 'api-key-123' });

      await command.run();

      expect(ContentModelSeeder).toHaveBeenCalledWith({
        parent: command,
        cdaHost: 'https://cdn.contentstack.io',
        cmaHost: 'https://api.contentstack.io',
        gitHubPath: 'user/repo',
        orgUid: 'org-123',
        stackUid: undefined,
        stackName: 'New Stack',
        fetchLimit: '50',
        skipStackConfirmation: undefined,
        isAuthenticated: true,
        alias: undefined,
        master_locale: 'en-us',
      });
      expect(mockSeeder.run).toHaveBeenCalled();
    });

    it('should use stack-api-key when provided', async () => {
      const flags = {
        repo: 'user/repo',
        org: undefined,
        'stack-api-key': 'api-key-123',
        'stack-name': undefined,
        'fetch-limit': undefined,
        yes: undefined,
        alias: undefined,
        locale: undefined,
      };

      jest.spyOn(command as any, 'parse').mockResolvedValue({
        flags,
      } as any);

      mockSeeder.run.mockResolvedValue({ api_key: 'api-key-123' });

      await command.run();

      expect(ContentModelSeeder).toHaveBeenCalledWith(
        expect.objectContaining({
          stackUid: 'api-key-123',
          orgUid: undefined,
          stackName: undefined,
        }),
      );
    });

    it('should use management token alias when provided', async () => {
      const flags = {
        repo: 'user/repo',
        org: undefined,
        'stack-api-key': undefined,
        'stack-name': undefined,
        'fetch-limit': undefined,
        yes: undefined,
        alias: 'my-alias',
        locale: undefined,
      };

      const mockTokens = {
        'my-alias': {
          token: 'management-token-123',
          apiKey: 'api-key-123',
        },
      };

      (configHandler.get as jest.Mock) = jest.fn().mockReturnValue(mockTokens);

      jest.spyOn(command as any, 'parse').mockResolvedValue({
        flags,
      } as any);

      mockSeeder.run.mockResolvedValue({ api_key: 'api-key-123' });

      await command.run();

      expect(ContentModelSeeder).toHaveBeenCalledWith(
        expect.objectContaining({
          alias: 'my-alias',
          managementToken: 'management-token-123',
          stackUid: 'api-key-123',
        }),
      );
    });


    it('should handle seeder errors with message', async () => {
      const flags = {
        repo: 'user/repo',
        org: undefined,
        'stack-api-key': undefined,
        'stack-name': undefined,
        'fetch-limit': undefined,
        yes: undefined,
        alias: undefined,
        locale: undefined,
      };

      jest.spyOn(command as any, 'parse').mockResolvedValue({
        flags,
      } as any);

      const error = new Error('Seeder failed');
      mockSeeder.run.mockRejectedValue(error);

      jest.spyOn(command, 'exit').mockImplementation(() => {
        throw new Error('Exit called');
      });

      await expect(command.run()).rejects.toThrow('Exit called');

      expect(cliux.loader).toHaveBeenCalled();
      expect(cliux.print).toHaveBeenCalledWith('Error: Seeder failed', { color: 'red' });
      expect(command.exit).toHaveBeenCalledWith(1);
    });

    it('should handle seeder errors without message', async () => {
      const flags = {
        repo: 'user/repo',
        org: undefined,
        'stack-api-key': undefined,
        'stack-name': undefined,
        'fetch-limit': undefined,
        yes: undefined,
        alias: undefined,
        locale: undefined,
      };

      jest.spyOn(command as any, 'parse').mockResolvedValue({
        flags,
      } as any);

      const error = { suggestions: ['Try again'] };
      mockSeeder.run.mockRejectedValue(error);

      jest.spyOn(command, 'error').mockImplementation(() => {
        throw new Error('Command error');
      });

      await expect(command.run()).rejects.toThrow('Command error');

      expect(command.error).toHaveBeenCalledWith(error, {
        exit: 1,
        suggestions: ['Try again'],
      });
    });

    it('should handle skipStackConfirmation flag', async () => {
      const flags = {
        repo: 'user/repo',
        org: undefined,
        'stack-api-key': undefined,
        'stack-name': undefined,
        'fetch-limit': undefined,
        yes: 'yes',
        alias: undefined,
        locale: undefined,
      };

      jest.spyOn(command as any, 'parse').mockResolvedValue({
        flags,
      } as any);

      mockSeeder.run.mockResolvedValue({ api_key: 'api-key-123' });

      await command.run();

      expect(ContentModelSeeder).toHaveBeenCalledWith(
        expect.objectContaining({
          skipStackConfirmation: 'yes',
        }),
      );
    });

    it('should handle all optional flags', async () => {
      const flags = {
        repo: 'user/repo',
        org: 'org-123',
        'stack-api-key': undefined,
        'stack-name': 'My Stack',
        'fetch-limit': '100',
        yes: 'yes',
        alias: 'my-alias',
        locale: 'fr-fr',
      };

      jest.spyOn(command as any, 'parse').mockResolvedValue({
        flags,
      } as any);

      mockSeeder.run.mockResolvedValue({ api_key: 'api-key-123' });

      await command.run();

      expect(ContentModelSeeder).toHaveBeenCalledWith({
        parent: command,
        cdaHost: 'https://cdn.contentstack.io',
        cmaHost: 'https://api.contentstack.io',
        gitHubPath: 'user/repo',
        orgUid: 'org-123',
        stackUid: undefined,
        stackName: 'My Stack',
        fetchLimit: '100',
        skipStackConfirmation: 'yes',
        isAuthenticated: true,
        alias: 'my-alias',
        master_locale: 'fr-fr',
      });
    });

    it('should return result from seeder', async () => {
      const flags = {
        repo: 'user/repo',
        org: undefined,
        'stack-api-key': undefined,
        'stack-name': undefined,
        'fetch-limit': undefined,
        yes: undefined,
        alias: undefined,
        locale: undefined,
      };

      jest.spyOn(command as any, 'parse').mockResolvedValue({
        flags,
      } as any);

      const expectedResult = { api_key: 'api-key-123' };
      mockSeeder.run.mockResolvedValue(expectedResult);

      const result = await command.run();

      expect(result).toEqual(expectedResult);
    });

    it('should handle undefined flags gracefully', async () => {
      const flags = {
        repo: undefined,
        org: undefined,
        'stack-api-key': undefined,
        'stack-name': undefined,
        'fetch-limit': undefined,
        yes: undefined,
        alias: undefined,
        locale: undefined,
      };

      jest.spyOn(command as any, 'parse').mockResolvedValue({
        flags,
      } as any);

      mockSeeder.run.mockResolvedValue({ api_key: 'api-key-123' });

      await command.run();

      expect(ContentModelSeeder).toHaveBeenCalledWith(
        expect.objectContaining({
          gitHubPath: undefined,
          orgUid: undefined,
          stackUid: undefined,
          stackName: undefined,
        }),
      );
    });
  });

  describe('static properties', () => {
    it('should have correct description', () => {
      expect(SeedCommand.description).toBe(
        'Create a stack from existing content types, entries, assets, etc',
      );
    });

    it('should have correct examples', () => {
      expect(SeedCommand.examples).toContain('$ csdx cm:stacks:seed');
      expect(SeedCommand.examples).toContain('$ csdx cm:stacks:seed --repo "account"');
    });

    it('should have correct usage', () => {
      expect(SeedCommand.usage).toBe(
        'cm:stacks:seed [--repo <value>] [--org <value>] [--stack-api-key <value>] [--stack-name <value>] [--yes <value>] [--alias <value>] [--locale <value>]',
      );
    });

    it('should have all required flags defined', () => {
      expect(SeedCommand.flags).toBeDefined();
      expect(SeedCommand.flags.repo).toBeDefined();
      expect(SeedCommand.flags.org).toBeDefined();
      expect(SeedCommand.flags['stack-api-key']).toBeDefined();
      expect(SeedCommand.flags['stack-name']).toBeDefined();
      expect(SeedCommand.flags.yes).toBeDefined();
      expect(SeedCommand.flags.alias).toBeDefined();
      expect(SeedCommand.flags.locale).toBeDefined();
    });
  });
});
