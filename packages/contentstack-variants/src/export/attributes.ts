import omit from 'lodash/omit';
import { resolve as pResolve } from 'node:path';
import { sanitizePath, log, handleAndLogError } from '@contentstack/cli-utilities';
import {fsUtil, PersonalizationAdapter } from '../utils';
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
    this.exportConfig = exportConfig;
    this.personalizeConfig = exportConfig.modules.personalize;
    this.attributesConfig = exportConfig.modules.attributes;
    this.attributesFolderPath = pResolve(
      sanitizePath(exportConfig.data),
      sanitizePath(exportConfig.branchName || ''),
      sanitizePath(this.personalizeConfig.dirName),
      sanitizePath(this.attributesConfig.dirName),
    );
    this.attributes = [];
    this.exportConfig.context.module = 'attributes';
  }

  async start() {
    try {
      log.info('Starting attributes export', this.exportConfig.context);
      
      log.debug('Initializing personalization adapter...', this.exportConfig.context);
      await this.init();
      log.debug('Personalization adapter initialized successfully', this.exportConfig.context);
      
      log.debug(`Creating attributes directory at: ${this.attributesFolderPath}`, this.exportConfig.context);
      await fsUtil.makeDirectory(this.attributesFolderPath);
      log.debug('Attributes directory created successfully', this.exportConfig.context);
      
      log.debug('Fetching attributes from personalization API...', this.exportConfig.context);
      this.attributes = (await this.getAttributes()) as AttributeStruct[];
      log.debug(`Fetched ${this.attributes?.length || 0} attributes`, this.exportConfig.context);

      if (!this.attributes?.length) {
        log.debug('No attributes found, completing export', this.exportConfig.context);
        log.info('No attributes found for the given project.', this.exportConfig.context);
      } else {
        log.debug(`Processing ${this.attributes.length} attributes`, this.exportConfig.context);
        this.sanitizeAttribs();
        log.debug('Attributes sanitization completed', this.exportConfig.context);
        
        const attributesFilePath = pResolve(sanitizePath(this.attributesFolderPath), sanitizePath(this.attributesConfig.fileName));
        log.debug(`Writing attributes to: ${attributesFilePath}`, this.exportConfig.context);
        fsUtil.writeFile(attributesFilePath, this.attributes);
        
        log.debug('Attributes export completed successfully', this.exportConfig.context);
        log.success(
          `Attributes exported successfully! Total attributes: ${this.attributes.length}`,
          this.exportConfig.context,
        );
      }
    } catch (error) {
      log.debug(`Error occurred during attributes export: ${error}`, this.exportConfig.context);
      handleAndLogError(error, { ...this.exportConfig.context });
    }
  }

  /**
   * function to remove invalid keys from attributes object
   */
  sanitizeAttribs() {
    log.debug(`Sanitizing ${this.attributes?.length || 0} attributes`, this.exportConfig.context);
    log.debug(`Invalid keys to remove: ${JSON.stringify(this.attributesConfig.invalidKeys)}`, this.exportConfig.context);
    
    this.attributes = this.attributes?.map((audience) => omit(audience, this.attributesConfig.invalidKeys)) || [];
    
    log.debug(`Sanitization complete. Total attributes after sanitization: ${this.attributes.length}`, this.exportConfig.context);
  }
}
