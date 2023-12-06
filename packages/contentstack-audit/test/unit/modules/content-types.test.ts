import fs from 'fs';
import sinon from 'sinon';
import { resolve } from 'path';
import { fancy } from 'fancy-test';
import { expect } from '@oclif/test';
import cloneDeep from 'lodash/cloneDeep';
import { ux } from '@contentstack/cli-utilities';

import config from '../../../src/config';
import { ContentType } from '../../../src/modules';
import { $t, auditMsg } from '../../../src/messages';
import {
  ContentTypeStruct,
  CtConstructorParam,
  GlobalFieldDataType,
  GroupFieldDataType,
  ModularBlockType,
  ModuleConstructorParam,
  ReferenceFieldDataType,
} from '../../../src/types';

describe('Content types', () => {
  type CtType = ContentTypeStruct | GlobalFieldDataType | ModularBlockType | GroupFieldDataType;

  let constructorParam: ModuleConstructorParam & CtConstructorParam;

  class AuditTempClass extends ContentType {
    constructor(public missingRefs: Record<string, any> = {}) {
      super(constructorParam);
      this.currentUid = 'audit';
      this.currentTitle = 'Audit';
      this.missingRefs['audit'] = [];
    }
  }

  class AuditFixTempClass extends ContentType {
    constructor(public missingRefs: Record<string, any> = {}) {
      super({ ...constructorParam, fix: true, moduleName: undefined });
      this.currentUid = 'audit-fix';
      this.currentTitle = 'Audit fix';
      this.missingRefs['audit-fix'] = [];
    }
  }

  beforeEach(() => {
    constructorParam = {
      log: () => {},
      moduleName: 'content-types',
      ctSchema: cloneDeep(require('../mock/contents/content_types/schema.json')),
      gfSchema: cloneDeep(require('../mock/contents/global_fields/globalfields.json')),
      config: Object.assign(config, { basePath: resolve(__dirname, '..', 'mock', 'contents'), flags: {} }),
    };
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('run method', () => {
    fancy.stdout({ print: process.env.PRINT === 'true' || false }).it('should validate base path', async () => {
      const ctInstance = new ContentType({
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
      .stub(ContentType.prototype, 'lookForReference', async () => {})
      .it('should call lookForReference', async () => {
        const ctInstance = new ContentType(constructorParam);
        const logSpy = sinon.spy(ctInstance, 'lookForReference');
        await ctInstance.run();
        expect(logSpy.callCount).to.be.equals(ctInstance.ctSchema.length);
      });

    fancy
      .stdout({ print: process.env.PRINT === 'true' || false })
      .stub(ContentType.prototype, 'lookForReference', async () => {})
      .it('should not break if empty schema passed', async () => {
        const ctInstance = new ContentType({ ...constructorParam, ctSchema: undefined as any });
        expect(await ctInstance.run(true)).to.be.undefined;
      });

    fancy
      .stdout({ print: process.env.PRINT === 'true' || false })
      .stub(ContentType.prototype, 'lookForReference', async () => {})
      .it('should return schema', async () => {
        const ctInstance = new ContentType(constructorParam);
        expect(await ctInstance.run(true)).to.deep.equals(ctInstance.ctSchema);
      });

    fancy
      .stdout({ print: process.env.PRINT === 'true' || false })
      .stub(ContentType.prototype, 'lookForReference', async () => {})
      .stub(ContentType.prototype, 'writeFixContent', async () => {})
      .it('should call writeFixContent', async () => {
        const ctInstance = new ContentType({ ...constructorParam, fix: true });
        const logSpy = sinon.spy(ctInstance, 'writeFixContent');
        await ctInstance.run();
        expect(logSpy.callCount).to.be.equals(1);
      });

    fancy
      .stub(fs, 'rmSync', () => {})
      .stdout({ print: process.env.PRINT === 'true' || false })
      .stub(ContentType.prototype, 'writeFixContent', async () => {})
      .it('perform audit operation on the given CT schema', async () => {
        const ctInstance = new AuditFixTempClass();

        await ctInstance.run();

        expect(ctInstance.missingRefs).ownProperty('page_1');
        expect(JSON.stringify(ctInstance.missingRefs)).includes('"missingRefs":["page_0"]');
      });

    fancy
      .stub(fs, 'rmSync', () => {})
      .stdout({ print: process.env.PRINT === 'true' || false })
      .stub(ContentType.prototype, 'writeFixContent', async () => {})
      .it('perform audit and fix operation on the given CT schema', async () => {
        const ctInstance = new AuditFixTempClass();

        expect(JSON.stringify(await ctInstance.run(true))).includes(
          '"display_name":"Reference","reference_to":["page_4","page_3","page_2","page_1"]',
        );
      });
  });

  describe('writeFixContent method', () => {
    fancy
      .stdout({ print: process.env.PRINT === 'true' || false })
      .stub(fs, 'writeFileSync', () => {})
      .stub(ux, 'confirm', async () => true)
      .it('should not write the file', async () => {
        const ctInstance = new ContentType({ ...constructorParam, fix: true });
        const fsSpy = sinon.spy(fs, 'writeFileSync');
        await ctInstance.writeFixContent();
        expect(fsSpy.callCount).to.be.equals(1);
      });

    fancy
      .stdout({ print: process.env.PRINT === 'true' || false })
      .stub(fs, 'writeFileSync', () => {})
      .it('should prompt and ask confirmation', async () => {
        sinon.replace(ux, 'confirm', async () => false);
        const ctInstance = new ContentType({ ...constructorParam, fix: true });
        const spy = sinon.spy(ux, 'confirm');
        await ctInstance.writeFixContent();
        expect(spy.callCount).to.be.equals(1);
      });
  });

  describe('lookForReference method', () => {
    fancy
      .stdout({ print: process.env.PRINT === 'true' || false })
      .stub(ContentType.prototype, 'validateReferenceField', () => [])
      .stub(ContentType.prototype, 'validateGlobalField', () => {})
      .stub(ContentType.prototype, 'validateJsonRTEFields', () => [])
      .stub(ContentType.prototype, 'validateGroupField', () => [])
      .stub(ContentType.prototype, 'validateModularBlocksField', () => [])
      .it('should call all CT type audit methods', async () => {
        const ctInstance = new (class TempClass extends ContentType {
          constructor() {
            super(constructorParam);
            this.currentUid = 'test';
            this.missingRefs['test'] = [];
          }
        })();
        const validateReferenceFieldSpy = sinon.spy(ctInstance, 'validateReferenceField');
        const validateGlobalFieldSpy = sinon.spy(ctInstance, 'validateGlobalField');
        const validateJsonRTEFieldsSpy = sinon.spy(ctInstance, 'validateJsonRTEFields');
        const validateModularBlocksFieldSpy = sinon.spy(ctInstance, 'validateModularBlocksField');
        const validateGroupFieldSpy = sinon.spy(ctInstance, 'validateGroupField');

        // NOTE dummy CT schema
        const schema = [
          { data_type: 'reference', uid: 'ref', display_name: 'Ref' },
          { data_type: 'global_field' },
          { data_type: 'json', field_metadata: { allow_json_rte: true } },
          { data_type: 'blocks' },
          { data_type: 'group' },
        ];
        await ctInstance.lookForReference([], { schema } as unknown as CtType);

        expect(validateReferenceFieldSpy.callCount).to.be.equals(1);
        expect(validateGlobalFieldSpy.callCount).to.be.equals(1);
        expect(validateJsonRTEFieldsSpy.callCount).to.be.equals(1);
        expect(validateModularBlocksFieldSpy.callCount).to.be.equals(1);
        expect(validateGroupFieldSpy.callCount).to.be.equals(1);
      });

    fancy
      .stdout({ print: process.env.PRINT === 'true' || false })
      .stub(ContentType.prototype, 'runFixOnSchema', () => [])
      .it('should call runFixOnSchema method', async () => {
        const ctInstance = new ContentType({ ...constructorParam, fix: true });
        const validateReferenceFieldSpy = sinon.spy(ctInstance, 'runFixOnSchema');
        await ctInstance.lookForReference([], { schema: [] } as unknown as CtType);

        expect(validateReferenceFieldSpy.callCount).to.be.equals(1);
      });
  });

  describe('validateReferenceField method', () => {
    fancy.stdout({ print: process.env.PRINT === 'true' || false }).it('should return missing reference', async () => {
      const ctInstance = new ContentType(constructorParam);
      const [, , , page1Ct] = ctInstance.ctSchema as CtType[];
      const [, , , , refField] = page1Ct.schema ?? [];

      expect(
        JSON.stringify(
          await ctInstance.validateReferenceField(
            [{ uid: refField.uid, name: refField.display_name }],
            refField as ReferenceFieldDataType,
          ),
        ),
      ).includes('"missingRefs":["page_0"]');
    });
  });

  describe('validateGlobalField method', () => {
    fancy
      .stdout({ print: process.env.PRINT === 'true' || false })
      .stub(ContentType.prototype, 'runFixOnSchema', () => {})
      .it('should call lookForReference method', async () => {
        const ctInstance = new AuditTempClass();

        const lookForReferenceSpy = sinon.spy(ctInstance, 'lookForReference');
        const [, , , page1Ct] = ctInstance.ctSchema as CtType[];
        const [, gf] = page1Ct.schema as [unknown, GlobalFieldDataType];
        await ctInstance.validateGlobalField([{ uid: gf.uid, name: gf.display_name }], gf);

        expect(lookForReferenceSpy.called).to.be.true;
        expect(JSON.stringify(ctInstance.missingRefs)).to.be.include('"missingRefs":["page_0"]');
      });

    fancy
      .stdout({ print: process.env.PRINT === 'true' || false })
      .stub(ContentType.prototype, 'runFixOnSchema', () => {})
      .it('should identify missing schema on global field', async () => {
        const ctInstance = new AuditTempClass();
        const field = {
          data_type: 'global_field',
          display_name: 'Global',
          reference_to: 'gf_0',
          uid: 'global_field',
        } as GlobalFieldDataType;

        await ctInstance.validateGlobalField([{ uid: field.uid, name: field.display_name }], field);

        const expected = {
          audit: [
            {
              name: 'Audit',
              ct_uid: 'audit',
              data_type: field.data_type,
              display_name: field.display_name,
              missingRefs: 'Empty schema found',
              tree: [{ uid: field.uid, name: field.display_name }],
              treeStr: [{ uid: field.uid, name: field.display_name }].map(({ name }) => name).join(' ➜ '),
            },
          ],
        };
        const actual = ctInstance.missingRefs;
        expect(actual).to.deep.equals(expected);
      });
  });

  describe('fixGlobalFieldReferences method', () => {
    fancy
      .stdout({ print: process.env.PRINT === 'true' || false })
      .stub(fs, 'rmSync', () => {})
      .stub(ContentType.prototype, 'runFixOnSchema', () => {})
      .stub(ContentType.prototype, 'lookForReference', () => {})
      .it('should identify missing global-field schema and attach with content-type schema', async () => {
        // Mock/Stub
        const ctInstance = new AuditFixTempClass();
        const field = {
          data_type: 'global_field',
          display_name: 'Global',
          reference_to: 'gf_1',
          uid: 'global_field',
        } as GlobalFieldDataType;

        // Execution
        const fixField = await ctInstance.fixGlobalFieldReferences([], field);

        // Assertion
        const actual = ctInstance.missingRefs;
        const expected = {
          'audit-fix': [
            {
              name: 'Audit fix',
              ct_uid: 'audit-fix',
              fixStatus: 'Fixed',
              data_type: field.data_type,
              display_name: field.display_name,
              missingRefs: 'Empty schema found',
              tree: [{ uid: field.uid, name: field.display_name, data_type: field.data_type }],
              treeStr: [{ uid: field.uid, name: field.display_name, data_type: field.data_type }]
                .map(({ name }) => name)
                .join(' ➜ '),
            },
          ],
        };
        expect(actual).to.deep.equals(expected);
        expect(fixField?.schema).is.not.empty;
        expect(fixField?.schema.length).to.be.equal(2);
      });
  });
});
