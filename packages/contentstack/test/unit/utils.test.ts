import { expect } from 'chai';
// CommonJS module: use default import and destructure for ESM compatibility
import cliUtilities from '@contentstack/cli-utilities';
const { CLIError } = cliUtilities;

/**
 * Utils tests. Analytics and UserConfig were removed from this package (Analytics removed;
 * UserConfig/region logic lives in @contentstack/cli-config and is tested there).
 * This file tests CLIError from cli-utilities which is used across the CLI.
 */
describe('Utils', function () {
  describe('CLIError (from @contentstack/cli-utilities)', function () {
    it('should be a constructor', function () {
      const err = new CLIError('test');
      expect(err).to.be.instanceOf(CLIError);
      expect(err.message).to.equal('test');
    });

    it('should extend Error', function () {
      const err = new CLIError('test');
      expect(err).to.be.instanceOf(Error);
    });
  });
});
