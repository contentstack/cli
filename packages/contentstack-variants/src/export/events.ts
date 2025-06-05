import omit from 'lodash/omit';
import { resolve as pResolve } from 'node:path';
import { v2Logger, handleAndLogError } from '@contentstack/cli-utilities';

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
      v2Logger.info('Starting events export', this.exportConfig.context);
      await this.init();
      await fsUtil.makeDirectory(this.eventsFolderPath);
      this.events = (await this.getEvents()) as EventStruct[];

      if (!this.events?.length) {
        v2Logger.info('No Events found with the given project!', this.exportConfig.context);
        return;
      } else {
        this.sanitizeAttribs();
        fsUtil.writeFile(pResolve(this.eventsFolderPath, this.eventsConfig.fileName), this.events);
        v2Logger.success(
          `Events exported successfully! Total events: ${this.events.length}`,
          this.exportConfig.context,
        );
        return;
      }
    } catch (error) {
      handleAndLogError(error, { ...this.exportConfig.context });
    }
  }

  /**
   * function to remove invalid keys from event object
   */
  sanitizeAttribs() {
    this.events = this.events?.map((event) => omit(event, this.eventsConfig.invalidKeys)) || [];
  }
}
