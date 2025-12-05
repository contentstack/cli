import { join, resolve } from 'path';
import { existsSync } from 'fs';
import values from 'lodash/values';
import cloneDeep from 'lodash/cloneDeep';
import { sanitizePath, log, handleAndLogError } from '@contentstack/cli-utilities';
import { PersonalizationAdapter, fsUtil, lookUpAudiences, lookUpEvents } from '../utils';
import {
  APIConfig,
  ImportConfig,
  ExperienceStruct,
  CreateExperienceInput,
  CreateExperienceVersionInput,
} from '../types';
import { PROCESS_NAMES, MODULE_CONTEXTS } from '../utils/constants';

export default class Experiences extends PersonalizationAdapter<ImportConfig> {
  private createdCTs: string[];
  private mapperDirPath: string;
  private cmsVariantPath: string;
  private cTsSuccessPath: string;
  private failedCmsExpPath: string;
  private expMapperDirPath: string;
  private eventsMapperPath: string;
  private experiencesPath: string;
  private experiencesDirPath: string;
  private audiencesMapperPath: string;
  private cmsVariantGroupPath: string;
  private experienceVariantsIdsPath: string;
  private variantUidMapperFilePath: string;
  private expThresholdTimer: number;
  private maxValidateRetry: number;
  private experiencesUidMapperPath: string;
  private experienceCTsPath: string;
  private expCheckIntervalDuration: number;
  private cmsVariants: Record<string, Record<string, string>>;
  private cmsVariantGroups: Record<string, unknown>;
  private experiencesUidMapper: Record<string, string>;
  private pendingVariantAndVariantGrpForExperience: string[];
  private audiencesUid: Record<string, string>;
  private eventsUid: Record<string, string>;
  private personalizeConfig: ImportConfig['modules']['personalize'];
  private audienceConfig: ImportConfig['modules']['personalize']['audiences'];
  private experienceConfig: ImportConfig['modules']['personalize']['experiences'];
  private experiences: ExperienceStruct[];

  constructor(public readonly config: ImportConfig) {
    const conf: APIConfig = {
      config,
      baseURL: config.modules.personalize.baseURL[config.region.name],
      headers: { 'X-Project-Uid': config.modules.personalize.project_id },
      cmaConfig: {
        baseURL: config.region.cma + `/v3`,
        headers: { api_key: config.apiKey },
      },
    };
    super(Object.assign(config, conf));

    this.personalizeConfig = this.config.modules.personalize;
    this.experiencesDirPath = resolve(
      sanitizePath(this.config.data),
      sanitizePath(this.personalizeConfig.dirName),
      sanitizePath(this.personalizeConfig.experiences.dirName),
    );
    this.experiencesPath = join(
      sanitizePath(this.experiencesDirPath),
      sanitizePath(this.personalizeConfig.experiences.fileName),
    );
    this.experienceConfig = this.personalizeConfig.experiences;
    this.audienceConfig = this.personalizeConfig.audiences;
    this.mapperDirPath = resolve(
      sanitizePath(this.config.backupDir),
      'mapper',
      sanitizePath(this.personalizeConfig.dirName),
    );
    this.expMapperDirPath = resolve(sanitizePath(this.mapperDirPath), sanitizePath(this.experienceConfig.dirName));
    this.experiencesUidMapperPath = resolve(sanitizePath(this.expMapperDirPath), 'uid-mapping.json');
    this.cmsVariantGroupPath = resolve(sanitizePath(this.expMapperDirPath), 'cms-variant-groups.json');
    this.cmsVariantPath = resolve(sanitizePath(this.expMapperDirPath), 'cms-variants.json');
    this.audiencesMapperPath = resolve(
      sanitizePath(this.mapperDirPath),
      sanitizePath(this.audienceConfig.dirName),
      'uid-mapping.json',
    );
    this.eventsMapperPath = resolve(sanitizePath(this.mapperDirPath), 'events', 'uid-mapping.json');
    this.failedCmsExpPath = resolve(sanitizePath(this.expMapperDirPath), 'failed-cms-experience.json');
    this.failedCmsExpPath = resolve(sanitizePath(this.expMapperDirPath), 'failed-cms-experience.json');
    this.experienceCTsPath = resolve(sanitizePath(this.experiencesDirPath), 'experiences-content-types.json');
    this.experienceVariantsIdsPath = resolve(
      sanitizePath(this.config.data),
      sanitizePath(this.personalizeConfig.dirName),
      sanitizePath(this.experienceConfig.dirName),
      'experiences-variants-ids.json',
    );
    this.variantUidMapperFilePath = resolve(sanitizePath(this.expMapperDirPath), 'variants-uid-mapping.json');
    this.experiencesUidMapper = {};
    this.cmsVariantGroups = {};
    this.cmsVariants = {};
    this.expThresholdTimer = this.experienceConfig?.thresholdTimer ?? 30000;
    this.expCheckIntervalDuration = this.experienceConfig?.checkIntervalDuration ?? 5000;
    this.maxValidateRetry = Math.round(this.expThresholdTimer / this.expCheckIntervalDuration);
    this.pendingVariantAndVariantGrpForExperience = [];
    this.cTsSuccessPath = resolve(sanitizePath(this.config.backupDir), 'mapper', 'content_types', 'success.json');
    this.createdCTs = [];
    this.audiencesUid = (fsUtil.readFile(this.audiencesMapperPath, true) as Record<string, string>) || {};
    this.eventsUid = (fsUtil.readFile(this.eventsMapperPath, true) as Record<string, string>) || {};
    this.config.context.module = MODULE_CONTEXTS.EXPERIENCES;
    this.experiences = [];
  }

