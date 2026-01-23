import { expect } from 'chai';
import {
  startupQuestions,
  chooseOrganization,
  chooseStack,
  chooseBranch,
  chooseContentType,
  chooseInMemContentTypes,
  chooseLanguage,
  chooseFallbackOptions,
  promptContinueExport,
} from '../../../src/utils/interactive';

describe('interactive', () => {
  describe('module exports', () => {
    it('should export all interactive functions', () => {
      expect(startupQuestions).to.be.a('function');
      expect(chooseOrganization).to.be.a('function');
      expect(chooseStack).to.be.a('function');
      expect(chooseBranch).to.be.a('function');
      expect(chooseContentType).to.be.a('function');
      expect(chooseInMemContentTypes).to.be.a('function');
      expect(chooseLanguage).to.be.a('function');
      expect(chooseFallbackOptions).to.be.a('function');
      expect(promptContinueExport).to.be.a('function');
    });
  });

  // Note: Interactive functions use inquirer.prompt() which requires
  // user input simulation. These are better tested via integration tests
  // or using tools like @inquirer/testing.
});
