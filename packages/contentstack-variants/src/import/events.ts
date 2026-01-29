import { resolve } from 'path';
import { existsSync } from 'fs';
import { sanitizePath, log, handleAndLogError } from '@contentstack/cli-utilities';
import { PersonalizationAdapter, fsUtil } from '../utils';
import { APIConfig, EventStruct, ImportConfig } from '../types';
import { PROCESS_NAMES, MODULE_CONTEXTS, IMPORT_PROCESS_STATUS } from '../utils/constants';

export default class Events extends PersonalizationAdapter<ImportConfig> {
  private mapperDirPath: string;
  private eventMapperDirPath: string;
  private eventsUidMapperPath: string;
  private eventsUidMapper: Record<string, unknown>;
  private personalizeConfig: ImportConfig['modules']['personalize'];
  private eventConfig: ImportConfig['modules']['personalize']['events'];
  private events: EventStruct[];

  constructor(public readonly config: ImportConfig) {
    const conf: APIConfig = {
      config,
      baseURL: config.modules.personalize.baseURL[config.region.name],
      headers: { 'X-Project-Uid': config.modules.personalize.project_id },
    };
    super(Object.assign(config, conf));

    this.personalizeConfig = this.config.modules.personalize;
    this.eventConfig = this.personalizeConfig.events;
    this.mapperDirPath = resolve(
      sanitizePath(this.config.backupDir),
      'mapper',
      sanitizePath(this.personalizeConfig.dirName),
    );
    this.eventMapperDirPath = resolve(sanitizePath(this.mapperDirPath), sanitizePath(this.eventConfig.dirName));
    this.eventsUidMapperPath = resolve(sanitizePath(this.eventMapperDirPath), 'uid-mapping.json');
    this.eventsUidMapper = {};
    this.events = [];
    this.config.context.module = MODULE_CONTEXTS.EVENTS;
  }

  /**
   * The function asynchronously imports events from a JSON file and creates them in the system.
   */
  async import() {
    try {
      log.debug('Starting events import...', this.config.context);

      const [canImport, eventsCount] = await this.analyzeEvents();
      if (!canImport) {
        log.info('No events found to import', this.config.context);
        // Still need to mark as complete for parent progress
        if (this.parentProgressManager) {
          this.parentProgressManager.tick(true, 'events module (no data)', null, PROCESS_NAMES.EVENTS);
        }
        return;
      }

      // Don't create own progress manager if we have a parent
      let progress;
      if (this.parentProgressManager) {
        progress = this.parentProgressManager;
        log.debug('Using parent progress manager for events import', this.config.context);
        this.parentProgressManager.updateProcessTotal(PROCESS_NAMES.EVENTS, eventsCount);
      } else {
        progress = this.createSimpleProgress(PROCESS_NAMES.EVENTS, eventsCount);
        log.debug('Created standalone progress manager for events import', this.config.context);
      }

      await this.init();
      await fsUtil.makeDirectory(this.eventMapperDirPath);
      log.debug(`Created mapper directory: ${this.eventMapperDirPath}`, this.config.context);

      log.info(`Processing ${eventsCount} events`, this.config.context);

      for (const event of this.events) {
        const { key, description, uid } = event;
        if (!this.parentProgressManager) {
          progress.updateStatus(IMPORT_PROCESS_STATUS[PROCESS_NAMES.EVENTS].CREATING);
        }
        log.debug(`Processing event: ${key} (${uid})`, this.config.context);

        try {
          log.debug(`Creating event: ${key}`, this.config.context);
          const eventRes = await this.createEvents({ key, description });
          this.eventsUidMapper[uid] = eventRes?.uid ?? '';

          // For parent progress manager, we don't need to specify process name as it will be handled automatically
          if (this.parentProgressManager) {
            this.updateProgress(true, `event: ${key}`);
          } else {
            this.updateProgress(true, `event: ${key}`, undefined, PROCESS_NAMES.EVENTS);
          }
          log.debug(`Created event: ${uid} -> ${eventRes?.uid}`, this.config.context);
        } catch (error) {
          if (this.parentProgressManager) {
            this.updateProgress(false, `event: ${key}`, (error as any)?.message);
          } else {
            this.updateProgress(false, `event: ${key}`, (error as any)?.message, PROCESS_NAMES.EVENTS);
          }
          handleAndLogError(error, this.config.context, `Failed to create event: ${key} (${uid})`);
        }
      }

      fsUtil.writeFile(this.eventsUidMapperPath, this.eventsUidMapper);
      log.debug(`Saved ${Object.keys(this.eventsUidMapper).length} event mappings`, this.config.context);

      // Only complete progress if we own the progress manager (no parent)
      if (!this.parentProgressManager) {
        this.completeProgress(true);
      }
      log.success(
        `Events imported successfully! Total events: ${eventsCount} - personalization enabled`,
        this.config.context,
      );
    } catch (error) {
      if (!this.parentProgressManager) {
        this.completeProgress(false, (error as any)?.message || 'Events import failed');
      }
      handleAndLogError(error, this.config.context);
      throw error;
    }
  }

  private async analyzeEvents(): Promise<[boolean, number]> {
    return this.withLoadingSpinner('EVENTS: Analyzing import data...', async () => {
      const { dirName, fileName } = this.eventConfig;
      const eventsPath = resolve(
        sanitizePath(this.config.contentDir),
        sanitizePath(this.personalizeConfig.dirName),
        sanitizePath(dirName),
        sanitizePath(fileName),
      );

      log.debug(`Checking for events file: ${eventsPath}`, this.config.context);

      if (!existsSync(eventsPath)) {
        log.warn(`Events file not found: ${eventsPath}`, this.config.context);
        return [false, 0];
      }

      this.events = fsUtil.readFile(eventsPath, true) as EventStruct[];
      const eventsCount = this.events?.length || 0;

      log.debug(`Found ${eventsCount} events to import`, this.config.context);
      return [eventsCount > 0, eventsCount];
    });
  }
}
