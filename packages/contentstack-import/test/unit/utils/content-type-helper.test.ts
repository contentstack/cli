import { expect } from 'chai';
import sinon from 'sinon';
import { schemaTemplate, suppressSchemaReference, removeReferenceFields, updateFieldRules } from '../../../src/utils/content-type-helper';

describe('Content Type Helper', () => {
  let sandbox: sinon.SinonSandbox;
  let logDebugStub: sinon.SinonStub;
  let logWarnStub: sinon.SinonStub;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    logDebugStub = sandbox.stub(console, 'log'); // Mock log.debug
    logWarnStub = sandbox.stub(console, 'warn'); // Mock log.warn
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('schemaTemplate', () => {
    it('should be an object with correct structure', () => {
      expect(schemaTemplate).to.be.an('object');
      expect(schemaTemplate).to.have.property('content_type');
      expect(schemaTemplate.content_type).to.have.property('title', 'Seed');
      expect(schemaTemplate.content_type).to.have.property('uid', '');
      expect(schemaTemplate.content_type).to.have.property('schema');
      expect(schemaTemplate.content_type).to.have.property('options');
    });

    it('should have schema with title and url fields', () => {
      const schema = schemaTemplate.content_type.schema;
      expect(schema).to.be.an('array');
      expect(schema).to.have.length(2);
      
      const titleField = schema[0];
      expect(titleField).to.have.property('display_name', 'Title');
      expect(titleField).to.have.property('uid', 'title');
      expect(titleField).to.have.property('data_type', 'text');
      expect(titleField).to.have.property('mandatory', true);
      expect(titleField).to.have.property('unique', false);
      expect(titleField).to.have.property('multiple', false);

      const urlField = schema[1];
      expect(urlField).to.have.property('display_name', 'URL');
      expect(urlField).to.have.property('uid', 'url');
      expect(urlField).to.have.property('data_type', 'text');
      expect(urlField).to.not.have.property('mandatory');
      expect(urlField).to.have.property('unique', false);
      expect(urlField).to.have.property('multiple', false);
    });

    it('should have correct options structure', () => {
      const options = schemaTemplate.content_type.options;
      expect(options).to.have.property('title', 'title');
      expect(options).to.have.property('publishable', true);
      expect(options).to.have.property('is_page', true);
      expect(options).to.have.property('singleton', false);
      expect(options).to.have.property('sub_title');
      expect(options).to.have.property('url_pattern', '/:title');
      expect(options).to.have.property('url_prefix', '/');
    });
  });

  describe('suppressSchemaReference', () => {
    it('should be a function', () => {
      expect(suppressSchemaReference).to.be.a('function');
    });

    it('should process group fields recursively', () => {
      const schema = [
        {
          uid: 'group-field',
          data_type: 'group',
          schema: [
            {
              uid: 'nested-field',
              data_type: 'text',
              mandatory: true,
              unique: false
            }
          ]
        }
      ];
      const flag = { references: false, suppressed: false };

      suppressSchemaReference(schema, flag);

      expect(schema[0].schema[0].mandatory).to.be.false;
      expect(schema[0].schema[0].unique).to.be.false;
      expect(flag.suppressed).to.be.true;
    });

    it('should process global_field fields recursively', () => {
      const schema = [
        {
          uid: 'global-field',
          data_type: 'global_field',
          schema: [
            {
              uid: 'nested-field',
              data_type: 'text',
              mandatory: true,
              unique: false
            }
          ]
        }
      ];
      const flag = { references: false, suppressed: false };

      suppressSchemaReference(schema, flag);

      expect(schema[0].schema[0].mandatory).to.be.false;
      expect(schema[0].schema[0].unique).to.be.false;
      expect(flag.suppressed).to.be.true;
    });

    it('should process blocks fields recursively', () => {
      const schema = [
        {
          uid: 'blocks-field',
          data_type: 'blocks',
          blocks: [
            {
              uid: 'block-1',
              schema: [
                {
                  uid: 'block-field',
                  data_type: 'text',
                  mandatory: true,
                  unique: false
                }
              ]
            }
          ]
        }
      ];
      const flag = { references: false, suppressed: false };

      suppressSchemaReference(schema, flag);

      expect(schema[0].blocks[0].schema[0].mandatory).to.be.false;
      expect(schema[0].blocks[0].schema[0].unique).to.be.false;
      expect(flag.suppressed).to.be.true;
    });

    it('should detect reference fields', () => {
      const schema = [
        {
          uid: 'ref-field',
          data_type: 'reference',
          mandatory: false,
          unique: false
        }
      ];
      const flag = { references: false, suppressed: false };

      suppressSchemaReference(schema, flag);

      expect(flag.references).to.be.true;
    });

    it('should detect JSON RTE fields', () => {
      const schema = [
        {
          uid: 'json-rte-field',
          data_type: 'json',
          field_metadata: {
            rich_text_type: true,
            embed_entry: false
          },
          mandatory: false,
          unique: false
        }
      ];
      const flag = { jsonRte: false, jsonRteEmbeddedEntries: false, suppressed: false };

      suppressSchemaReference(schema, flag);

      expect(flag.jsonRte).to.be.true;
      expect(flag.jsonRteEmbeddedEntries).to.be.false;
    });

    it('should detect JSON RTE fields with embedded entries', () => {
      const schema = [
        {
          uid: 'json-rte-field',
          data_type: 'json',
          field_metadata: {
            rich_text_type: true,
            embed_entry: true
          },
          mandatory: false,
          unique: false
        }
      ];
      const flag = { jsonRte: false, jsonRteEmbeddedEntries: false, suppressed: false };

      suppressSchemaReference(schema, flag);

      expect(flag.jsonRte).to.be.true;
      expect(flag.jsonRteEmbeddedEntries).to.be.true;
    });

    it('should detect text RTE fields', () => {
      const schema = [
        {
          uid: 'text-rte-field',
          data_type: 'text',
          field_metadata: {
            rich_text_type: true,
            embed_entry: false
          },
          mandatory: false,
          unique: false
        }
      ];
      const flag = { rte: false, rteEmbeddedEntries: false, suppressed: false };

      suppressSchemaReference(schema, flag);

      expect(flag.rte).to.be.true;
      expect(flag.rteEmbeddedEntries).to.be.false;
    });

    it('should detect text RTE fields with embedded entries', () => {
      const schema = [
        {
          uid: 'text-rte-field',
          data_type: 'text',
          field_metadata: {
            rich_text_type: true,
            embed_entry: true
          },
          mandatory: false,
          unique: false
        }
      ];
      const flag = { rte: false, rteEmbeddedEntries: false, suppressed: false };

      suppressSchemaReference(schema, flag);

      expect(flag.rte).to.be.true;
      expect(flag.rteEmbeddedEntries).to.be.true;
    });

    it('should suppress mandatory fields except title', () => {
      const schema = [
        {
          uid: 'title', // Must be exactly 'title' to not be suppressed
          data_type: 'text',
          mandatory: true,
          unique: false
        },
        {
          uid: 'other-field',
          data_type: 'text',
          mandatory: true,
          unique: false
        }
      ];
      const flag = { suppressed: false };

      suppressSchemaReference(schema, flag);

      expect(schema[0].mandatory).to.be.true; // title field should not be suppressed
      expect(schema[1].mandatory).to.be.false; // other field should be suppressed
      expect(flag.suppressed).to.be.true; // Should be true because other-field was suppressed
    });

    it('should suppress unique fields except title', () => {
      const schema = [
        {
          uid: 'title', // Must be exactly 'title' to not be suppressed
          data_type: 'text',
          mandatory: false,
          unique: true
        },
        {
          uid: 'other-field',
          data_type: 'text',
          mandatory: false,
          unique: true
        }
      ];
      const flag = { suppressed: false };

      suppressSchemaReference(schema, flag);

      expect(schema[0].unique).to.be.true; // title field should not be suppressed
      expect(schema[1].unique).to.be.false; // other field should be suppressed
      expect(flag.suppressed).to.be.true; // Should be true because other-field was suppressed
    });

    it('should handle mixed field types', () => {
      const schema = [
        {
          uid: 'ref-field',
          data_type: 'reference',
          mandatory: false,
          unique: false
        },
        {
          uid: 'mandatory-field',
          data_type: 'text',
          mandatory: true,
          unique: false
        },
        {
          uid: 'json-rte-field',
          data_type: 'json',
          field_metadata: {
            rich_text_type: true,
            embed_entry: true
          },
          mandatory: false,
          unique: false
        }
      ];
      const flag = { 
        references: false, 
        jsonRte: false, 
        jsonRteEmbeddedEntries: false, 
        suppressed: false 
      };

      suppressSchemaReference(schema, flag);

      expect(flag.references).to.be.true;
      expect(flag.jsonRte).to.be.true;
      expect(flag.jsonRteEmbeddedEntries).to.be.true;
      expect(flag.suppressed).to.be.true;
      expect(schema[1].mandatory).to.be.false;
    });

    it('should handle empty schema', () => {
      const schema: any[] = [];
      const flag = { references: false, suppressed: false };

      suppressSchemaReference(schema, flag);

      expect(flag.references).to.be.false;
      expect(flag.suppressed).to.be.false;
    });
  });

  describe('removeReferenceFields', () => {
    let mockStackAPIClient: any;

    beforeEach(() => {
      mockStackAPIClient = {
        contentType: sandbox.stub().returns({
          fetch: sandbox.stub()
        })
      };
    });

    it('should be a function', () => {
      expect(removeReferenceFields).to.be.a('function');
    });

    it('should return a Promise', () => {
      const result = removeReferenceFields([], { supressed: false }, mockStackAPIClient);
      expect(result).to.be.a('Promise');
    });

    it('should process group fields recursively', async () => {
      const schema = [
        {
          uid: 'group-field',
          data_type: 'group',
          schema: [
            {
              uid: 'nested-ref-field',
              data_type: 'reference',
              reference_to: ['content-type-1']
            }
          ]
        }
      ];
      const flag = { supressed: false };

      mockStackAPIClient.contentType().fetch.resolves({});

      await removeReferenceFields(schema, flag, mockStackAPIClient);

      expect(flag.supressed).to.be.true;
    });

    it('should process blocks fields recursively', async () => {
      const schema = [
        {
          uid: 'blocks-field',
          data_type: 'blocks',
          blocks: [
            {
              uid: 'block-1',
              schema: [
                {
                  uid: 'block-ref-field',
                  data_type: 'reference',
                  reference_to: ['content-type-1']
                }
              ]
            }
          ]
        }
      ];
      const flag = { supressed: false };

      mockStackAPIClient.contentType().fetch.resolves({});

      await removeReferenceFields(schema, flag, mockStackAPIClient);

      expect(flag.supressed).to.be.true;
    });

    it('should handle reference fields with existing content types', async () => {
      const schema = [
        {
          uid: 'ref-field',
          data_type: 'reference',
          reference_to: ['content-type-1', 'content-type-2']
        }
      ];
      const flag = { supressed: false };

      mockStackAPIClient.contentType().fetch.resolves({});

      await removeReferenceFields(schema, flag, mockStackAPIClient);

      expect(flag.supressed).to.be.true;
      expect(schema).to.have.length(1); // Field should not be removed
    });

    it('should remove reference fields with non-existing content types', async () => {
      const schema = [
        {
          uid: 'ref-field',
          data_type: 'reference',
          reference_to: ['non-existing-type']
        }
      ];
      const flag = { supressed: false };

      mockStackAPIClient.contentType().fetch.rejects(new Error('Not found'));

      await removeReferenceFields(schema, flag, mockStackAPIClient);

      expect(flag.supressed).to.be.true;
      expect(schema).to.have.length(1); // Should have dummy field
      expect(schema[0].uid).to.equal('dummy_test');
    });

    it('should add dummy field when schema becomes empty', async () => {
      const schema = [
        {
          uid: 'ref-field',
          data_type: 'reference',
          reference_to: ['non-existing-type']
        }
      ];
      const flag = { supressed: false };

      mockStackAPIClient.contentType().fetch.rejects(new Error('Not found'));

      await removeReferenceFields(schema, flag, mockStackAPIClient);

      expect(schema).to.have.length(1);
      expect(schema[0]).to.have.property('data_type', 'text');
      expect(schema[0]).to.have.property('uid', 'dummy_test');
      expect(schema[0]).to.have.property('display_name', 'dummyTest');
    });

    it('should handle JSON RTE fields with multiple references', async () => {
      const schema = [
        {
          uid: 'json-rte-field',
          data_type: 'json',
          field_metadata: {
            allow_json_rte: true,
            embed_entry: true
          },
          reference_to: ['content-type-1', 'content-type-2']
        }
      ];
      const flag = { supressed: false };

      await removeReferenceFields(schema, flag, mockStackAPIClient);

      expect(flag.supressed).to.be.true;
      expect(schema[0].reference_to).to.deep.equal(['sys_assets']);
    });

    it('should handle JSON RTE fields with rich_text_type and multiple references', async () => {
      const schema = [
        {
          uid: 'json-rte-field',
          data_type: 'json',
          field_metadata: {
            rich_text_type: true,
            embed_entry: true
          },
          reference_to: ['content-type-1', 'content-type-2']
        }
      ];
      const flag = { supressed: false };

      await removeReferenceFields(schema, flag, mockStackAPIClient);

      expect(flag.supressed).to.be.true;
      expect(schema[0].reference_to).to.deep.equal(['sys_assets']);
    });

    it('should handle text RTE fields with references', async () => {
      const schema = [
        {
          uid: 'text-rte-field',
          data_type: 'text',
          field_metadata: {
            rich_text_type: true,
            embed_entry: true
          },
          reference_to: ['content-type-1']
        }
      ];
      const flag = { supressed: false };

      await removeReferenceFields(schema, flag, mockStackAPIClient);

      expect(flag.supressed).to.be.true;
      expect(schema[0].reference_to).to.deep.equal(['sys_assets']);
    });

    it('should handle empty schema', async () => {
      const schema: any[] = [];
      const flag = { supressed: false };

      await removeReferenceFields(schema, flag, mockStackAPIClient);

      expect(schema).to.have.length(0);
    });

    it('should handle null/undefined schema', async () => {
      const flag = { supressed: false };

      await removeReferenceFields(null, flag, mockStackAPIClient);
      await removeReferenceFields(undefined, flag, mockStackAPIClient);

      // Should not throw errors
      expect(true).to.be.true;
    });

    it('should handle mixed field types', async () => {
      const schema = [
        {
          uid: 'ref-field',
          data_type: 'reference',
          reference_to: ['existing-type']
        },
        {
          uid: 'json-rte-field',
          data_type: 'json',
          field_metadata: {
            rich_text_type: true,
            embed_entry: true
          },
          reference_to: ['content-type-1', 'content-type-2']
        },
        {
          uid: 'text-field',
          data_type: 'text',
          field_metadata: {
            rich_text_type: true,
            embed_entry: true
          },
          reference_to: ['content-type-1']
        }
      ];
      const flag = { supressed: false };

      mockStackAPIClient.contentType().fetch.resolves({});

      await removeReferenceFields(schema, flag, mockStackAPIClient);

      expect(flag.supressed).to.be.true;
      expect(schema[1].reference_to).to.deep.equal(['sys_assets']);
      expect(schema[2].reference_to).to.deep.equal(['sys_assets']);
    });
  });

  describe('updateFieldRules', () => {
    it('should be a function', () => {
      expect(updateFieldRules).to.be.a('function');
    });

    it('should return field rules without reference conditions', () => {
      const contentType = {
        uid: 'test-content-type',
        schema: [
          { uid: 'title', data_type: 'text' },
          { uid: 'reference_field', data_type: 'reference' },
          { uid: 'text_field', data_type: 'text' }
        ],
        field_rules: [
          {
            conditions: [
              { operand_field: 'title' }
            ]
          },
          {
            conditions: [
              { operand_field: 'reference_field' }
            ]
          },
          {
            conditions: [
              { operand_field: 'text_field' }
            ]
          }
        ]
      };

      const result = updateFieldRules(contentType);

      expect(result).to.be.an('array');
      expect(result).to.have.length(2); // Should remove rule with reference field
      expect(result[0].conditions[0].operand_field).to.equal('title');
      expect(result[1].conditions[0].operand_field).to.equal('text_field');
    });

    it('should handle content type with no field rules', () => {
      const contentType = {
        uid: 'test-content-type',
        schema: [
          { uid: 'title', data_type: 'text' }
        ],
        field_rules: [] as any[]
      };

      const result = updateFieldRules(contentType);

      expect(result).to.be.an('array');
      expect(result).to.have.length(0);
    });

    it('should handle content type with no reference fields', () => {
      const contentType = {
        uid: 'test-content-type',
        schema: [
          { uid: 'title', data_type: 'text' },
          { uid: 'description', data_type: 'text' }
        ],
        field_rules: [
          {
            conditions: [
              { operand_field: 'title' }
            ]
          },
          {
            conditions: [
              { operand_field: 'description' }
            ]
          }
        ]
      };

      const result = updateFieldRules(contentType);

      expect(result).to.be.an('array');
      expect(result).to.have.length(2); // No rules should be removed
    });

    it('should handle multiple conditions in a single rule', () => {
      const contentType = {
        uid: 'test-content-type',
        schema: [
          { uid: 'title', data_type: 'text' },
          { uid: 'reference_field', data_type: 'reference' },
          { uid: 'text_field', data_type: 'text' }
        ],
        field_rules: [
          {
            conditions: [
              { operand_field: 'title' },
              { operand_field: 'reference_field' }
            ]
          },
          {
            conditions: [
              { operand_field: 'text_field' }
            ]
          }
        ]
      };

      const result = updateFieldRules(contentType);

      expect(result).to.be.an('array');
      expect(result).to.have.length(1); // Should remove rule with reference field
      expect(result[0].conditions[0].operand_field).to.equal('text_field');
    });

    it('should handle rules with multiple reference fields', () => {
      const contentType = {
        uid: 'test-content-type',
        schema: [
          { uid: 'title', data_type: 'text' },
          { uid: 'ref1', data_type: 'reference' },
          { uid: 'ref2', data_type: 'reference' }
        ],
        field_rules: [
          {
            conditions: [
              { operand_field: 'ref1' }
            ]
          },
          {
            conditions: [
              { operand_field: 'ref2' }
            ]
          },
          {
            conditions: [
              { operand_field: 'title' }
            ]
          }
        ]
      };

      const result = updateFieldRules(contentType);

      expect(result).to.be.an('array');
      expect(result).to.have.length(1); // Should keep only rule with title field
      expect(result[0].conditions[0].operand_field).to.equal('title');
    });

    it('should handle empty schema', () => {
      const contentType = {
        uid: 'test-content-type',
        schema: [] as any[],
        field_rules: [
          {
            conditions: [
              { operand_field: 'some_field' }
            ]
          }
        ]
      };

      const result = updateFieldRules(contentType);

      expect(result).to.be.an('array');
      expect(result).to.have.length(1); // Rule should remain as field type is unknown
    });
  });
});
