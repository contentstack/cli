import { resolve } from 'path';
import { existsSync } from 'fs';
import { sanitizePath, log, handleAndLogError } from '@contentstack/cli-utilities';
import { PersonalizationAdapter, fsUtil } from '../utils';
import { APIConfig, EventStruct, ImportConfig } from '../types';

export default class Events extends PersonalizationAdapter<ImportConfig> {
  private mapperDirPath: string;
  private eventMapperDirPath: string;
  private eventsUidMapperPath: string;
  private eventsUidMapper: Record<string, unknown>;
  private personalizeConfig: ImportConfig['modules']['personalize'];
  private eventsConfig: ImportConfig['modules']['personalize']['events'];

  constructor(public readonly config: ImportConfig) {
    const conf: APIConfig = {
      config,
      baseURL: config.modules.personalize.baseURL[config.region.name],
      headers: { 'X-Project-Uid': config.modules.personalize.project_id },
    };
    super(Object.assign(config, conf));
    
    this.personalizeConfig = this.config.modules.personalize;
    this.eventsConfig = this.personalizeConfig.events;
    this.mapperDirPath = resolve(
      sanitizePath(this.config.backupDir),
      'mapper',
      sanitizePath(this.personalizeConfig.dirName),
    );
    this.eventMapperDirPath = resolve(sanitizePath(this.mapperDirPath), sanitizePath(this.eventsConfig.dirName));
    this.eventsUidMapperPath = resolve(sanitizePath(this.eventMapperDirPath), 'uid-mapping.json');
    this.eventsUidMapper = {};
    this.config.context.module = 'events';
  }

  /**
   * The function asynchronously imports events from a JSON file and creates them in the system.
   */
  async import() {
    await this.init();
    await fsUtil.makeDirectory(this.eventMapperDirPath);
    log.debug(`Created mapper directory: ${this.eventMapperDirPath}`, this.config.context);
    
    const { dirName, fileName } = this.eventsConfig;
    const eventsPath = resolve(
      sanitizePath(this.config.data),
      sanitizePath(this.personalizeConfig.dirName),
      sanitizePath(dirName),
      sanitizePath(fileName),
    );

    log.debug(`Checking for events file: ${eventsPath}`, this.config.context);
    
    if (existsSync(eventsPath)) {
      try {
        const events = fsUtil.readFile(eventsPath, true) as EventStruct[];
        log.info(`Found ${events.length} events to import`, this.config.context);

        for (const event of events) {
          const { key, description, uid } = event;
          log.debug(`Processing event: ${key} (${uid})...`, this.config.context);
          
          try {
            log.debug(`Creating event: ${key}`, this.config.context);
            const eventsResponse = await this.createEvents({ key, description });
            this.eventsUidMapper[uid] = eventsResponse?.uid ?? '';
            log.debug(`Created event: ${uid} -> ${eventsResponse?.uid}`, this.config.context);
          } catch (error) {
            handleAndLogError(error, this.config.context, `Failed to create event: ${key} (${uid})`);
          }
        }

        fsUtil.writeFile(this.eventsUidMapperPath, this.eventsUidMapper);
        log.debug(`Saved ${Object.keys(this.eventsUidMapper).length} event mappings to: ${this.eventsUidMapperPath}`, this.config.context);
        log.success('Events imported successfully', this.config.context);
      } catch (error) {
        handleAndLogError(error, this.config.context);
      }
    } else {
      log.warn(`Events file not found: ${eventsPath}`, this.config.context);
    }
  }
}
