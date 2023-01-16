import { test, expect } from '@oclif/test';
import config from '../../../../../src/config';
import { mockData } from '../../../mock/assets';
import { ExportAssets } from '../../../../../src/export/modules';
import { sdk } from '../../../utility/contentstack-management-sdk';

const exportConfig: Record<string, any> = config;
exportConfig.data = './contents';
const assetInstance: ExportAssets = new ExportAssets({
  stackAPIClient: sdk(mockData).stack(),
  exportConfig: exportConfig,
});

describe('Assets module test', () => {
  test
    .stdout({ print: false })
    .do(async (ctx: any) => {
      ctx.response = await assetInstance.start();
      return ctx;
    })
    .it('Assets start function test', (ctx) => {
      expect(ctx.stdout).to.be.a('string');
      expect(ctx.stdout).includes('info: Assets folder Exported successfully.!');
      expect(ctx.stdout).includes('info: Assets exported successfully.!');
      expect(ctx.stdout).includes('info: Assets download completed successfully.!');
      expect(ctx.response).to.be.equal(undefined);
    });
});
