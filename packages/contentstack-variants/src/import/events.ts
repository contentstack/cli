import { resolve } from 'path';
import { existsSync } from 'fs';

import { PersonalizationAdapter, fsUtil, log } from '../utils';
import { APIConfig, EventStruct, ImportConfig } from '../types';

export default class Events extends PersonalizationAdapter<ImportConfig> {
  private mapperDirPath: string;
  private eventMapperDirPath: string;
  private eventsUidMapperPath: string;
  private eventsUidMapper: Record<string, unknown>;
  private personalizationConfig: ImportConfig['modules']['personalization'];
  private eventsConfig: ImportConfig['modules']['personalization']['events'];

  constructor(public readonly config: ImportConfig) {
    const conf: APIConfig = {
      config,
      baseURL: config.personalizationHost,
      headers: { 'X-Project-Uid': config.modules.personalization.project_id, authtoken: config.auth_token },
    };
    super(Object.assign(config, conf));
    this.personalizationConfig = this.config.modules.personalization;
    this.eventsConfig = this.personalizationConfig.events;
    this.mapperDirPath = resolve(this.config.backupDir, 'mapper', this.personalizationConfig.dirName);
    this.eventMapperDirPath = resolve(this.mapperDirPath, this.eventsConfig.dirName);
    this.eventsUidMapperPath = resolve(this.eventMapperDirPath, 'uid-mapping.json');
    this.eventsUidMapper = {};
  }

  /**
   * The function asynchronously imports attributes from a JSON file and creates them in the system.
   */
  async import() {
    log(this.config, this.$t(this.messages.IMPORT_MSG, { module: 'Events' }), 'info');

    await fsUtil.makeDirectory(this.eventMapperDirPath);
    const { dirName, fileName } = this.eventsConfig;
    const eventsPath = resolve(this.config.data, this.personalizationConfig.dirName, dirName, fileName);

    if (existsSync(eventsPath)) {
      try {
        const events = fsUtil.readFile(eventsPath, true) as EventStruct[];

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
