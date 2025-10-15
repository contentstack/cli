import { expect } from 'chai';
import sinon from 'sinon';
import { lookUpTaxonomy, lookUpTerms } from '../../../src/utils/taxonomies-helper';
import { ImportConfig } from '../../../src/types';
import * as cliUtilities from '@contentstack/cli-utilities';

describe('Taxonomies Helper', () => {
  let mockImportConfig: ImportConfig;
  let logWarnStub: sinon.SinonStub;
  let logDebugStub: sinon.SinonStub;

  beforeEach(() => {
    mockImportConfig = {
      apiKey: 'test',
      data: '/test/content',
      context: {
        command: 'cm:stacks:import',
        module: 'taxonomies',
        userId: 'user-123',
        email: 'test@example.com'
      }
    } as any;

    logWarnStub = sinon.stub(cliUtilities, 'log').value({
      warn: sinon.stub(),
      debug: sinon.stub(),
      info: sinon.stub(),
      error: sinon.stub(),
      success: sinon.stub()
    });
    logDebugStub = (cliUtilities.log as any).debug;
    logWarnStub = (cliUtilities.log as any).warn;
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('lookUpTaxonomy()', () => {
    it('should process schema with taxonomy fields', () => {
      const schema = [
        {
          uid: 'taxonomy_field',
          data_type: 'taxonomy',
          taxonomies: [
            { taxonomy_uid: 'tax1' },
            { taxonomy_uid: 'tax2' }
          ]
        }
      ];
      const taxonomies = {
        tax1: { uid: 'tax1' },
        tax2: { uid: 'tax2' }
      };

      lookUpTaxonomy(mockImportConfig, schema, taxonomies);

      expect(schema).to.have.lengthOf(1);
      expect(schema[0].taxonomies).to.have.lengthOf(2);
    });

    it('should remove invalid taxonomy from field', () => {
      const schema = [
        {
          uid: 'taxonomy_field',
          data_type: 'taxonomy',
          taxonomies: [
            { taxonomy_uid: 'tax1' },
            { taxonomy_uid: 'invalid_tax' }
          ]
        }
      ];
      const taxonomies = {
        tax1: { uid: 'tax1' }
      };

      lookUpTaxonomy(mockImportConfig, schema, taxonomies);

      expect(schema[0].taxonomies).to.have.lengthOf(1);
      expect(schema[0].taxonomies[0].taxonomy_uid).to.equal('tax1');
      expect(logWarnStub.calledWith(sinon.match(/invalid_tax.*does not exist/))).to.be.true;
    });

    it('should remove entire taxonomy field when no valid taxonomies remain', () => {
      const schema = [
        {
          uid: 'taxonomy_field',
          data_type: 'taxonomy',
          taxonomies: [
            { taxonomy_uid: 'invalid_tax1' },
            { taxonomy_uid: 'invalid_tax2' }
          ]
        }
      ];
      const taxonomies = {
        tax1: { uid: 'tax1' }
      };

      lookUpTaxonomy(mockImportConfig, schema, taxonomies);

      expect(schema).to.have.lengthOf(0);
      expect(logWarnStub.calledWith(sinon.match(/No valid taxonomies/))).to.be.true;
    });

    it('should not process non-taxonomy fields', () => {
      const schema = [
        {
          uid: 'text_field',
          data_type: 'text'
        }
      ];
      const taxonomies = {};

      lookUpTaxonomy(mockImportConfig, schema, taxonomies);

      expect(schema).to.have.lengthOf(1);
    });

    it('should handle empty schema', () => {
      const schema: any[] = [];
      const taxonomies = {};

      lookUpTaxonomy(mockImportConfig, schema, taxonomies);

      expect(schema).to.have.lengthOf(0);
    });

    it('should handle undefined taxonomies', () => {
      const schema = [
        {
          uid: 'taxonomy_field',
          data_type: 'taxonomy',
          taxonomies: [
            { taxonomy_uid: 'tax1' }
          ]
        }
      ];
      const taxonomies = undefined as any;

      lookUpTaxonomy(mockImportConfig, schema, taxonomies);

      expect(schema).to.have.lengthOf(0);
      expect(logWarnStub.called).to.be.true;
    });

    it('should handle multiple taxonomy fields in schema', () => {
      const schema = [
        {
          uid: 'taxonomy_field_1',
          data_type: 'taxonomy',
          taxonomies: [{ taxonomy_uid: 'tax1' }]
        },
        {
          uid: 'text_field',
          data_type: 'text'
        },
        {
          uid: 'taxonomy_field_2',
          data_type: 'taxonomy',
          taxonomies: [{ taxonomy_uid: 'tax2' }]
        }
      ];
      const taxonomies = {
        tax1: { uid: 'tax1' },
        tax2: { uid: 'tax2' }
      };

      lookUpTaxonomy(mockImportConfig, schema, taxonomies);

      expect(schema).to.have.lengthOf(3);
      expect(schema[0].data_type).to.equal('taxonomy');
      expect(schema[2].data_type).to.equal('taxonomy');
    });

    it('should handle partially valid taxonomies', () => {
      const schema = [
        {
          uid: 'taxonomy_field',
          data_type: 'taxonomy',
          taxonomies: [
            { taxonomy_uid: 'tax1' },
            { taxonomy_uid: 'invalid_tax' },
            { taxonomy_uid: 'tax2' }
          ]
        }
      ];
      const taxonomies = {
        tax1: { uid: 'tax1' },
        tax2: { uid: 'tax2' }
      };

      lookUpTaxonomy(mockImportConfig, schema, taxonomies);

      expect(schema[0].taxonomies).to.have.lengthOf(2);
      expect(schema[0].taxonomies[0].taxonomy_uid).to.equal('tax1');
      expect(schema[0].taxonomies[1].taxonomy_uid).to.equal('tax2');
    });

    it('should call debug logs', () => {
      const schema = [
        {
          uid: 'taxonomy_field',
          data_type: 'taxonomy',
          taxonomies: [{ taxonomy_uid: 'tax1' }]
        }
      ];
      const taxonomies = { tax1: { uid: 'tax1' } };

      lookUpTaxonomy(mockImportConfig, schema, taxonomies);

      expect(logDebugStub.called).to.be.true;
    });

    it('should handle empty taxonomies array in field', () => {
      const schema = [
        {
          uid: 'taxonomy_field',
          data_type: 'taxonomy',
          taxonomies: [] as any
        }
      ];
      const taxonomies = { tax1: { uid: 'tax1' } };

      lookUpTaxonomy(mockImportConfig, schema, taxonomies);

      expect(schema).to.have.lengthOf(0);
    });

    it('should handle null taxonomy_uid', () => {
      const schema = [
        {
          uid: 'taxonomy_field',
          data_type: 'taxonomy',
          taxonomies: [
            { taxonomy_uid: null },
            { taxonomy_uid: 'tax1' }
          ] as any
        }
      ];
      const taxonomies = { tax1: { uid: 'tax1' } };

      lookUpTaxonomy(mockImportConfig, schema, taxonomies);

      expect(schema[0].taxonomies).to.have.lengthOf(1);
      expect(schema[0].taxonomies[0].taxonomy_uid).to.equal('tax1');
    });
  });

  describe('lookUpTerms()', () => {
    it('should process entry with taxonomy fields', () => {
      const ctSchema = [
        {
          uid: 'taxonomy_field',
          data_type: 'taxonomy'
        }
      ];
      const entry = {
        uid: 'entry1',
        taxonomy_field: [
          { taxonomy_uid: 'tax1', term_uid: 'term1' }
        ]
      };
      const taxonomiesAndTermData = {
        tax1: [{ uid: 'term1' }]
      };

      lookUpTerms(ctSchema, entry, taxonomiesAndTermData, mockImportConfig);

      expect(entry.taxonomy_field).to.exist;
      expect(entry.taxonomy_field).to.have.lengthOf(1);
    });

    it('should remove invalid term from entry', () => {
      const ctSchema = [
        {
          uid: 'taxonomy_field',
          data_type: 'taxonomy'
        }
      ];
      const entry = {
        uid: 'entry1',
        taxonomy_field: [
          { taxonomy_uid: 'tax1', term_uid: 'term1' },
          { taxonomy_uid: 'tax1', term_uid: 'invalid_term' }
        ]
      };
      const taxonomiesAndTermData = {
        tax1: [{ uid: 'term1' }]
      };

      lookUpTerms(ctSchema, entry, taxonomiesAndTermData, mockImportConfig);

      expect(entry.taxonomy_field).to.have.lengthOf(1);
      expect(entry.taxonomy_field[0].term_uid).to.equal('term1');
      expect(logWarnStub.calledWith(sinon.match(/invalid_term.*does not exist/))).to.be.true;
    });

    it('should delete taxonomy field from entry when all terms are invalid', () => {
      const ctSchema = [
        {
          uid: 'taxonomy_field',
          data_type: 'taxonomy'
        }
      ];
      const entry = {
        uid: 'entry1',
        taxonomy_field: [
          { taxonomy_uid: 'tax1', term_uid: 'invalid_term' }
        ]
      };
      const taxonomiesAndTermData = {
        tax1: [{ uid: 'term1' }]
      };

      lookUpTerms(ctSchema, entry, taxonomiesAndTermData, mockImportConfig);

      expect(entry.taxonomy_field).to.be.undefined;
    });

    it('should not process non-taxonomy fields', () => {
      const ctSchema = [
        {
          uid: 'text_field',
          data_type: 'text'
        }
      ];
      const entry = {
        uid: 'entry1',
        text_field: 'some text'
      };
      const taxonomiesAndTermData = {};

      lookUpTerms(ctSchema, entry, taxonomiesAndTermData, mockImportConfig);

      expect(entry.text_field).to.equal('some text');
    });

    it('should handle entry without taxonomy field', () => {
      const ctSchema = [
        {
          uid: 'taxonomy_field',
          data_type: 'taxonomy'
        }
      ];
      const entry: any = {
        uid: 'entry1'
      };
      const taxonomiesAndTermData = {
        tax1: [{ uid: 'term1' }]
      };

      lookUpTerms(ctSchema, entry, taxonomiesAndTermData, mockImportConfig);

      expect(entry.taxonomy_field).to.be.undefined;
    });

    it('should handle undefined taxonomiesAndTermData', () => {
      const ctSchema = [
        {
          uid: 'taxonomy_field',
          data_type: 'taxonomy'
        }
      ];
      const entry = {
        uid: 'entry1',
        taxonomy_field: [
          { taxonomy_uid: 'tax1', term_uid: 'term1' }
        ]
      };
      const taxonomiesAndTermData = undefined as any;

      lookUpTerms(ctSchema, entry, taxonomiesAndTermData, mockImportConfig);

      expect(entry.taxonomy_field).to.be.undefined;
      expect(logWarnStub.called).to.be.true;
    });

    it('should handle missing taxonomy in taxonomiesAndTermData', () => {
      const ctSchema = [
        {
          uid: 'taxonomy_field',
          data_type: 'taxonomy'
        }
      ];
      const entry = {
        uid: 'entry1',
        taxonomy_field: [
          { taxonomy_uid: 'missing_tax', term_uid: 'term1' }
        ]
      };
      const taxonomiesAndTermData = {
        tax1: [{ uid: 'term1' }]
      };

      lookUpTerms(ctSchema, entry, taxonomiesAndTermData, mockImportConfig);

      expect(entry.taxonomy_field).to.be.undefined;
    });

    it('should handle multiple taxonomy fields in entry', () => {
      const ctSchema = [
        {
          uid: 'taxonomy_field_1',
          data_type: 'taxonomy'
        },
        {
          uid: 'taxonomy_field_2',
          data_type: 'taxonomy'
        }
      ];
      const entry = {
        uid: 'entry1',
        taxonomy_field_1: [
          { taxonomy_uid: 'tax1', term_uid: 'term1' }
        ],
        taxonomy_field_2: [
          { taxonomy_uid: 'tax2', term_uid: 'term2' }
        ]
      };
      const taxonomiesAndTermData = {
        tax1: [{ uid: 'term1' }],
        tax2: [{ uid: 'term2' }]
      };

      lookUpTerms(ctSchema, entry, taxonomiesAndTermData, mockImportConfig);

      expect(entry.taxonomy_field_1).to.exist;
      expect(entry.taxonomy_field_2).to.exist;
    });

    it('should call debug logs', () => {
      const ctSchema = [
        {
          uid: 'taxonomy_field',
          data_type: 'taxonomy'
        }
      ];
      const entry = {
        uid: 'entry1',
        taxonomy_field: [
          { taxonomy_uid: 'tax1', term_uid: 'term1' }
        ]
      };
      const taxonomiesAndTermData = {
        tax1: [{ uid: 'term1' }]
      };

      lookUpTerms(ctSchema, entry, taxonomiesAndTermData, mockImportConfig);

      expect(logDebugStub.called).to.be.true;
    });

    it('should handle empty taxonomy field array in entry', () => {
      const ctSchema = [
        {
          uid: 'taxonomy_field',
          data_type: 'taxonomy'
        }
      ];
      const entry = {
        uid: 'entry1',
        taxonomy_field: [] as any
      };
      const taxonomiesAndTermData = {
        tax1: [{ uid: 'term1' }]
      };

      lookUpTerms(ctSchema, entry, taxonomiesAndTermData, mockImportConfig);

      expect(entry.taxonomy_field).to.be.undefined;
    });

    it('should handle null term_uid', () => {
      const ctSchema = [
        {
          uid: 'taxonomy_field',
          data_type: 'taxonomy'
        }
      ];
      const entry = {
        uid: 'entry1',
        taxonomy_field: [
          { taxonomy_uid: 'tax1', term_uid: null },
          { taxonomy_uid: 'tax1', term_uid: 'term1' }
        ]
      };
      const taxonomiesAndTermData = {
        tax1: [{ uid: 'term1' }]
      };

      lookUpTerms(ctSchema, entry, taxonomiesAndTermData, mockImportConfig);

      expect(entry.taxonomy_field).to.have.lengthOf(1);
      expect(entry.taxonomy_field[0].term_uid).to.equal('term1');
    });

    it('should handle partially valid terms', () => {
      const ctSchema = [
        {
          uid: 'taxonomy_field',
          data_type: 'taxonomy'
        }
      ];
      const entry = {
        uid: 'entry1',
        taxonomy_field: [
          { taxonomy_uid: 'tax1', term_uid: 'term1' },
          { taxonomy_uid: 'tax1', term_uid: 'invalid' },
          { taxonomy_uid: 'tax1', term_uid: 'term2' }
        ]
      };
      const taxonomiesAndTermData = {
        tax1: [{ uid: 'term1' }, { uid: 'term2' }]
      };

      lookUpTerms(ctSchema, entry, taxonomiesAndTermData, mockImportConfig);

      expect(entry.taxonomy_field).to.have.lengthOf(2);
      expect(entry.taxonomy_field[0].term_uid).to.equal('term1');
      expect(entry.taxonomy_field[1].term_uid).to.equal('term2');
    });

    it('should handle multiple terms from different taxonomies', () => {
      const ctSchema = [
        {
          uid: 'taxonomy_field',
          data_type: 'taxonomy'
        }
      ];
      const entry = {
        uid: 'entry1',
        taxonomy_field: [
          { taxonomy_uid: 'tax1', term_uid: 'term1' },
          { taxonomy_uid: 'tax2', term_uid: 'term2' }
        ]
      };
      const taxonomiesAndTermData = {
        tax1: [{ uid: 'term1' }],
        tax2: [{ uid: 'term2' }]
      };

      lookUpTerms(ctSchema, entry, taxonomiesAndTermData, mockImportConfig);

      expect(entry.taxonomy_field).to.have.lengthOf(2);
    });

    it('should handle empty ctSchema', () => {
      const ctSchema: any[] = [];
      const entry = {
        uid: 'entry1',
        taxonomy_field: [
          { taxonomy_uid: 'tax1', term_uid: 'term1' }
        ]
      };
      const taxonomiesAndTermData = {
        tax1: [{ uid: 'term1' }]
      };

      lookUpTerms(ctSchema, entry, taxonomiesAndTermData, mockImportConfig);

      expect(entry.taxonomy_field).to.exist;
    });
  });

  describe('Edge Cases', () => {
    it('should handle schema with mixed field types', () => {
      const schema = [
        { uid: 'text', data_type: 'text' },
        {
          uid: 'taxonomy',
          data_type: 'taxonomy',
          taxonomies: [{ taxonomy_uid: 'tax1' }]
        },
        { uid: 'number', data_type: 'number' }
      ];
      const taxonomies = { tax1: { uid: 'tax1' } };

      lookUpTaxonomy(mockImportConfig, schema, taxonomies);

      expect(schema).to.have.lengthOf(3);
    });

    it('should handle entry with taxonomy field as undefined', () => {
      const ctSchema = [
        {
          uid: 'taxonomy_field',
          data_type: 'taxonomy'
        }
      ];
      const entry = {
        uid: 'entry1',
        taxonomy_field: undefined as any
      };
      const taxonomiesAndTermData = {
        tax1: [{ uid: 'term1' }]
      };

      lookUpTerms(ctSchema, entry, taxonomiesAndTermData, mockImportConfig);

      expect(entry.taxonomy_field).to.be.undefined;
    });

    it('should handle empty taxonomies object', () => {
      const schema = [
        {
          uid: 'taxonomy_field',
          data_type: 'taxonomy',
          taxonomies: [{ taxonomy_uid: 'tax1' }]
        }
      ];
      const taxonomies = {};

      lookUpTaxonomy(mockImportConfig, schema, taxonomies);

      expect(schema).to.have.lengthOf(0);
    });

    it('should handle empty taxonomiesAndTermData object', () => {
      const ctSchema = [
        {
          uid: 'taxonomy_field',
          data_type: 'taxonomy'
        }
      ];
      const entry = {
        uid: 'entry1',
        taxonomy_field: [
          { taxonomy_uid: 'tax1', term_uid: 'term1' }
        ]
      };
      const taxonomiesAndTermData = {};

      lookUpTerms(ctSchema, entry, taxonomiesAndTermData, mockImportConfig);

      expect(entry.taxonomy_field).to.be.undefined;
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete taxonomy validation flow', () => {
      const schema = [
        {
          uid: 'categories',
          data_type: 'taxonomy',
          taxonomies: [
            { taxonomy_uid: 'product_categories' },
            { taxonomy_uid: 'invalid_taxonomy' }
          ]
        }
      ];
      const taxonomies = {
        product_categories: { uid: 'product_categories' }
      };

      lookUpTaxonomy(mockImportConfig, schema, taxonomies);

      expect(schema[0].taxonomies).to.have.lengthOf(1);
      expect(schema[0].taxonomies[0].taxonomy_uid).to.equal('product_categories');
    });

    it('should handle complete term validation flow', () => {
      const ctSchema = [
        {
          uid: 'categories',
          data_type: 'taxonomy'
        }
      ];
      const entry = {
        uid: 'entry1',
        categories: [
          { taxonomy_uid: 'product_categories', term_uid: 'electronics' },
          { taxonomy_uid: 'product_categories', term_uid: 'invalid_term' },
          { taxonomy_uid: 'product_categories', term_uid: 'clothing' }
        ]
      };
      const taxonomiesAndTermData = {
        product_categories: [
          { uid: 'electronics' },
          { uid: 'clothing' }
        ]
      };

      lookUpTerms(ctSchema, entry, taxonomiesAndTermData, mockImportConfig);

      expect(entry.categories).to.have.lengthOf(2);
      expect(entry.categories[0].term_uid).to.equal('electronics');
      expect(entry.categories[1].term_uid).to.equal('clothing');
    });
  });
});