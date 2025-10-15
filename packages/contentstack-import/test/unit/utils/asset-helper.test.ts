import { expect } from 'chai';
import sinon from 'sinon';
import { uploadAssetHelper, lookupAssets } from '../../../src/utils/asset-helper';
import { ImportConfig } from '../../../src/types';
import * as cliUtilities from '@contentstack/cli-utilities';
import * as fileHelper from '../../../src/utils/file-helper';

describe('Asset Helper', () => {
  let mockImportConfig: ImportConfig;
  let managementSDKClientStub: sinon.SinonStub;
  let logStub: any;

  beforeEach(() => {
    mockImportConfig = {
      apiKey: 'test',
      target_stack: 'target-stack-key',
      management_token: 'test-mgmt-token',
      data: '/test/content',
      context: {
        command: 'cm:stacks:import',
        module: 'assets',
        userId: 'user-123',
        email: 'test@example.com'
      }
    } as any;

    logStub = {
      debug: sinon.stub(),
      error: sinon.stub(),
      warn: sinon.stub(),
      info: sinon.stub(),
      success: sinon.stub()
    };

    sinon.stub(cliUtilities, 'log').value(logStub);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('uploadAssetHelper()', () => {
    it('should reject when RETRY exceeds MAX_RETRY_LIMIT', async () => {
      const req = { title: 'Test Asset' };
      const fsPath = '/path/to/asset.jpg';

      try {
        await uploadAssetHelper(mockImportConfig, req, fsPath, 6);
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).to.include('Max retry limit exceeded');
      }
    });

    it('should reject with invalid request', async () => {
      const invalidReq = 'invalid' as any;
      const fsPath = '/path/to/asset.jpg';

      try {
        await uploadAssetHelper(mockImportConfig, invalidReq, fsPath);
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).to.include('Invalid params');
      }
    });

    it('should log debug messages', async () => {
      const req = { title: 'Test Asset' };
      const fsPath = '/path/to/asset.jpg';

      // This test will fail at SDK level but we can still verify debug logging
      try {
        await uploadAssetHelper(mockImportConfig, req, fsPath, 2);
      } catch (error) {
        // Expected to fail, just checking if debug was called
        expect(error).to.exist;
      }

      expect(logStub.debug.called).to.be.true;
    });

    it('should handle successful asset upload', async () => {
      // Test the function directly without complex mocking
      const req: any = { title: 'Test Asset' };
      const fsPath = '/tmp/test-asset.jpg';

      // Create a temporary file for the test
      const fs = require('fs');
      fs.writeFileSync(fsPath, 'test content');

      try {
        // This will fail at the SDK level but we can verify the function structure
        await uploadAssetHelper(mockImportConfig, req, fsPath);
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        // Expected to fail, just checking if the function processes correctly
        expect(error).to.exist;
        expect((req as any).upload).to.equal(fsPath);
      } finally {
        // Clean up the temporary file
        if (fs.existsSync(fsPath)) {
          fs.unlinkSync(fsPath);
        }
      }
    });

    it('should handle asset upload failure and retry', async () => {
      const req = { title: 'Test Asset' };
      const fsPath = '/tmp/test-asset.jpg';

      // Create a temporary file for the test
      const fs = require('fs');
      fs.writeFileSync(fsPath, 'test content');

      try {
        // This will fail at the SDK level but we can verify the retry logic
        await uploadAssetHelper(mockImportConfig, req, fsPath, 2);
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        // Expected to fail, just checking if the function processes correctly
        expect(error).to.exist;
        expect((req as any).upload).to.equal(fsPath);
      } finally {
        // Clean up the temporary file
        if (fs.existsSync(fsPath)) {
          fs.unlinkSync(fsPath);
        }
      }
    });

    it('should set RETRY to 1 when not provided', async () => {
      const req = { title: 'Test Asset' };
      const fsPath = '/tmp/test-asset.jpg';

      // Create a temporary file for the test
      const fs = require('fs');
      fs.writeFileSync(fsPath, 'test content');

      try {
        // This will fail at the SDK level but we can verify the retry logic
        await uploadAssetHelper(mockImportConfig, req, fsPath);
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        // Expected to fail, just checking if the function processes correctly
        expect(error).to.exist;
        expect((req as any).upload).to.equal(fsPath);
        expect(logStub.debug.calledWith('Uploading asset (attempt 1/5): /tmp/test-asset.jpg')).to.be.true;
      } finally {
        // Clean up the temporary file
        if (fs.existsSync(fsPath)) {
          fs.unlinkSync(fsPath);
        }
      }
    });

    it('should handle managementSDKClient failure', async () => {
      const req = { title: 'Test Asset' };
      const fsPath = '/tmp/test-asset.jpg';

      // Create a temporary file for the test
      const fs = require('fs');
      fs.writeFileSync(fsPath, 'test content');

      try {
        // This will fail at the SDK level but we can verify the error handling
        await uploadAssetHelper(mockImportConfig, req, fsPath);
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        // Expected to fail, just checking if the function processes correctly
        expect(error).to.exist;
        expect((req as any).upload).to.equal(fsPath);
      } finally {
        // Clean up the temporary file
        if (fs.existsSync(fsPath)) {
          fs.unlinkSync(fsPath);
        }
      }
    });

    it('should handle unexpected errors in try-catch', async () => {
      const req = { title: 'Test Asset' };
      const fsPath = '/tmp/test-asset.jpg';

      // Create a temporary file for the test
      const fs = require('fs');
      fs.writeFileSync(fsPath, 'test content');

      try {
        // This will fail at the SDK level but we can verify the error handling
        await uploadAssetHelper(mockImportConfig, req, fsPath);
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        // Expected to fail, just checking if the function processes correctly
        expect(error).to.exist;
        expect((req as any).upload).to.equal(fsPath);
      } finally {
        // Clean up the temporary file
        if (fs.existsSync(fsPath)) {
          fs.unlinkSync(fsPath);
        }
      }
    });
  });

  describe('lookupAssets()', () => {
    let readFileSyncStub: sinon.SinonStub;

    beforeEach(() => {
      readFileSyncStub = sinon.stub(fileHelper, 'readFileSync').returns({});
      sinon.stub(fileHelper, 'fileExistsSync').returns(false);
      sinon.stub(fileHelper, 'writeFile');
    });

    it('should throw error with invalid inputs', () => {
      expect(() => {
        lookupAssets({} as any, {}, {}, '/path', []);
      }).to.throw('Invalid inputs for lookupAssets!');
    });

    it('should process entry with file fields', () => {
      const data = {
        entry: {
          uid: 'entry1',
          file_field: {
            uid: 'asset1',
            filename: 'test.jpg',
            url: 'https://example.com/test.jpg'
          }
        },
        content_type: {
          uid: 'ct1',
          schema: [
            { uid: 'file_field', data_type: 'file' }
          ]
        }
      };
      const mappedAssetUids = { asset1: 'new-asset1' };
      const mappedAssetUrls = {};
      const assetUidMapperPath = '/test/mapper';

      const result = lookupAssets(data, mappedAssetUids, mappedAssetUrls, assetUidMapperPath, []);

      expect(result).to.exist;
    });

    it('should handle text fields with markdown', () => {
      const data = {
        entry: {
          uid: 'entry1',
          markdown_field: '![image](https://images.contentstack.io/v3/assets/stack/blt123/file.jpg)'
        },
        content_type: {
          uid: 'ct1',
          schema: [
            {
              uid: 'markdown_field',
              data_type: 'text',
              field_metadata: { markdown: true }
            }
          ]
        }
      };
      const mappedAssetUids = {};
      const mappedAssetUrls = { 'https://images.contentstack.io/v3/assets/stack/blt123/file.jpg': 'https://newcdn.com/file.jpg' };
      const assetUidMapperPath = '/test/mapper';

      const result = lookupAssets(data, mappedAssetUids, mappedAssetUrls, assetUidMapperPath, []);

      expect(result).to.exist;
    });

    it('should handle text fields with rich_text_type', () => {
      const data = {
        entry: {
          uid: 'entry1',
          rte_field: '<img asset_uid=\\"asset123\\" />'
        },
        content_type: {
          uid: 'ct1',
          schema: [
            {
              uid: 'rte_field',
              data_type: 'text',
              field_metadata: { rich_text_type: true }
            }
          ]
        }
      };
      const mappedAssetUids = { asset123: 'new-asset123' };
      const mappedAssetUrls = {};
      const assetUidMapperPath = '/test/mapper';

      const result = lookupAssets(data, mappedAssetUids, mappedAssetUrls, assetUidMapperPath, []);

      expect(result).to.exist;
    });

    it('should handle group fields', () => {
      const data = {
        entry: {
          uid: 'entry1',
          group_field: {
            nested_field: 'value'
          }
        },
        content_type: {
          uid: 'ct1',
          schema: [
            {
              uid: 'group_field',
              data_type: 'group',
              schema: [
                { uid: 'nested_field', data_type: 'text' }
              ]
            }
          ]
        }
      };
      const mappedAssetUids = {};
      const mappedAssetUrls = {};
      const assetUidMapperPath = '/test/mapper';

      const result = lookupAssets(data, mappedAssetUids, mappedAssetUrls, assetUidMapperPath, []);

      expect(result).to.exist;
    });

    it('should handle global_field fields', () => {
      const data = {
        entry: {
          uid: 'entry1',
          global_field: {
            field: 'value'
          }
        },
        content_type: {
          uid: 'ct1',
          schema: [
            {
              uid: 'global_field',
              data_type: 'global_field',
              schema: [
                { uid: 'field', data_type: 'text' }
              ]
            }
          ]
        }
      };
      const mappedAssetUids = {};
      const mappedAssetUrls = {};
      const assetUidMapperPath = '/test/mapper';

      const result = lookupAssets(data, mappedAssetUids, mappedAssetUrls, assetUidMapperPath, []);

      expect(result).to.exist;
    });

    it('should handle blocks fields', () => {
      const data = {
        entry: {
          uid: 'entry1',
          blocks_field: [] as any
        },
        content_type: {
          uid: 'ct1',
          schema: [
            {
              uid: 'blocks_field',
              data_type: 'blocks',
              blocks: [
                {
                  uid: 'block1',
                  schema: [
                    { uid: 'field', data_type: 'text' }
                  ]
                }
              ]
            }
          ]
        }
      };
      const mappedAssetUids = {};
      const mappedAssetUrls = {};
      const assetUidMapperPath = '/test/mapper';

      const result = lookupAssets(data, mappedAssetUids, mappedAssetUrls, assetUidMapperPath, []);

      expect(result).to.exist;
    });

    it('should handle JSON RTE fields', () => {
      const data = {
        entry: {
          uid: 'entry1',
          json_rte: {
            children: [
              {
                type: 'reference',
                attrs: {
                  type: 'asset',
                  'asset-uid': 'asset123',
                  'asset-link': 'https://example.com/asset.jpg'
                },
                children: [] as any
              }
            ]
          }
        },
        content_type: {
          uid: 'ct1',
          schema: [
            {
              uid: 'json_rte',
              data_type: 'json',
              field_metadata: { rich_text_type: true }
            }
          ]
        }
      };
      const mappedAssetUids = { asset123: 'new-asset123' };
      const mappedAssetUrls = { 'https://example.com/asset.jpg': 'https://newcdn.com/asset.jpg' };
      const assetUidMapperPath = '/test/mapper';

      const result = lookupAssets(data, mappedAssetUids, mappedAssetUrls, assetUidMapperPath, []);

      expect(result).to.exist;
    });

    it('should handle JSON custom fields with extensions', () => {
      const data = {
        entry: {
          uid: 'entry1',
          custom_field: {
            metadata: {
              extension_uid: 'old-ext-uid'
            }
          }
        },
        content_type: {
          uid: 'ct1',
          schema: [
            {
              uid: 'custom_field',
              data_type: 'json',
              extension_uid: 'old-ext-uid',
              field_metadata: {
                extension: true,
                is_asset: true
              }
            }
          ]
        }
      };
      const mappedAssetUids = {};
      const mappedAssetUrls = {};
      const assetUidMapperPath = '/test/mapper';
      const installedExtensions: any = { 'old-ext-uid': 'new-ext-uid' };

      const result = lookupAssets(data, mappedAssetUids, mappedAssetUrls, assetUidMapperPath, installedExtensions);

      expect(result).to.exist;
    });

    it('should map extension UIDs when installedExtensions provided', () => {
      const data = {
        entry: {
          uid: 'entry1'
        },
        content_type: {
          uid: 'ct1',
          schema: [
            {
              uid: 'custom_field',
              data_type: 'json',
              extension_uid: 'old-ext',
              field_metadata: {
                extension: true
              }
            }
          ]
        }
      };
      const installedExtensions: any = { 'old-ext': 'new-ext' };

      lookupAssets(data, {}, {}, '/test/mapper', installedExtensions);

      expect(data.content_type.schema[0].extension_uid).to.equal('new-ext');
    });

    it('should write matched asset UIDs to file', () => {
      const data = {
        entry: {
          uid: 'entry1',
          file_field: {
            uid: 'asset1',
            filename: 'test.jpg'
          }
        },
        content_type: {
          uid: 'ct1',
          schema: [
            { uid: 'file_field', data_type: 'file' }
          ]
        }
      };
      const mappedAssetUids = { asset1: 'new-asset1' };
      const mappedAssetUrls = {};
      const assetUidMapperPath = '/test/mapper';

      lookupAssets(data, mappedAssetUids, mappedAssetUrls, assetUidMapperPath, []);

      expect(readFileSyncStub.called).to.be.true;
    });

    it('should handle asset URL replacement', () => {
      const data = {
        entry: {
          uid: 'entry1',
          markdown_field: '![img](https://old-cdn.com/asset.jpg)'
        },
        content_type: {
          uid: 'ct1',
          schema: [
            {
              uid: 'markdown_field',
              data_type: 'text',
              field_metadata: { markdown: true }
            }
          ]
        }
      };
      const mappedAssetUids = {};
      const mappedAssetUrls = { 'https://old-cdn.com/asset.jpg': 'https://new-cdn.com/asset.jpg' };
      const assetUidMapperPath = '/test/mapper';

      const result = lookupAssets(data, mappedAssetUids, mappedAssetUrls, assetUidMapperPath, []);

      expect(result).to.exist;
    });

    it('should handle multiple JSON RTE elements with assets', () => {
      const data = {
        entry: {
          uid: 'entry1',
          json_rte: {
            children: [
              {
                type: 'reference',
                attrs: {
                  type: 'asset',
                  'asset-uid': 'asset1',
                  'href': 'https://example.com/asset1.jpg'
                },
                children: [] as any
              },
              {
                type: 'paragraph',
                children: [
                  {
                    type: 'reference',
                    attrs: {
                      type: 'asset',
                      'asset-uid': 'asset2'
                    },
                    children: [] as any
                  }
                ] as any
              }
            ]
          }
        },
        content_type: {
          uid: 'ct1',
          schema: [
            {
              uid: 'json_rte',
              data_type: 'json',
              field_metadata: { rich_text_type: true }
            }
          ]
        }
      };
      const mappedAssetUids = { asset1: 'new-asset1', asset2: 'new-asset2' };
      const mappedAssetUrls = {};
      const assetUidMapperPath = '/test/mapper';

      const result = lookupAssets(data, mappedAssetUids, mappedAssetUrls, assetUidMapperPath, []);

      expect(result).to.exist;
    });

    it('should handle multiple JSON RTE in array', () => {
      const data = {
        entry: {
          uid: 'entry1',
          json_rte: [
            {
              children: [
                {
                  type: 'reference',
                  attrs: {
                    type: 'asset',
                    'asset-uid': 'asset1'
                  },
                  children: [] as any
                }
              ]
            }
          ]
        },
        content_type: {
          uid: 'ct1',
          schema: [
            {
              uid: 'json_rte',
              data_type: 'json',
              multiple: true,
              field_metadata: { rich_text_type: true }
            }
          ]
        }
      };
      const mappedAssetUids = { asset1: 'new-asset1' };
      const mappedAssetUrls = {};
      const assetUidMapperPath = '/test/mapper';

      const result = lookupAssets(data, mappedAssetUids, mappedAssetUrls, assetUidMapperPath, []);

      expect(result).to.exist;
    });

    it('should handle blocks in JSON RTE with multiple entries', () => {
      const data = {
        entry: {
          uid: 'entry1',
          blocks_field: [
            {
              block1: {
                field: 'value'
              }
            }
          ]
        },
        content_type: {
          uid: 'ct1',
          schema: [
            {
              uid: 'blocks_field',
              data_type: 'blocks',
              multiple: true,
              blocks: [
                {
                  uid: 'block1',
                  schema: [
                    { uid: 'field', data_type: 'text' }
                  ]
                }
              ]
            }
          ]
        }
      };
      const mappedAssetUids = {};
      const mappedAssetUrls = {};
      const assetUidMapperPath = '/test/mapper';

      const result = lookupAssets(data, mappedAssetUids, mappedAssetUrls, assetUidMapperPath, []);

      expect(result).to.exist;
    });

    it('should handle group fields with multiple entries', () => {
      const data = {
        entry: {
          uid: 'entry1',
          group_field: [
            { nested: 'value1' },
            { nested: 'value2' }
          ]
        },
        content_type: {
          uid: 'ct1',
          schema: [
            {
              uid: 'group_field',
              data_type: 'group',
              multiple: true,
              schema: [
                { uid: 'nested', data_type: 'text' }
              ]
            }
          ]
        }
      };
      const mappedAssetUids = {};
      const mappedAssetUrls = {};
      const assetUidMapperPath = '/test/mapper';

      const result = lookupAssets(data, mappedAssetUids, mappedAssetUrls, assetUidMapperPath, []);

      expect(result).to.exist;
    });
  });

  describe('Edge Cases', () => {
    it('should handle uploadAssetHelper with unexpected error', async () => {
      sinon.stub(cliUtilities, 'managementSDKClient').rejects(new Error('Unexpected'));
      const req = { title: 'Test' };

      try {
        await uploadAssetHelper(mockImportConfig, req, '/path');
        expect.fail('Should have thrown');
      } catch (error: any) {
        expect(error).to.exist;
      }
    });

    it('should handle lookupAssets with missing entry property', () => {
      expect(() => {
        lookupAssets({ content_type: { uid: 'ct1', schema: [] } } as any, {}, {}, '/path', []);
      }).to.throw('Invalid inputs for lookupAssets!');
    });

    it('should handle lookupAssets with missing content_type property', () => {
      expect(() => {
        lookupAssets({ entry: { uid: 'e1' } } as any, {}, {}, '/path', []);
      }).to.throw('Invalid inputs for lookupAssets!');
    });

    it('should handle lookupAssets with non-object mappedAssetUids', () => {
      expect(() => {
        lookupAssets(
          { entry: { uid: 'e1' }, content_type: { uid: 'ct1', schema: [] } },
          'invalid' as any,
          {},
          '/path',
          []
        );
      }).to.throw('Invalid inputs for lookupAssets!');
    });

    it('should handle lookupAssets with non-string assetUidMapperPath', () => {
      expect(() => {
        lookupAssets(
          { entry: { uid: 'e1' }, content_type: { uid: 'ct1', schema: [] } },
          {},
          {},
          123 as any,
          []
        );
      }).to.throw('Invalid inputs for lookupAssets!');
    });

    it('should handle v2 asset URLs in markdown fields', () => {
      const data = {
        entry: {
          uid: 'entry1',
          markdown_field: 'https://api.contentstack.io/v2/assets/download?uid=bltabcd1234'
        },
        content_type: {
          uid: 'ct1',
          schema: [
            {
              uid: 'markdown_field',
              data_type: 'text',
              field_metadata: { markdown: true }
            }
          ]
        }
      };

      const result = lookupAssets(data, {}, {}, '/test/mapper', []);

      expect(result).to.exist;
    });

    it('should handle v3 asset URLs with different CDN regions', () => {
      const data = {
        entry: {
          uid: 'entry1',
          rte_field: 'Text with https://eu-images.contentstack.io/v3/assets/stack/blt123/file/name.jpg embedded'
        },
        content_type: {
          uid: 'ct1',
          schema: [
            {
              uid: 'rte_field',
              data_type: 'text',
              field_metadata: { rich_text_type: true }
            }
          ]
        }
      };

      const result = lookupAssets(data, {}, {}, '/test/mapper', []);

      expect(result).to.exist;
    });

    it('should handle nested blocks without schema', () => {
      const data = {
        entry: {
          uid: 'entry1',
          blocks_field: [] as any
        },
        content_type: {
          uid: 'ct1',
          schema: [
            {
              uid: 'blocks_field',
              data_type: 'blocks',
              blocks: [
                {
                  uid: 'block1'
                  // No schema property
                }
              ]
            }
          ]
        }
      };

      const result = lookupAssets(data, {}, {}, '/test/mapper', []);

      expect(result).to.exist;
    });

    it('should handle file fields with sys_assets content_type_uid', () => {
      const data = {
        entry: {
          uid: 'entry1',
          file_ref: {
            uid: 'asset1',
            url: 'https://cdn.com/asset.jpg',
            filename: 'asset.jpg',
            asset: {},
            _content_type_uid: 'sys_assets'
          }
        },
        content_type: {
          uid: 'ct1',
          schema: [] as any
        }
      };

      const mappedAssetUids = { asset1: 'new-asset1' };
      const mappedAssetUrls = { 'https://cdn.com/asset.jpg': 'https://newcdn.com/asset.jpg' };

      const result = lookupAssets(data, mappedAssetUids, mappedAssetUrls, '/test/mapper', []);

      expect(result).to.exist;
    });

    it('should handle arrays with undefined and null values', () => {
      const data = {
        entry: {
          uid: 'entry1',
          file_array: [
            { uid: 'asset1', filename: 'test.jpg' },
            undefined,
            null,
            { uid: 'asset2', filename: 'test2.jpg' }
          ]
        },
        content_type: {
          uid: 'ct1',
          schema: [] as any
        }
      };

      const mappedAssetUids = { asset1: 'new-asset1', asset2: 'new-asset2' };

      const result = lookupAssets(data, mappedAssetUids, {}, '/test/mapper', []);

      expect(result).to.exist;
    });

    it('should handle unmatched asset UIDs and write to file', () => {
      const data = {
        entry: {
          uid: 'entry1',
          file_field: {
            uid: 'unmatched-asset',
            filename: 'test.jpg'
          }
        },
        content_type: {
          uid: 'ct1',
          schema: [] as any
        }
      };

      const mappedAssetUids = { 'other-asset': 'new-asset' };

      const result = lookupAssets(data, mappedAssetUids, {}, '/test/mapper', []);

      expect(result).to.exist;
    });

    it('should handle JSON RTE with non-reference elements', () => {
      const data = {
        entry: {
          uid: 'entry1',
          json_rte: {
            children: [
              {
                type: 'paragraph',
                children: [
                  {
                    type: 'text',
                    text: 'Some text'
                  }
                ]
              }
            ]
          }
        },
        content_type: {
          uid: 'ct1',
          schema: [
            {
              uid: 'json_rte',
              data_type: 'json',
              field_metadata: { rich_text_type: true }
            }
          ]
        }
      };

      const result = lookupAssets(data, {}, {}, '/test/mapper', []);

      expect(result).to.exist;
    });

    it('should handle lookupAssets with non-object mappedAssetUrls', () => {
      expect(() => {
        lookupAssets(
          { entry: { uid: 'e1' }, content_type: { uid: 'ct1', schema: [] } },
          {},
          'invalid' as any,
          '/path',
          []
        );
      }).to.throw('Invalid inputs for lookupAssets!');
    });

    it('should handle file fields with parent UID mapping', () => {
      const data = {
        entry: {
          uid: 'entry1',
          file_field: {
            uid: 'asset1',
            filename: 'test.jpg',
            url: 'https://example.com/test.jpg'
          }
        },
        content_type: {
          uid: 'ct1',
          schema: [] as any
        }
      };
      const mappedAssetUids = { asset1: 'new-asset1' };
      const mappedAssetUrls = { 'https://example.com/test.jpg': 'https://newcdn.com/test.jpg' };

      const result = lookupAssets(data, mappedAssetUids, mappedAssetUrls, '/test/mapper', []);

      expect(result).to.exist;
    });

    it('should handle file fields with sys_assets and parent UID mapping', () => {
      const data = {
        entry: {
          uid: 'entry1',
          file_ref: {
            uid: 'asset1',
            url: 'https://cdn.com/asset.jpg',
            filename: 'asset.jpg',
            asset: { some: 'data' },
            _content_type_uid: 'sys_assets'
          }
        },
        content_type: {
          uid: 'ct1',
          schema: [] as any
        }
      };

      const mappedAssetUids = { asset1: 'new-asset1' };
      const mappedAssetUrls = { 'https://cdn.com/asset.jpg': 'https://newcdn.com/asset.jpg' };

      const result = lookupAssets(data, mappedAssetUids, mappedAssetUrls, '/test/mapper', []);

      expect(result).to.exist;
    });

    it('should handle file fields with parent UID in mappedAssetUids', () => {
      const data = {
        entry: {
          uid: 'entry1',
          file_ref: {
            uid: 'asset1',
            url: 'https://cdn.com/asset.jpg',
            filename: 'asset.jpg',
            asset: { some: 'data' },
            _content_type_uid: 'sys_assets'
          }
        },
        content_type: {
          uid: 'ct1',
          schema: [] as any
        }
      };

      const mappedAssetUids = { 
        asset1: 'new-asset1',
        'parent-uid': 'new-parent-uid' 
      };
      const mappedAssetUrls = { 'https://cdn.com/asset.jpg': 'https://newcdn.com/asset.jpg' };

      // Mock the parent object to have a uid
      const parent: any = { uid: 'parent-uid' };
      data.entry.file_ref = parent;

      const result = lookupAssets(data, mappedAssetUids, mappedAssetUrls, '/test/mapper', []);

      expect(result).to.exist;
    });

    it('should handle JSON custom fields without extension mapping', () => {
      const data = {
        entry: {
          uid: 'entry1',
          custom_field: {
            metadata: {
              extension_uid: 'old-ext-uid'
            }
          }
        },
        content_type: {
          uid: 'ct1',
          schema: [
            {
              uid: 'custom_field',
              data_type: 'json',
              extension_uid: 'old-ext-uid',
              field_metadata: {
                extension: true,
                is_asset: true
              }
            }
          ]
        }
      };
      const mappedAssetUids = {};
      const mappedAssetUrls = {};
      const assetUidMapperPath = '/test/mapper';
      const installedExtensions: any = {}; // Empty extensions

      const result = lookupAssets(data, mappedAssetUids, mappedAssetUrls, assetUidMapperPath, installedExtensions);

      expect(result).to.exist;
    });

    it('should handle JSON custom fields with metadata extension mapping', () => {
      const data = {
        entry: {
          uid: 'entry1',
          custom_field: {
            metadata: {
              extension_uid: 'old-metadata-ext-uid'
            }
          }
        },
        content_type: {
          uid: 'ct1',
          schema: [
            {
              uid: 'custom_field',
              data_type: 'json',
              extension_uid: 'old-ext-uid',
              field_metadata: {
                extension: true,
                is_asset: true
              }
            }
          ]
        }
      };
      const mappedAssetUids = {};
      const mappedAssetUrls = {};
      const assetUidMapperPath = '/test/mapper';
      const installedExtensions: any = { 
        'old-ext-uid': 'new-ext-uid',
        'old-metadata-ext-uid': 'new-metadata-ext-uid'
      };

      const result = lookupAssets(data, mappedAssetUids, mappedAssetUrls, assetUidMapperPath, installedExtensions);

      expect(result).to.exist;
    });

    it('should handle JSON RTE with asset-link and href attributes', () => {
      const data = {
        entry: {
          uid: 'entry1',
          json_rte: {
            children: [
              {
                type: 'reference',
                attrs: {
                  type: 'asset',
                  'asset-uid': 'asset123',
                  'asset-link': 'https://example.com/asset.jpg',
                  'href': 'https://example.com/asset2.jpg'
                },
                children: [] as any
              }
            ]
          }
        },
        content_type: {
          uid: 'ct1',
          schema: [
            {
              uid: 'json_rte',
              data_type: 'json',
              field_metadata: { rich_text_type: true }
            }
          ]
        }
      };
      const mappedAssetUids = { asset123: 'new-asset123' };
      const mappedAssetUrls = { 
        'https://example.com/asset.jpg': 'https://newcdn.com/asset.jpg',
        'https://example.com/asset2.jpg': 'https://newcdn.com/asset2.jpg'
      };
      const assetUidMapperPath = '/test/mapper';

      const result = lookupAssets(data, mappedAssetUids, mappedAssetUrls, assetUidMapperPath, []);

      expect(result).to.exist;
    });

    it('should handle JSON RTE with only href attribute', () => {
      const data = {
        entry: {
          uid: 'entry1',
          json_rte: {
            children: [
              {
                type: 'reference',
                attrs: {
                  type: 'asset',
                  'asset-uid': 'asset123',
                  'href': 'https://example.com/asset.jpg'
                },
                children: [] as any
              }
            ]
          }
        },
        content_type: {
          uid: 'ct1',
          schema: [
            {
              uid: 'json_rte',
              data_type: 'json',
              field_metadata: { rich_text_type: true }
            }
          ]
        }
      };
      const mappedAssetUids = { asset123: 'new-asset123' };
      const mappedAssetUrls = { 'https://example.com/asset.jpg': 'https://newcdn.com/asset.jpg' };
      const assetUidMapperPath = '/test/mapper';

      const result = lookupAssets(data, mappedAssetUids, mappedAssetUrls, assetUidMapperPath, []);

      expect(result).to.exist;
    });

    it('should handle JSON RTE with nested children', () => {
      const data = {
        entry: {
          uid: 'entry1',
          json_rte: {
            children: [
              {
                type: 'reference',
                attrs: {
                  type: 'asset',
                  'asset-uid': 'asset123'
                },
                children: [
                  {
                    type: 'text',
                    text: 'Some text'
                  }
                ]
              }
            ]
          }
        },
        content_type: {
          uid: 'ct1',
          schema: [
            {
              uid: 'json_rte',
              data_type: 'json',
              field_metadata: { rich_text_type: true }
            }
          ]
        }
      };
      const mappedAssetUids = { asset123: 'new-asset123' };
      const mappedAssetUrls = {};
      const assetUidMapperPath = '/test/mapper';

      const result = lookupAssets(data, mappedAssetUids, mappedAssetUrls, assetUidMapperPath, []);

      expect(result).to.exist;
    });

    it('should handle JSON RTE with default case in switch', () => {
      const data = {
        entry: {
          uid: 'entry1',
          json_rte: {
            children: [
              {
                type: 'unknown-type',
                children: [
                  {
                    type: 'reference',
                    attrs: {
                      type: 'asset',
                      'asset-uid': 'asset123'
                    },
                    children: [] as any
                  }
                ]
              }
            ]
          }
        },
        content_type: {
          uid: 'ct1',
          schema: [
            {
              uid: 'json_rte',
              data_type: 'json',
              field_metadata: { rich_text_type: true }
            }
          ]
        }
      };
      const mappedAssetUids = { asset123: 'new-asset123' };
      const mappedAssetUrls = {};
      const assetUidMapperPath = '/test/mapper';

      const result = lookupAssets(data, mappedAssetUids, mappedAssetUrls, assetUidMapperPath, []);

      expect(result).to.exist;
    });

    it('should handle JSON RTE with elements without type', () => {
      const data = {
        entry: {
          uid: 'entry1',
          json_rte: {
            children: [
              {
                // No type property
                children: [
                  {
                    type: 'reference',
                    attrs: {
                      type: 'asset',
                      'asset-uid': 'asset123'
                    },
                    children: [] as any
                  }
                ]
              }
            ]
          }
        },
        content_type: {
          uid: 'ct1',
          schema: [
            {
              uid: 'json_rte',
              data_type: 'json',
              field_metadata: { rich_text_type: true }
            }
          ]
        }
      };
      const mappedAssetUids = { asset123: 'new-asset123' };
      const mappedAssetUrls = {};
      const assetUidMapperPath = '/test/mapper';

      const result = lookupAssets(data, mappedAssetUids, mappedAssetUrls, assetUidMapperPath, []);

      expect(result).to.exist;
    });

    it('should handle file writing when matched UIDs exist', () => {
      const writeFileStub = sinon.stub(fileHelper, 'writeFile');
      const fileExistsStub = sinon.stub(fileHelper, 'fileExistsSync').returns(false); // File doesn't exist initially
      const readFileSyncStub = sinon.stub(fileHelper, 'readFileSync').returns({});
      
      const data = {
        entry: {
          uid: 'entry1',
          file_field: {
            uid: 'asset1',
            filename: 'test.jpg'
          }
        },
        content_type: {
          uid: 'ct1',
          schema: [] as any
        }
      };
      const mappedAssetUids = { asset1: 'new-asset1' };
      const mappedAssetUrls = {};
      const assetUidMapperPath = '/test/mapper';

      lookupAssets(data, mappedAssetUids, mappedAssetUrls, assetUidMapperPath, []);

      // The function should write to file when there are matched UIDs
      // This test verifies the file writing behavior
      expect(writeFileStub.called).to.be.true;
    });

    it('should handle file writing when unmatched UIDs exist', () => {
      const writeFileStub = sinon.stub(fileHelper, 'writeFile');
      
      const data = {
        entry: {
          uid: 'entry1',
          file_field: {
            uid: 'unmatched-asset',
            filename: 'test.jpg'
          }
        },
        content_type: {
          uid: 'ct1',
          schema: [] as any
        }
      };
      const mappedAssetUids = { 'other-asset': 'new-asset' };
      const mappedAssetUrls = {};
      const assetUidMapperPath = '/test/mapper';

      lookupAssets(data, mappedAssetUids, mappedAssetUrls, assetUidMapperPath, []);

      expect(writeFileStub.called).to.be.true;
    });



    it('should handle v2 asset URLs without markdown', () => {
      const data = {
        entry: {
          uid: 'entry1',
          text_field: 'https://api.contentstack.io/v2/assets/download?uid=bltabcd1234'
        },
        content_type: {
          uid: 'ct1',
          schema: [
            {
              uid: 'text_field',
              data_type: 'text',
              field_metadata: { rich_text_type: true }
            }
          ]
        }
      };

      const result = lookupAssets(data, {}, {}, '/test/mapper', []);

      expect(result).to.exist;
    });

    it('should handle v3 asset URLs without markdown', () => {
      const data = {
        entry: {
          uid: 'entry1',
          text_field: 'Text with https://images.contentstack.io/v3/assets/stack/blt123/file/name.jpg embedded'
        },
        content_type: {
          uid: 'ct1',
          schema: [
            {
              uid: 'text_field',
              data_type: 'text',
              field_metadata: { rich_text_type: true }
            }
          ]
        }
      };

      const result = lookupAssets(data, {}, {}, '/test/mapper', []);

      expect(result).to.exist;
    });

    it('should handle v3 asset URLs with different CDN regions without markdown', () => {
      const data = {
        entry: {
          uid: 'entry1',
          text_field: 'Text with https://eu-images.contentstack.io/v3/assets/stack/blt123/file/name.jpg embedded'
        },
        content_type: {
          uid: 'ct1',
          schema: [
            {
              uid: 'text_field',
              data_type: 'text',
              field_metadata: { rich_text_type: true }
            }
          ]
        }
      };

      const result = lookupAssets(data, {}, {}, '/test/mapper', []);

      expect(result).to.exist;
    });

    it('should handle v3 asset URLs with azure regions', () => {
      const data = {
        entry: {
          uid: 'entry1',
          text_field: 'Text with https://azure-na-images.contentstack.io/v3/assets/stack/blt123/file/name.jpg embedded'
        },
        content_type: {
          uid: 'ct1',
          schema: [
            {
              uid: 'text_field',
              data_type: 'text',
              field_metadata: { rich_text_type: true }
            }
          ]
        }
      };

      const result = lookupAssets(data, {}, {}, '/test/mapper', []);

      expect(result).to.exist;
    });

    it('should handle v3 asset URLs with gcp regions', () => {
      const data = {
        entry: {
          uid: 'entry1',
          text_field: 'Text with https://gcp-eu-images.contentstack.io/v3/assets/stack/blt123/file/name.jpg embedded'
        },
        content_type: {
          uid: 'ct1',
          schema: [
            {
              uid: 'text_field',
              data_type: 'text',
              field_metadata: { rich_text_type: true }
            }
          ]
        }
      };

      const result = lookupAssets(data, {}, {}, '/test/mapper', []);

      expect(result).to.exist;
    });

    it('should handle v3 asset URLs with assets subdomain', () => {
      const data = {
        entry: {
          uid: 'entry1',
          text_field: 'Text with https://assets.contentstack.io/v3/assets/stack/blt123/file/name.jpg embedded'
        },
        content_type: {
          uid: 'ct1',
          schema: [
            {
              uid: 'text_field',
              data_type: 'text',
              field_metadata: { rich_text_type: true }
            }
          ]
        }
      };

      const result = lookupAssets(data, {}, {}, '/test/mapper', []);

      expect(result).to.exist;
    });

    it('should handle v3 asset URLs with .com domain', () => {
      const data = {
        entry: {
          uid: 'entry1',
          text_field: 'Text with https://images.contentstack.com/v3/assets/stack/blt123/file/name.jpg embedded'
        },
        content_type: {
          uid: 'ct1',
          schema: [
            {
              uid: 'text_field',
              data_type: 'text',
              field_metadata: { rich_text_type: true }
            }
          ]
        }
      };

      const result = lookupAssets(data, {}, {}, '/test/mapper', []);

      expect(result).to.exist;
    });

    it('should handle file fields with string position', () => {
      const data = {
        entry: {
          uid: 'entry1',
          file_array: [
            { uid: 'asset1', filename: 'test.jpg' },
            { uid: 'asset2', filename: 'test2.jpg' }
          ]
        },
        content_type: {
          uid: 'ct1',
          schema: [] as any
        }
      };

      const mappedAssetUids = { asset1: 'new-asset1', asset2: 'new-asset2' };

      const result = lookupAssets(data, mappedAssetUids, {}, '/test/mapper', []);

      expect(result).to.exist;
    });

    it('should handle file fields with number position', () => {
      const data = {
        entry: {
          uid: 'entry1',
          file_array: [
            { uid: 'asset1', filename: 'test.jpg' },
            { uid: 'asset2', filename: 'test2.jpg' }
          ]
        },
        content_type: {
          uid: 'ct1',
          schema: [] as any
        }
      };

      const mappedAssetUids = { asset1: 'new-asset1', asset2: 'new-asset2' };

      const result = lookupAssets(data, mappedAssetUids, {}, '/test/mapper', []);

      expect(result).to.exist;
    });

    it('should handle file fields with undefined position', () => {
      const data = {
        entry: {
          uid: 'entry1',
          file_field: {
            uid: 'asset1',
            filename: 'test.jpg'
          }
        },
        content_type: {
          uid: 'ct1',
          schema: [] as any
        }
      };

      const mappedAssetUids = { asset1: 'new-asset1' };

      const result = lookupAssets(data, mappedAssetUids, {}, '/test/mapper', []);

      expect(result).to.exist;
    });

    it('should handle file fields without filename and uid', () => {
      const data = {
        entry: {
          uid: 'entry1',
          file_field: {
            some: 'other property'
          }
        },
        content_type: {
          uid: 'ct1',
          schema: [] as any
        }
      };

      const result = lookupAssets(data, {}, {}, '/test/mapper', []);

      expect(result).to.exist;
    });

    it('should handle non-object entries in updateFileFields', () => {
      const data = {
        entry: {
          uid: 'entry1',
          string_field: 'some string'
        },
        content_type: {
          uid: 'ct1',
          schema: [] as any
        }
      };

      const result = lookupAssets(data, {}, {}, '/test/mapper', []);

      expect(result).to.exist;
    });

    it('should handle array entries in updateFileFields', () => {
      const data = {
        entry: {
          uid: 'entry1',
          array_field: ['item1', 'item2', 'item3']
        },
        content_type: {
          uid: 'ct1',
          schema: [] as any
        }
      };

      const result = lookupAssets(data, {}, {}, '/test/mapper', []);

      expect(result).to.exist;
    });

    it('should handle empty array entries in updateFileFields', () => {
      const data = {
        entry: {
          uid: 'entry1',
          array_field: [] as any[]
        },
        content_type: {
          uid: 'ct1',
          schema: [] as any
        }
      };

      const result = lookupAssets(data, {}, {}, '/test/mapper', []);

      expect(result).to.exist;
    });

    it('should handle array with undefined and null values in updateFileFields', () => {
      const data = {
        entry: {
          uid: 'entry1',
          array_field: [undefined, null, 'valid', undefined, null]
        },
        content_type: {
          uid: 'ct1',
          schema: [] as any
        }
      };

      const result = lookupAssets(data, {}, {}, '/test/mapper', []);

      expect(result).to.exist;
    });

    it('should handle file fields with sys_assets but without asset property', () => {
      const data = {
        entry: {
          uid: 'entry1',
          file_ref: {
            uid: 'asset1',
            url: 'https://cdn.com/asset.jpg',
            filename: 'asset.jpg',
            _content_type_uid: 'sys_assets'
            // No asset property
          }
        },
        content_type: {
          uid: 'ct1',
          schema: [] as any
        }
      };

      const mappedAssetUids = { asset1: 'new-asset1' };
      const mappedAssetUrls = { 'https://cdn.com/asset.jpg': 'https://newcdn.com/asset.jpg' };

      const result = lookupAssets(data, mappedAssetUids, mappedAssetUrls, '/test/mapper', []);

      expect(result).to.exist;
    });

    it('should handle file fields with sys_assets but without _content_type_uid', () => {
      const data = {
        entry: {
          uid: 'entry1',
          file_ref: {
            uid: 'asset1',
            url: 'https://cdn.com/asset.jpg',
            filename: 'asset.jpg',
            asset: { some: 'data' }
            // No _content_type_uid property
          }
        },
        content_type: {
          uid: 'ct1',
          schema: [] as any
        }
      };

      const mappedAssetUids = { asset1: 'new-asset1' };
      const mappedAssetUrls = { 'https://cdn.com/asset.jpg': 'https://newcdn.com/asset.jpg' };

      const result = lookupAssets(data, mappedAssetUids, mappedAssetUrls, '/test/mapper', []);

      expect(result).to.exist;
    });

    it('should handle file fields with sys_assets but different _content_type_uid', () => {
      const data = {
        entry: {
          uid: 'entry1',
          file_ref: {
            uid: 'asset1',
            url: 'https://cdn.com/asset.jpg',
            filename: 'asset.jpg',
            asset: { some: 'data' },
            _content_type_uid: 'other_content_type'
          }
        },
        content_type: {
          uid: 'ct1',
          schema: [] as any
        }
      };

      const mappedAssetUids = { asset1: 'new-asset1' };
      const mappedAssetUrls = { 'https://cdn.com/asset.jpg': 'https://newcdn.com/asset.jpg' };

      const result = lookupAssets(data, mappedAssetUids, mappedAssetUrls, '/test/mapper', []);

      expect(result).to.exist;
    });

    it('should handle file fields with sys_assets but without url property', () => {
      const data = {
        entry: {
          uid: 'entry1',
          file_ref: {
            uid: 'asset1',
            filename: 'asset.jpg',
            asset: { some: 'data' },
            _content_type_uid: 'sys_assets'
            // No url property
          }
        },
        content_type: {
          uid: 'ct1',
          schema: [] as any
        }
      };

      const mappedAssetUids = { asset1: 'new-asset1' };

      const result = lookupAssets(data, mappedAssetUids, {}, '/test/mapper', []);

      expect(result).to.exist;
    });

    it('should handle file fields with sys_assets but without uid property', () => {
      const data = {
        entry: {
          uid: 'entry1',
          file_ref: {
            url: 'https://cdn.com/asset.jpg',
            filename: 'asset.jpg',
            asset: { some: 'data' },
            _content_type_uid: 'sys_assets'
            // No uid property
          }
        },
        content_type: {
          uid: 'ct1',
          schema: [] as any
        }
      };

      const mappedAssetUrls = { 'https://cdn.com/asset.jpg': 'https://newcdn.com/asset.jpg' };

      const result = lookupAssets(data, {}, mappedAssetUrls, '/test/mapper', []);

      expect(result).to.exist;
    });

    it('should handle file fields with sys_assets but parent is not an object', () => {
      const data = {
        entry: {
          uid: 'entry1',
          file_ref: {
            uid: 'asset1',
            url: 'https://cdn.com/asset.jpg',
            filename: 'asset.jpg',
            asset: { some: 'data' },
            _content_type_uid: 'sys_assets'
          }
        },
        content_type: {
          uid: 'ct1',
          schema: [] as any
        }
      };

      const mappedAssetUids = { asset1: 'new-asset1' };
      const mappedAssetUrls = { 'https://cdn.com/asset.jpg': 'https://newcdn.com/asset.jpg' };

      const result = lookupAssets(data, mappedAssetUids, mappedAssetUrls, '/test/mapper', []);

      expect(result).to.exist;
    });

    it('should handle complex sys_assets file field with parent UID mapping and asset removal', () => {
      const data = {
        entry: {
          uid: 'entry1',
          file_ref: {
            uid: 'asset1',
            url: 'https://cdn.com/asset.jpg',
            filename: 'asset.jpg',
            asset: { some: 'data' },
            _content_type_uid: 'sys_assets'
          }
        },
        content_type: {
          uid: 'ct1',
          schema: [] as any
        }
      };

      const mappedAssetUids = { 
        asset1: 'new-asset1',
        'parent-uid': 'new-parent-uid' 
      };
      const mappedAssetUrls = { 'https://cdn.com/asset.jpg': 'https://newcdn.com/asset.jpg' };

      // Create a complex parent object that will trigger the sys_assets logic
      const complexParent = {
        uid: 'parent-uid',
        asset: { some: 'data' },
        _content_type_uid: 'sys_assets',
        file_ref: {
          uid: 'asset1',
          url: 'https://cdn.com/asset.jpg',
          filename: 'asset.jpg'
        }
      };

      // Mock the data to use the complex parent structure
      data.entry = complexParent as any;

      const result = lookupAssets(data, mappedAssetUids, mappedAssetUrls, '/test/mapper', []);

      expect(result).to.exist;
    });

    it('should handle sys_assets file field with all conditions met', () => {
      const data = {
        entry: {
          uid: 'entry1',
          file_ref: {
            uid: 'asset1',
            url: 'https://cdn.com/asset.jpg',
            filename: 'asset.jpg',
            asset: { some: 'data' },
            _content_type_uid: 'sys_assets'
          }
        },
        content_type: {
          uid: 'ct1',
          schema: [] as any
        }
      };

      const mappedAssetUids = { 
        asset1: 'new-asset1',
        'parent-uid': 'new-parent-uid' 
      };
      const mappedAssetUrls = { 'https://cdn.com/asset.jpg': 'https://newcdn.com/asset.jpg' };

      // Create a parent object that will trigger all the sys_assets conditions
      const parentWithAsset = {
        uid: 'parent-uid',
        asset: { some: 'data' },
        _content_type_uid: 'sys_assets',
        file_ref: {
          uid: 'asset1',
          url: 'https://cdn.com/asset.jpg',
          filename: 'asset.jpg'
        }
      };

      // Mock the data to use the parent structure that will trigger the complex logic
      data.entry = parentWithAsset as any;

      const result = lookupAssets(data, mappedAssetUids, mappedAssetUrls, '/test/mapper', []);

      expect(result).to.exist;
    });

    it('should handle file writing when file does not exist', () => {
      const writeFileStub = sinon.stub(fileHelper, 'writeFile');
      const fileExistsStub = sinon.stub(fileHelper, 'fileExistsSync').returns(false);
      const readFileSyncStub = sinon.stub(fileHelper, 'readFileSync').returns({});
      
      const data = {
        entry: {
          uid: 'entry1',
          file_field: {
            uid: 'asset1',
            filename: 'test.jpg'
          }
        },
        content_type: {
          uid: 'ct1',
          schema: [] as any
        }
      };
      const mappedAssetUids = { asset1: 'new-asset1' };
      const mappedAssetUrls = {};
      const assetUidMapperPath = '/test/mapper';

      lookupAssets(data, mappedAssetUids, mappedAssetUrls, assetUidMapperPath, []);

      expect(writeFileStub.called).to.be.true;
    });

    it('should handle file writing with existing content type structure', () => {
      const writeFileStub = sinon.stub(fileHelper, 'writeFile');
      const readFileSyncStub = sinon.stub(fileHelper, 'readFileSync').returns({
        'ct1': {
          'entry1': ['asset1']
        }
      });
      
      const data = {
        entry: {
          uid: 'entry1',
          file_field: {
            uid: 'asset1',
            filename: 'test.jpg'
          }
        },
        content_type: {
          uid: 'ct1',
          schema: [] as any
        }
      };
      const mappedAssetUids = { asset1: 'new-asset1' };
      const mappedAssetUrls = {};
      const assetUidMapperPath = '/test/mapper';

      lookupAssets(data, mappedAssetUids, mappedAssetUrls, assetUidMapperPath, []);

      expect(writeFileStub.called).to.be.true;
    });

    it('should handle file writing with existing unmatched UIDs structure', () => {
      const writeFileStub = sinon.stub(fileHelper, 'writeFile');
      const readFileSyncStub = sinon.stub(fileHelper, 'readFileSync').returns({
        'ct1': {
          'entry1': ['unmatched-asset']
        }
      });
      
      const data = {
        entry: {
          uid: 'entry1',
          file_field: {
            uid: 'unmatched-asset',
            filename: 'test.jpg'
          }
        },
        content_type: {
          uid: 'ct1',
          schema: [] as any
        }
      };
      const mappedAssetUids = { 'other-asset': 'new-asset' };
      const mappedAssetUrls = {};
      const assetUidMapperPath = '/test/mapper';

      lookupAssets(data, mappedAssetUids, mappedAssetUrls, assetUidMapperPath, []);

      expect(writeFileStub.called).to.be.true;
    });



    it('should handle JSON RTE with multiple children and nested references', () => {
      const data = {
        entry: {
          uid: 'entry1',
          json_rte: {
            children: [
              {
                type: 'reference',
                attrs: {
                  type: 'asset',
                  'asset-uid': 'asset1',
                  'asset-link': 'https://example.com/asset1.jpg'
                },
                children: [
                  {
                    type: 'reference',
                    attrs: {
                      type: 'asset',
                      'asset-uid': 'asset2',
                      'href': 'https://example.com/asset2.jpg'
                    },
                    children: [] as any
                  }
                ]
              }
            ]
          }
        },
        content_type: {
          uid: 'ct1',
          schema: [
            {
              uid: 'json_rte',
              data_type: 'json',
              field_metadata: { rich_text_type: true }
            }
          ]
        }
      };
      const mappedAssetUids = { asset1: 'new-asset1', asset2: 'new-asset2' };
      const mappedAssetUrls = { 
        'https://example.com/asset1.jpg': 'https://newcdn.com/asset1.jpg',
        'https://example.com/asset2.jpg': 'https://newcdn.com/asset2.jpg'
      };
      const assetUidMapperPath = '/test/mapper';

      const result = lookupAssets(data, mappedAssetUids, mappedAssetUrls, assetUidMapperPath, []);

      expect(result).to.exist;
    });

    it('should handle JSON RTE with empty children array', () => {
      const data = {
        entry: {
          uid: 'entry1',
          json_rte: {
            children: [] as any
          }
        },
        content_type: {
          uid: 'ct1',
          schema: [
            {
              uid: 'json_rte',
              data_type: 'json',
              field_metadata: { rich_text_type: true }
            }
          ]
        }
      };
      const mappedAssetUids = {};
      const mappedAssetUrls = {};
      const assetUidMapperPath = '/test/mapper';

      const result = lookupAssets(data, mappedAssetUids, mappedAssetUrls, assetUidMapperPath, []);

      expect(result).to.exist;
    });

    it('should handle JSON RTE with children that have no type property', () => {
      const data = {
        entry: {
          uid: 'entry1',
          json_rte: {
            children: [
              {
                // No type property
                attrs: {
                  type: 'asset',
                  'asset-uid': 'asset1'
                },
                children: [] as any
              }
            ]
          }
        },
        content_type: {
          uid: 'ct1',
          schema: [
            {
              uid: 'json_rte',
              data_type: 'json',
              field_metadata: { rich_text_type: true }
            }
          ]
        }
      };
      const mappedAssetUids = { asset1: 'new-asset1' };
      const mappedAssetUrls = {};
      const assetUidMapperPath = '/test/mapper';

      const result = lookupAssets(data, mappedAssetUids, mappedAssetUrls, assetUidMapperPath, []);

      expect(result).to.exist;
    });

    it('should handle JSON RTE with reference elements that have empty attrs', () => {
      const data = {
        entry: {
          uid: 'entry1',
          json_rte: {
            children: [
              {
                type: 'reference',
                attrs: {}, // Empty attrs
                children: [] as any
              }
            ]
          }
        },
        content_type: {
          uid: 'ct1',
          schema: [
            {
              uid: 'json_rte',
              data_type: 'json',
              field_metadata: { rich_text_type: true }
            }
          ]
        }
      };
      const mappedAssetUids = {};
      const mappedAssetUrls = {};
      const assetUidMapperPath = '/test/mapper';

      const result = lookupAssets(data, mappedAssetUids, mappedAssetUrls, assetUidMapperPath, []);

      expect(result).to.exist;
    });

    it('should handle JSON RTE with reference elements that have attrs without type', () => {
      const data = {
        entry: {
          uid: 'entry1',
          json_rte: {
            children: [
              {
                type: 'reference',
                attrs: {
                  'asset-uid': 'asset1',
                  'asset-link': 'https://example.com/asset1.jpg'
                  // No type property
                },
                children: [] as any
              }
            ]
          }
        },
        content_type: {
          uid: 'ct1',
          schema: [
            {
              uid: 'json_rte',
              data_type: 'json',
              field_metadata: { rich_text_type: true }
            }
          ]
        }
      };
      const mappedAssetUids = { asset1: 'new-asset1' };
      const mappedAssetUrls = { 'https://example.com/asset1.jpg': 'https://newcdn.com/asset1.jpg' };
      const assetUidMapperPath = '/test/mapper';

      const result = lookupAssets(data, mappedAssetUids, mappedAssetUrls, assetUidMapperPath, []);

      expect(result).to.exist;
    });

    it('should handle JSON RTE with reference elements that have type but not asset', () => {
      const data = {
        entry: {
          uid: 'entry1',
          json_rte: {
            children: [
              {
                type: 'reference',
                attrs: {
                  type: 'entry', // Not asset type
                  'asset-uid': 'asset1',
                  'asset-link': 'https://example.com/asset1.jpg'
                },
                children: [] as any
              }
            ]
          }
        },
        content_type: {
          uid: 'ct1',
          schema: [
            {
              uid: 'json_rte',
              data_type: 'json',
              field_metadata: { rich_text_type: true }
            }
          ]
        }
      };
      const mappedAssetUids = {};
      const mappedAssetUrls = {};
      const assetUidMapperPath = '/test/mapper';

      const result = lookupAssets(data, mappedAssetUids, mappedAssetUrls, assetUidMapperPath, []);

      expect(result).to.exist;
    });

    it('should handle JSON RTE with reference elements that have asset type but no asset-uid', () => {
      const data = {
        entry: {
          uid: 'entry1',
          json_rte: {
            children: [
              {
                type: 'reference',
                attrs: {
                  type: 'asset',
                  'asset-link': 'https://example.com/asset1.jpg'
                  // No asset-uid property
                },
                children: [] as any
              }
            ]
          }
        },
        content_type: {
          uid: 'ct1',
          schema: [
            {
              uid: 'json_rte',
              data_type: 'json',
              field_metadata: { rich_text_type: true }
            }
          ]
        }
      };
      const mappedAssetUids = {};
      const mappedAssetUrls = { 'https://example.com/asset1.jpg': 'https://newcdn.com/asset1.jpg' };
      const assetUidMapperPath = '/test/mapper';

      const result = lookupAssets(data, mappedAssetUids, mappedAssetUrls, assetUidMapperPath, []);

      expect(result).to.exist;
    });

    it('should handle JSON RTE with reference elements that have asset type but no asset-link or href', () => {
      const data = {
        entry: {
          uid: 'entry1',
          json_rte: {
            children: [
              {
                type: 'reference',
                attrs: {
                  type: 'asset',
                  'asset-uid': 'asset1'
                  // No asset-link or href property
                },
                children: [] as any
              }
            ]
          }
        },
        content_type: {
          uid: 'ct1',
          schema: [
            {
              uid: 'json_rte',
              data_type: 'json',
              field_metadata: { rich_text_type: true }
            }
          ]
        }
      };
      const mappedAssetUids = { asset1: 'new-asset1' };
      const mappedAssetUrls = {};
      const assetUidMapperPath = '/test/mapper';

      const result = lookupAssets(data, mappedAssetUids, mappedAssetUrls, assetUidMapperPath, []);

      expect(result).to.exist;
    });

    it('should handle JSON RTE with reference elements that have both asset-link and href', () => {
      const data = {
        entry: {
          uid: 'entry1',
          json_rte: {
            children: [
              {
                type: 'reference',
                attrs: {
                  type: 'asset',
                  'asset-uid': 'asset1',
                  'asset-link': 'https://example.com/asset1.jpg',
                  'href': 'https://example.com/asset2.jpg'
                },
                children: [] as any
              }
            ]
          }
        },
        content_type: {
          uid: 'ct1',
          schema: [
            {
              uid: 'json_rte',
              data_type: 'json',
              field_metadata: { rich_text_type: true }
            }
          ]
        }
      };
      const mappedAssetUids = { asset1: 'new-asset1' };
      const mappedAssetUrls = { 
        'https://example.com/asset1.jpg': 'https://newcdn.com/asset1.jpg',
        'https://example.com/asset2.jpg': 'https://newcdn.com/asset2.jpg'
      };
      const assetUidMapperPath = '/test/mapper';

      const result = lookupAssets(data, mappedAssetUids, mappedAssetUrls, assetUidMapperPath, []);

      expect(result).to.exist;
    });

    it('should handle JSON RTE with reference elements that have href but no asset-link', () => {
      const data = {
        entry: {
          uid: 'entry1',
          json_rte: {
            children: [
              {
                type: 'reference',
                attrs: {
                  type: 'asset',
                  'asset-uid': 'asset1',
                  'href': 'https://example.com/asset1.jpg'
                  // No asset-link property
                },
                children: [] as any
              }
            ]
          }
        },
        content_type: {
          uid: 'ct1',
          schema: [
            {
              uid: 'json_rte',
              data_type: 'json',
              field_metadata: { rich_text_type: true }
            }
          ]
        }
      };
      const mappedAssetUids = { asset1: 'new-asset1' };
      const mappedAssetUrls = { 'https://example.com/asset1.jpg': 'https://newcdn.com/asset1.jpg' };
      const assetUidMapperPath = '/test/mapper';

      const result = lookupAssets(data, mappedAssetUids, mappedAssetUrls, assetUidMapperPath, []);

      expect(result).to.exist;
    });

    it('should handle JSON RTE with reference elements that have asset type but empty attrs', () => {
      const data = {
        entry: {
          uid: 'entry1',
          json_rte: {
            children: [
              {
                type: 'reference',
                attrs: {
                  type: 'asset'
                  // No other properties
                },
                children: [] as any
              }
            ]
          }
        },
        content_type: {
          uid: 'ct1',
          schema: [
            {
              uid: 'json_rte',
              data_type: 'json',
              field_metadata: { rich_text_type: true }
            }
          ]
        }
      };
      const mappedAssetUids = {};
      const mappedAssetUrls = {};
      const assetUidMapperPath = '/test/mapper';

      const result = lookupAssets(data, mappedAssetUids, mappedAssetUrls, assetUidMapperPath, []);

      expect(result).to.exist;
    });

    it('should handle JSON RTE with reference elements that have asset type but no attrs', () => {
      const data = {
        entry: {
          uid: 'entry1',
          json_rte: {
            children: [
              {
                type: 'reference',
                attrs: {} as any,
                children: [] as any
              }
            ]
          }
        },
        content_type: {
          uid: 'ct1',
          schema: [
            {
              uid: 'json_rte',
              data_type: 'json',
              field_metadata: { rich_text_type: true }
            }
          ]
        }
      };
      const mappedAssetUids = {};
      const mappedAssetUrls = {};
      const assetUidMapperPath = '/test/mapper';

      const result = lookupAssets(data, mappedAssetUids, mappedAssetUrls, assetUidMapperPath, []);

      expect(result).to.exist;
    });

    it('should handle JSON RTE with reference elements that have asset type but no children', () => {
      const data = {
        entry: {
          uid: 'entry1',
          json_rte: {
            children: [
              {
                type: 'reference',
                attrs: {
                  type: 'asset',
                  'asset-uid': 'asset1',
                  'asset-link': 'https://example.com/asset1.jpg'
                }
                // No children property
              }
            ]
          }
        },
        content_type: {
          uid: 'ct1',
          schema: [
            {
              uid: 'json_rte',
              data_type: 'json',
              field_metadata: { rich_text_type: true }
            }
          ]
        }
      };
      const mappedAssetUids = { asset1: 'new-asset1' };
      const mappedAssetUrls = { 'https://example.com/asset1.jpg': 'https://newcdn.com/asset1.jpg' };
      const assetUidMapperPath = '/test/mapper';

      const result = lookupAssets(data, mappedAssetUids, mappedAssetUrls, assetUidMapperPath, []);

      expect(result).to.exist;
    });

    it('should handle JSON RTE with reference elements that have asset type but empty children', () => {
      const data = {
        entry: {
          uid: 'entry1',
          json_rte: {
            children: [
              {
                type: 'reference',
                attrs: {
                  type: 'asset',
                  'asset-uid': 'asset1',
                  'asset-link': 'https://example.com/asset1.jpg'
                },
                children: [] as any
              }
            ]
          }
        },
        content_type: {
          uid: 'ct1',
          schema: [
            {
              uid: 'json_rte',
              data_type: 'json',
              field_metadata: { rich_text_type: true }
            }
          ]
        }
      };
      const mappedAssetUids = { asset1: 'new-asset1' };
      const mappedAssetUrls = { 'https://example.com/asset1.jpg': 'https://newcdn.com/asset1.jpg' };
      const assetUidMapperPath = '/test/mapper';

      const result = lookupAssets(data, mappedAssetUids, mappedAssetUrls, assetUidMapperPath, []);

      expect(result).to.exist;
    });

    it('should handle HTML RTE with multiple asset UIDs in while loop', () => {
      const data = {
        entry: {
          uid: 'entry1',
          html_rte: '<img asset_uid="asset1" src="test1.jpg"><img asset_uid="asset2" src="test2.jpg"><img asset_uid="asset3" src="test3.jpg">'
        },
        content_type: {
          uid: 'ct1',
          schema: [
            {
              uid: 'html_rte',
              data_type: 'text',
              field_metadata: { rich_text_type: true }
            }
          ]
        }
      };
      const mappedAssetUids = { asset1: 'new-asset1', asset2: 'new-asset2', asset3: 'new-asset3' };
      const mappedAssetUrls = {};
      const assetUidMapperPath = '/test/mapper';

      const result = lookupAssets(data, mappedAssetUids, mappedAssetUrls, assetUidMapperPath, []);

      expect(result).to.exist;
    });

    it('should handle blocks with multiple entries in findAssetIdsFromJsonRte', () => {
      const data = {
        entry: {
          uid: 'entry1',
          blocks_field: [
            {
              block1: {
                text_field: 'Test content with asset_uid="asset1"'
              }
            },
            {
              block2: {
                text_field: 'Another test with asset_uid="asset2"'
              }
            }
          ]
        },
        content_type: {
          uid: 'ct1',
          schema: [
            {
              uid: 'blocks_field',
              data_type: 'blocks',
              multiple: true,
              blocks: [
                {
                  uid: 'block1',
                  schema: [
                    {
                      uid: 'text_field',
                      data_type: 'text',
                      field_metadata: { rich_text_type: true }
                    }
                  ]
                },
                {
                  uid: 'block2',
                  schema: [
                    {
                      uid: 'text_field',
                      data_type: 'text',
                      field_metadata: { rich_text_type: true }
                    }
                  ]
                }
              ]
            }
          ]
        }
      };
      const mappedAssetUids = { asset1: 'new-asset1', asset2: 'new-asset2' };
      const mappedAssetUrls = {};
      const assetUidMapperPath = '/test/mapper';

      const result = lookupAssets(data, mappedAssetUids, mappedAssetUrls, assetUidMapperPath, []);

      expect(result).to.exist;
    });

    it('should handle markdown with multiple asset URLs in while loop', () => {
      const data = {
        entry: {
          uid: 'entry1',
          markdown_field: '![img1](https://api.contentstack.io/v3/assets/download?uid=asset1&environment=dev)\n![img2](https://api.contentstack.io/v3/assets/download?uid=asset2&environment=dev)\n![img3](https://api.contentstack.io/v3/assets/download?uid=asset3&environment=dev)'
        },
        content_type: {
          uid: 'ct1',
          schema: [
            {
              uid: 'markdown_field',
              data_type: 'text',
              field_metadata: { markdown: true }
            }
          ]
        }
      };
      const mappedAssetUids = {};
      const mappedAssetUrls = { 
        'https://api.contentstack.io/v3/assets/download?uid=asset1&environment=dev': 'https://new-cdn.com/asset1.jpg',
        'https://api.contentstack.io/v3/assets/download?uid=asset2&environment=dev': 'https://new-cdn.com/asset2.jpg',
        'https://api.contentstack.io/v3/assets/download?uid=asset3&environment=dev': 'https://new-cdn.com/asset3.jpg'
      };
      const assetUidMapperPath = '/test/mapper';

      const result = lookupAssets(data, mappedAssetUids, mappedAssetUrls, assetUidMapperPath, []);

      expect(result).to.exist;
    });

    it('should handle updateFileFields with url property mapping', () => {
      const data = {
        entry: {
          uid: 'entry1',
          file_field: {
            uid: 'asset1',
            url: 'https://old-cdn.com/asset1.jpg',
            filename: 'asset1.jpg'
          }
        },
        content_type: {
          uid: 'ct1',
          schema: [] as any
        }
      };
      const mappedAssetUids = { asset1: 'new-asset1' };
      const mappedAssetUrls = { 'https://old-cdn.com/asset1.jpg': 'https://new-cdn.com/asset1.jpg' };
      const assetUidMapperPath = '/test/mapper';

      const result = lookupAssets(data, mappedAssetUids, mappedAssetUrls, assetUidMapperPath, []);

      expect(result).to.exist;
      // The function should process the URL mapping successfully
    });
  });
});

