import omit from 'lodash/omit';
import { resolve as pResolve } from 'node:path';
import { log, handleAndLogError } from '@contentstack/cli-utilities';

import { fsUtil, PersonalizationAdapter } from '../utils';
import { PersonalizeConfig, ExportConfig, EventStruct, EventsConfig } from '../types';

export default class ExportEvents extends PersonalizationAdapter<ExportConfig> {
  private eventsConfig: EventsConfig;
  private eventsFolderPath: string;
  private events: Record<string, unknown>[];
  public personalizeConfig: PersonalizeConfig;

  constructor(readonly exportConfig: ExportConfig) {
    super({
      config: exportConfig,
      baseURL: exportConfig.modules.personalize.baseURL[exportConfig.region.name],
      headers: { 'X-Project-Uid': exportConfig.project_id },
    });
    this.personalizeConfig = exportConfig.modules.personalize;
    this.eventsConfig = exportConfig.modules.events;
    this.eventsFolderPath = pResolve(
      exportConfig.data,
      exportConfig.branchName || '',
      this.personalizeConfig.dirName,
      this.eventsConfig.dirName,
    );
    this.events = [];
  }

  async start() {
    try {
      log.debug('Starting events export process...', this.exportConfig.context);
      log.info('Starting events export', this.exportConfig.context);
      
      log.debug('Initializing personalization adapter...', this.exportConfig.context);
      await this.init();
      log.debug('Personalization adapter initialized successfully', this.exportConfig.context);
      
      log.debug(`Creating events directory at: ${this.eventsFolderPath}`, this.exportConfig.context);
      await fsUtil.makeDirectory(this.eventsFolderPath);
      log.debug('Events directory created successfully', this.exportConfig.context);
      
      log.debug('Fetching events from personalization API...', this.exportConfig.context);
      this.events = (await this.getEvents()) as EventStruct[];
      log.debug(`Fetched ${this.events?.length || 0} events`, this.exportConfig.context);

      if (!this.events?.length) {
        log.debug('No events found, completing export', this.exportConfig.context);
        log.info('No Events found with the given project!', this.exportConfig.context);
        return;
      } else {
        log.debug(`Processing ${this.events.length} events`, this.exportConfig.context);
        this.sanitizeAttribs();
        log.debug('Events sanitization completed', this.exportConfig.context);
        
        const eventsFilePath = pResolve(this.eventsFolderPath, this.eventsConfig.fileName);
        log.debug(`Writing events to: ${eventsFilePath}`, this.exportConfig.context);
        fsUtil.writeFile(eventsFilePath, this.events);
        
        log.debug('Events export completed successfully', this.exportConfig.context);
        log.success(
          `Events exported successfully! Total events: ${this.events.length}`,
          this.exportConfig.context,
        );
        return;
      }
    } catch (error) {
      log.debug(`Error occurred during events export: ${error}`, this.exportConfig.context);
      handleAndLogError(error, { ...this.exportConfig.context });
    }
  }

  /**
   * function to remove invalid keys from event object
   */
  sanitizeAttribs() {
    log.debug(`Sanitizing ${this.events?.length || 0} events`, this.exportConfig.context);
    log.debug(`Invalid keys to remove: ${JSON.stringify(this.eventsConfig.invalidKeys)}`, this.exportConfig.context);
    
    this.events = this.events?.map((event) => omit(event, this.eventsConfig.invalidKeys)) || [];
    
    log.debug(`Sanitization complete. Total events after sanitization: ${this.events.length}`, this.exportConfig.context);
  }
}
