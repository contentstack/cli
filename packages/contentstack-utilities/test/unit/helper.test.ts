import { cliux, validatePath } from '../../lib';
import { expect } from '@oclif/test';
import { fancy } from '@contentstack/cli-dev-dependencies';

describe('Testing the Validate function', () => {
  describe('When there is no input', () => {
    it('should return true', () => {
      expect(validatePath('')).eql(true);
    });
  });
  describe('When input contains special character', () => {
    fancy
      .stub(cliux, 'print', () => {})
      .it('should return true', () => {
        expect(validatePath('/invalidPath*&%$#')).eql(false);
      });
  });
  describe('When input does not contains special character', () => {
    fancy
      .stub(cliux, 'print', () => {})
      .it('should return true', () => {
        expect(validatePath('/validPath')).eql(true);
      });
  });
});
