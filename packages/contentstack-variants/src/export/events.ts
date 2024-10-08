import omit from 'lodash/omit';
import { resolve as pResolve } from 'node:path';

import { formatError, fsUtil, PersonalizationAdapter, log } from '../utils';
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
      log(this.exportConfig, 'Starting events export', 'info');
      await this.init();
      await fsUtil.makeDirectory(this.eventsFolderPath);
      this.events = (await this.getEvents()) as EventStruct[];

      if (!this.events?.length) {
        log(this.exportConfig, 'No Events found with the given project!', 'info');
        return;
      } else {
        this.sanitizeAttribs();
        fsUtil.writeFile(pResolve(this.eventsFolderPath, this.eventsConfig.fileName), this.events);
        log(this.exportConfig, 'All the events have been exported successfully!', 'success');
        return;
      }
    } catch (error) {
      log(this.exportConfig, `Failed to export events!`, 'error');
      log(this.config, error, 'error');
    }
  }

  /**
   * function to remove invalid keys from event object
   */
  sanitizeAttribs() {
    this.events = this.events?.map((event) => omit(event, this.eventsConfig.invalidKeys)) || [];
  }
}
