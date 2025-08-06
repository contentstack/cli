import omit from 'lodash/omit';
import { resolve as pResolve } from 'node:path';
import { sanitizePath, log, handleAndLogError } from '@contentstack/cli-utilities';
import { PersonalizeConfig, ExportConfig, EventsConfig, EventStruct } from '../types';
import { fsUtil, PersonalizationAdapter } from '../utils';

export default class ExportEvents extends PersonalizationAdapter<ExportConfig> {
  private eventsConfig: EventsConfig;
  private eventsFolderPath: string;
  private events: Record<string, unknown>[];
  public exportConfig: ExportConfig;
  public personalizeConfig: PersonalizeConfig;

  constructor(exportConfig: ExportConfig) {
    super({
      config: exportConfig,
      baseURL: exportConfig.modules.personalize.baseURL[exportConfig.region.name],
      headers: { 'X-Project-Uid': exportConfig.project_id },
    });
    this.exportConfig = exportConfig;
    this.personalizeConfig = exportConfig.modules.personalize;
    this.eventsConfig = exportConfig.modules.events;
    this.eventsFolderPath = pResolve(
      sanitizePath(exportConfig.data),
      sanitizePath(exportConfig.branchName || ''),
      sanitizePath(this.personalizeConfig.dirName),
      sanitizePath(this.eventsConfig.dirName),
    );
    this.events = [];
    this.exportConfig.context.module = 'events';
  }

  async start() {
    try {
      log.debug('Starting events export process...', this.exportConfig.context);
      log.info('Starting events export', this.exportConfig.context);

      await this.withLoadingSpinner('EVENTS: Initializing export and fetching data...', async () => {
        log.debug('Initializing personalization adapter...', this.exportConfig.context);
        await this.init();
        log.debug('Personalization adapter initialized successfully', this.exportConfig.context);

        log.debug(`Creating events directory at: ${this.eventsFolderPath}`, this.exportConfig.context);
        await fsUtil.makeDirectory(this.eventsFolderPath);
        log.debug('Events directory created successfully', this.exportConfig.context);

        log.debug('Fetching events from personalization API...', this.exportConfig.context);
        this.events = (await this.getEvents()) as EventStruct[];
        log.debug(`Fetched ${this.events?.length || 0} events`, this.exportConfig.context);
      });

      if (!this.events?.length) {
        log.debug('No events found, completing export', this.exportConfig.context);
        log.info('No Events found with the given project!', this.exportConfig.context);
        return;
      }

      // Create progress manager - use parent if available, otherwise create simple
      let progress: any;
      if (this.parentProgressManager) {
        // Use parent progress manager - we're part of the personalize modules process
        progress = this.parentProgressManager;
        this.progressManager = this.parentProgressManager;
      } else {
        // Create our own progress for standalone execution
        progress = this.createSimpleProgress('Events', this.events.length + 1);
      }

      log.debug(`Processing ${this.events.length} events`, this.exportConfig.context);
      
      // Update progress with process name
      const processName = 'Events';
      progress.updateStatus('Sanitizing events data...', processName);
      
      this.sanitizeAttribs();
      log.debug('Events sanitization completed', this.exportConfig.context);

      progress.updateStatus('Writing events data...', processName);
      const eventsFilePath = pResolve(sanitizePath(this.eventsFolderPath), sanitizePath(this.eventsConfig.fileName));
      log.debug(`Writing events to: ${eventsFilePath}`, this.exportConfig.context);
      fsUtil.writeFile(eventsFilePath, this.events);

      // Final progress update 
      if (this.progressManager) {
        this.updateProgress(true, `${this.events.length} events exported`, undefined, processName);
      }

      // Complete progress only if we're managing our own progress
      if (!this.parentProgressManager) {
        this.completeProgress(true);
      }

      log.debug('Events export completed successfully', this.exportConfig.context);
      log.success(`Events exported successfully! Total events: ${this.events.length}`, this.exportConfig.context);
    } catch (error: any) {
      log.debug(`Error occurred during events export: ${error}`, this.exportConfig.context);
      this.completeProgress(false, error?.message || 'Events export failed');
      handleAndLogError(error, { ...this.exportConfig.context });
    }
  }

  /**
   * function to remove invalid keys from event object
   */
  sanitizeAttribs() {
    log.debug(`Sanitizing ${this.events?.length || 0} events`, this.exportConfig.context);

    this.events =
      this.events?.map((event, index) => {
        const sanitizedEvent = omit(event, this.eventsConfig.invalidKeys);

        // Update progress for each processed event 
        if (this.progressManager) {
          const processName = this.parentProgressManager ? 'Events' : undefined;
          this.updateProgress(
            true,
            `event ${index + 1}/${this.events.length}: ${
              (event as any).key || (event as any).name || (event as any).uid || 'unknown'
            }`,
            undefined,
            processName
          );
        }

        return sanitizedEvent;
      }) || [];

    log.debug(
      `Sanitization complete. Total events after sanitization: ${this.events.length}`,
      this.exportConfig.context,
    );
  }
}
