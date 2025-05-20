import fs from 'fs';
import sinon from 'sinon';
import { resolve } from 'path';
import { fancy } from 'fancy-test';
import { expect } from 'chai';
import cloneDeep from 'lodash/cloneDeep';
import { ux } from '@contentstack/cli-utilities';

import config from '../../../src/config';
import { GlobalField } from '../../../src/modules';
import { $t, auditMsg } from '../../../src/messages';
import { CtConstructorParam, ModuleConstructorParam } from '../../../src/types';

describe('Global Fields', () => {
  let constructorParam: ModuleConstructorParam & CtConstructorParam;

  class AuditFixTempClass extends GlobalField {
    constructor(public missingRefs: Record<string, any> = {}) {
      super({ ...constructorParam, fix: true, moduleName: 'global-fields' });
      this.currentUid = 'audit-fix';
      this.currentTitle = 'Audit fix';
      this.missingRefs['audit-fix'] = [];
    }
  }

  beforeEach(() => {
    constructorParam = {
      log: () => {},
      moduleName: 'global-fields',
      ctSchema: cloneDeep(require('../mock/contents/content_types/schema.json')),
      gfSchema: cloneDeep(require('../mock/contents/global_fields/globalfields.json')),
      config: Object.assign(config, { basePath: resolve(__dirname, '..', 'mock', 'contents'), flags: {} }),
    };
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('run method', () => {
    fancy
      .stdout({ print: process.env.PRINT === 'true' || false })
      .stub(ux, 'confirm', async () => true)
      .it('Should Validate the base path for global-fields', async () => {
        const gfInstance = new GlobalField({ ...constructorParam });
        try {
          await gfInstance.run();
        } catch (error: any) {
          expect(error).to.be.instanceOf(Error);
          expect(error.message).to.eql($t(auditMsg.NOT_VALID_PATH, { path: gfInstance.folderPath }));
        }
      });

    fancy
      .stdout({ print: process.env.PRINT === 'true' || false })
      .stub(GlobalField.prototype, 'lookForReference', async () => {})
      .it('should call lookForReference', async () => {
        const gfInstance = new GlobalField(constructorParam);
        const logSpy = sinon.spy(gfInstance, 'lookForReference');
        await gfInstance.run();
        expect(logSpy.callCount).to.be.equals(gfInstance.gfSchema.length);
      });

    fancy
      .stdout({ print: process.env.PRINT === 'true' || false })
      .stub(GlobalField.prototype, 'lookForReference', async () => {})
      .it('should return schema', async () => {
        const gfInstance = new GlobalField(constructorParam);
        expect(await gfInstance.run(true)).to.deep.equals(gfInstance.gfSchema);
      });

    fancy
      .stdout({ print: process.env.PRINT === 'true' || false })
      .stub(GlobalField.prototype, 'lookForReference', async () => {})
      .stub(GlobalField.prototype, 'writeFixContent', async () => {})
      .it('should call writeFixContent', async () => {
        const gfInstance = new GlobalField({ ...constructorParam, fix: true });
        const logSpy = sinon.spy(gfInstance, 'writeFixContent');
        await gfInstance.run();
        expect(logSpy.callCount).to.be.equals(1);
      });
  });

  describe('fix nested global field references', () => {
    fancy
      .stub(fs, 'rmSync', () => {})
      .stdout({ print: process.env.PRINT === 'true' || false })
      .stub(GlobalField.prototype, 'writeFixContent', async () => {})
      .it('perform audit operation on the given GF schema', async () => {
        const gfInstance = new AuditFixTempClass();

        await gfInstance.run();

        expect(gfInstance.missingRefs).ownProperty('nested_global_field_2');
        expect(JSON.stringify(gfInstance.missingRefs)).includes('"missingRefs":["nested_global_field_1"]');
      });

    fancy
      .stub(fs, 'rmSync', () => {})
      .stdout({ print: process.env.PRINT === 'true' || false })
      .stub(GlobalField.prototype, 'writeFixContent', async () => {})
      .it('perform audit and fix operation on the given GF schema', async () => {
        const gfInstance = new AuditFixTempClass();
        expect(JSON.stringify(await gfInstance.run(true))).includes('"uid":"global_field_sample_2","schema":[]');
      });
  });
});
