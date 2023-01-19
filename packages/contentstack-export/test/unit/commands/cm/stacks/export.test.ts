import merge from 'lodash/merge';
import { test, expect } from '@oclif/test';

import config from '../../../../../src/config';
import { overrideFsMethods } from '../../../utility/fs';
import { mockData, versionedAssets } from '../../../mock/assets';
import { sdk } from '../../../utility/contentstack-management-sdk';
import ExportAssets from '../../../../../src/export/modules/assets';

const exportConfig: Record<string, any> = config;
exportConfig.data = './test-contents';
exportConfig.modules.assets.includeVersionedAssets = true;

describe('Assets module test', () => {
  describe('Assets module start() functions test for success case', () => {
    test
      .timeout(600000) // NOTE setting default timeout as 1 minutes
      .stdout({ print: true })
      .do((ctx: any) => {
        overrideFsMethods();
        return ctx;
      })
      .do(async (ctx: any) => {
        const assetInstance = new ExportAssets({
          exportConfig,
          stackAPIClient: sdk(mockData).stack(),
        });
        assetInstance.versionedAssets = versionedAssets;
        ctx.response = await assetInstance.start();
      })
      .it('Success case', (ctx) => {
        expect(ctx.stdout).to.be.a('string');
        expect(ctx.stdout).includes('info: Assets folder Exported successfully.!');
        expect(ctx.stdout).includes('info: Assets exported successfully.!');
        expect(ctx.stdout).includes('info: Assets download completed successfully.!');
        expect(ctx.response).to.be.equal(undefined);
      });
  });

  describe('Assets module start() functions test for failuer case', () => {
    test
      .timeout(60000) // NOTE setting default timeout as 1 minutes
      .stdout({ print: true })
      .do((ctx: any) => {
        overrideFsMethods();
        return ctx;
      })
      .do(async (ctx: any) => {
        const assetInstance = new ExportAssets({
          exportConfig,
          stackAPIClient: sdk(
            merge(mockData, {
              findResolve: false,
              fetchResolve: false,
              assetResolve: false,
              findOneResolve: false,
            }),
          ).stack(),
        });
        assetInstance.versionedAssets = versionedAssets;
        ctx.response = await assetInstance.start();
        return ctx;
      })
      .it('Failuer case', (ctx) => {
        expect(ctx.stdout).to.be.a('string');
        expect(ctx.stdout).includes('error: Export asset folder query failed');
        expect(ctx.response).to.be.equal(undefined);
      });
  });
});
