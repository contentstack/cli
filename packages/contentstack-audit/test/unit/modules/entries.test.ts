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
});