  /**
   * The function asynchronously imports experiences from a JSON file and creates them in the system.
   */
  async import() {
    try {
      log.debug('Starting experiences import...', this.config.context);

      const [canImport, experiencesCount] = await this.analyzeExperiences();
      if (!canImport) {
        log.info('No experiences found to import', this.config.context);
        // Still need to mark as complete for parent progress
        if (this.parentProgressManager) {
          this.parentProgressManager.tick(true, 'experiences module (no data)', null, PROCESS_NAMES.EXPERIENCES);
        }
        return;
      }

      // If we have a parent progress manager, use it as a sub-module
      // Otherwise create our own simple progress manager
      let progress;
      if (this.parentProgressManager) {
        progress = this.parentProgressManager;
        log.debug('Using parent progress manager for experiences import', this.config.context);
        this.parentProgressManager.updateProcessTotal(PROCESS_NAMES.EXPERIENCES, experiencesCount);
      } else {
        progress = this.createSimpleProgress(PROCESS_NAMES.EXPERIENCES, experiencesCount);
        log.debug('Created standalone progress manager for experiences import', this.config.context);
      }

      await this.init();
      await fsUtil.makeDirectory(this.expMapperDirPath);
      log.debug(`Created mapper directory: ${this.expMapperDirPath}`, this.config.context);

      log.info(`Processing ${experiencesCount} experiences for import`, this.config.context);

      for (const experience of this.experiences) {
        const { uid, ...restExperienceData } = experience;
        log.debug(`Processing experience: ${uid}`, this.config.context);

        //check whether reference audience exists or not that referenced in variations having __type equal to AudienceBasedVariation & targeting
        let experienceReqObj: CreateExperienceInput = lookUpAudiences(restExperienceData, this.audiencesUid);
        //check whether events exists or not that referenced in metrics
        experienceReqObj = lookUpEvents(experienceReqObj, this.eventsUid);

        try {
          const expRes = (await this.createExperience(experienceReqObj)) as ExperienceStruct;
          //map old experience uid to new experience uid
          this.experiencesUidMapper[uid] = expRes?.uid ?? '';
          log.debug(`Created experience: ${uid} -> ${expRes?.uid}`, this.config.context);

          try {
            // import versions of experience
            await this.importExperienceVersions(expRes, uid);
          } catch (error) {
            handleAndLogError(error, this.config.context, `Failed to import experience versions for ${expRes.uid}`);
          }

          this.updateProgress(true, `experience: ${experience.name || uid}`, undefined, PROCESS_NAMES.EXPERIENCES);
          log.debug(`Successfully processed experience: ${uid}`, this.config.context);
        } catch (error) {
          this.updateProgress(
            false,
            `experience: ${experience.name || uid}`,
            (error as any)?.message,
            PROCESS_NAMES.EXPERIENCES,
          );
          handleAndLogError(error, this.config.context, `Failed to create experience: ${uid}`);
        }
      }

      fsUtil.writeFile(this.experiencesUidMapperPath, this.experiencesUidMapper);
      log.success('Experiences created successfully', this.config.context);

      log.info('Validating variant and variant group creation', this.config.context);
      this.pendingVariantAndVariantGrpForExperience = values(cloneDeep(this.experiencesUidMapper));
      const jobRes = await this.validateVariantGroupAndVariantsCreated();
      fsUtil.writeFile(this.cmsVariantPath, this.cmsVariants);
      fsUtil.writeFile(this.cmsVariantGroupPath, this.cmsVariantGroups);

      if (jobRes) {
        log.success('Variant and variant groups created successfully', this.config.context);
      } else {
        log.error('Failed to create variants and variant groups', this.config.context);
        this.personalizeConfig.importData = false;
      }

      if (this.personalizeConfig.importData) {
        log.info('Attaching content types to experiences', this.config.context);
        await this.attachCTsInExperience();
        log.success('Content types attached to experiences successfully', this.config.context);
      }

      await this.createVariantIdMapper();

      // Only complete progress if we own the progress manager (no parent)
      if (!this.parentProgressManager) {
        this.completeProgress(true);
      }

      log.success(
        `Experiences imported successfully! Total experiences: ${experiencesCount} - personalization enabled`,
        this.config.context,
      );
    } catch (error) {
      if (!this.parentProgressManager) {
        this.completeProgress(false, (error as any)?.message || 'Experiences import failed');
      }
      handleAndLogError(error, this.config.context);
      throw error;
    }
  }

