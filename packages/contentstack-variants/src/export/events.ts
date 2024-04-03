import omit from 'lodash/omit';
import { resolve as pResolve } from 'node:path';

import { formatError, fsUtil, PersonalizationAdapter, log, VariantHttpClient } from '../utils';
import { EclipseConfig, ExportConfig, EventsStruct, EventsConfig, LogType } from '../types';

export default class ExportEvents extends PersonalizationAdapter<VariantHttpClient<ExportConfig>> {
  private eventsConfig: EventsConfig;
  private eventsFolderPath: string;
  private events: Record<string, unknown>[];
  public exportConfig: ExportConfig;
  public eclipseConfig: EclipseConfig;

  constructor(exportConfig: ExportConfig) {
    super({
      config: { ...exportConfig },
      baseURL: exportConfig.modules.eclipse.baseURL,
      headers: {
        organization_uid: exportConfig.org_uid,
        authtoken: exportConfig.auth_token,
        project_id: exportConfig.project_id,
      },
    });
    this.exportConfig = exportConfig;
    this.eclipseConfig = this.exportConfig.modules.eclipse;
    this.eventsConfig = this.exportConfig.modules.events;
    this.eventsFolderPath = pResolve(
      this.exportConfig.data,
      this.exportConfig.branchName || '',
      this.eclipseConfig.dirName,
      this.eventsConfig.dirName,
    );
    this.events = [];
  }

  async start() {
    try {
      log(this.exportConfig, 'Starting events export', 'info');
      await fsUtil.makeDirectory(this.eventsFolderPath);
      this.events = (await this.getEvents()) as EventsStruct[];

      if (!this.events?.length) {
        log(this.exportConfig, 'No Events found with the given project!', 'info');
        return;
      } else {
        this.sanitizeAttribs();
        fsUtil.writeFile(pResolve(this.eventsFolderPath, this.eventsConfig.fileName), this.events);
        log(this.exportConfig, 'All the events have been exported successfully!', 'success');
        return;
      }
    } catch (error: any) {
      if (error?.errorMessage || error?.message || error?.error_message) {
        log(this.exportConfig, `Failed to export events! ${formatError(error)}`, 'error');
      } else {
        log(this.exportConfig, `Failed to export events! ${error}`, 'error');
      }
    }
  }

  /**
   * function to remove invalid keys from event object
   */
  sanitizeAttribs() {
    this.events = this.events?.map((event) => omit(event, this.eventsConfig.invalidKeys)) || [];
  }
}
