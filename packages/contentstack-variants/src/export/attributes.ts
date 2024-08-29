import omit from 'lodash/omit';
import { resolve as pResolve } from 'node:path';
import { sanitizePath } from '@contentstack/cli-utilities';
import { formatError, fsUtil, PersonalizationAdapter, log } from '../utils';
import { PersonalizationConfig, ExportConfig, AttributesConfig, AttributeStruct } from '../types';

export default class ExportAttributes extends PersonalizationAdapter<ExportConfig> {
  private attributesConfig: AttributesConfig;
  private attributesFolderPath: string;
  private attributes: Record<string, unknown>[];
  public personalizationConfig: PersonalizationConfig;

  constructor(readonly exportConfig: ExportConfig) {
    super({
      config: exportConfig,
      baseURL: exportConfig.modules.personalization.baseURL as unknown as string || exportConfig.modules.personalization.baseURL[exportConfig.region.name],
      headers: { authtoken: exportConfig.auth_token, 'X-Project-Uid': exportConfig.project_id },
    });
    this.personalizationConfig = exportConfig.modules.personalization;
    this.attributesConfig = exportConfig.modules.attributes;
    this.attributesFolderPath = pResolve(
      sanitizePath(exportConfig.data),
      sanitizePath(exportConfig.branchName || ''),
      sanitizePath(this.personalizationConfig.dirName),
      sanitizePath(this.attributesConfig.dirName),
    );
    this.attributes = [];
  }

  async start() {
    try {
      log(this.exportConfig, 'Starting attributes export', 'info');
      await fsUtil.makeDirectory(this.attributesFolderPath);
      this.attributes = (await this.getAttributes()) as AttributeStruct[];

      if (!this.attributes?.length) {
        log(this.exportConfig, 'No Attributes found with the given project!', 'info');
      } else {
        this.sanitizeAttribs();
        fsUtil.writeFile(pResolve(sanitizePath(this.attributesFolderPath), sanitizePath(this.attributesConfig.fileName)), this.attributes);
        log(this.exportConfig, 'All the attributes have been exported successfully!', 'success');
      }
    } catch (error) {
      log(this.exportConfig, `Failed to export attributes!`, 'error');
      log(this.config, error, 'error');
    }
  }

  /**
   * function to remove invalid keys from attributes object
   */
  sanitizeAttribs() {
    this.attributes = this.attributes?.map((audience) => omit(audience, this.attributesConfig.invalidKeys)) || [];
  }
}
