import fs from 'fs';
import { resolve } from 'path';
import { fancy } from 'fancy-test';
import { expect } from '@oclif/test';
import cloneDeep from 'lodash/cloneDeep';
import { ux } from '@contentstack/cli-utilities';

import config from '../../../src/config';
import { Workflows } from '../../../src/modules';
import { $t, auditMsg } from '../../../src/messages';
import { values } from 'lodash';
import { Workflow } from '../../../src/types';
import { join } from 'path';

describe('Workflows', () => {
  describe('run method with invalid path for workflows', () => {
    const wf = new Workflows({
      log: () => {},
      moduleName: 'workflows',
      ctSchema: cloneDeep(require('./../mock/contents/workflows/ctSchema.json')),
      config: Object.assign(config, { basePath: resolve(__dirname, '..', 'mock', 'workflows'), flags: {} }),
    });
    fancy
      .stdout({ print: process.env.PRINT === 'true' || false })
      .stub(ux, 'confirm', async () => true)
      .it('Should Validate the base path for workflows', async () => {
        try {
          await wf.run();
        } catch (error: any) {
          expect(error).to.be.instanceOf(Error);
          expect(error.message).to.eql($t(auditMsg.NOT_VALID_PATH, { path: wf.folderPath }));
        }
      });
  });
  describe('run method with valid path for workflows and ctSchema', () => {
    const wf = new Workflows({
      log: () => {},
      moduleName: 'workflows',
      ctSchema: cloneDeep(require('./../mock/contents/workflows/ctSchema.json')),
      config: Object.assign(config, {
        basePath: resolve(`./test/unit/mock/contents/`),
        flags: {},
      }),
    });

    fancy
      .stdout({ print: process.env.PRINT === 'true' || true })
      .stub(ux, 'confirm', async () => true)
      .it(
        'should expect missingRefs equal to empty array, expect entire workflow schema and empty missingCts',
        async () => {
          const missingRefs = await wf.run();
          expect(wf.workflowSchema).eql(values(JSON.parse(fs.readFileSync(wf.workflowPath, 'utf8'))));
          expect(missingRefs).eql([]);
          expect(wf.missingCts).eql(new Set([]));
        },
      );
  });

  describe('run method with valid path and empty ctSchema to check the missing references', () => {
    const wf = new Workflows({
      log: () => {},
      moduleName: 'workflows',
      ctSchema: [],
      config: Object.assign(config, {
        basePath: resolve(`./test/unit/mock/contents/`),
        flags: {},
      }),
    });

    fancy
      .stdout({ print: process.env.PRINT === 'true' || true })
      .stub(ux, 'confirm', async () => true)
      .it('should expect missingRefs equal to all workflows', async () => {
        const missingRefs = await wf.run();
        expect(missingRefs).eql(wf.workflowSchema);
      });
  });

  describe('run method with audit fix for workflows with valid path and empty ctSchema', () => {
    const wf = new Workflows({
      log: () => {},
      moduleName: 'workflows',
      ctSchema: [],
      config: Object.assign(config, {
        basePath: resolve(`./test/unit/mock/contents/`),
        flags: {},
      }),
      fix: true,
    });

    fancy
      .stdout({ print: process.env.PRINT === 'true' || true })
      .stub(wf, 'fixWorkflowSchema', async () => {})
      .stub(wf, 'writeFixContent', async () => {})
      .stub(ux, 'confirm', async () => true)
      .it('the run function should run and flow should go till fixWorkflowSchema', async () => {
        await wf.run();
      });

    fancy
      .stdout({ print: process.env.PRINT === 'true' || true })
      .stub(wf, 'writeFixContent', () => {})
      .stub(ux, 'confirm', async () => true)
      .it('should expect fixWorkflow schema to run', async () => {
        const wfInstance = new (class Class extends Workflows {
          public newWorkflowSchema!: Record<string, Workflow>;
          constructor() {
            super({
              log: () => {},
              moduleName: 'workflows',
              ctSchema: [],
              config: Object.assign(config, {
                basePath: resolve(`./test/unit/mock/contents/`),
                flags: {},
              }),
              fix: true,
            });
            this.workflowPath = join(this.folderPath, this.fileName);
          }
          async writeFixContent(WorkflowSchema: Record<string, Workflow>) {
            this.newWorkflowSchema = WorkflowSchema;
          }
        })();
        await wfInstance.run();
        await wfInstance.fixWorkflowSchema();
        expect(wfInstance.newWorkflowSchema).eql({});
      });

    fancy
      .stdout({ print: process.env.PRINT === 'true' || true })
      .stub(wf, 'writeFileSync', () => {})
      .stub(ux, 'confirm', async () => true)
      .it('expect the format for the fixed Workflow schema that only contains the ct that is present', async () => {
        return await wf.writeFixContent({
          id: {
            name: 'wf3',
            uid: 'uid',
            org_uid: 'org1',
            api_key: 'apikey',
            content_types: ['ct2'],
            enabled: false,
            deleted_at: false,
          },
        });
      });
  });
});