  private async analyzeExperiences(): Promise<[boolean, number]> {
    return this.withLoadingSpinner('EXPERIENCES: Analyzing import data...', async () => {
      log.debug(`Checking for experiences file: ${this.experiencesPath}`, this.config.context);

      if (!existsSync(this.experiencesPath)) {
        log.warn(`Experiences file not found: ${this.experiencesPath}`, this.config.context);
        return [false, 0];
      }

      this.experiences = fsUtil.readFile(this.experiencesPath, true) as ExperienceStruct[];
      const experiencesCount = this.experiences?.length || 0;

      if (experiencesCount < 1) {
        log.warn('No experiences found in file', this.config.context);
        return [false, 0];
      }

      log.debug(`Found ${experiencesCount} experiences to import`, this.config.context);
      return [true, experiencesCount];
    });
  }

  /**
   * function import experience versions from a JSON file and creates them in the project.
   */
  async importExperienceVersions(experience: ExperienceStruct, oldExperienceUid: string) {
    log.debug(`Importing versions for experience: ${oldExperienceUid}`, this.config.context);

    const versionsPath = resolve(
      sanitizePath(this.experiencesDirPath),
      'versions',
      `${sanitizePath(oldExperienceUid)}.json`,
    );

    if (!existsSync(versionsPath)) {
      log.debug(`No versions file found for experience: ${oldExperienceUid}`, this.config.context);
      return;
    }

    const versions = fsUtil.readFile(versionsPath, true) as ExperienceStruct[];
    log.debug(`Found ${versions.length} versions for experience: ${oldExperienceUid}`, this.config.context);

    const versionMap: Record<string, CreateExperienceVersionInput | undefined> = {
      ACTIVE: undefined,
      DRAFT: undefined,
      PAUSE: undefined,
    };

    // Process each version and map them by status
    versions.forEach((version) => {
      let versionReqObj = lookUpAudiences(version, this.audiencesUid) as CreateExperienceVersionInput;
      versionReqObj = lookUpEvents(version, this.eventsUid) as CreateExperienceVersionInput;

      if (versionReqObj && versionReqObj.status) {
        versionMap[versionReqObj.status] = versionReqObj;
        log.debug(`Mapped version with status: ${versionReqObj.status}`, this.config.context);
      }
    });

    // Prioritize updating or creating versions based on the order: ACTIVE -> DRAFT -> PAUSE
    return await this.handleVersionUpdateOrCreate(experience, versionMap);
  }

