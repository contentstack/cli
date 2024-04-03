import omit from 'lodash/omit';
import { resolve as pResolve } from 'node:path';

import { EclipseConfig, ExportConfig, AttributesConfig, AttributesStruct } from '../types';
import { formatError, fsUtil, PersonalizationAdapter, log, VariantHttpClient } from '../utils';

export default class ExportAttributes extends PersonalizationAdapter<VariantHttpClient<ExportConfig>> {
  private attributesConfig: AttributesConfig;
  private attributesFolderPath: string;
  private attributes: Record<string, unknown>[];
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
    this.attributesConfig = this.exportConfig.modules.attributes;
    this.attributesFolderPath = pResolve(
      this.exportConfig.data,
      this.exportConfig.branchName || '',
      this.eclipseConfig.dirName,
      this.attributesConfig.dirName,
    );
    this.attributes = [];
  }

  async start() {
    try {
      log(this.exportConfig, 'Starting attributes export', 'info');
      await fsUtil.makeDirectory(this.attributesFolderPath);
      this.attributes = (await this.getAttributes()) as AttributesStruct[];

      if (!this.attributes?.length) {
        log(this.exportConfig, 'No Attributes found with the given project!', 'info');
        return;
      } else {
        this.sanitizeAttribs();
        fsUtil.writeFile(pResolve(this.attributesFolderPath, this.attributesConfig.fileName), this.attributes);
        log(this.exportConfig, 'All the attributes have been exported successfully!', 'success');
        return;
      }
    } catch (error: any) {
      if (error?.errorMessage || error?.message || error?.error_message) {
        log(this.exportConfig, `Failed to export attributes! ${formatError(error)}`, 'error');
      } else {
        log(this.exportConfig, `Failed to export attributes! ${error}`, 'error');
      }
    }
  }

  /**
   * function to remove invalid keys from attributes object
   */
  sanitizeAttribs() {
    this.attributes = this.attributes?.map((audience) => omit(audience, this.attributesConfig.invalidKeys)) || [];
  }
}
