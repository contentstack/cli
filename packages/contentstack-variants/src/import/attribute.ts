import { resolve } from 'path';
import { existsSync } from 'fs';
import { sanitizePath, log, handleAndLogError } from '@contentstack/cli-utilities';
import { PersonalizationAdapter, fsUtil } from '../utils';
import { APIConfig, AttributeStruct, ImportConfig, LogType } from '../types';

export default class Attribute extends PersonalizationAdapter<ImportConfig> {
  private mapperDirPath: string;
  private attrMapperDirPath: string;
  private attributesUidMapperPath: string;
  private attributesUidMapper: Record<string, unknown>;
  private personalizeConfig: ImportConfig['modules']['personalize'];
  private attributeConfig: ImportConfig['modules']['personalize']['attributes'];
  private attributeData: AttributeStruct[];

  constructor(public readonly config: ImportConfig) {
    const conf: APIConfig = {
      config,
      baseURL: config.modules.personalize.baseURL[config.region.name],
      headers: { 'X-Project-Uid': config.modules.personalize.project_id },
    };
    super(Object.assign(config, conf));

    this.personalizeConfig = this.config.modules.personalize;
    this.attributeConfig = this.personalizeConfig.attributes;
    this.mapperDirPath = resolve(
      sanitizePath(this.config.backupDir),
      'mapper',
      sanitizePath(this.personalizeConfig.dirName),
    );
    this.attrMapperDirPath = resolve(sanitizePath(this.mapperDirPath), sanitizePath(this.attributeConfig.dirName));
    this.attributesUidMapperPath = resolve(sanitizePath(this.attrMapperDirPath), 'uid-mapping.json');
    this.attributesUidMapper = {};
    this.config.context.module = 'attributes';
    this.attributeData = [];
  }

  /**
   * The function asynchronously imports attributes from a JSON file and creates them in the system.
   */
  async import() {
    try {
      log.debug('Starting attributes import...', this.config.context);

      const [canImport, attributesCount] = await this.analyzeAttributes();
      if (!canImport) {
        log.info('No attributes found to import', this.config.context);
        // Still need to mark as complete for parent progress
        if (this.parentProgressManager) {
          this.parentProgressManager.tick(true, 'attributes module (no data)', null, 'Attributes');
        }
        return;
      }

      // If we have a parent progress manager, use it as a sub-module
      // Otherwise create our own simple progress manager
      let progress;
      if (this.parentProgressManager) {
        progress = this.parentProgressManager;
        log.debug('Using parent progress manager for attributes import', this.config.context);
      } else {
        progress = this.createSimpleProgress('Attributes', attributesCount);
        log.debug('Created standalone progress manager for attributes import', this.config.context);
      }

      await this.init();
      await fsUtil.makeDirectory(this.attrMapperDirPath);
      log.debug(`Created mapper directory: ${this.attrMapperDirPath}`, this.config.context);

      const { dirName, fileName } = this.attributeConfig;
      log.info(`Processing ${attributesCount} attributes`, this.config.context);

      for (const attribute of this.attributeData) {
        const { key, name, description, uid } = attribute;
        if (!this.parentProgressManager) {
          progress.updateStatus(`Processing attribute: ${name}...`);
        }
        log.debug(`Processing attribute: ${name} - ${attribute.__type}`, this.config.context);

        // skip creating preset attributes, as they are already present in the system
        if (attribute.__type === 'PRESET') {
          log.debug(`Skipping preset attribute: ${name}`, this.config.context);
          this.updateProgress(true, `attribute: ${name} (preset - skipped)`, undefined, 'Attributes');
          continue;
        }

        try {
          log.debug(`Creating custom attribute: ${name}`, this.config.context);
          const attributeRes = await this.createAttribute({ key, name, description });
          //map old attribute uid to new attribute uid
          //mapper file is used to check whether attribute created or not before creating audience
          this.attributesUidMapper[uid] = attributeRes?.uid ?? '';

          this.updateProgress(true, `attribute: ${name}`, undefined, 'Attributes');
          log.debug(`Created attribute: ${uid} -> ${attributeRes?.uid}`, this.config.context);
        } catch (error) {
          this.updateProgress(false, `attribute: ${name}`, (error as any)?.message, 'Attributes');
          handleAndLogError(error, this.config.context, `Failed to create attribute: ${name}`);
        }
      }

      fsUtil.writeFile(this.attributesUidMapperPath, this.attributesUidMapper);
      log.debug(`Saved ${Object.keys(this.attributesUidMapper).length} attribute mappings`, this.config.context);

      if (!this.parentProgressManager) {
        this.completeProgress(true);
      }
      log.success(
        `Attributes imported successfully! Total attributes: ${attributesCount} - personalization enabled`,
        this.config.context,
      );
    } catch (error) {
      if (!this.parentProgressManager) {
        this.completeProgress(false, (error as any)?.message || 'Attributes import failed');
      }
      handleAndLogError(error, this.config.context);
      throw error;
    }
  }

  private async analyzeAttributes(): Promise<[boolean, number]> {
    return this.withLoadingSpinner('ATTRIBUTES: Analyzing import data...', async () => {
      const { dirName, fileName } = this.attributeConfig;
      const attributesPath = resolve(
        sanitizePath(this.config.data),
        sanitizePath(this.personalizeConfig.dirName),
        sanitizePath(dirName),
        sanitizePath(fileName),
      );

      log.debug(`Checking for attributes file: ${attributesPath}`, this.config.context);

      if (!existsSync(attributesPath)) {
        log.warn(`Attributes file not found: ${attributesPath}`, this.config.context);
        return [false, 0];
      }

      this.attributeData = fsUtil.readFile(attributesPath, true) as AttributeStruct[];
      const attributesCount = this.attributeData?.length || 0;

      log.debug(`Found ${attributesCount} attributes to import`, this.config.context);
      return [attributesCount > 0, attributesCount];
    });
  }
}