  // Helper method to handle version update or creation logic
  private async handleVersionUpdateOrCreate(
    experience: ExperienceStruct,
    versionMap: Record<string, CreateExperienceVersionInput | undefined>,
  ) {
    log.debug(`Handling version update/create for experience: ${experience.uid}`, this.config.context);
    const { ACTIVE, DRAFT, PAUSE } = versionMap;
    let latestVersionUsed = false;

    if (ACTIVE) {
      log.debug(`Updating experience version to ACTIVE for: ${experience.uid}`, this.config.context);
      await this.updateExperienceVersion(experience.uid, experience.latestVersion, ACTIVE);
      latestVersionUsed = true;
    }

    if (DRAFT) {
      if (latestVersionUsed) {
        log.debug(`Creating new DRAFT version for: ${experience.uid}`, this.config.context);
        await this.createExperienceVersion(experience.uid, DRAFT);
      } else {
        log.debug(`Updating experience version to DRAFT for: ${experience.uid}`, this.config.context);
        await this.updateExperienceVersion(experience.uid, experience.latestVersion, DRAFT);
        latestVersionUsed = true;
      }
    }

    if (PAUSE) {
      if (latestVersionUsed) {
        log.debug(`Creating new PAUSED version for: ${experience.uid}`, this.config.context);
        await this.createExperienceVersion(experience.uid, PAUSE);
      } else {
        log.debug(`Updating experience version to PAUSED for: ${experience.uid}`, this.config.context);
        await this.updateExperienceVersion(experience.uid, experience.latestVersion, PAUSE);
      }
    }
  }

  /**
   * function to validate if all variant groups and variants have been created using personalize background job
   * store the variant groups data in mapper/personalize/experiences/cms-variant-groups.json and the variants data
   * in mapper/personalize/experiences/cms-variants.json. If not, invoke validateVariantGroupAndVariantsCreated after some delay.
   * @param retryCount Counter to track the number of times the function has been called
   * @returns
   */
  async validateVariantGroupAndVariantsCreated(retryCount = 0): Promise<any> {
    log.debug(
      `Validating variant groups and variants creation - attempt ${retryCount + 1}/${this.maxValidateRetry}`,
      this.config.context,
    );

    try {
      const promises = this.pendingVariantAndVariantGrpForExperience.map(async (expUid) => {
        log.debug(`Checking experience: ${expUid}`, this.config.context);
        const expRes = await this.getExperience(expUid);
        const variants = expRes?._cms?.variants ?? {};
        if (expRes?._cms && expRes?._cms?.variantGroup && Object.keys(variants).length > 0) {
          log.debug(`Found variants and variant group for experience: ${expUid}`, this.config.context);
          this.cmsVariants[expUid] = expRes._cms?.variants ?? {};
          this.cmsVariantGroups[expUid] = expRes._cms?.variantGroup ?? {};
          return expUid; // Return the expUid for filtering later
        } else {
          log.debug(`Variants or variant group not ready for experience: ${expUid}`, this.config.context);
        }
      });

      await Promise.all(promises);
      retryCount++;

      if (this.pendingVariantAndVariantGrpForExperience?.length) {
        if (retryCount !== this.maxValidateRetry) {
          log.debug(`Waiting ${this.expCheckIntervalDuration}ms before retry`, this.config.context);
          await this.delay(this.expCheckIntervalDuration);
          // Filter out the processed elements
          this.pendingVariantAndVariantGrpForExperience = this.pendingVariantAndVariantGrpForExperience.filter(
            (uid) => !this.cmsVariants[uid],
          );
          return this.validateVariantGroupAndVariantsCreated(retryCount);
        } else {
          log.error('Personalize job failed to create variants and variant groups.', this.config.context);
          log.error(
            `Failed experiences: ${this.pendingVariantAndVariantGrpForExperience.join(', ')}`,
            this.config.context,
          );
          fsUtil.writeFile(this.failedCmsExpPath, this.pendingVariantAndVariantGrpForExperience);
          return false;
        }
      } else {
        log.debug('All variant groups and variants created successfully', this.config.context);
        return true;
      }
    } catch (error) {
      handleAndLogError(error, this.config.context);
      throw error;
    }
  }

