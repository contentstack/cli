import { expect } from 'chai';

describe('interactive', () => {
  describe('module exports', () => {
    it('should export all interactive functions', async () => {
      // Import from barrel export with explicit index.js
      const utils = await import('../../../dist/utils/index.js');

      expect(utils.startupQuestions).to.be.a('function');
      expect(utils.chooseOrganization).to.be.a('function');
      expect(utils.chooseStack).to.be.a('function');
      expect(utils.chooseBranch).to.be.a('function');
      expect(utils.chooseContentType).to.be.a('function');
      expect(utils.chooseInMemContentTypes).to.be.a('function');
      expect(utils.chooseLanguage).to.be.a('function');
      expect(utils.chooseFallbackOptions).to.be.a('function');
      expect(utils.promptContinueExport).to.be.a('function');
    });
  });

  // Note: Interactive functions use inquirer.prompt() which requires
  // user input simulation. These are better tested via integration tests
  // or using tools like @inquirer/testing.
});
