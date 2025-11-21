// Mock utilities before importing
jest.mock('@contentstack/cli-utilities', () => {
  const actual = jest.requireActual('@contentstack/cli-utilities');
  return {
    ...actual,
    configHandler: {
      get: jest.fn().mockReturnValue(null),
    },
  };
});

// Mock dependencies
jest.mock('@contentstack/cli-cm-import');
jest.mock('@contentstack/cli-utilities');

import * as importer from '../../src/seed/importer';
import ImportCommand from '@contentstack/cli-cm-import';
import * as path from 'node:path';
import * as cliUtilities from '@contentstack/cli-utilities';

// Mock process.chdir
const mockChdir = jest.fn();
jest.spyOn(process, 'chdir').mockImplementation(mockChdir);

describe('Importer', () => {
  const mockOptions = {
    master_locale: 'en-us',
    api_key: 'test-api-key',
    tmpPath: '/tmp/test-path',
    cmaHost: 'https://api.contentstack.io',
    cdaHost: 'https://cdn.contentstack.io',
    isAuthenticated: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(cliUtilities, 'pathValidator').mockImplementation((p: any) => p);
    jest.spyOn(cliUtilities, 'sanitizePath').mockImplementation((p: any) => p);
    (ImportCommand.run as jest.Mock) = jest.fn().mockResolvedValue(undefined);
  });

  describe('run', () => {
    it('should run import command with correct arguments', async () => {
      await importer.run(mockOptions);

      const expectedPath = path.resolve(mockOptions.tmpPath, 'stack');
      expect(cliUtilities.pathValidator).toHaveBeenCalledWith(expectedPath);
      expect(cliUtilities.sanitizePath).toHaveBeenCalledWith(mockOptions.tmpPath);
      expect(mockChdir).toHaveBeenCalledWith(mockOptions.tmpPath);
      expect(ImportCommand.run).toHaveBeenCalledWith(['-k', mockOptions.api_key, '-d', expectedPath, '--skip-audit']);
    });

    it('should include alias in arguments when provided', async () => {
      const optionsWithAlias = {
        ...mockOptions,
        alias: 'test-alias',
      };

      await importer.run(optionsWithAlias);

      expect(ImportCommand.run).toHaveBeenCalledWith([
        '-k',
        optionsWithAlias.api_key,
        '-d',
        path.resolve(optionsWithAlias.tmpPath, 'stack'),
        '--alias',
        'test-alias',
        '--skip-audit',
      ]);
    });

    it('should not include alias when not provided', async () => {
      await importer.run(mockOptions);

      const args = (ImportCommand.run as jest.Mock).mock.calls[0][0];
      expect(args).not.toContain('--alias');
    });

    it('should always include --skip-audit flag', async () => {
      await importer.run(mockOptions);

      const args = (ImportCommand.run as jest.Mock).mock.calls[0][0];
      expect(args).toContain('--skip-audit');
    });

    it('should handle different master locales', async () => {
      const optionsWithLocale = {
        ...mockOptions,
        master_locale: 'fr-fr',
      };

      await importer.run(optionsWithLocale);

      expect(ImportCommand.run).toHaveBeenCalled();
    });

    it('should handle unauthenticated state', async () => {
      const unauthenticatedOptions = {
        ...mockOptions,
        isAuthenticated: false,
      };

      await importer.run(unauthenticatedOptions);

      expect(ImportCommand.run).toHaveBeenCalled();
    });

    it('should resolve path correctly with different tmpPath values', async () => {
      const testPaths = ['/tmp/test', './relative/path', String.raw`C:\Windows\Path`, '/tmp/path with spaces'];

      for (const testPath of testPaths) {
        const options = {
          ...mockOptions,
          tmpPath: testPath,
        };

        await importer.run(options);

        const expectedPath = path.resolve(testPath, 'stack');
        expect(cliUtilities.pathValidator).toHaveBeenCalledWith(expectedPath);
        expect(mockChdir).toHaveBeenCalledWith(testPath);
      }
    });

    it('should handle path sanitization', async () => {
      const unsafePath = '../../../etc/passwd';
      const sanitizedPath = '/safe/path';
      const options = {
        ...mockOptions,
        tmpPath: unsafePath,
      };

      jest.spyOn(cliUtilities, 'sanitizePath').mockReturnValue(sanitizedPath);

      await importer.run(options);

      expect(cliUtilities.sanitizePath).toHaveBeenCalledWith(unsafePath);
      expect(cliUtilities.pathValidator).toHaveBeenCalledWith(path.resolve(sanitizedPath, 'stack'));
    });

    it('should handle path validation', async () => {
      const invalidPath = '/invalid/path';
      const validatedPath = '/valid/path';
      const options = {
        ...mockOptions,
        tmpPath: invalidPath,
      };

      jest.spyOn(cliUtilities, 'pathValidator').mockReturnValue(validatedPath);

      await importer.run(options);

      expect(cliUtilities.pathValidator).toHaveBeenCalled();
    });

    it('should change directory before running import', async () => {
      await importer.run(mockOptions);

      // Verify chdir is called before ImportCommand.run
      const chdirCallOrder = mockChdir.mock.invocationCallOrder[0];
      const importCallOrder = (ImportCommand.run as jest.Mock).mock.invocationCallOrder[0];

      expect(chdirCallOrder).toBeLessThan(importCallOrder);
    });

    it('should handle import command errors', async () => {
      const mockError = new Error('Import failed');
      (ImportCommand.run as jest.Mock) = jest.fn().mockRejectedValue(mockError);

      await expect(importer.run(mockOptions)).rejects.toThrow('Import failed');
    });

    it('should use correct stack folder name', async () => {
      await importer.run(mockOptions);

      const expectedPath = path.resolve(mockOptions.tmpPath, 'stack');
      expect(cliUtilities.pathValidator).toHaveBeenCalledWith(expectedPath);
    });
  });
});