  async attachCTsInExperience() {
    log.debug('Attaching content types to experiences', this.config.context);

    try {
      // Read the created content types from the file
      this.createdCTs = fsUtil.readFile(this.cTsSuccessPath, true) as any;
      if (!this.createdCTs) {
        log.warn('No content types created.', this.config.context);
        return;
      }

      log.debug(`Found ${this.createdCTs.length} created content types`, this.config.context);
      const experienceCTsMap = fsUtil.readFile(this.experienceCTsPath, true) as Record<string, string[]>;

      return await Promise.allSettled(
        Object.entries(this.experiencesUidMapper).map(async ([oldExpUid, newExpUid]) => {
          if (experienceCTsMap[oldExpUid]?.length) {
            log.debug(`Processing content types for experience: ${oldExpUid} -> ${newExpUid}`, this.config.context);

            // Filter content types that were created
            const updatedContentTypes = experienceCTsMap[oldExpUid].filter(
              (ct: any) => this.createdCTs.includes(ct?.uid) && ct.status === 'linked',
            );

            if (updatedContentTypes?.length) {
              log.debug(
                `Attaching ${updatedContentTypes.length} content types to experience: ${newExpUid}`,
                this.config.context,
              );
              const { variant_groups: [variantGroup] = [] } =
                (await this.getVariantGroup({ experienceUid: newExpUid })) || {};
              variantGroup.content_types = updatedContentTypes;
              // Update content types detail in the new experience asynchronously
              return await this.updateVariantGroup(variantGroup);
            } else {
              log.debug(`No valid content types found for experience: ${newExpUid}`, this.config.context);
            }
          } else {
            log.debug(`No content types mapped for experience: ${oldExpUid}`, this.config.context);
          }
        }),
      );
    } catch (error) {
      handleAndLogError(error, this.config.context, 'Failed to attach content type with experience');
    }
  }

  async createVariantIdMapper() {
    log.debug('Creating variant ID mapper', this.config.context);

    try {
      const experienceVariantIds: any = fsUtil.readFile(this.experienceVariantsIdsPath, true) || [];
      log.debug(`Found ${experienceVariantIds.length} experience variant IDs to process`, this.config.context);

      const variantUIDMapper: Record<string, string> = {};
      for (let experienceVariantId of experienceVariantIds) {
        const [experienceId, variantShortId, oldVariantId] = experienceVariantId.split('-');
        const latestVariantId = this.cmsVariants[this.experiencesUidMapper[experienceId]]?.[variantShortId];
        if (latestVariantId) {
          variantUIDMapper[oldVariantId] = latestVariantId;
          log.debug(`Mapped variant ID: ${oldVariantId} -> ${latestVariantId}`, this.config.context);
        } else {
          log.warn(`Could not find variant ID mapping for: ${experienceVariantId}`, this.config.context);
        }
      }

      log.debug(`Created ${Object.keys(variantUIDMapper).length} variant ID mappings`, this.config.context);
      fsUtil.writeFile(this.variantUidMapperFilePath, variantUIDMapper);
      log.debug(`Variant ID mapper saved to: ${this.variantUidMapperFilePath}`, this.config.context);
    } catch (error) {
      handleAndLogError(error, this.config.context, 'Failed to create variant ID mapper');
      throw error;
    }
  }
}
