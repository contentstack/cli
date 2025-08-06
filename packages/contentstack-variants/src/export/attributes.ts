import omit from 'lodash/omit';
import { resolve as pResolve } from 'node:path';
import { sanitizePath, log, handleAndLogError } from '@contentstack/cli-utilities';
import { PersonalizeConfig, ExportConfig, AttributesConfig, AttributeStruct } from '../types';
import { fsUtil, PersonalizationAdapter } from '../utils';

export default class ExportAttributes extends PersonalizationAdapter<ExportConfig> {
  private attributesConfig: AttributesConfig;
  private attributesFolderPath: string;
  private attributes: Record<string, unknown>[];
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

      // Initial setup with loading spinner
      await this.withLoadingSpinner('ATTRIBUTES: Initializing export and fetching data...', async () => {
        log.debug('Initializing personalization adapter...', this.exportConfig.context);
        await this.init();
        log.debug('Personalization adapter initialized successfully', this.exportConfig.context);

        log.debug(`Creating attributes directory at: ${this.attributesFolderPath}`, this.exportConfig.context);
        await fsUtil.makeDirectory(this.attributesFolderPath);
        log.debug('Attributes directory created successfully', this.exportConfig.context);
        log.debug('Fetching attributes from personalization API...', this.exportConfig.context);
        this.attributes = (await this.getAttributes()) as AttributeStruct[];
        log.debug(`Fetched ${this.attributes?.length || 0} attributes`, this.exportConfig.context);
      });

      if (!this.attributes?.length) {
        log.debug('No attributes found, completing export', this.exportConfig.context);
        log.info('No Attributes found with the given project!', this.exportConfig.context);
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
        progress = this.createSimpleProgress('Attributes', this.attributes.length + 1);
      }

      log.debug(`Processing ${this.attributes.length} attributes`, this.exportConfig.context);

      // Update progress with process name
      const processName = 'Attributes';
      progress.updateStatus('Sanitizing attributes data...', processName);

      this.sanitizeAttribs();
      log.debug('Attributes sanitization completed', this.exportConfig.context);

      progress.updateStatus('Writing attributes data...', processName);
      const attributesFilePath = pResolve(
        sanitizePath(this.attributesFolderPath),
        sanitizePath(this.attributesConfig.fileName),
      );
      log.debug(`Writing attributes to: ${attributesFilePath}`, this.exportConfig.context);
      fsUtil.writeFile(attributesFilePath, this.attributes);

      if (this.progressManager) {
        this.updateProgress(true, `${this.attributes.length} attributes exported`, undefined, processName);
      }

      // Complete progress only if we're managing our own progress
      if (!this.parentProgressManager) {
        this.completeProgress(true);
      }

      log.debug('Attributes export completed successfully', this.exportConfig.context);
      log.success(
        `Attributes exported successfully! Total attributes: ${this.attributes.length}`,
        this.exportConfig.context,
      );
    } catch (error: any) {
      log.debug(`Error occurred during attributes export: ${error}`, this.exportConfig.context);
      this.completeProgress(false, error?.message || 'Attributes export failed');
      handleAndLogError(error, { ...this.exportConfig.context });
    }
  }

  /**
   * function to remove invalid keys from attributes object
   */
  sanitizeAttribs() {
    log.debug(`Sanitizing ${this.attributes?.length || 0} attributes`, this.exportConfig.context);

    this.attributes =
      this.attributes?.map((attribute, index) => {
        const sanitizedAttribute = omit(attribute, this.attributesConfig.invalidKeys);

        // Update progress for each processed attribute
        if (this.progressManager) {
          const processName = this.parentProgressManager ? 'Attributes' : undefined;
          this.updateProgress(
            true,
            `attribute ${index + 1}/${this.attributes.length}: ${
              (attribute as any)?.name || (attribute as any)?.uid || 'unknown'
            }`,
            undefined,
            processName,
          );
        }

        return sanitizedAttribute;
      }) || [];

    log.debug(
      `Sanitization complete. Total attributes after sanitization: ${this.attributes.length}`,
      this.exportConfig.context,
    );
  }
}
