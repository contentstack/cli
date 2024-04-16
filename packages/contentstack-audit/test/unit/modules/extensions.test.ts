import { resolve } from 'path';
import { fancy } from 'fancy-test';
import { expect } from '@oclif/test';
import cloneDeep from 'lodash/cloneDeep';
import { ux } from '@contentstack/cli-utilities';

import config from '../../../src/config';
import { Extensions } from '../../../src/modules';
import { $t, auditMsg } from '../../../src/messages';
import sinon from 'sinon';
import { Extension } from '../../../src/types';

const fixedSchema = [
  {
    stackHeaders: {
      api_key: 'apiKey',
    },
    urlPath: '/extensions/ext1',
    uid: 'ext1',
    created_at: '2024-02-22T09:45:48.681Z',
    updated_at: '2024-02-22T09:45:48.681Z',
    created_by: 'u1',
    updated_by: 'u1',
    tags: [],
    _version: 1,
    title: 'Progress Bar',
    config: {},
    type: 'field',
    data_type: 'number',
    "fixStatus": "Fixed",
    content_types: ['ct6'],
    multiple: false,
    scope: {
      content_types: ['ct6'],
    }
  },
  {
    stackHeaders: {
      api_key: 'apiKey',
    },
    urlPath: '/extensions/ext2',
    uid: 'ext2',
    created_at: '2024-02-22T09:45:11.284Z',
    updated_at: '2024-02-22T09:45:11.284Z',
    created_by: 'u1',
    updated_by: 'u1',
    tags: [],
    _version: 1,
    title: 'Color Picker',
    config: {},
    type: 'field',
    data_type: 'text',
    "fixStatus": "Fixed",
    multiple: false,
    content_types: ['ct8'],
    scope: {
      content_types: ['ct8'],
    }
  },
  {
    stackHeaders: {
      api_key: 'apiKey',
    },
    urlPath: '/extensions/ext5',
    uid: 'ext5',
    created_at: '2024-02-22T09:44:27.030Z',
    updated_at: '2024-02-22T09:44:27.030Z',
    created_by: 'u1',
    "fixStatus": "Fixed",
    updated_by: 'u1',
    tags: [],
    _version: 1,
    title: 'Text Intelligence',
    config: {
      token: 'your_token_here',
    },
    content_types: ['ct6'],
    type: 'widget',
    scope: {
      content_types: ["ct4", "ct3", "ct2", "ct1",'ct6'],
    },
  },
]
describe('Extensions scope containing content_types uids', () => {
  describe('run method with invalid path for extensions', () => {
    const ext = new Extensions({
      log: () => {},
      moduleName: 'extensions',
      ctSchema: cloneDeep(require('./../mock/contents/extensions/ctSchema.json')),
      config: Object.assign(config, { basePath: resolve(__dirname, '..', 'mock', 'workflows'), flags: {} }),
    });
    fancy
      .stdout({ print: process.env.PRINT === 'true' || false })
      .stub(ux, 'confirm', async () => true)
      .it('Should Validate the base path for workflows', async () => {
        try {
          await ext.run();
        } catch (error: any) {
          expect(error).to.be.instanceOf(Error);
          expect(error.message).to.eql($t(auditMsg.NOT_VALID_PATH, { path: ext.folderPath }));
        }
      });
  });
  describe('run method with valid path for extensions containing extensions with missing content types', () => {
    const ext = new Extensions({
      log: () => {},
      moduleName: 'extensions',
      ctSchema: cloneDeep(require('./../mock/contents/extensions/ctSchema.json')),
      config: Object.assign(config, {
        basePath: resolve(`./test/unit/mock/contents/extensions/invalidExtensions/`),
        flags: {},
      }),
    });
    fancy
      .stdout({ print: process.env.PRINT === 'true' || true })
      .stub(ux, 'confirm', async () => true)
      .it(
        'should expect missing Cts to the ones that are not present in the schema, and MissingCts in extension equal to the extensions which has Cts that are not present',
        async () => {
          await ext.run();
          expect(ext.missingCtInExtensions).eql([
            {
              stackHeaders: {
                api_key: 'apiKey',
              },
              urlPath: '/extensions/ext1',
              uid: 'ext1',
              created_at: '2024-02-22T09:45:48.681Z',
              updated_at: '2024-02-22T09:45:48.681Z',
              created_by: 'u1',
              updated_by: 'u1',
              tags: [],
              _version: 1,
              title: 'Progress Bar',
              config: {},
              type: 'field',
              data_type: 'number',
              content_types: ['ct6'],
              multiple: false,
              scope: {
                content_types: ['ct6'],
              },
            },
            {
              stackHeaders: {
                api_key: 'apiKey',
              },
              urlPath: '/extensions/ext2',
              uid: 'ext2',
              created_at: '2024-02-22T09:45:11.284Z',
              updated_at: '2024-02-22T09:45:11.284Z',
              created_by: 'u1',
              updated_by: 'u1',
              tags: [],
              _version: 1,
              title: 'Color Picker',
              config: {},
              type: 'field',
              data_type: 'text',
              multiple: false,
              content_types: ['ct8'],
              scope: {
                content_types: ['ct8'],
              },
            },
            {
              stackHeaders: {
                api_key: 'apiKey',
              },
              urlPath: '/extensions/ext5',
              uid: 'ext5',
              created_at: '2024-02-22T09:44:27.030Z',
              updated_at: '2024-02-22T09:44:27.030Z',
              created_by: 'u1',
              updated_by: 'u1',
              tags: [],
              _version: 1,
              title: 'Text Intelligence',
              config: {
                token: 'your_token_here',
              },
              content_types: ['ct6'],
              type: 'widget',
              scope: {
                content_types: ["ct4", "ct3", "ct2", "ct1", "ct6"],
              },
            },
          ]);
          expect(ext.missingCts).eql(new Set(['ct6', 'ct8']));
        },
      );
  });
  describe('run method with valid path for extensions containing extensions with no missing content types and ct set to $all', () => {
    const ext = new Extensions({
      log: () => {},
      moduleName: 'extensions',
      ctSchema: cloneDeep(require('./../mock/contents/extensions/ctSchema.json')),
      config: Object.assign(config, {
        basePath: resolve(`./test/unit/mock/contents/extensions/allCts/`),
        flags: {},
      }),
    });
    fancy
      .stdout({ print: process.env.PRINT === 'true' || true })
      .stub(ux, 'confirm', async () => true)
      .it(
        'should expect missingRefs equal to empty array, expect entire workflow schema and empty missingCts',
        async () => {
          expect(ext.missingCtInExtensions).eql([]);
          expect(ext.missingCts).eql(new Set([]));
        },
      );
  });
  describe('run method with valid path for extensions containing extensions with no missing content types and ct set content types that are present', () => {
    const ext = new Extensions({
      log: () => {},
      moduleName: 'extensions',
      ctSchema: cloneDeep(require('./../mock/contents/extensions/ctSchema.json')),
      config: Object.assign(config, {
        basePath: resolve(`./test/unit/mock/contents/extensions/validExtensions/`),
        flags: {},
      }),
    });
    fancy
      .stdout({ print: process.env.PRINT === 'true' || true })
      .stub(ux, 'confirm', async () => true)
      .it(
        'should expect missingRefs equal to empty array, expect entire workflow schema and empty missingCts',
        async () => {
          await ext.run();
          expect(ext.missingCtInExtensions).eql([]);
          expect(ext.missingCts).eql(new Set([]));
        },
      );
  });
  describe('fixSchema method with valid path for extensions containing extensions with missing content types', () => {
    const ext = new (class Class extends Extensions {
      public fixedExtensions!: Record<string, Extension>;
      constructor() {
        super({
          log: () => {},
          moduleName: 'extensions',
          ctSchema: cloneDeep(require('./../mock/contents/extensions/ctSchema.json')),
          config: Object.assign(config, {
            basePath: resolve(`./test/unit/mock/contents/extensions/invalidExtensions/`),
            flags: {},
          }),
          fix: true,
        });
      }
      async writeFixContent(fixedExtensions: Record<string, Extension>) {
        this.fixedExtensions = fixedExtensions;
      }
    })();

    fancy
      .stdout({ print: process.env.PRINT === 'true' || true })
      .stub(ux, 'confirm', async () => true)
      .stub(ext, 'writeFileSync', () => {})
      .it(
        'missingCts in extension to extensionSchema containing, extensions with fixed scope, missing Cts to the Cts that are not present in Ct Schema, And the fixed extensions that would be overwritten in the file',
        async () => {
          const missingRefs = await ext.run();
          expect(ext.missingCtInExtensions).eql(fixedSchema);
          expect(missingRefs).eql(fixedSchema);
          expect(ext.missingCts).eql(new Set(['ct6', 'ct8']));
          expect(ext.fixedExtensions).eql({
            "ext5": {
              "stackHeaders": {
                "api_key": "apiKey"
              },
              "urlPath": "/extensions/ext5",
              "uid": "ext5",
              "created_at": "2024-02-22T09:44:27.030Z",
              "updated_at": "2024-02-22T09:44:27.030Z",
              "created_by": "u1",
              "updated_by": "u1",
              "tags": [],
              "_version": 1,
              "title": "Text Intelligence",
              "config": {
                "token": "your_token_here"
              },
              "type": "widget",
              "scope": {
                "content_types": ["ct4", "ct3", "ct2", "ct1"]
              }
            },
            "ext6": {
              "stackHeaders": {
                "api_key": "apiKey"
              },
              "urlPath": "/extensions/ext6",
              "uid": "ext6",
              "created_at": "2024-02-22T09:44:01.784Z",
              "updated_at": "2024-02-22T09:44:01.784Z",
              "created_by": "u1",
              "updated_by": "u1",
              "tags": [],
              "_version": 1,
              "title": "Ace Editor",
              "config": {},
              "type": "field",
              "data_type": "reference",
              "multiple": true
            },
            "ext7": {
              "stackHeaders": {
                "api_key": "apiKey"
              },
              "urlPath": "/extensions/ext7",
              "uid": "ext7",
              "created_at": "2024-02-22T09:43:35.589Z",
              "updated_at": "2024-02-22T09:43:35.589Z",
              "created_by": "u1",
              "updated_by": "u1",
              "tags": [],
              "_version": 1,
              "title": "Gatsby Preview",
              "config": {
                "siteUrl": "your_site_url"
              },
              "type": "widget",
              "scope": {
                "content_types": ["ct3", "ct5"]
              }
            }
          }
          );
        },
      );
  });
  describe('fixSchema method with valid path for extensions containing extensions with missing content types checking the fixed content', () => {
    const ext = new Extensions({
      log: () => {},
      moduleName: 'extensions',
      ctSchema: cloneDeep(require('./../mock/contents/extensions/ctSchema.json')),
      config: Object.assign(config, {
        basePath: resolve(`./test/unit/mock/contents/extensions/invalidExtensions/`),
        flags: {},
      }),
      fix: true,
    });
    fancy
      .stdout({ print: process.env.PRINT === 'true' || true })
      .stub(ux, 'confirm', async () => true)
      .stub(ext, 'writeFixContent', async () => {})
      .stub(ext, 'writeFileSync', () => {})
      .it(
        'missingCts in extension to extensionSchema containing, extensions with fixed scope, missing Cts to the Cts that are not present in Ct Schema, Not overwriting to the file',
        async () => {
          const missingRefs = await ext.run();
          expect(ext.missingCtInExtensions).eql(fixedSchema);
          expect(missingRefs).eql(fixedSchema);
          expect(ext.missingCts).eql(new Set(['ct6', 'ct8']));
        },
      );
  });
  describe('fixSchema method with valid path for extensions containing extensions with no missing content types and ct set to $all', () => {
    const ext = new Extensions({
      log: () => {},
      moduleName: 'extensions',
      ctSchema: cloneDeep(require('./../mock/contents/extensions/ctSchema.json')),
      config: Object.assign(config, {
        basePath: resolve(`./test/unit/mock/contents/extensions/allCts/`),
        flags: {},
      }),
      fix: true,
    });
    fancy
      .stdout({ print: process.env.PRINT === 'true' || true })
      .stub(ux, 'confirm', async () => true)
      .stub(ext, 'writeFileSync', () => {})
      .it(
        'should expect missingRefs equal to empty array, expect entire workflow schema and empty missingCts',
        async () => {
          expect(ext.missingCtInExtensions).eql([]);
          expect(ext.missingCts).eql(new Set([]));
          const fixExt = sinon.spy(ext, 'fixExtensionsScope');
          expect(fixExt.callCount).to.be.equals(0);
        },
      );
  });
});
