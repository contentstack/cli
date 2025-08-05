import { expect } from 'chai';
import { VariantReferenceValidator } from '../../../../src/modules/variant/variant-reference-validator';
import { IVariantLogger } from '../../../../src/modules/variant/interfaces';

describe('VariantReferenceValidator', () => {
  const mockLogger: IVariantLogger = {
    logInfo: () => {},
    logError: () => {}
  };

  const mockEntryMetaData = [
    { uid: 'ref1', content_type_uid: 'blog' },
    { uid: 'ref2', content_type_uid: 'article' }
  ];

  let validator: VariantReferenceValidator;

  beforeEach(() => {
    validator = new VariantReferenceValidator(mockEntryMetaData, mockLogger, false);
  });

  describe('validateReferences', () => {
    it('should handle variant without references', () => {
      const variant = {
        _variant: { _uid: 'test-variant' },
        locale: 'en-us'
      };

      const result = validator.validateReferences(variant, 'entry1');
      expect(result.isValid).to.be.true;
      expect(result.errors).to.have.length(0);
    });

    it('should validate valid references', () => {
      const variant = {
        _variant: { _uid: 'test-variant' },
        locale: 'en-us',
        _metadata: {
          references: [
            { uid: 'ref1', _content_type_uid: 'blog' },
            { uid: 'ref2', _content_type_uid: 'article' }
          ]
        }
      };

      const result = validator.validateReferences(variant, 'entry1');
      expect(result.isValid).to.be.true;
      expect(result.errors).to.have.length(0);
    });

    it('should detect invalid references', () => {
      const variant = {
        _variant: { _uid: 'test-variant' },
        locale: 'en-us',
        _metadata: {
          references: [
            { uid: 'ref1', _content_type_uid: 'blog' },
            { uid: 'invalid-ref', _content_type_uid: 'article' }
          ]
        }
      };

      const result = validator.validateReferences(variant, 'entry1');
      expect(result.isValid).to.be.false;
      expect(result.errors).to.have.length(1);
      expect(result.errors[0].type).to.equal('reference');
      const error = result.errors[0];
      expect(error.type).to.equal('reference');
      if (error.type === 'reference') {
        expect(error.reference_uid).to.equal('invalid-ref');
      }
      expect(result.errors[0].is_variant).to.be.true;
    });

    it('should handle direct UID references', () => {
      const variant = {
        _variant: { _uid: 'test-variant' },
        locale: 'en-us',
        _metadata: {
          references: ['bltinvalid-ref']
        }
      };

      const result = validator.validateReferences(variant, 'entry1');
      expect(result.isValid).to.be.false;
      expect(result.errors).to.have.length(1);
      expect(result.errors[0].type).to.equal('reference');
      const error = result.errors[0];
      expect(error.type).to.equal('reference');
      if (error.type === 'reference') {
        expect(error.reference_uid).to.equal('bltinvalid-ref');
      }
      expect(result.errors[0].is_variant).to.be.true;
    });

    it('should handle fix mode by removing invalid references', () => {
      validator = new VariantReferenceValidator(mockEntryMetaData, mockLogger, true);

      const variant = {
        _variant: { _uid: 'test-variant' },
        locale: 'en-us',
        _metadata: {
          references: [
            { uid: 'ref1', _content_type_uid: 'blog' },
            { uid: 'invalid-ref', _content_type_uid: 'article' }
          ]
        }
      };

      const result = validator.validateReferences(variant, 'entry1');
      expect(result.isValid).to.be.false;
      expect(result.errors).to.have.length(1);
      expect(result.errors[0].fixStatus).to.equal('Fixed');
      expect(variant._metadata.references).to.have.length(1);
      expect(variant._metadata.references[0].uid).to.equal('ref1');
    });
  });
});