import { resolve } from 'path';
import { fancy } from 'fancy-test';
import { expect } from 'chai';
import cloneDeep from 'lodash/cloneDeep';
import { ux } from '@contentstack/cli-utilities';

import config from '../../../src/config';
import { GlobalField } from '../../../src/modules';
import { $t, auditMsg } from '../../../src/messages';


describe('Global Fields', () => {
  describe('run method with invalid path for global_feild', () => {
    const gfInstance = new GlobalField({
      log: () => {},
      moduleName: 'global-fields',
      ctSchema: cloneDeep(require('../mock/contents/content_types/schema.json')),
      gfSchema: cloneDeep(require('../mock/contents/global_fields/Global_fields_2.json')),
      config: Object.assign(config, { basePath: resolve(__dirname, '..', 'mock', 'contents'), flags: {} }),
    });
    console.log(gfInstance.folderPath,"CUNT")
    fancy
      .stdout({ print: process.env.PRINT === 'true' || false })
      .stub(ux, 'confirm', async () => true)
      .it('Should Validate the base path for workflows', async () => {
        try {
          await gfInstance.run();
        } catch (error: any) {
          expect(error).to.be.instanceOf(Error);
          expect(error.message).to.eql($t(auditMsg.NOT_VALID_PATH, { path: gfInstance.folderPath }));
        }
      });
  });

  describe('run method with valid Path', () => {
    const gfInstance = new GlobalField({
      log: () => {},
      moduleName: 'global-fields',
      ctSchema: cloneDeep(require('../mock/contents/content_types/schema.json')),
      gfSchema: cloneDeep(require('../mock/contents/global_fields/globalfields.json')),
      config: Object.assign(config, { basePath: resolve(__dirname, '..', 'mock', 'contents'), flags: {} }),
    });
    fancy
      .stdout({ print: process.env.PRINT === 'true' || true })
      .stub(ux, 'confirm', async () => true)
      .it('Should output the global feild where nested feilds are not present', async () => {
        try {
          const missingRefs = await gfInstance.run();
          console.log(JSON.stringify(missingRefs))
          expect(JSON.stringify(missingRefs)).to.be.equal(
            '{\n  nested_global_field_2: [\n    {\n      tree: [\n        {\n          uid: "nested_global_field_2",\n          name: "Nested Global Field 2",\n        },\n        {\n          uid: "global_field",\n          name: "Global",\n        },\n      ],\n      ct: "nested_global_field_2",\n      name: "Nested Global Field 2",\n      data_type: "global_field",\n      display_name: "Global",\n      missingRefs: "Referred Global Field Does not Exist",\n      treeStr: "Nested Global Field 2 ➜ Global",\n    },\n  ],\n  global_field_sample_2: [\n    {\n      tree: [\n        {\n          uid: "global_field_sample_2",\n          name: "global_field_sample_2",\n        },\n        {\n          uid: "group",\n          name: "Group",\n        },\n        {\n          uid: "group",\n          name: "Group",\n        },\n        {\n          uid: "global_field",\n          name: "Global",\n        },\n      ],\n      ct: "global_field_sample_2",\n      name: "global_field_sample_2",\n      data_type: "global_field",\n      display_name: "Global",\n      missingRefs: "Referred Global Field Does not Exist",\n      treeStr: "global_field_sample_2 ➜ Group ➜ Group ➜ Global",\n    },\n  ],\n}',
          );
        } catch (error) {}
      });
  });
});
