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
        'should expect missingRefs equal to workflow which has missing refs, missingCts equal to missing Cts',
        async () => {
          wf.config.branch = 'development';
          const missingRefs = await wf.run();
          expect(wf.workflowSchema).eql(values(JSON.parse(fs.readFileSync(wf.workflowPath, 'utf8'))));
          expect(missingRefs).eql([
            {
              name: 'wf1',
              uid: 'wf1',
              org_uid: 'org1',
              api_key: 'apiKey',
              content_types: ['ct45', 'ct14'],
              enabled: false,
              deleted_at: false,
            },
            {
              name: 'wf3',
              uid: 'wf3',
              org_uid: 'org1',
              api_key: 'apiKey',
              content_types: ['ct6'],
              enabled: false,
              deleted_at: false,
            },
            {
              api_key: 'apiKey',
              branches: ['main', 'stage'],
              content_types: [],
              deleted_at: false,
              enabled: false,
              name: 'wf5',
              org_uid: 'org1',
              uid: 'wf5',
            },
          ]);
          expect(wf.missingCts).eql(new Set(['ct45', 'ct14', 'ct6']));
        },
      );
  });

  describe('run method with audit fix for workflows with valid path and empty ctSchema', () => {
    const wf = new Workflows({
      log: () => {},
      moduleName: 'workflows',
      ctSchema: cloneDeep(require('./../mock/contents/workflows/ctSchema.json')),
      config: Object.assign(config, {
        basePath: resolve(`./test/unit/mock/contents/`),
        flags: {},
      }),
      fix: true,
    });

    fancy
      .stdout({ print: process.env.PRINT === 'true' || true })
      .stub(wf, 'log', async () => {})
      .stub(ux, 'confirm', async () => true)
      .stub(wf, 'WriteFileSync', () => {})
      .stub(wf, 'writeFixContent', () => {})
      .it('the run function should run and flow should go till fixWorkflowSchema', async () => {
        const fixedReference = await wf.run();
        expect(fixedReference).eql([
          {
            name: 'wf1',
            uid: 'wf1',
            org_uid: 'org1',
            api_key: 'apiKey',
            content_types: ['ct45', 'ct14'],
            enabled: false,
            deleted_at: false,
            fixStatus: 'Fixed',
          },
          {
            name: 'wf3',
            uid: 'wf3',
            org_uid: 'org1',
            api_key: 'apiKey',
            content_types: ['ct6'],
            enabled: false,
            deleted_at: false,
            fixStatus: 'Fixed',
          },
          {
            api_key: 'apiKey',
            branches: ['main', 'stage'],
            content_types: [],
            deleted_at: false,
            enabled: false,
            fixStatus: 'Fixed',
            name: 'wf5',
            org_uid: 'org1',
            uid: 'wf5',
          },
        ]);
      });
  });
});
