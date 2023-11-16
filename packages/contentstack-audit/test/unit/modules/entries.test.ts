import fs from 'fs';
import { resolve } from 'path';
import { expect } from '@oclif/test';
import cloneDeep from 'lodash/cloneDeep';
import { ux } from '@contentstack/cli-utilities';
import { fancy } from '@contentstack/cli-dev-dependencies';

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

describe('Entries module', () => {
  let constructorParam: ModuleConstructorParam & CtConstructorParam;

  beforeEach(() => {
    constructorParam = {
      log: () => {},
      moduleName: 'entries',
      ctSchema: cloneDeep(require('../mock/contents/content_types/schema.json')),
      gfSchema: cloneDeep(require('../mock/contents/global_fields/globalfields.json')),
      config: Object.assign(config, { basePath: resolve(__dirname, '..', 'mock', 'contents'), flags: {} }),
    };
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

        expect(missingRefs).not.to.be.empty;
        expect(missingRefs).deep.contain({ 'test-entry-id': [{ uid: 'test', treeStr: 'gf_0' }] });
      });

    fancy
      .stdout({ print: process.env.PRINT === 'true' || false })
      .stub(Entries.prototype, 'prepareEntryMetaData', async () => {})
      .stub(Entries.prototype, 'fixPrerequisiteData', async () => {})
      .stub(Entries.prototype, 'lookForReference', async () => {})
      .stub(Entries.prototype, 'writeFixContent', async () => {})
      .stub(Entries.prototype, 'locales', [{ code: 'en-us' }] as any)
      .spy(Entries.prototype, 'prepareEntryMetaData')
      .spy(Entries.prototype, 'fixPrerequisiteData')
      .spy(Entries.prototype, 'lookForReference')
      .spy(Entries.prototype, 'writeFixContent')
      .it('should call prepareEntryMetaData & fixPrerequisiteData methods', async ({ spy }) => {
        const ctInstance = new Entries({ ...constructorParam, fix: true });
        const missingRefs = await ctInstance.run();

        expect(missingRefs).to.be.empty;
        expect(spy.writeFixContent.callCount).to.be.equals(1);
        expect(spy.lookForReference.callCount).to.be.equals(1);
        expect(spy.fixPrerequisiteData.callCount).to.be.equals(1);
        expect(spy.prepareEntryMetaData.callCount).to.be.equals(1);
      });
  });

  describe('fixPrerequisiteData method', () => {
    fancy
      .stdout({ print: process.env.PRINT === 'true' || false })
      .stub(ContentType.prototype, 'run', async () => ({ ct1: [{}] }))
      .stub(GlobalField.prototype, 'run', async () => ({ gf1: [{}] }))
      .spy(ContentType.prototype, 'run', 'ct')
      .spy(GlobalField.prototype, 'run', 'gf')
      .it('should call content type and global fields fix functionality', async ({ spy }) => {
        const ctInstance = new Entries(constructorParam);
        await ctInstance.fixPrerequisiteData();

        expect(spy.ctRun.callCount).to.be.equals(1);
        expect(spy.gfRun.callCount).to.be.equals(1);
        expect(ctInstance.ctSchema).deep.contain({ ct1: [{}] });
        expect(ctInstance.gfSchema).deep.contain({ gf1: [{}] });
      });
  });

  describe('writeFixContent method', () => {
    fancy
      .stdout({ print: process.env.PRINT === 'true' || false })
      .stub(fs, 'writeFileSync', () => {})
      .stub(ux, 'confirm', async () => true)
      .spy(fs, 'writeFileSync')
      .it('should ask confirmation adn write content in given path', async ({ spy }) => {
        const ctInstance = new Entries({ ...constructorParam, fix: true });
        await ctInstance.writeFixContent(resolve(__dirname, '..', 'mock', 'contents'), {});

        expect(spy.writeFileSync.callCount).to.be.equals(1);
      });

    fancy
      .stdout({ print: process.env.PRINT === 'true' || false })
      .stub(fs, 'writeFileSync', () => {})
      .spy(fs, 'writeFileSync')
      .it("should skip confirmation if 'yes' flag passed", async ({ spy }) => {
        const ctInstance = new Entries({ ...constructorParam, fix: true });
        ctInstance.config.flags.yes = true;
        await ctInstance.writeFixContent(resolve(__dirname, '..', 'mock', 'contents'), {});

        expect(spy.writeFileSync.callCount).to.be.equals(1);
        expect(
          spy.writeFileSync.calledWithExactly(resolve(__dirname, '..', 'mock', 'contents'), JSON.stringify({})),
        ).to.be.true;
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
      .spy(Entries.prototype, 'runFixOnSchema')
      .spy(Entries.prototype, 'validateReferenceField')
      .spy(Entries.prototype, 'validateGlobalField')
      .spy(Entries.prototype, 'validateJsonRTEFields')
      .spy(Entries.prototype, 'validateModularBlocksField')
      .spy(Entries.prototype, 'validateGroupField')
      .it('should call datatype specific methods', async ({ spy }) => {
        const ctInstance = new (class Class extends Entries {
          constructor() {
            super({ ...constructorParam, fix: true });
            this.currentUid = 'reference';
            this.missingRefs = { reference: [] };
          }
        })();
        await ctInstance.lookForReference([], { schema } as any, {});

        expect(spy.runFixOnSchema.callCount).to.be.equals(1);
        expect(spy.validateReferenceField.callCount).to.be.equals(1);
        expect(spy.validateGlobalField.callCount).to.be.equals(1);
        expect(spy.validateJsonRTEFields.callCount).to.be.equals(1);
        expect(spy.validateModularBlocksField.callCount).to.be.equals(1);
        expect(spy.validateGroupField.callCount).to.be.equals(1);
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
      .spy(Entries.prototype, 'validateReferenceValues')
      .it('should call validateReferenceField method', async ({ spy }) => {
        const ctInstance = new Class();
        await ctInstance.validateReferenceField([], ctInstance.ctSchema[3].schema as any, ctInstance.entries as any);

        expect(spy.validateReferenceValues.callCount).to.be.equals(1);
        expect(spy.validateReferenceValues.alwaysCalledWith([], ctInstance.ctSchema[3].schema, ctInstance.entries)).to
          .be.true;
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

  describe('validateGlobalField method', () => {
    fancy
      .stdout({ print: process.env.PRINT === 'true' || false })
      .stub(Entries.prototype, 'lookForReference', () => {})
      .spy(Entries.prototype, 'lookForReference')
      .it('should call validateReferenceField method', async ({ spy }) => {
        const ctInstance = new (class Class extends Entries {
          public entries: Record<string, EntryStruct> = (
            require('../mock/contents/entries/page_1/en-us/e7f6e3cc-64ca-4226-afb3-7794242ae5f5-entries.json') as any
          )['test-uid-2'];
        })(constructorParam);
        await ctInstance.validateGlobalField([], ctInstance.ctSchema as any, ctInstance.entries as any);

        expect(spy.lookForReference.callCount).to.be.equals(1);
        expect(spy.lookForReference.alwaysCalledWith([], ctInstance.ctSchema, ctInstance.entries)).to.be.true;
      });
  });

  describe('validateJsonRTEFields method', () => {
    fancy
      .stdout({ print: process.env.PRINT === 'true' || false })
      .stub(Entries.prototype, 'jsonRefCheck', () => {})
      .spy(Entries.prototype, 'jsonRefCheck')
      .spy(Entries.prototype, 'validateJsonRTEFields')
      .it('should do recursive call on validateJsonRTEFields method', async ({ spy }) => {
        const ctInstance = new Entries(constructorParam);
        await ctInstance.validateJsonRTEFields([], ctJsonRTE as any, entryJsonRTE as any);
        expect(spy.jsonRefCheck.callCount).to.be.equals(4);
        expect(spy.validateJsonRTEFields.callCount).to.be.equals(3);
        expect(spy.validateJsonRTEFields.calledWithExactly([], ctJsonRTE, entryJsonRTE)).to.be.true;
        expect(spy.jsonRefCheck.calledWithExactly([], ctJsonRTE, entryJsonRTE.children[0])).to.be.true;
      });
  });

  describe('validateModularBlocksField method', () => {
    fancy
      .stdout({ print: process.env.PRINT === 'true' || false })
      .stub(Entries.prototype, 'modularBlockRefCheck', () => {})
      .stub(Entries.prototype, 'lookForReference', () => {})
      .spy(Entries.prototype, 'modularBlockRefCheck')
      .spy(Entries.prototype, 'lookForReference')
      .it(
        'should iterate each blocks and call modularBlockRefCheck & lookForReference methods number of blocks exist in the entry times',
        async ({ spy }) => {
          const ctInstance = new Entries(constructorParam);
          await ctInstance.validateModularBlocksField([], ctBlock as any, entryBlock as any);

          expect(spy.modularBlockRefCheck.callCount).to.be.equals(3);
          expect(spy.lookForReference.callCount).to.be.equals(5);
          expect(spy.modularBlockRefCheck.calledWithExactly([], ctBlock.blocks, entryBlock[0], 0)).to.be.true;
          expect(
            spy.lookForReference.calledWithExactly(
              [{ uid: 'gf_1', name: 'GF 1' }],
              ctBlock.blocks[1],
              entryBlock[0].gf_1,
            ),
          ).to.be.true;
        },
      );
  });

  describe('validateGroupField method', () => {
    fancy
      .stdout({ print: process.env.PRINT === 'true' || false })
      .stub(Entries.prototype, 'lookForReference', () => {})
      .spy(Entries.prototype, 'lookForReference')
      .it('should call lookForReference method to iterate GroupField schema', async ({ spy }) => {
        const ctInstance = new Entries(constructorParam);
        await ctInstance.validateGroupField([], ctGroupField as any, entryGroupField as any);
        expect(spy.lookForReference.callCount).to.be.equals(1);
        expect(spy.lookForReference.calledWithExactly([], ctGroupField, entryGroupField)).to.be.true;
      });

    fancy
      .stdout({ print: process.env.PRINT === 'true' || false })
      .stub(Entries.prototype, 'lookForReference', () => {})
      .spy(Entries.prototype, 'lookForReference')
      .it(
        'should iterate all group entries and call lookForReference method to iterate GroupField schema',
        async ({ spy }) => {
          const ctInstance = new Entries(constructorParam);
          await ctInstance.validateGroupField([], ctGroupField as any, [entryGroupField, entryGroupField] as any);

          expect(spy.lookForReference.callCount).to.be.equals(2);
          expect(
            spy.lookForReference.calledWithExactly(
              [{ uid: ctGroupField.uid, display_name: ctGroupField.display_name }],
              ctGroupField,
              entryGroupField,
            ),
          ).to.be.true;
        },
      );
  });
});
