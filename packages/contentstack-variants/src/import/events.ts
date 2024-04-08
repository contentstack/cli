import { resolve } from 'path';
import { existsSync } from 'fs';

import { PersonalizationAdapter, fsUtil, log } from '../utils';
import { APIConfig, AttributeStruct, ImportConfig } from '../types';

export default class EventsImport extends PersonalizationAdapter<ImportConfig> {
  private mapperDirPath: string;
  private eventsUidMapperPath: string;
  private eventsUidMapper: Record<string, unknown>;
  private personalizationConfig: ImportConfig['modules']['personalization'];
  private eventsConfig: ImportConfig['modules']['personalization']['events'];

  constructor(public readonly config: ImportConfig) {
    const conf: APIConfig = {
      config,
      baseURL: config.personalizationHost,
      headers: { 'X-Project-Uid': config.project_id, authtoken: config.auth_token },
    };
    super(Object.assign(config, conf));
    this.personalizationConfig = this.config.modules.personalization;
    this.eventsConfig = this.personalizationConfig.attributes;
    this.mapperDirPath = resolve(
      this.config.backupDir,
      'mapper',
      this.personalizationConfig.dirName,
      this.eventsConfig.dirName,
    );
    this.eventsUidMapperPath = resolve(this.mapperDirPath, 'uid-mapping.json');
    this.eventsUidMapper = {};
  }

  /**
   * The function asynchronously imports attributes from a JSON file and creates them in the system.
   */
  async import() {
    log(this.config, this.$t(this.messages.IMPORT_MSG, { module: 'Events' }), 'info');

    await fsUtil.makeDirectory(this.mapperDirPath);
    const { dirName, fileName } = this.eventsConfig;
    const eventsPath = resolve(this.config.data, this.personalizationConfig.dirName, dirName, fileName);

    if (existsSync(eventsPath)) {
      try {
        const events = fsUtil.readFile(eventsPath, true) as AttributeStruct[];

        for (const event of events) {
          const { key, description, uid } = event;
          const eventsResponse = await this.createEvents({ key, description });
          this.eventsUidMapper[uid] = eventsResponse?.uid ?? '';
        }

        fsUtil.writeFile(this.eventsUidMapperPath, this.eventsUidMapper);
        log(this.config, this.$t(this.messages.CREATE_SUCCESS, { module: 'Events' }), 'info');
      } catch (error: any) {
        if (error?.errorMessage || error?.message || error?.error_message) {
          log(this.config, this.$t(this.messages.CREATE_FAILURE, { module: 'Events' }), 'error');
        }
        throw error;
      }
    }
  }
}
