import { resolve } from 'path';
import { existsSync } from 'fs';
import { sanitizePath } from '@contentstack/cli-utilities';
import { PersonalizationAdapter, fsUtil } from '../utils';
import { APIConfig, EventStruct, ImportConfig, LogType } from '../types';

export default class Events extends PersonalizationAdapter<ImportConfig> {
  private mapperDirPath: string;
  private eventMapperDirPath: string;
  private eventsUidMapperPath: string;
  private eventsUidMapper: Record<string, unknown>;
  private personalizeConfig: ImportConfig['modules']['personalize'];
  private eventsConfig: ImportConfig['modules']['personalize']['events'];

  constructor(public readonly config: ImportConfig, private readonly log: LogType = console.log) {
    const conf: APIConfig = {
      config,
      baseURL: config.modules.personalize.baseURL[config.region.name],
      headers: { 'X-Project-Uid': config.modules.personalize.project_id, authtoken: config.auth_token },
    };
    super(Object.assign(config, conf));
    this.personalizeConfig = this.config.modules.personalize;
    this.eventsConfig = this.personalizeConfig.events;
    this.mapperDirPath = resolve(sanitizePath(this.config.backupDir), 'mapper', sanitizePath(this.personalizeConfig.dirName));
    this.eventMapperDirPath = resolve(sanitizePath(this.mapperDirPath), sanitizePath(this.eventsConfig.dirName));
    this.eventsUidMapperPath = resolve(sanitizePath(this.eventMapperDirPath), 'uid-mapping.json');
    this.eventsUidMapper = {};
  }

  /**
   * The function asynchronously imports attributes from a JSON file and creates them in the system.
   */
  async import() {
    this.log(this.config, this.$t(this.messages.IMPORT_MSG, { module: 'Events' }), 'info');

    await fsUtil.makeDirectory(this.eventMapperDirPath);
    const { dirName, fileName } = this.eventsConfig;
    const eventsPath = resolve(sanitizePath(this.config.data), sanitizePath(this.personalizeConfig.dirName), sanitizePath(dirName), sanitizePath(fileName));

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
