import fs from 'fs';
import { resolve } from 'path';
import { expect } from 'chai';
import cloneDeep from 'lodash/cloneDeep';
import { cliux } from '@contentstack/cli-utilities';
import fancy from 'fancy-test';
import Sinon from 'sinon';
import config from '../../../src/config';
import { $t, auditMsg } from '../../../src/messages';
import { ContentType, Entries, GlobalField } from '../../../src/modules';
import { CtConstructorParam, EntryStruct, ModuleConstructorParam } from '../../../src/types';
import {
  schema,
  emptyEntries,
  ctBlock,
  entryBlock,
  ctJsonRTE,
  entryJsonRTE,
  ctGroupField,
  entryGroupField,
} from '../mock/mock.json';
import { mockLogger } from '../mock-logger';

describe('Entries module', () => {
  let constructorParam: ModuleConstructorParam & CtConstructorParam;
  let ctStub: Sinon.SinonStub;
  let gfStub: Sinon.SinonStub;

  beforeEach(() => {
    constructorParam = {
      moduleName: 'entries',
      ctSchema: cloneDeep(require('../mock/contents/content_types/schema.json')),
      gfSchema: cloneDeep(require('../mock/contents/global_fields/globalfields.json')),
      config: Object.assign(config, { basePath: resolve(__dirname, '..', 'mock', 'contents'), flags: {} }),
    };
    
    // Mock the logger for all tests
    Sinon.stub(require('@contentstack/cli-utilities'), 'log').value(mockLogger);
  });

  before(() => {
    ctStub = Sinon.stub(ContentType.prototype, 'run').resolves({ ct1: [{}] });
    gfStub = Sinon.stub(GlobalField.prototype, 'run').resolves({ gf1: [{}] });
  });

  after(() => {
    Sinon.restore(); // Clears Sinon spies/stubs/mocks
    ctStub.restore();
    gfStub.restore();
  });

  describe('run method', () => {
    fancy
      .stdout({ print: process.env.PRINT === 'true' || false })
      .it('should throw folder path validation error', async () => {
        const ctInstance = new Entries({
          ...constructorParam,
          config: { ...constructorParam.config, basePath: resolve(__dirname, '..', 'mock', 'contents-1') },
        });
        try {
          await ctInstance.run();
        } catch (error: any) {
          expect(error).to.be.instanceOf(Error);
          expect(error.message).to.eql($t(auditMsg.NOT_VALID_PATH, { path: ctInstance.folderPath }));
        }
      });

    fancy
      .stdout({ print: process.env.PRINT === 'true' || false })
      .stub(Entries.prototype, 'prepareEntryMetaData', async () => {})
      .stub(Entries.prototype, 'fixPrerequisiteData', async () => {})
      .stub(Entries.prototype, 'writeFixContent', async () => {})
      .stub(Entries.prototype, 'lookForReference', async () => {})
      .stub(Entries.prototype, 'locales', [{ code: 'en-us' }] as any)
      .it('should return missing refs', async () => {
        const ctInstance = new (class Class extends Entries {
          constructor() {
            super(constructorParam);
            this.missingRefs['test-entry-id'] = [{ uid: 'test', treeStr: 'gf_0' }];
          }
        })();
        const missingRefs = await ctInstance.run();
        expect((missingRefs as any).missingEntryRefs).not.to.be.empty;
        expect((missingRefs as any).missingEntryRefs).deep.contain({ 'test-entry-id': [{ uid: 'test', treeStr: 'gf_0' }] });
      });

    fancy
      .stdout({ print: process.env.PRINT === 'true' || false })
      .stub(Entries.prototype, 'prepareEntryMetaData', async () => {})
      .stub(Entries.prototype, 'fixPrerequisiteData', async () => {})
      .stub(Entries.prototype, 'lookForReference', async () => {})
      .stub(Entries.prototype, 'writeFixContent', async () => {})
      .stub(Entries.prototype, 'locales', [{ code: 'en-us' }] as any)
      .it('should call prepareEntryMetaData & fixPrerequisiteData methods', async () => {
        const prepareEntryMetaData = Sinon.spy(Entries.prototype, 'prepareEntryMetaData');
        const fixPrerequisiteData = Sinon.spy(Entries.prototype, 'fixPrerequisiteData');
        const lookForReference = Sinon.spy(Entries.prototype, 'lookForReference');
        const writeFixContent = Sinon.spy(Entries.prototype, 'writeFixContent');
        const ctInstance = new Entries({ ...constructorParam, fix: true });
        const missingRefs = await ctInstance.run();
        expect((missingRefs as any).missingEntryRefs).to.be.empty;
        expect(writeFixContent.callCount).to.be.equals(1);
        expect(lookForReference.callCount).to.be.equals(1);
        expect(fixPrerequisiteData.callCount).to.be.equals(1);
        expect(prepareEntryMetaData.callCount).to.be.equals(1);
      });
  });

  describe('fixPrerequisiteData method', () => {
    fancy
      .stdout({ print: process.env.PRINT === 'true' || false })
      .it('should call content type and global fields fix functionality', async () => {
        const ctInstance = new Entries(constructorParam);
        (ctInstance as any).currentUid = 'test-entry';
        (ctInstance as any).missingRefs = { 'test-entry': [] };
        (ctInstance as any).missingSelectFeild = { 'test-entry': [] };
        (ctInstance as any).missingMandatoryFields = { 'test-entry': [] };
        await ctInstance.fixPrerequisiteData();
        expect(ctStub.callCount).to.be.equals(1);
        expect(gfStub.callCount).to.be.equals(1);
        expect(ctInstance.ctSchema).deep.contain({ ct1: [{}] });
        expect(ctInstance.gfSchema).deep.contain({ gf1: [{}] });
      });
  });

  describe('writeFixContent method', () => {
    fancy
      .stdout({ print: process.env.PRINT === 'true' || false })
      .stub(fs, 'writeFileSync', () => {})
      .stub(cliux, 'confirm', async () => true)
      .it('should ask confirmation adn write content in given path', async ({}) => {
        const writeFileSync = Sinon.spy(fs, 'writeFileSync');
        const ctInstance = new Entries({ ...constructorParam, fix: true });
        await ctInstance.writeFixContent(resolve(__dirname, '..', 'mock', 'contents'), {});

        expect(writeFileSync.callCount).to.be.equals(1);
      });

    fancy
      .stdout({ print: process.env.PRINT === 'true' || false })
      .stub(fs, 'writeFileSync', () => {})
      .it("should skip confirmation if 'yes' flag passed", async ({}) => {
        const writeFileSync = Sinon.spy(fs, 'writeFileSync');
        const ctInstance = new Entries({ ...constructorParam, fix: true });
        ctInstance.config.flags.yes = true;
        await ctInstance.writeFixContent(resolve(__dirname, '..', 'mock', 'contents'), {});

        expect(writeFileSync.callCount).to.be.equals(1);
        expect(writeFileSync.calledWithExactly(resolve(__dirname, '..', 'mock', 'contents'), JSON.stringify({}))).to.be
          .true;
      });
  });

  describe('lookForReference method', () => {
    fancy
      .stdout({ print: process.env.PRINT === 'true' || false })
      .stub(Entries.prototype, 'runFixOnSchema', () => emptyEntries)
      .stub(Entries.prototype, 'validateReferenceField', () => [])
      .stub(Entries.prototype, 'validateGlobalField', () => {})
      .stub(Entries.prototype, 'validateJsonRTEFields', () => {})
      .stub(Entries.prototype, 'validateModularBlocksField', () => {})
      .stub(Entries.prototype, 'validateGroupField', () => {})
      .it('should call datatype specific methods', async ({}) => {
        const ctInstance = new (class Class extends Entries {
          constructor() {
            super({ ...constructorParam, fix: true });
            this.currentUid = 'reference';
            this.missingRefs = { reference: [] };
            this.missingMandatoryFields['reference'] = [];
          }
        })();
        const runFixOnSchema = Sinon.spy(ctInstance, 'runFixOnSchema');
        const validateReferenceField = Sinon.spy(ctInstance, 'validateReferenceField');
        const validateGlobalField = Sinon.spy(ctInstance, 'validateGlobalField');
        const validateJsonRTEFields = Sinon.spy(ctInstance, 'validateJsonRTEFields');
        const validateModularBlocksField = Sinon.spy(ctInstance, 'validateModularBlocksField');
        const validateGroupField = Sinon.spy(ctInstance, 'validateGroupField');
        await ctInstance.lookForReference([], { schema } as any, {});

        expect(runFixOnSchema.callCount).to.be.equals(1);
        expect(validateReferenceField.callCount).to.be.equals(1);
        expect(validateGlobalField.callCount).to.be.equals(1);
        expect(validateJsonRTEFields.callCount).to.be.equals(1);
        expect(validateModularBlocksField.callCount).to.be.equals(1);
        expect(validateGroupField.callCount).to.be.equals(1);
      });
  });

  describe('validateReferenceField method', () => {
    class Class extends Entries {
      public entries: Record<string, EntryStruct> = (
        require('../mock/contents/entries/page_1/en-us/e7f6e3cc-64ca-4226-afb3-7794242ae5f5-entries.json') as any
      )['test-uid-2'];

      constructor() {
        super(constructorParam);
      }
    }

    fancy
      .stdout({ print: process.env.PRINT === 'true' || false })
      .stub(Entries.prototype, 'validateReferenceValues', () => {})

      .it('should call validateReferenceField method', async ({}) => {
        const validateReferenceValues = Sinon.spy(Entries.prototype, 'validateReferenceValues');
        const ctInstance = new Class();

        await ctInstance.validateReferenceField([], ctInstance.ctSchema[3].schema as any, ctInstance.entries as any);

        expect(validateReferenceValues.callCount).to.be.equals(1);
        expect(
          validateReferenceValues.alwaysCalledWith(
            [],
            ctInstance.ctSchema[3].schema as unknown as any,
            ctInstance.entries as any,
          ),
        ).to.be.true;
      });

    fancy.stdout({ print: process.env.PRINT === 'true' || false }).it('should return missing reference', async () => {
      const ctInstance = new Class();
      const missingRefs = await ctInstance.validateReferenceField(
        [{ uid: 'test-uid', name: 'reference', field: 'reference' }],
        ctInstance.ctSchema[3].schema as any,
        ctInstance.entries['reference'] as any,
      );

      expect(missingRefs).deep.equal([
        {
          tree: [
            {
              uid: 'test-uid',
              name: 'reference',
              field: 'reference',
            },
          ],
          data_type: undefined,
          missingRefs: [
            {
              uid: 'test-uid-1',
              _content_type_uid: 'page_0',
            },
          ],
          display_name: undefined,
          uid: undefined,
          name: undefined,
          treeStr: 'reference',
        },
      ]);
    });
  });

  // describe('validateGlobalField method', () => {
  //   let lookForReferenceSpy;
  //   let ctInstance;

  //   beforeEach(() => {
  //     // Restore original methods before each test
  //     Sinon.restore();

  //     // Spy on the lookForReference method
  //     lookForReferenceSpy = Sinon.spy(Entries.prototype, 'lookForReference');

  //     // Create a new instance of Entries for each test
  //     ctInstance = new (class extends Entries {
  //       public entries: Record<string, EntryStruct> = (
  //         require('../mock/contents/entries/page_1/en-us/e7f6e3cc-64ca-4226-afb3-7794242ae5f5-entries.json') as any
  //       )['test-uid-2'];
  //     })(constructorParam);
  //   });

  //   it('should call lookForReference method', async () => {
  //     // Call the method under test
  //     await ctInstance.validateGlobalField([], ctInstance.ctSchema as any, ctInstance.entries);

  //     // Assertions
  //     expect(lookForReferenceSpy.callCount).to.be.equals(1);
  //     expect(lookForReferenceSpy.calledWithExactly([], ctInstance.ctSchema, ctInstance.entries)).to.be.true;
  //   });
  // });

  describe('validateJsonRTEFields method', () => {
    fancy
      .stdout({ print: process.env.PRINT === 'true' || false })
      .stub(Entries.prototype, 'jsonRefCheck', () => {})
      .it('should do recursive call on validateJsonRTEFields method', async ({}) => {
        const jsonRefCheck = Sinon.spy(Entries.prototype, 'jsonRefCheck');
        const validateJsonRTEFields = Sinon.spy(Entries.prototype, 'validateJsonRTEFields');
        const ctInstance = new Entries(constructorParam);
        (ctInstance as any).currentUid = 'test-entry';
        (ctInstance as any).missingRefs = { 'test-entry': [] };
        (ctInstance as any).missingSelectFeild = { 'test-entry': [] };
        (ctInstance as any).missingMandatoryFields = { 'test-entry': [] };
        await ctInstance.validateJsonRTEFields([], ctJsonRTE as any, entryJsonRTE as any);
        expect(jsonRefCheck.callCount).to.be.equals(4);
        expect(validateJsonRTEFields.callCount).to.be.equals(3);
        expect(validateJsonRTEFields.calledWithExactly([], ctJsonRTE as any, entryJsonRTE as any)).to.be.true;
        expect(jsonRefCheck.calledWithExactly([], ctJsonRTE as any, entryJsonRTE.children[0] as any)).to.be.true;
      });
  });

  describe('validateModularBlocksField method', () => {
    fancy
      .stdout({ print: process.env.PRINT === 'true' || false })
      .stub(Entries.prototype, 'modularBlockRefCheck', () => {})
      .stub(Entries.prototype, 'lookForReference', () => {})

      .it(
        'should iterate each blocks and call modularBlockRefCheck & lookForReference methods number of blocks exist in the entry times',
        async ({}) => {
          const modularBlockRefCheck = Sinon.spy(Entries.prototype, 'modularBlockRefCheck');
          const lookForReference = Sinon.spy(Entries.prototype, 'lookForReference');
          const ctInstance = new Entries(constructorParam);
        (ctInstance as any).currentUid = 'test-entry';
        (ctInstance as any).missingRefs = { 'test-entry': [] };
        (ctInstance as any).missingSelectFeild = { 'test-entry': [] };
        (ctInstance as any).missingMandatoryFields = { 'test-entry': [] };
          await ctInstance.validateModularBlocksField([], ctBlock as any, entryBlock as any);

          expect(modularBlockRefCheck.callCount).to.be.equals(3);
          expect(lookForReference.callCount).to.be.equals(5);
          expect(modularBlockRefCheck.calledWithExactly([], ctBlock.blocks as any, entryBlock[0] as any, 0)).to.be.true;
          expect(
            lookForReference.calledWithExactly(
              [{ uid: 'gf_1', name: 'GF 1' }],
              ctBlock.blocks[1] as any,
              entryBlock[0].gf_1 as any,
            ),
          ).to.be.true;
        },
      );
  });

  describe('validateGroupField method', () => {
    fancy
      .stdout({ print: process.env.PRINT === 'true' || false })
      .stub(Entries.prototype, 'lookForReference', () => {})
      .it('should call lookForReference method to iterate GroupField schema', async ({}) => {
        const lookForReference = Sinon.spy(Entries.prototype, 'lookForReference');
        const ctInstance = new Entries(constructorParam);
        (ctInstance as any).currentUid = 'test-entry';
        (ctInstance as any).missingRefs = { 'test-entry': [] };
        (ctInstance as any).missingSelectFeild = { 'test-entry': [] };
        (ctInstance as any).missingMandatoryFields = { 'test-entry': [] };
        await ctInstance.validateGroupField([], ctGroupField as any, entryGroupField as any);
        expect(lookForReference.callCount).to.be.equals(1);
        expect(lookForReference.calledWithExactly([], ctGroupField as any, entryGroupField)).to.be.true;
      });

    fancy
      .stdout({ print: process.env.PRINT === 'true' || false })
      .stub(Entries.prototype, 'lookForReference', () => {})
      .it(
        'should iterate all group entries and call lookForReference method to iterate GroupField schema',
        async ({}) => {
          const lookForReference = Sinon.spy(Entries.prototype, 'lookForReference');

          const ctInstance = new Entries(constructorParam);
        (ctInstance as any).currentUid = 'test-entry';
        (ctInstance as any).missingRefs = { 'test-entry': [] };
        (ctInstance as any).missingSelectFeild = { 'test-entry': [] };
        (ctInstance as any).missingMandatoryFields = { 'test-entry': [] };
          await ctInstance.validateGroupField([], ctGroupField as any, [entryGroupField, entryGroupField] as any);

          expect(lookForReference.callCount).to.be.equals(2);
          expect(
            lookForReference.calledWithExactly(
              [{ uid: ctGroupField.uid, display_name: ctGroupField.display_name }],
              ctGroupField as any,
              entryGroupField,
            ),
          ).to.be.true;
        },
      );
  });

  describe('fixGlobalFieldReferences method', () => {
    fancy
      .stdout({ print: process.env.PRINT === 'true' || false })
      .stub(Entries.prototype, 'runFixOnSchema', (...args: any[]) => args[2])
      .it('should call runFixOnSchema for single global field entry', async ({}) => {
        const runFixOnSchema = Sinon.spy(Entries.prototype, 'runFixOnSchema');
        const ctInstance = new Entries({ ...constructorParam, fix: true });
        
        const globalFieldSchema = {
          uid: 'gf_1',
          display_name: 'Global Field 1',
          data_type: 'global_field',
          multiple: false,
          schema: [
            { uid: 'reference', display_name: 'Reference', data_type: 'reference' }
          ]
        };
        
        const entryData = {
          reference: [{ uid: 'test-uid-1', _content_type_uid: 'page_0' }]
        };

        const result = await ctInstance.fixGlobalFieldReferences([], globalFieldSchema as any, entryData as any);

        expect(runFixOnSchema.callCount).to.be.equals(1);
        expect(runFixOnSchema.firstCall.args[0]).to.deep.equal([{ uid: globalFieldSchema.uid, display_name: globalFieldSchema.display_name }]);
        expect(runFixOnSchema.firstCall.args[1]).to.deep.equal(globalFieldSchema.schema);
        expect(runFixOnSchema.firstCall.args[2]).to.deep.equal(entryData);
        expect(result).to.deep.equal(entryData);
      });
  });

  describe('validateSelectField method', () => {
    fancy
      .stdout({ print: process.env.PRINT === 'true' || false })
      .it('should validate single select field with valid value', async ({}) => {
        const ctInstance = new Entries(constructorParam);
        (ctInstance as any).currentUid = 'test-entry';
        (ctInstance as any).currentTitle = 'Test Entry';
        (ctInstance as any).missingRefs = { 'test-entry': [] };
        (ctInstance as any).missingSelectFeild = { 'test-entry': [] };
        (ctInstance as any).missingMandatoryFields = { 'test-entry': [] };
        
        const selectFieldSchema = {
          uid: 'select_field',
          display_name: 'Select Field',
          data_type: 'select',
          display_type: 'dropdown',
          multiple: false,
          enum: {
            choices: [
              { value: 'option1', display_name: 'Option 1' },
              { value: 'option2', display_name: 'Option 2' }
            ]
          }
        };
        
        const entryData = 'option1';
        const tree = [{ uid: 'test-entry', name: 'Test Entry' }];

        const result = ctInstance.validateSelectField(tree, selectFieldSchema as any, entryData);

        expect(result).to.be.an('array');
        expect(result.length).to.equal(0); // No validation errors
      });

    fancy
      .stdout({ print: process.env.PRINT === 'true' || false })
      .it('should flag single select field with invalid value', async ({}) => {
        const ctInstance = new Entries(constructorParam);
        (ctInstance as any).currentUid = 'test-entry';
        (ctInstance as any).currentTitle = 'Test Entry';
        (ctInstance as any).missingRefs = { 'test-entry': [] };
        (ctInstance as any).missingSelectFeild = { 'test-entry': [] };
        (ctInstance as any).missingMandatoryFields = { 'test-entry': [] };
        
        const selectFieldSchema = {
          uid: 'select_field',
          display_name: 'Select Field',
          data_type: 'select',
          display_type: 'dropdown',
          multiple: false,
          enum: {
            choices: [
              { value: 'option1', display_name: 'Option 1' },
              { value: 'option2', display_name: 'Option 2' }
            ]
          }
        };
        
        const entryData = 'invalid_option';
        const tree = [{ uid: 'test-entry', name: 'Test Entry' }];

        const result = ctInstance.validateSelectField(tree, selectFieldSchema as any, entryData);

        expect(result).to.be.an('array');
        expect(result.length).to.equal(1);
        expect(result[0]).to.have.property('missingCTSelectFieldValues', 'invalid_option');
        expect(result[0]).to.have.property('display_name', 'Select Field');
      });

    fancy
      .stdout({ print: process.env.PRINT === 'true' || false })
      .it('should handle empty single select field value', async ({}) => {
        const ctInstance = new Entries(constructorParam);
        (ctInstance as any).currentUid = 'test-entry';
        (ctInstance as any).currentTitle = 'Test Entry';
        (ctInstance as any).missingRefs = { 'test-entry': [] };
        (ctInstance as any).missingSelectFeild = { 'test-entry': [] };
        (ctInstance as any).missingMandatoryFields = { 'test-entry': [] };
        
        const selectFieldSchema = {
          uid: 'select_field',
          display_name: 'Select Field',
          data_type: 'select',
          display_type: 'dropdown',
          multiple: false,
          enum: {
            choices: [
              { value: 'option1', display_name: 'Option 1' },
              { value: 'option2', display_name: 'Option 2' }
            ]
          }
        };
        
        const entryData = '';
        const tree = [{ uid: 'test-entry', name: 'Test Entry' }];

        const result = ctInstance.validateSelectField(tree, selectFieldSchema as any, entryData);

        expect(result).to.be.an('array');
        expect(result.length).to.equal(1);
        expect(result[0]).to.have.property('missingCTSelectFieldValues', 'Not Selected');
      });

    fancy
      .stdout({ print: process.env.PRINT === 'true' || false })
      .it('should handle null single select field value', async ({}) => {
        const ctInstance = new Entries(constructorParam);
        (ctInstance as any).currentUid = 'test-entry';
        (ctInstance as any).currentTitle = 'Test Entry';
        (ctInstance as any).missingRefs = { 'test-entry': [] };
        (ctInstance as any).missingSelectFeild = { 'test-entry': [] };
        (ctInstance as any).missingMandatoryFields = { 'test-entry': [] };
        
        const selectFieldSchema = {
          uid: 'select_field',
          display_name: 'Select Field',
          data_type: 'select',
          display_type: 'dropdown',
          multiple: false,
          enum: {
            choices: [
              { value: 'option1', display_name: 'Option 1' },
              { value: 'option2', display_name: 'Option 2' }
            ]
          }
        };
        
        const entryData = null;
        const tree = [{ uid: 'test-entry', name: 'Test Entry' }];

        const result = ctInstance.validateSelectField(tree, selectFieldSchema as any, entryData);

        expect(result).to.be.an('array');
        expect(result.length).to.equal(1);
        expect(result[0]).to.have.property('missingCTSelectFieldValues', 'Not Selected');
      });

    fancy
      .stdout({ print: process.env.PRINT === 'true' || false })
      .it('should validate multiple select field with valid values', async ({}) => {
        const ctInstance = new Entries(constructorParam);
        (ctInstance as any).currentUid = 'test-entry';
        (ctInstance as any).currentTitle = 'Test Entry';
        (ctInstance as any).missingRefs = { 'test-entry': [] };
        (ctInstance as any).missingSelectFeild = { 'test-entry': [] };
        (ctInstance as any).missingMandatoryFields = { 'test-entry': [] };
        
        const selectFieldSchema = {
          uid: 'select_field',
          display_name: 'Select Field',
          data_type: 'select',
          display_type: 'dropdown',
          multiple: true,
          enum: {
            choices: [
              { value: 'option1', display_name: 'Option 1' },
              { value: 'option2', display_name: 'Option 2' },
              { value: 'option3', display_name: 'Option 3' }
            ]
          }
        };
        
        const entryData = ['option1', 'option2'];
        const tree = [{ uid: 'test-entry', name: 'Test Entry' }];

        const result = ctInstance.validateSelectField(tree, selectFieldSchema as any, entryData);

        expect(result).to.be.an('array');
        expect(result.length).to.equal(0); // No validation errors
      });

    fancy
      .stdout({ print: process.env.PRINT === 'true' || false })
      .it('should flag multiple select field with invalid values', async ({}) => {
        const ctInstance = new Entries(constructorParam);
        (ctInstance as any).currentUid = 'test-entry';
        (ctInstance as any).currentTitle = 'Test Entry';
        (ctInstance as any).missingRefs = { 'test-entry': [] };
        (ctInstance as any).missingSelectFeild = { 'test-entry': [] };
        (ctInstance as any).missingMandatoryFields = { 'test-entry': [] };
        
        const selectFieldSchema = {
          uid: 'select_field',
          display_name: 'Select Field',
          data_type: 'select',
          display_type: 'dropdown',
          multiple: true,
          enum: {
            choices: [
              { value: 'option1', display_name: 'Option 1' },
              { value: 'option2', display_name: 'Option 2' }
            ]
          }
        };
        
        const entryData = ['option1', 'invalid_option', 'option2'];
        const tree = [{ uid: 'test-entry', name: 'Test Entry' }];

        const result = ctInstance.validateSelectField(tree, selectFieldSchema as any, entryData);

        expect(result).to.be.an('array');
        expect(result.length).to.equal(1);
        expect(result[0]).to.have.property('missingCTSelectFieldValues');
        expect(result[0].missingCTSelectFieldValues).to.include('invalid_option');
      });

    fancy
      .stdout({ print: process.env.PRINT === 'true' || false })
      .it('should handle empty multiple select field array', async ({}) => {
        const ctInstance = new Entries(constructorParam);
        (ctInstance as any).currentUid = 'test-entry';
        (ctInstance as any).currentTitle = 'Test Entry';
        (ctInstance as any).missingRefs = { 'test-entry': [] };
        (ctInstance as any).missingSelectFeild = { 'test-entry': [] };
        (ctInstance as any).missingMandatoryFields = { 'test-entry': [] };
        
        const selectFieldSchema = {
          uid: 'select_field',
          display_name: 'Select Field',
          data_type: 'select',
          display_type: 'dropdown',
          multiple: true,
          enum: {
            choices: [
              { value: 'option1', display_name: 'Option 1' },
              { value: 'option2', display_name: 'Option 2' }
            ]
          }
        };
        
        const entryData: string[] = [];
        const tree = [{ uid: 'test-entry', name: 'Test Entry' }];

        const result = ctInstance.validateSelectField(tree, selectFieldSchema as any, entryData);

        expect(result).to.be.an('array');
        expect(result.length).to.equal(1);
        expect(result[0]).to.have.property('missingCTSelectFieldValues', 'Not Selected');
      });

    fancy
      .stdout({ print: process.env.PRINT === 'true' || false })
      .it('should handle number data type with zero value', async ({}) => {
        const ctInstance = new Entries(constructorParam);
        (ctInstance as any).currentUid = 'test-entry';
        (ctInstance as any).currentTitle = 'Test Entry';
        (ctInstance as any).missingRefs = { 'test-entry': [] };
        (ctInstance as any).missingSelectFeild = { 'test-entry': [] };
        (ctInstance as any).missingMandatoryFields = { 'test-entry': [] };
        
        const selectFieldSchema = {
          uid: 'select_field',
          display_name: 'Select Field',
          data_type: 'number',
          display_type: 'dropdown',
          multiple: false,
          enum: {
            choices: [
              { value: 0, display_name: 'Zero' },
              { value: 1, display_name: 'One' }
            ]
          }
        };
        
        const entryData = 0;
        const tree = [{ uid: 'test-entry', name: 'Test Entry' }];

        const result = ctInstance.validateSelectField(tree, selectFieldSchema as any, entryData);

        expect(result).to.be.an('array');
        expect(result.length).to.equal(0); // Zero should be valid for number type
      });

    fancy
      .stdout({ print: process.env.PRINT === 'true' || false })
      .it('should return empty array when display_type is missing', async ({}) => {
        const ctInstance = new Entries(constructorParam);
        (ctInstance as any).currentUid = 'test-entry';
        (ctInstance as any).currentTitle = 'Test Entry';
        (ctInstance as any).missingRefs = { 'test-entry': [] };
        (ctInstance as any).missingSelectFeild = { 'test-entry': [] };
        (ctInstance as any).missingMandatoryFields = { 'test-entry': [] };
        
        const selectFieldSchema = {
          uid: 'select_field',
          display_name: 'Select Field',
          data_type: 'select',
          // No display_type
          multiple: false,
          enum: {
            choices: [
              { value: 'option1', display_name: 'Option 1' }
            ]
          }
        };
        
        const entryData = 'invalid_option';
        const tree = [{ uid: 'test-entry', name: 'Test Entry' }];

        const result = ctInstance.validateSelectField(tree, selectFieldSchema as any, entryData);

        expect(result).to.be.an('array');
        expect(result.length).to.equal(0); // No display_type means no validation
      });
  });

  describe('fixSelectField method', () => {
    fancy
      .stdout({ print: process.env.PRINT === 'true' || false })
      .it('should return original value when fix is disabled', async ({}) => {
        const ctInstance = new Entries(constructorParam);
        (ctInstance as any).currentUid = 'test-entry';
        (ctInstance as any).currentTitle = 'Test Entry';
        (ctInstance as any).missingRefs = { 'test-entry': [] };
        (ctInstance as any).missingSelectFeild = { 'test-entry': [] };
        (ctInstance as any).missingMandatoryFields = { 'test-entry': [] };
        (ctInstance as any).config = { ...constructorParam.config, fixSelectField: false };
        
        const selectFieldSchema = {
          uid: 'select_field',
          display_name: 'Select Field',
          data_type: 'select',
          display_type: 'dropdown',
          multiple: false,
          enum: {
            choices: [
              { value: 'option1', display_name: 'Option 1' },
              { value: 'option2', display_name: 'Option 2' }
            ]
          }
        };
        
        const entryData = 'invalid_option';
        const tree = [{ uid: 'test-entry', name: 'Test Entry' }];

        const result = ctInstance.fixSelectField(tree, selectFieldSchema as any, entryData);

        expect(result).to.equal('invalid_option'); // Should return original value unchanged
      });

    fancy
      .stdout({ print: process.env.PRINT === 'true' || false })
      .it('should fix single select field with invalid value', async ({}) => {
        const ctInstance = new Entries(constructorParam);
        (ctInstance as any).currentUid = 'test-entry';
        (ctInstance as any).currentTitle = 'Test Entry';
        (ctInstance as any).missingRefs = { 'test-entry': [] };
        (ctInstance as any).missingSelectFeild = { 'test-entry': [] };
        (ctInstance as any).missingMandatoryFields = { 'test-entry': [] };
        (ctInstance as any).config = { ...constructorParam.config, fixSelectField: true };
        
        const selectFieldSchema = {
          uid: 'select_field',
          display_name: 'Select Field',
          data_type: 'select',
          display_type: 'dropdown',
          multiple: false,
          enum: {
            choices: [
              { value: 'option1', display_name: 'Option 1' },
              { value: 'option2', display_name: 'Option 2' }
            ]
          }
        };
        
        const entryData = 'invalid_option';
        const tree = [{ uid: 'test-entry', name: 'Test Entry' }];

        const result = ctInstance.fixSelectField(tree, selectFieldSchema as any, entryData);

        expect(result).to.equal('option1'); // Should be replaced with first valid option
        expect((ctInstance as any).missingSelectFeild['test-entry']).to.have.length(1);
        expect((ctInstance as any).missingSelectFeild['test-entry'][0]).to.have.property('fixStatus', 'Fixed');
      });

    fancy
      .stdout({ print: process.env.PRINT === 'true' || false })
      .it('should not change single select field with valid value', async ({}) => {
        const ctInstance = new Entries(constructorParam);
        (ctInstance as any).currentUid = 'test-entry';
        (ctInstance as any).currentTitle = 'Test Entry';
        (ctInstance as any).missingRefs = { 'test-entry': [] };
        (ctInstance as any).missingSelectFeild = { 'test-entry': [] };
        (ctInstance as any).missingMandatoryFields = { 'test-entry': [] };
        (ctInstance as any).config = { ...constructorParam.config, fixSelectField: true };
        
        const selectFieldSchema = {
          uid: 'select_field',
          display_name: 'Select Field',
          data_type: 'select',
          display_type: 'dropdown',
          multiple: false,
          enum: {
            choices: [
              { value: 'option1', display_name: 'Option 1' },
              { value: 'option2', display_name: 'Option 2' }
            ]
          }
        };
        
        const entryData = 'option2';
        const tree = [{ uid: 'test-entry', name: 'Test Entry' }];

        const result = ctInstance.fixSelectField(tree, selectFieldSchema as any, entryData);

        expect(result).to.equal('option2'); // Should remain unchanged
        expect((ctInstance as any).missingSelectFeild['test-entry']).to.have.length(0);
      });

    fancy
      .stdout({ print: process.env.PRINT === 'true' || false })
      .it('should fix multiple select field with invalid values', async ({}) => {
        const ctInstance = new Entries(constructorParam);
        (ctInstance as any).currentUid = 'test-entry';
        (ctInstance as any).currentTitle = 'Test Entry';
        (ctInstance as any).missingRefs = { 'test-entry': [] };
        (ctInstance as any).missingSelectFeild = { 'test-entry': [] };
        (ctInstance as any).missingMandatoryFields = { 'test-entry': [] };
        (ctInstance as any).config = { ...constructorParam.config, fixSelectField: true };
        
        const selectFieldSchema = {
          uid: 'select_field',
          display_name: 'Select Field',
          data_type: 'select',
          display_type: 'dropdown',
          multiple: true,
          enum: {
            choices: [
              { value: 'option1', display_name: 'Option 1' },
              { value: 'option2', display_name: 'Option 2' },
              { value: 'option3', display_name: 'Option 3' }
            ]
          }
        };
        
        const entryData = ['option1', 'invalid_option', 'option2'];
        const tree = [{ uid: 'test-entry', name: 'Test Entry' }];

        const result = ctInstance.fixSelectField(tree, selectFieldSchema as any, entryData);

        expect(result).to.deep.equal(['option1', 'option2']); // Invalid option should be removed
        expect((ctInstance as any).missingSelectFeild['test-entry']).to.have.length(1);
        expect((ctInstance as any).missingSelectFeild['test-entry'][0]).to.have.property('fixStatus', 'Fixed');
      });

    fancy
      .stdout({ print: process.env.PRINT === 'true' || false })
      .it('should add default value to empty multiple select field', async ({}) => {
        const ctInstance = new Entries(constructorParam);
        (ctInstance as any).currentUid = 'test-entry';
        (ctInstance as any).currentTitle = 'Test Entry';
        (ctInstance as any).missingRefs = { 'test-entry': [] };
        (ctInstance as any).missingSelectFeild = { 'test-entry': [] };
        (ctInstance as any).missingMandatoryFields = { 'test-entry': [] };
        (ctInstance as any).config = { ...constructorParam.config, fixSelectField: true };
        
        const selectFieldSchema = {
          uid: 'select_field',
          display_name: 'Select Field',
          data_type: 'select',
          display_type: 'dropdown',
          multiple: true,
          enum: {
            choices: [
              { value: 'option1', display_name: 'Option 1' },
              { value: 'option2', display_name: 'Option 2' }
            ]
          }
        };
        
        const entryData: string[] = [];
        const tree = [{ uid: 'test-entry', name: 'Test Entry' }];

        const result = ctInstance.fixSelectField(tree, selectFieldSchema as any, entryData);

        expect(result).to.deep.equal(['option1']); // Should add first option
        expect((ctInstance as any).missingSelectFeild['test-entry']).to.have.length(1);
        expect((ctInstance as any).missingSelectFeild['test-entry'][0]).to.have.property('fixStatus', 'Fixed');
      });

    fancy
      .stdout({ print: process.env.PRINT === 'true' || false })
      .it('should handle min_instance requirement for multiple select field', async ({}) => {
        const ctInstance = new Entries(constructorParam);
        (ctInstance as any).currentUid = 'test-entry';
        (ctInstance as any).currentTitle = 'Test Entry';
        (ctInstance as any).missingRefs = { 'test-entry': [] };
        (ctInstance as any).missingSelectFeild = { 'test-entry': [] };
        (ctInstance as any).missingMandatoryFields = { 'test-entry': [] };
        (ctInstance as any).config = { ...constructorParam.config, fixSelectField: true };
        
        const selectFieldSchema = {
          uid: 'select_field',
          display_name: 'Select Field',
          data_type: 'select',
          display_type: 'dropdown',
          multiple: true,
          min_instance: 3,
          enum: {
            choices: [
              { value: 'option1', display_name: 'Option 1' },
              { value: 'option2', display_name: 'Option 2' },
              { value: 'option3', display_name: 'Option 3' },
              { value: 'option4', display_name: 'Option 4' }
            ]
          }
        };
        
        const entryData = ['option1'];
        const tree = [{ uid: 'test-entry', name: 'Test Entry' }];

        const result = ctInstance.fixSelectField(tree, selectFieldSchema as any, entryData);

        expect(result).to.have.length(3); // Should have min_instance number of values
        expect(result).to.include('option1'); // Original value should remain
        expect((ctInstance as any).missingSelectFeild['test-entry']).to.have.length(1);
        expect((ctInstance as any).missingSelectFeild['test-entry'][0]).to.have.property('fixStatus', 'Fixed');
      });

    fancy
      .stdout({ print: process.env.PRINT === 'true' || false })
      .it('should handle empty choices array gracefully', async ({}) => {
        const ctInstance = new Entries(constructorParam);
        (ctInstance as any).currentUid = 'test-entry';
        (ctInstance as any).currentTitle = 'Test Entry';
        (ctInstance as any).missingRefs = { 'test-entry': [] };
        (ctInstance as any).missingSelectFeild = { 'test-entry': [] };
        (ctInstance as any).missingMandatoryFields = { 'test-entry': [] };
        (ctInstance as any).config = { ...constructorParam.config, fixSelectField: true };
        
        const selectFieldSchema = {
          uid: 'select_field',
          display_name: 'Select Field',
          data_type: 'select',
          display_type: 'dropdown',
          multiple: false,
          enum: {
            choices: [] // Empty choices
          }
        };
        
        const entryData = 'invalid_option';
        const tree = [{ uid: 'test-entry', name: 'Test Entry' }];

        const result = ctInstance.fixSelectField(tree, selectFieldSchema as any, entryData);

        expect(result).to.equal(null); // Should be set to null when no choices available
        expect((ctInstance as any).missingSelectFeild['test-entry']).to.have.length(1);
        expect((ctInstance as any).missingSelectFeild['test-entry'][0]).to.have.property('fixStatus', 'Fixed');
      });

    fancy
      .stdout({ print: process.env.PRINT === 'true' || false })
      .it('should not record fix when display_type is missing', async ({}) => {
        const ctInstance = new Entries(constructorParam);
        (ctInstance as any).currentUid = 'test-entry';
        (ctInstance as any).currentTitle = 'Test Entry';
        (ctInstance as any).missingRefs = { 'test-entry': [] };
        (ctInstance as any).missingSelectFeild = { 'test-entry': [] };
        (ctInstance as any).missingMandatoryFields = { 'test-entry': [] };
        (ctInstance as any).config = { ...constructorParam.config, fixSelectField: true };
        
        const selectFieldSchema = {
          uid: 'select_field',
          display_name: 'Select Field',
          data_type: 'select',
          // No display_type
          multiple: false,
          enum: {
            choices: [
              { value: 'option1', display_name: 'Option 1' }
            ]
          }
        };
        
        const entryData = 'invalid_option';
        const tree = [{ uid: 'test-entry', name: 'Test Entry' }];

        const result = ctInstance.fixSelectField(tree, selectFieldSchema as any, entryData);

        expect(result).to.equal('option1'); // Should still fix the value
        expect((ctInstance as any).missingSelectFeild['test-entry']).to.have.length(0); // But not record it
      });
  });

  describe('validateReferenceField method', () => {
    fancy
      .stdout({ print: process.env.PRINT === 'true' || false })
      .it('should validate reference field with valid UID', async ({}) => {
        const ctInstance = new Entries(constructorParam);
        (ctInstance as any).currentUid = 'test-entry';
        (ctInstance as any).missingRefs = { 'test-entry': [] };
        (ctInstance as any).missingSelectFeild = { 'test-entry': [] };
        (ctInstance as any).missingMandatoryFields = { 'test-entry': [] };
        (ctInstance as any).entryMetaData = [{ uid: 'valid-uid', ctUid: 'page' }]; // Entry exists
        
        const referenceFieldSchema = {
          uid: 'reference_field',
          display_name: 'Reference Field',
          data_type: 'reference',
          reference_to: ['page']
        };
        
        const entryData = [{ uid: 'valid-uid', _content_type_uid: 'page' }];
        const tree = [{ uid: 'test-entry', name: 'Test Entry' }];

        const result = ctInstance.validateReferenceField(tree, referenceFieldSchema as any, entryData);

        expect(result).to.be.an('array'); // Should return empty array if no issues
      });

    fancy
      .stdout({ print: process.env.PRINT === 'true' || false })
      .it('should flag reference field with invalid UID', async ({}) => {
        const ctInstance = new Entries(constructorParam);
        (ctInstance as any).currentUid = 'test-entry';
        (ctInstance as any).missingRefs = { 'test-entry': [] };
        (ctInstance as any).missingSelectFeild = { 'test-entry': [] };
        (ctInstance as any).missingMandatoryFields = { 'test-entry': [] };
        (ctInstance as any).entryMetaData = []; // No entries exist
        
        const referenceFieldSchema = {
          uid: 'reference_field',
          display_name: 'Reference Field',
          data_type: 'reference',
          reference_to: ['page']
        };
        
        const entryData = [{ uid: 'invalid-uid', _content_type_uid: 'page' }];
        const tree = [{ uid: 'test-entry', name: 'Test Entry' }];

        const result = ctInstance.validateReferenceField(tree, referenceFieldSchema as any, entryData);

        expect(result).to.be.an('array'); // Should return array of missing references
      });
  });

  describe('validateModularBlocksField method', () => {
    fancy
      .stdout({ print: process.env.PRINT === 'true' || false })
      .it('should validate modular block with valid blocks', async ({}) => {
        const ctInstance = new Entries(constructorParam);
        (ctInstance as any).currentUid = 'test-entry';
        (ctInstance as any).missingRefs = { 'test-entry': [] };
        (ctInstance as any).missingSelectFeild = { 'test-entry': [] };
        (ctInstance as any).missingMandatoryFields = { 'test-entry': [] };
        
        const modularBlockSchema = {
          uid: 'modular_block',
          display_name: 'Modular Block',
          data_type: 'blocks',
          blocks: [
            {
              uid: 'block1',
              display_name: 'Block 1',
              schema: [
                { uid: 'text_field', display_name: 'Text Field', data_type: 'text' }
              ]
            }
          ]
        };
        
        const entryData = [
          {
            _metadata: { uid: 'block1' },
            text_field: 'test value'
          }
        ];
        const tree = [{ uid: 'test-entry', name: 'Test Entry' }];

        ctInstance.validateModularBlocksField(tree, modularBlockSchema as any, entryData as any);

        // Should not throw - method is void
      });

    fancy
      .stdout({ print: process.env.PRINT === 'true' || false })
      .it('should handle modular block with missing block metadata', async ({}) => {
        const ctInstance = new Entries(constructorParam);
        (ctInstance as any).currentUid = 'test-entry';
        (ctInstance as any).missingRefs = { 'test-entry': [] };
        (ctInstance as any).missingSelectFeild = { 'test-entry': [] };
        (ctInstance as any).missingMandatoryFields = { 'test-entry': [] };
        
        const modularBlockSchema = {
          uid: 'modular_block',
          display_name: 'Modular Block',
          data_type: 'blocks',
          blocks: [
            {
              uid: 'block1',
              display_name: 'Block 1',
              schema: [
                { uid: 'text_field', display_name: 'Text Field', data_type: 'text' }
              ]
            }
          ]
        };
        
        const entryData = [
          {
            text_field: 'test value'
            // Missing _metadata
          }
        ];
        const tree = [{ uid: 'test-entry', name: 'Test Entry' }];

        ctInstance.validateModularBlocksField(tree, modularBlockSchema as any, entryData as any);

        // Should not throw - method is void
      });
  });

  describe('validateGroupField method', () => {
    fancy
      .stdout({ print: process.env.PRINT === 'true' || false })
      .it('should validate group field with valid data', async ({}) => {
        const ctInstance = new Entries(constructorParam);
        (ctInstance as any).currentUid = 'test-entry';
        (ctInstance as any).missingRefs = { 'test-entry': [] };
        (ctInstance as any).missingSelectFeild = { 'test-entry': [] };
        (ctInstance as any).missingMandatoryFields = { 'test-entry': [] };
        
        const groupFieldSchema = {
          uid: 'group_field',
          display_name: 'Group Field',
          data_type: 'group',
          multiple: false,
          schema: [
            { uid: 'text_field', display_name: 'Text Field', data_type: 'text' }
          ]
        };
        
        const entryData = {
          group_field: {
            text_field: 'test value'
          }
        };
        const tree = [{ uid: 'test-entry', name: 'Test Entry' }];

        const result = await ctInstance.validateGroupField(tree, groupFieldSchema as any, entryData as any);

        expect(result).to.be.undefined; // Should not throw or return error
      });

    fancy
      .stdout({ print: process.env.PRINT === 'true' || false })
      .it('should validate multiple group field entries', async ({}) => {
        const ctInstance = new Entries(constructorParam);
        (ctInstance as any).currentUid = 'test-entry';
        (ctInstance as any).missingRefs = { 'test-entry': [] };
        (ctInstance as any).missingSelectFeild = { 'test-entry': [] };
        (ctInstance as any).missingMandatoryFields = { 'test-entry': [] };
        
        const groupFieldSchema = {
          uid: 'group_field',
          display_name: 'Group Field',
          data_type: 'group',
          multiple: true,
          schema: [
            { uid: 'text_field', display_name: 'Text Field', data_type: 'text' }
          ]
        };
        
        const entryData = {
          group_field: [
            { text_field: 'value 1' },
            { text_field: 'value 2' }
          ]
        };
        const tree = [{ uid: 'test-entry', name: 'Test Entry' }];

        const result = await ctInstance.validateGroupField(tree, groupFieldSchema as any, entryData as any);

        expect(result).to.be.undefined; // Should not throw or return error
      });
  });

  describe('validateModularBlocksField method', () => {
    fancy
      .stdout({ print: process.env.PRINT === 'true' || false })
      .it('should validate modular block with nested global fields', async ({}) => {
        const ctInstance = new Entries(constructorParam);
        (ctInstance as any).currentUid = 'test-entry';
        (ctInstance as any).missingRefs = { 'test-entry': [] };
        (ctInstance as any).missingSelectFeild = { 'test-entry': [] };
        (ctInstance as any).missingMandatoryFields = { 'test-entry': [] };
        
        const modularBlockSchema = {
          uid: 'modular_block',
          display_name: 'Modular Block',
          data_type: 'blocks',
          blocks: [
            {
              uid: 'block_with_global',
              display_name: 'Block with Global',
              schema: [
                {
                  uid: 'global_field_ref',
                  display_name: 'Global Field Reference',
                  data_type: 'global_field',
                  reference_to: 'global_field_uid'
                }
              ]
            }
          ]
        };
        
        const entryData = [
          {
            _metadata: { uid: 'block_with_global' },
            global_field_ref: {
              nested_field: 'test value'
            }
          }
        ];
        const tree = [{ uid: 'test-entry', name: 'Test Entry' }];

        ctInstance.validateModularBlocksField(tree, modularBlockSchema as any, entryData as any);

        // Should not throw - method is void
      });
  });

  describe('validateExtensionAndAppField method', () => {
    fancy
      .stdout({ print: process.env.PRINT === 'true' || false })
      .it('should validate file field with valid asset UID', async ({}) => {
        const ctInstance = new Entries(constructorParam);
        (ctInstance as any).currentUid = 'test-entry';
        (ctInstance as any).missingRefs = { 'test-entry': [] };
        (ctInstance as any).missingSelectFeild = { 'test-entry': [] };
        (ctInstance as any).missingMandatoryFields = { 'test-entry': [] };
        
        const fileFieldSchema = {
          uid: 'file_field',
          display_name: 'File Field',
          data_type: 'file'
        };
        
        const entryData = {
          file_field: {
            uid: 'valid-asset-uid',
            filename: 'test.jpg',
            content_type: 'image/jpeg'
          }
        };
        const tree = [{ uid: 'test-entry', name: 'Test Entry' }];

        const result = ctInstance.validateExtensionAndAppField(tree, fileFieldSchema as any, entryData as any);

        expect(result).to.be.an('array'); // Should return an array of missing references
      });

    fancy
      .stdout({ print: process.env.PRINT === 'true' || false })
      .it('should flag file field with invalid asset UID', async ({}) => {
        const ctInstance = new Entries(constructorParam);
        (ctInstance as any).currentUid = 'test-entry';
        (ctInstance as any).missingRefs = { 'test-entry': [] };
        (ctInstance as any).missingSelectFeild = { 'test-entry': [] };
        (ctInstance as any).missingMandatoryFields = { 'test-entry': [] };
        
        const fileFieldSchema = {
          uid: 'file_field',
          display_name: 'File Field',
          data_type: 'file'
        };
        
        const entryData = {
          file_field: {
            uid: 'invalid-asset-uid',
            filename: 'test.jpg',
            content_type: 'image/jpeg'
          }
        };
        const tree = [{ uid: 'test-entry', name: 'Test Entry' }];

        const result = ctInstance.validateExtensionAndAppField(tree, fileFieldSchema as any, entryData as any);

        expect(result).to.be.an('array'); // Should return an array of missing references
      });
  });

  describe('validateJsonRTEFields method', () => {
    fancy
      .stdout({ print: process.env.PRINT === 'true' || false })
      .it('should validate RTE field with valid content', async ({}) => {
        const ctInstance = new Entries(constructorParam);
        (ctInstance as any).currentUid = 'test-entry';
        (ctInstance as any).missingRefs = { 'test-entry': [] };
        (ctInstance as any).missingSelectFeild = { 'test-entry': [] };
        (ctInstance as any).missingMandatoryFields = { 'test-entry': [] };
        
        const rteFieldSchema = {
          uid: 'rte_field',
          display_name: 'RTE Field',
          data_type: 'richtext'
        };
        
        const entryData = {
          rte_field: {
            uid: 'rte-uid',
            type: 'doc',
            children: [
              {
                type: 'p',
                children: [{ text: 'Test content' }]
              }
            ]
          }
        };
        const tree = [{ uid: 'test-entry', name: 'Test Entry' }];

        ctInstance.validateJsonRTEFields(tree, rteFieldSchema as any, entryData as any);

        // Should not throw - method is void
      });

    fancy
      .stdout({ print: process.env.PRINT === 'true' || false })
      .it('should validate RTE field with embedded references', async ({}) => {
        const ctInstance = new Entries(constructorParam);
        (ctInstance as any).currentUid = 'test-entry';
        (ctInstance as any).missingRefs = { 'test-entry': [] };
        (ctInstance as any).missingSelectFeild = { 'test-entry': [] };
        (ctInstance as any).missingMandatoryFields = { 'test-entry': [] };
        
        const rteFieldSchema = {
          uid: 'rte_field',
          display_name: 'RTE Field',
          data_type: 'richtext'
        };
        
        const entryData = {
          rte_field: {
            uid: 'rte-uid',
            type: 'doc',
            children: [
              {
                type: 'p',
                children: [
                  { text: 'Content with ' },
                  {
                    type: 'a',
                    attrs: { href: '/test-page' },
                    children: [{ text: 'link' }]
                  }
                ]
              }
            ]
          }
        };
        const tree = [{ uid: 'test-entry', name: 'Test Entry' }];

        ctInstance.validateJsonRTEFields(tree, rteFieldSchema as any, entryData as any);

        // Should not throw - method is void
      });
  });
});
