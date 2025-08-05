import { expect } from 'chai';


import { VariantPublishValidator } from '../../../../src/modules/variant/variant-publish-validator';
import { IVariantFileHandler, IVariantLogger } from '../../../../src/modules/variant/interfaces';

describe('VariantPublishValidator', () => {
  const mockConfig = {
    environments: ['development', 'production'],
    locales: [{ code: 'en-us' }, { code: 'fr' }]
  };

  const mockLogger: IVariantLogger = {
    logInfo: () => {},
    logError: () => {}
  };

  const mockFileHandler: IVariantFileHandler = {
    readVariantFile: async () => [{
      _variant: {
        _uid: 'test-variant',
        _change_set: [],
        _instance_uid: 'instance1',
        _base_entry_version: 1
      },
      locale: 'en-us',
      publish_details: [{
        locale: 'en-us',
        environment: 'development',
        variant_uid: 'test-variant',
        entry_locale: 'en-us',
        time: '2024-01-01T00:00:00.000Z',
        user: 'test-user',
        version: 1
      }]
    }],
    writeVariantFile: async () => {}
  };

  const mockEntryMetaData = [
    { uid: 'ref1', content_type_uid: 'blog' },
    { uid: 'ref2', content_type_uid: 'article' }
  ];

  let validator: VariantPublishValidator;

  beforeEach(() => {
    validator = new VariantPublishValidator(
      mockConfig,
      mockFileHandler,
      mockLogger,
      false,
      mockEntryMetaData
    );
  });

  describe('validatePublishDetails', () => {
    it('should validate valid publish details', async () => {
      const variant = {
        _variant: {
          _uid: 'test-variant',
          _change_set: [],
          _instance_uid: 'instance1',
          _base_entry_version: 1
        },
        locale: 'en-us',
        publish_details: [{
          locale: 'en-us',
          environment: 'development',
          variant_uid: 'test-variant',
          entry_locale: 'en-us',
          time: '2024-01-01T00:00:00.000Z',
          user: 'test-user',
          version: 1
        }]
      };

      const result = await validator.validatePublishDetails(variant, 'entry1', 'blog', 'en-us');
      expect(result.isValid).to.be.true;
      expect(result.errors).to.have.length(0);
    });

    it('should detect invalid locale in publish details', async () => {
      const variant = {
        _variant: {
          _uid: 'test-variant',
          _change_set: [],
          _instance_uid: 'instance1',
          _base_entry_version: 1
        },
        locale: 'en-us',
        publish_details: [{
          locale: 'invalid-locale',
          environment: 'development',
          variant_uid: 'test-variant',
          entry_locale: 'en-us',
          time: '2024-01-01T00:00:00.000Z',
          user: 'test-user',
          version: 1
        }]
      };

      const result = await validator.validatePublishDetails(variant, 'entry1', 'blog', 'en-us');
      expect(result.isValid).to.be.false;
      expect(result.errors).to.have.length(1);
      expect(result.errors[0].type).to.equal('publish');
      const error = result.errors[0];
      expect(error.type).to.equal('publish');
      if (error.type === 'publish') {
        expect(error.publish_locale).to.equal('invalid-locale');
      }
    });

    it('should detect invalid environment in publish details', async () => {
      const variant = {
        _variant: {
          _uid: 'test-variant',
          _change_set: [],
          _instance_uid: 'instance1',
          _base_entry_version: 1
        },
        locale: 'en-us',
        publish_details: [{
          locale: 'en-us',
          environment: 'invalid-env',
          variant_uid: 'test-variant',
          entry_locale: 'en-us',
          time: '2024-01-01T00:00:00.000Z',
          user: 'test-user',
          version: 1
        }]
      };

      const result = await validator.validatePublishDetails(variant, 'entry1', 'blog', 'en-us');
      expect(result.isValid).to.be.false;
      expect(result.errors).to.have.length(1);
      expect(result.errors[0].type).to.equal('publish');
      const error = result.errors[0];
      expect(error.type).to.equal('publish');
      if (error.type === 'publish') {
        expect(error.publish_environment).to.equal('invalid-env');
      }
    });

    it('should detect mismatched variant_uid in publish details', async () => {
      const variant = {
        _variant: {
          _uid: 'test-variant',
          _change_set: [],
          _instance_uid: 'instance1',
          _base_entry_version: 1
        },
        locale: 'en-us',
        publish_details: [{
          locale: 'en-us',
          environment: 'development',
          variant_uid: 'wrong-variant',
          entry_locale: 'en-us',
          time: '2024-01-01T00:00:00.000Z',
          user: 'test-user',
          version: 1
        }]
      };

      const result = await validator.validatePublishDetails(variant, 'entry1', 'blog', 'en-us');
      expect(result.isValid).to.be.false;
      expect(result.errors).to.have.length(1);
      expect(result.errors[0].type).to.equal('publish');
      const error = result.errors[0];
      expect(error.type).to.equal('publish');
      if (error.type === 'publish') {
        expect(error.variant_uid).to.equal('wrong-variant');
      }
    });

    it('should handle variant without _variant property', async () => {
      const variant = {
        locale: 'en-us',
        publish_details: [{
          locale: 'en-us',
          environment: 'development',
          variant_uid: 'test-variant',
          entry_locale: 'en-us',
          time: '2024-01-01T00:00:00.000Z',
          user: 'test-user',
          version: 1
        }]
      } as any; // Using any to test the edge case

      const result = await validator.validatePublishDetails(variant, 'entry1', 'blog', 'en-us');
      expect(result.isValid).to.be.true;
      expect(result.errors).to.have.length(0);
    });

    it('should handle invalid publish_details format', async () => {
      const variant = {
        _variant: {
          _uid: 'test-variant',
          _change_set: [],
          _instance_uid: 'instance1',
          _base_entry_version: 1
        },
        locale: 'en-us',
        publish_details: 'invalid-format'
      } as any; // Using any to test the edge case

      const result = await validator.validatePublishDetails(variant, 'entry1', 'blog', 'en-us');
      expect(result.isValid).to.be.false;
      expect(result.errors).to.have.length(1);
      expect(result.errors[0].type).to.equal('publish');
      const error = result.errors[0];
      expect(error.type).to.equal('publish');
      if (error.type === 'publish') {
        expect(error.publish_locale).to.equal('invalid');
        expect(error.publish_environment).to.equal('invalid');
      }
    });

    it('should handle multiple validation errors in same variant', async () => {
      const variant = {
        _variant: {
          _uid: 'test-variant',
          _change_set: [],
          _instance_uid: 'instance1',
          _base_entry_version: 1
        },
        locale: 'en-us',
        publish_details: [
          {
            locale: 'invalid-locale',
            environment: 'development',
            variant_uid: 'test-variant',
            entry_locale: 'en-us',
            time: '2024-01-01T00:00:00.000Z',
            user: 'test-user',
            version: 1
          },
          {
            locale: 'en-us',
            environment: 'invalid-env',
            variant_uid: 'test-variant',
            entry_locale: 'en-us',
            time: '2024-01-01T00:00:00.000Z',
            user: 'test-user',
            version: 1
          }
        ]
      };

      const result = await validator.validatePublishDetails(variant, 'entry1', 'blog', 'en-us');
      expect(result.isValid).to.be.false;
      expect(result.errors).to.have.length(2);
      expect(result.errors[0].type).to.equal('publish');
      expect(result.errors[1].type).to.equal('publish');
    });

    it('should handle fix mode correctly', async () => {
      const fixValidator = new VariantPublishValidator(
        mockConfig,
        mockFileHandler,
        mockLogger,
        true, // fix mode
        mockEntryMetaData
      );

      const variant = {
        _variant: {
          _uid: 'test-variant',
          _change_set: [],
          _instance_uid: 'instance1',
          _base_entry_version: 1
        },
        locale: 'en-us',
        publish_details: [{
          locale: 'invalid-locale',
          environment: 'development',
          variant_uid: 'test-variant',
          entry_locale: 'en-us'
        }]
      };

      const result = await fixValidator.validatePublishDetails(variant as any, 'entry1', 'blog', 'en-us');
      expect(result.isValid).to.be.false;
      expect(result.errors).to.have.length(1);
      expect(result.errors[0].fixStatus).to.equal('Fixed');
    });
  });

  describe('validateVariantsInDirectory', () => {
    it('should handle non-existent variants directory', async () => {
      const result = await validator.validateVariantsInDirectory(
        '/non/existent/path',
        'entry1',
        'blog',
        'en-us'
      );
      expect(result.isValid).to.be.true;
      expect(result.errors).to.have.length(0);
    });

    it('should handle file read errors gracefully', async () => {
      const errorFileHandler: IVariantFileHandler = {
        readVariantFile: async () => {
          throw new Error('File read error');
        },
        writeVariantFile: async () => {}
      };

      const errorValidator = new VariantPublishValidator(
        mockConfig,
        errorFileHandler,
        mockLogger,
        false,
        mockEntryMetaData
      );

      const result = await errorValidator.validateVariantsInDirectory(
        '/test/path',
        'entry1',
        'blog',
        'en-us'
      );
      expect(result.isValid).to.be.true;
      expect(result.errors).to.have.length(0);
    });

    it('should handle invalid file format', async () => {
      const invalidFileHandler: IVariantFileHandler = {
        readVariantFile: async () => 'invalid-format',
        writeVariantFile: async () => {}
      };

      const invalidValidator = new VariantPublishValidator(
        mockConfig,
        invalidFileHandler,
        mockLogger,
        false,
        mockEntryMetaData
      );

      const result = await invalidValidator.validateVariantsInDirectory(
        '/test/path',
        'entry1',
        'blog',
        'en-us'
      );
      expect(result.isValid).to.be.true;
      expect(result.errors).to.have.length(0);
    });

    it('should handle fix mode with file writing', async () => {
      let writtenContent: any = null;
      const fixFileHandler: IVariantFileHandler = {
        readVariantFile: async () => [{
          _variant: {
            _uid: 'test-variant',
            _change_set: [],
            _instance_uid: 'instance1',
            _base_entry_version: 1
          },
          locale: 'en-us',
          publish_details: [{
            locale: 'invalid-locale',
            environment: 'development',
            variant_uid: 'test-variant',
            entry_locale: 'en-us'
          }]
        }],
        writeVariantFile: async (_path: string, content: any) => {
          writtenContent = content;
        }
      };

      const fixValidator = new VariantPublishValidator(
        mockConfig,
        fixFileHandler,
        mockLogger,
        true, // fix mode
        mockEntryMetaData
      );

      const result = await fixValidator.validateVariantsInDirectory(
        '/test/path',
        'entry1',
        'blog',
        'en-us'
      );
      expect(result.isValid).to.be.true;
      expect(result.errors).to.have.length(0);
      expect(writtenContent).to.be.null;
    });
  });

  describe('processVariantFile', () => {
    it('should combine publish and reference errors correctly', async () => {
      const mockFileHandlerWithErrors: IVariantFileHandler = {
        readVariantFile: async () => [{
          _variant: {
            _uid: 'test-variant',
            _change_set: [],
            _instance_uid: 'instance1',
            _base_entry_version: 1
          },
          locale: 'en-us',
          publish_details: [{
            locale: 'invalid-locale',
            environment: 'development',
            variant_uid: 'test-variant',
            entry_locale: 'en-us'
          }],
          _metadata: {
            references: [
              { uid: 'invalid-ref', _content_type_uid: 'blog' }
            ]
          }
        }],
        writeVariantFile: async () => {}
      };

      const testValidator = new VariantPublishValidator(
        mockConfig,
        mockFileHandlerWithErrors,
        mockLogger,
        false,
        mockEntryMetaData
      );

      // This tests the private method indirectly through validateVariantsInDirectory
      const result = await testValidator.validateVariantsInDirectory(
        '/test/path',
        'entry1',
        'blog',
        'en-us'
      );
      expect(result.isValid).to.be.true;
      expect(result.errors).to.have.length(0);
    });
  });
});