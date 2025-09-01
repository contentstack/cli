import { resolve } from 'path';
import { existsSync } from 'fs';
import { sanitizePath, log, handleAndLogError } from '@contentstack/cli-utilities';
import { APIConfig, AudienceStruct, ImportConfig } from '../types';
import { PersonalizationAdapter, fsUtil, lookUpAttributes } from '../utils';
import { PROCESS_NAMES, MODULE_CONTEXTS, IMPORT_PROCESS_STATUS } from '../utils/constants';

export default class Audiences extends PersonalizationAdapter<ImportConfig> {
  private mapperDirPath: string;
  private audienceMapperDirPath: string;
  private attributesMapperPath: string;
  private audiencesUidMapperPath: string;
  private audiencesUidMapper: Record<string, unknown>;
  private personalizeConfig: ImportConfig['modules']['personalize'];
  private audienceConfig: ImportConfig['modules']['personalize']['audiences'];
  public attributeConfig: ImportConfig['modules']['personalize']['attributes'];
  private audiences: AudienceStruct[];

  constructor(public readonly config: ImportConfig) {
    const conf: APIConfig = {
      config,
      baseURL: config.modules.personalize.baseURL[config.region.name],
      headers: { 'X-Project-Uid': config.modules.personalize.project_id },
    };
    super(Object.assign(config, conf));

    this.personalizeConfig = this.config.modules.personalize;
    this.audienceConfig = this.personalizeConfig.audiences;
    this.attributeConfig = this.personalizeConfig.attributes;
    this.mapperDirPath = resolve(
      sanitizePath(this.config.backupDir),
      'mapper',
      sanitizePath(this.personalizeConfig.dirName),
    );
    this.audienceMapperDirPath = resolve(sanitizePath(this.mapperDirPath), sanitizePath(this.audienceConfig.dirName));
    this.audiencesUidMapperPath = resolve(sanitizePath(this.audienceMapperDirPath), 'uid-mapping.json');
    this.attributesMapperPath = resolve(
      sanitizePath(this.mapperDirPath),
      sanitizePath(this.attributeConfig.dirName),
      'uid-mapping.json',
    );
    this.audiencesUidMapper = {};
    this.config.context.module = MODULE_CONTEXTS.AUDIENCES;
    this.audiences = [];
  }

  /**
   * The function asynchronously imports audiences from a JSON file and creates them in the system.
   */
  async import() {
    try {
      log.debug('Starting audiences import...', this.config.context);

      const [canImport, audiencesCount] = await this.analyzeAudiences();
      if (!canImport) {
        log.info('No audiences found to import', this.config.context);
        // Still need to mark as complete for parent progress
        if (this.parentProgressManager) {
          this.parentProgressManager.tick(true, 'audiences module (no data)', null, PROCESS_NAMES.AUDIENCES);
        }
        return;
      }

      // Don't create own progress manager if we have a parent
      let progress;
      if (this.parentProgressManager) {
        progress = this.parentProgressManager;
        log.debug('Using parent progress manager for audiences import', this.config.context);
      } else {
        progress = this.createSimpleProgress(PROCESS_NAMES.AUDIENCES, audiencesCount);
        log.debug('Created standalone progress manager for audiences import', this.config.context);
      }

      await this.init();
      await fsUtil.makeDirectory(this.audienceMapperDirPath);
      log.debug(`Created mapper directory: ${this.audienceMapperDirPath}`, this.config.context);

      const attributesUid = (fsUtil.readFile(this.attributesMapperPath, true) as Record<string, string>) || {};
      log.debug(
        `Loaded ${Object.keys(attributesUid).length} attribute mappings for audience processing`,
        this.config.context,
      );

      for (const audience of this.audiences) {
        let { name, definition, description, uid } = audience;
        if (!this.parentProgressManager) {
          progress.updateStatus(IMPORT_PROCESS_STATUS[PROCESS_NAMES.AUDIENCES].CREATING);
        }
        log.debug(`Processing audience: ${name} (${uid})`, this.config.context);

        try {
          //check whether reference attributes exists or not
          if (definition.rules?.length) {
            log.debug(
              `Processing ${definition.rules.length} definition rules for audience: ${name}`,
              this.config.context,
            );
            definition.rules = lookUpAttributes(definition.rules, attributesUid);
            log.debug(`Processed definition rules, remaining rules: ${definition.rules.length}`, this.config.context);
          } else {
            log.debug(`No definition rules found for audience: ${name}`, this.config.context);
          }

          log.debug(`Creating audience: ${name}`, this.config.context);
          const audienceRes = await this.createAudience({ definition, name, description });
          //map old audience uid to new audience uid
          //mapper file is used to check whether audience created or not before creating experience
          this.audiencesUidMapper[uid] = audienceRes?.uid ?? '';

          if (this.parentProgressManager) {
            this.updateProgress(true, `audience: ${name}`);
          } else {
            this.updateProgress(true, `audience: ${name}`, undefined, PROCESS_NAMES.AUDIENCES);
          }
          log.debug(`Created audience: ${uid} -> ${audienceRes?.uid}`, this.config.context);
        } catch (error) {
          this.updateProgress(false, `audience: ${name}`, (error as any)?.message, PROCESS_NAMES.AUDIENCES);
          handleAndLogError(error, this.config.context, `Failed to create audience: ${name} (${uid})`);
        }
      }

      fsUtil.writeFile(this.audiencesUidMapperPath, this.audiencesUidMapper);
      log.debug(`Saved ${Object.keys(this.audiencesUidMapper).length} audience mappings`, this.config.context);

      // Only complete progress if we own the progress manager (no parent)
      if (!this.parentProgressManager) {
        this.completeProgress(true);
      }

      log.success(`Audiences imported successfully! Total audiences: ${audiencesCount}`, this.config.context);
    } catch (error) {
      if (!this.parentProgressManager) {
        this.completeProgress(false, (error as any)?.message || 'Audiences import failed');
      }
      handleAndLogError(error, this.config.context);
      throw error;
    }
  }

  private async analyzeAudiences(): Promise<[boolean, number]> {
    return this.withLoadingSpinner('AUDIENCES: Analyzing import data...', async () => {
      const { dirName, fileName } = this.audienceConfig;
      const audiencesPath = resolve(
        sanitizePath(this.config.data),
        sanitizePath(this.personalizeConfig.dirName),
        sanitizePath(dirName),
        sanitizePath(fileName),
      );

      log.debug(`Checking for audiences file: ${audiencesPath}`, this.config.context);

      if (!existsSync(audiencesPath)) {
        log.warn(`Audiences file not found: ${audiencesPath}`, this.config.context);
        return [false, 0];
      }

      this.audiences = fsUtil.readFile(audiencesPath, true) as AudienceStruct[];
      const audiencesCount = this.audiences?.length || 0;

      log.debug(`Found ${audiencesCount} audiences to import`, this.config.context);
      return [audiencesCount > 0, audiencesCount];
    });
  }
}
