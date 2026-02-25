import { expect } from '@oclif/test';
import cloneDeep from 'lodash/cloneDeep';
import { fancy } from '@contentstack/cli-dev-dependencies';

import importConf from '../mock/import-config.json';
import { Import, ImportConfig } from '../../../src';

describe('Audiences Import', () => {
  let config: ImportConfig;
  let createAudienceCalls: Array<{ name: string }> = [];

  const test = fancy.stdout({ print: process.env.PRINT === 'true' || false });

  beforeEach(() => {
    config = cloneDeep(importConf) as unknown as ImportConfig;
    createAudienceCalls = [];
    // Audiences uses modules.personalize and region - add them for tests
    config.modules.personalize = {
      ...(config.modules as any).personalization,
      dirName: 'personalize',
      baseURL: {
        na: 'https://personalization.na-api.contentstack.com',
        eu: 'https://personalization.eu-api.contentstack.com',
      },
    } as any;
    config.region = { name: 'eu' } as any;
    config.context = config.context || {};
  });

  describe('import method - Lytics audience skip', () => {
    test
      .stub(Import.Audiences.prototype, 'init', async () => {})
      .stub(Import.Audiences.prototype, 'createAudience', (async (payload: any) => {
        createAudienceCalls.push({ name: payload.name });
        return { uid: `new-${payload.name.replace(/\s/g, '-')}`, name: payload.name };
      }) as any)
      .it('should skip Lytics audiences and not call createAudience for them', async () => {
        const audiencesInstance = new Import.Audiences(config);
        await audiencesInstance.import();

        const lyticsNames = createAudienceCalls.filter(
          (c) => c.name === 'Lytics Audience' || c.name === 'Lytics Lowercase',
        );
        expect(lyticsNames.length).to.equal(0);
      });

    test
      .stub(Import.Audiences.prototype, 'init', async () => {})
      .stub(Import.Audiences.prototype, 'createAudience', (async (payload: any) => {
        createAudienceCalls.push({ name: payload.name });
        return { uid: `new-${payload.name.replace(/\s/g, '-')}`, name: payload.name };
      }) as any)
      .it('should process audiences with undefined source', async () => {
        const audiencesInstance = new Import.Audiences(config);
        await audiencesInstance.import();

        const noSourceCall = createAudienceCalls.find((c) => c.name === 'No Source Audience');
        expect(noSourceCall).to.not.be.undefined;
      });

    test
      .stub(Import.Audiences.prototype, 'init', async () => {})
      .stub(Import.Audiences.prototype, 'createAudience', (async (payload: any) => {
        createAudienceCalls.push({ name: payload.name });
        return { uid: `new-${payload.name.replace(/\s/g, '-')}`, name: payload.name };
      }) as any)
      .it('should skip audience with source "lytics" (lowercase)', async () => {
        const audiencesInstance = new Import.Audiences(config);
        await audiencesInstance.import();

        const lyticsLowercaseCall = createAudienceCalls.find((c) => c.name === 'Lytics Lowercase');
        expect(lyticsLowercaseCall).to.be.undefined;
      });

    test
      .stub(Import.Audiences.prototype, 'init', async () => {})
      .stub(Import.Audiences.prototype, 'createAudience', (async (payload: any) => {
        createAudienceCalls.push({ name: payload.name });
        return { uid: `new-uid-${payload.name}`, name: payload.name };
      }) as any)
      .it('should call createAudience only for non-Lytics audiences', async () => {
        const audiencesInstance = new Import.Audiences(config);
        await audiencesInstance.import();

        // 4 audiences in mock: 2 Lytics (skip), 2 non-Lytics (Contentstack Test, No Source)
        expect(createAudienceCalls.length).to.equal(2);
      });

    test
      .stub(Import.Audiences.prototype, 'init', async () => {})
      .stub(Import.Audiences.prototype, 'createAudience', (async (payload: any) => {
        createAudienceCalls.push({ name: payload.name });
        return { uid: 'new-contentstack-uid', name: payload.name };
      }) as any)
      .it('should not add Lytics audiences to audiencesUidMapper', async () => {
        const audiencesInstance = new Import.Audiences(config);
        await audiencesInstance.import();

        const mapper = (audiencesInstance as any).audiencesUidMapper;
        expect(mapper['lytics-audience-001']).to.be.undefined;
        expect(mapper['lytics-lowercase-001']).to.be.undefined;
      });

    test
      .stub(Import.Audiences.prototype, 'init', async () => {})
      .stub(Import.Audiences.prototype, 'createAudience', (async (payload: any) => {
        createAudienceCalls.push({ name: payload.name });
        return { uid: 'new-contentstack-uid', name: payload.name };
      }) as any)
      .it('should add Contentstack audiences to audiencesUidMapper', async () => {
        const audiencesInstance = new Import.Audiences(config);
        await audiencesInstance.import();

        const mapper = (audiencesInstance as any).audiencesUidMapper;
        expect(mapper['contentstack-audience-001']).to.equal('new-contentstack-uid');
      });
  });
});
