import { resolve } from 'path';
import { existsSync } from 'fs';

import { PersonalizationAdapter, fsUtil } from '../utils';
import { APIConfig, EventStruct, ImportConfig, LogType } from '../types';

export default class Events extends PersonalizationAdapter<ImportConfig> {
  private mapperDirPath: string;
  private eventMapperDirPath: string;
  private eventsUidMapperPath: string;
  private eventsUidMapper: Record<string, unknown>;
  private personalizationConfig: ImportConfig['modules']['personalization'];
  private eventsConfig: ImportConfig['modules']['personalization']['events'];

  constructor(public readonly config: ImportConfig, private readonly log: LogType = console.log) {
    const conf: APIConfig = {
      config,
      baseURL: config.modules.personalization.baseURL[config.region.name],
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
    this.log(this.config, this.$t(this.messages.IMPORT_MSG, { module: 'Events' }), 'info');

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
        this.log(this.config, this.$t(this.messages.CREATE_SUCCESS, { module: 'Events' }), 'info');
      } catch (error) {
        this.log(this.config, this.$t(this.messages.CREATE_FAILURE, { module: 'Events' }), 'error');
        this.log(this.config, error, 'error');
      }
    }
  }
}
