import omit from 'lodash/omit';
import { resolve as pResolve } from 'node:path';
import { sanitizePath, v2Logger, handleAndLogError } from '@contentstack/cli-utilities';
import { formatError, fsUtil, PersonalizationAdapter } from '../utils';
import { PersonalizeConfig, ExportConfig, AttributesConfig, AttributeStruct } from '../types';

export default class ExportAttributes extends PersonalizationAdapter<ExportConfig> {
  private attributesConfig: AttributesConfig;
  private attributesFolderPath: string;
  private attributes: Record<string, unknown>[];
  public personalizeConfig: PersonalizeConfig;

  constructor(readonly exportConfig: ExportConfig) {
    super({
      config: exportConfig,
      baseURL: exportConfig.modules.personalize.baseURL[exportConfig.region.name],
      headers: { 'X-Project-Uid': exportConfig.project_id },
    });
    this.personalizeConfig = exportConfig.modules.personalize;
    this.attributesConfig = exportConfig.modules.attributes;
    this.attributesFolderPath = pResolve(
      sanitizePath(exportConfig.data),
      sanitizePath(exportConfig.branchName || ''),
      sanitizePath(this.personalizeConfig.dirName),
      sanitizePath(this.attributesConfig.dirName),
    );
    this.attributes = [];
  }

  async start() {
    try {
      v2Logger.info('Starting attributes export', this.exportConfig.context);
      await this.init();
      await fsUtil.makeDirectory(this.attributesFolderPath);
      this.attributes = (await this.getAttributes()) as AttributeStruct[];

      if (!this.attributes?.length) {
        v2Logger.info('No Attributes found with the given project!', this.exportConfig.context);
      } else {
        this.sanitizeAttribs();
        fsUtil.writeFile(
          pResolve(sanitizePath(this.attributesFolderPath), sanitizePath(this.attributesConfig.fileName)),
          this.attributes,
        );
        v2Logger.success(
          `Attributes exported successfully! Total attributes: ${this.attributes.length}`,
          this.exportConfig.context,
        );
      }
    } catch (error) {
      handleAndLogError(error, { ...this.exportConfig.context });
    }
  }

  /**
   * function to remove invalid keys from attributes object
   */
  sanitizeAttribs() {
    this.attributes = this.attributes?.map((audience) => omit(audience, this.attributesConfig.invalidKeys)) || [];
  }
}
