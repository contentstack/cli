import fs from 'fs';
import sinon from 'sinon';
import { resolve } from 'path';
import { fancy } from 'fancy-test';
import { expect } from 'chai';
import cloneDeep from 'lodash/cloneDeep';
import { cliux } from '@contentstack/cli-utilities';

import config from '../../../src/config';
import { FieldRule } from '../../../src/modules';
import { $t, auditMsg } from '../../../src/messages';
import { CtConstructorParam, ModuleConstructorParam } from '../../../src/types';

const missingRefs = require('../mock/contents/field_rules/schema.json');

describe('Field Rules', () => {

  let constructorParam: ModuleConstructorParam & CtConstructorParam;

  class AuditTempClass extends FieldRule {
    public missingRefs: Record<string, any>;
    
    constructor(missingRefs: Record<string, any> = {}) {
      super(constructorParam);
      this.currentUid = 'audit';
      this.currentTitle = 'Audit';
      this.missingRefs = missingRefs;
      this.missingRefs['audit'] = [];
    }
  }

  class AuditFixTempClass extends FieldRule {
    public missingRefs: Record<string, any>;
    
    constructor(missingRefs: Record<string, any> = {}) {
      super({ ...constructorParam, fix: true, moduleName: undefined });
      this.currentUid = 'audit-fix';
      this.currentTitle = 'Audit fix';
      this.missingRefs = missingRefs;
      this.missingRefs['audit-fix'] = [];
    }
  }

  beforeEach(() => {
    constructorParam = {
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
      const ctInstance = new FieldRule({
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
      .stub(FieldRule.prototype, 'prepareEntryMetaData', async () => {})
      .stub(FieldRule.prototype, 'prerequisiteData', async () => {})
      .stub(FieldRule.prototype, 'fixFieldRules', async () => {})
      .stub(FieldRule.prototype, 'validateFieldRules', async () => {})
      .stub(FieldRule.prototype, 'lookForReference', async () => {})
      .it('should call lookForReference and return the call count for it', async () => {
        const frInstance = new FieldRule(constructorParam);
        const logSpy = sinon.spy(frInstance, 'lookForReference');
        await frInstance.run();
        expect(logSpy.callCount).to.be.equals(frInstance.ctSchema.length);
      });

    fancy
      .stdout({ print: process.env.PRINT === 'true' || false })
      .stub(FieldRule.prototype, 'lookForReference', async () => {})
      .stub(FieldRule.prototype, 'fixFieldRules', async () => {})
      .stub(FieldRule.prototype, 'validateFieldRules', async () => {})
      .it('should not break if empty schema passed', async () => {
        const frInstance = new FieldRule({ ...constructorParam, ctSchema: undefined as any });
        expect(await frInstance.run()).to.be.empty;
      });

    fancy
      .stdout({ print: process.env.PRINT === 'true' || false })
      .stub(FieldRule.prototype, 'lookForReference', async () => {})
      .stub(FieldRule.prototype, 'fixFieldRules', async () => {})
      .it('should return schema', async () => {
        const ctInstance = new FieldRule(constructorParam);
        expect(await ctInstance.run()).to.deep.equals(missingRefs);
      });

    fancy
      .stdout({ print: process.env.PRINT === 'true' || false })
      .stub(FieldRule.prototype, 'lookForReference', async () => {})
      .stub(FieldRule.prototype, 'writeFixContent', async () => {})
      .it('should call writeFixContent', async () => {
        const ctInstance = new FieldRule({ ...constructorParam, fix: true });
        const logSpy = sinon.spy(ctInstance, 'writeFixContent');
        await ctInstance.run();
        expect(logSpy.callCount).to.be.equals(1);
      });

    fancy
      .stub(fs, 'rmSync', () => {})
      .stdout({ print: process.env.PRINT === 'true' || false })
      .stub(FieldRule.prototype, 'writeFixContent', async () => {})
      .it('perform audit operation on the given CT schema field rules', async () => {
        const ctInstance = new AuditTempClass();
        await ctInstance.run();
        expect(ctInstance.missingRefs).ownProperty('page_2');
        expect(ctInstance.missingRefs).ownProperty('page_3');
        expect(ctInstance.missingRefs).ownProperty('page_4');
      });

    fancy
      .stub(fs, 'rmSync', () => {})
      .stdout({ print: process.env.PRINT === 'true' || false })
      .stub(FieldRule.prototype, 'writeFixContent', async () => {})
      .it('perform audit and fix operation on the given CT schema field rules', async () => {
        const ctInstance = new AuditFixTempClass();
        expect(JSON.stringify(await ctInstance.run())).includes(
          '{"ctUid":"page_2","action":{"action":"show","target_field":"desc"},"fixStatus":"Fixed"}',
        );
      });
  });

  describe('writeFixContent method', () => {
    fancy
      .stdout({ print: process.env.PRINT === 'true' || false })
      .stub(fs, 'writeFileSync', () => {})
      .stub(cliux, 'confirm', async () => true)
      .it('should not write the file', async () => {
        const ctInstance = new FieldRule({ ...constructorParam, fix: true });
        const fsSpy = sinon.spy(fs, 'writeFileSync');
        await ctInstance.writeFixContent();
        expect(fsSpy.callCount).to.be.equals(1);
      });

    fancy
      .stdout({ print: process.env.PRINT === 'true' || false })
      .stub(fs, 'writeFileSync', () => {})
      .it('should prompt and ask confirmation', async () => {
        sinon.replace(cliux, 'confirm', async () => false);
        const ctInstance = new FieldRule({ ...constructorParam, fix: true });
        const spy = sinon.spy(cliux, 'confirm');
        await ctInstance.writeFixContent();
        expect(spy.callCount).to.be.equals(1);
      });
  });

  describe('Test Other methods', () => {
    fancy
      .stub(fs, 'rmSync', () => {})
      .stdout({ print: process.env.PRINT === 'true' || false })
      .stub(FieldRule.prototype, 'writeFixContent', async () => {})
      .it('Check the calls for other methods', async () => {
        const frInstance = new AuditTempClass();
        const logSpy2 = sinon.spy(frInstance, 'validateFieldRules');
        const logSpy3 = sinon.spy(frInstance, 'addMissingReferences');
        await frInstance.run();
        expect(logSpy2.callCount).to.be.equals(frInstance.ctSchema.length);
        expect(logSpy3.callCount).to.be.equals(10);
      });

    fancy
      .stub(fs, 'rmSync', () => {})
      .stdout({ print: process.env.PRINT === 'true' || false })
      .stub(FieldRule.prototype, 'writeFixContent', async () => {})
      .it('Check the calls for other methods when field_rules are empty', async () => {
        const frInstance = new FieldRule({
          moduleName: 'content-types',
          ctSchema: [
            {
              title: 'Page 2',
              uid: 'page_2',
              schema: [
                {
                  data_type: 'text',
                  display_name: 'Title',
                  field_metadata: { _default: true, version: 3 },
                  mandatory: true,
                  uid: 'title',
                  unique: true,
                  multiple: false,
                  non_localizable: false,
                },
              ],
              field_rules: [],
              description: '',
              mandatory: false,
              multiple: false,
            },
          ],
          gfSchema: [],
          config: Object.assign(config, { basePath: resolve(__dirname, '..', 'mock', 'contents'), flags: {} }),
        });
        const logSpy2 = sinon.spy(frInstance, 'validateFieldRules');
        const logSpy3 = sinon.spy(frInstance, 'addMissingReferences');
        await frInstance.run();
        expect(logSpy2.callCount).to.be.equals(1);
        expect(logSpy3.callCount).to.be.equals(0);
      });
  });
});
