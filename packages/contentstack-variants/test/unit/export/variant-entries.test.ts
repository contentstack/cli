import { expect } from '@oclif/test';
import { FsUtility } from '@contentstack/cli-utilities';
import { fancy } from '@contentstack/cli-dev-dependencies';

import exportConf from '../mock/export-config.json';
import { Export, ExportConfig, VariantHttpClient, VariantsOption } from '../../../src';

describe('Variant Entries Export', () => {
  let config: ExportConfig;

  const exportEntryData = {
    locale: 'en-us',
    contentTypeUid: 'CT-ID',
    entries: [{ uid: 'E-UID-1', title: 'Entry 1' }],
  };

  const test = fancy
    .stdout({ print: process.env.PRINT === 'true' || false })
    .stub(FsUtility.prototype, 'completeFile', () => {})
    .stub(FsUtility.prototype, 'writeIntoFile', () => {})
    .stub(FsUtility.prototype, 'createFolderIfNotExist', () => {});

  beforeEach(() => {
    config = exportConf as unknown as ExportConfig;
  });

  describe('exportVariantEntry method', () => {
    test
      .stub(VariantHttpClient.prototype, 'variantEntries', async () => {})
      .spy(VariantHttpClient.prototype, 'variantEntries')
      .spy(FsUtility.prototype, 'completeFile')
      .spy(FsUtility.prototype, 'createFolderIfNotExist')
      .it('should call export variant entry method (API call)', async ({ spy }) => {
        let entryVariantInstace = new Export.VariantEntries(config);
        await entryVariantInstace.exportVariantEntry(exportEntryData);

        expect(spy.variantEntries.callCount).to.be.equals(1);
        expect(spy.completeFile.callCount).to.be.equals(1);
        expect(spy.createFolderIfNotExist.callCount).to.be.equals(1);
        expect(spy.completeFile.alwaysCalledWith(true)).to.be.true;
      });

    test
      .stub(VariantHttpClient.prototype, 'variantEntries', async (...args: any) => {
        const { callback } = args[0] as VariantsOption;
        if (callback) {
          callback([{ uid: 'E-UID-1', title: 'Entry 1' }]);
        }
      })
      .spy(FsUtility.prototype, 'writeIntoFile')
      .it('should write data in files (As chunk)', async ({ spy }) => {
        let entryVariantInstace = new Export.VariantEntries(config);
        await entryVariantInstace.exportVariantEntry(exportEntryData);

        expect(spy.writeIntoFile.callCount).to.be.equals(1);
        expect(spy.writeIntoFile.alwaysCalledWith([{ uid: 'E-UID-1', title: 'Entry 1' }])).to.be.true;
      });

    test
      .stub(VariantHttpClient.prototype, 'variantEntries', async (...args: any) => {
        const { callback } = args[0] as VariantsOption;
        if (callback) {
          callback([]); // NOTE API callback with empty response
        }
      })
      .spy(FsUtility.prototype, 'writeIntoFile')
      .spy(VariantHttpClient.prototype, 'variantEntries')
      .it(
        'should skip write data in files (Empty data check validation), should set default file chunk 1MB if chunk size is not passed in config',
        async ({ spy }) => {
          config.modules.variantEntry.chunkFileSize = null as any;
          let entryVariantInstace = new Export.VariantEntries(config, () => {});
          await entryVariantInstace.exportVariantEntry(exportEntryData);

          expect(spy.writeIntoFile.callCount).to.be.equals(0);
          expect(spy.variantEntries.callCount).to.be.equals(1);
        },
      );
  });
});
