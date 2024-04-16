import { resolve } from 'path';
import { existsSync } from 'fs';
import values from 'lodash/values';
import cloneDeep from 'lodash/cloneDeep';

import { APIConfig, ImportConfig, ExperienceStruct, CreateExperienceInput } from '../types';
import { PersonalizationAdapter, fsUtil, log, lookUpAudiences, lookUpEvents } from '../utils';

export default class Experiences extends PersonalizationAdapter<ImportConfig> {
  private mapperDirPath: string;
  private cmsVariantPath: string;
  private failedCmsExpPath: string;
  private expMapperDirPath: string;
  private eventsMapperPath: string;
  private audiencesMapperPath: string;
  private cmsVariantGroupPath: string;
  private expThresholdTimer: number;
  private maxValidateRetry: number;
  private experiencesUidMapperPath: string;
  private expCheckIntervalDuration: number;
  private cmsVariants: Record<string, unknown>;
  private cmsVariantGroups: Record<string, unknown>;
  private experiencesUidMapper: Record<string, string>;
  private pendingVariantAndVariantGrpForExperience: string[];
  private personalizationConfig: ImportConfig['modules']['personalization'];
  private audienceConfig: ImportConfig['modules']['personalization']['audiences'];
  private experienceConfig: ImportConfig['modules']['personalization']['experiences'];

  constructor(public readonly config: ImportConfig) {
    const conf: APIConfig = {
      config,
      baseURL: config.personalizationHost,
      headers: { 'X-Project-Uid': config.modules.personalization.project_id, authtoken: config.auth_token },
    };
    super(Object.assign(config, conf));
    this.personalizationConfig = this.config.modules.personalization;
    this.experienceConfig = this.personalizationConfig.experiences;
    this.audienceConfig = this.personalizationConfig.audiences;
    this.mapperDirPath = resolve(this.config.backupDir, 'mapper', this.personalizationConfig.dirName);
    this.expMapperDirPath = resolve(this.mapperDirPath, this.experienceConfig.dirName);
    this.experiencesUidMapperPath = resolve(this.expMapperDirPath, 'uid-mapping.json');
    this.cmsVariantGroupPath = resolve(this.expMapperDirPath, 'cms-variant-groups.json');
    this.cmsVariantPath = resolve(this.expMapperDirPath, 'cms-variants.json');
    this.audiencesMapperPath = resolve(this.mapperDirPath, this.audienceConfig.dirName, 'uid-mapping.json');
    this.eventsMapperPath = resolve(this.mapperDirPath, 'events', 'uid-mapping.json');
    this.failedCmsExpPath = resolve(this.expMapperDirPath, 'failed-cms-experience.json');
    this.experiencesUidMapper = {};
    this.cmsVariantGroups = {};
    this.cmsVariants = {};
    this.expThresholdTimer = this.experienceConfig?.thresholdTimer ?? 60000;
    this.expCheckIntervalDuration = this.experienceConfig?.checkIntervalDuration ?? 10000;
    this.maxValidateRetry = Math.round(this.expThresholdTimer / this.expCheckIntervalDuration);
    this.pendingVariantAndVariantGrpForExperience = [];
  }

  /**
   * The function asynchronously imports experiences from a JSON file and creates them in the system.
   */
  async import() {
    log(this.config, this.$t(this.messages.IMPORT_MSG, { module: 'Experiences' }), 'info');

    await fsUtil.makeDirectory(this.expMapperDirPath);
    const { dirName, fileName } = this.experienceConfig;
    const experiencePath = resolve(this.config.data, this.personalizationConfig.dirName, dirName, fileName);

    if (existsSync(experiencePath)) {
      try {
        const experiences = fsUtil.readFile(experiencePath, true) as ExperienceStruct[];
        const audiencesUid = (fsUtil.readFile(this.audiencesMapperPath, true) as Record<string, string>) || {};
        const eventsUid = (fsUtil.readFile(this.eventsMapperPath, true) as Record<string, string>) || {};

        for (const experience of experiences) {
          const { uid, ...restExperienceData } = experience;
          //check whether reference audience exists or not that referenced in variations having __type equal to AudienceBasedVariation & targeting
          let experienceReqObj: CreateExperienceInput = lookUpAudiences(restExperienceData, audiencesUid);
          //check whether events exists or not that referenced in metrics
          experienceReqObj = lookUpEvents(experienceReqObj, eventsUid);

          const expRes = await this.createExperience(experienceReqObj);
          //map old experience uid to new experience uid
          this.experiencesUidMapper[uid] = expRes?.uid ?? '';
        }
        fsUtil.writeFile(this.experiencesUidMapperPath, this.experiencesUidMapper);
        log(this.config, this.$t(this.messages.CREATE_SUCCESS, { module: 'Experiences' }), 'info');

        log(this.config, this.messages.VALIDATE_VARIANT_AND_VARIANT_GRP, 'info');
        this.pendingVariantAndVariantGrpForExperience = values(cloneDeep(this.experiencesUidMapper));
        const jobRes = await this.validateVariantGroupAndVariantsCreated();
        fsUtil.writeFile(this.cmsVariantPath, this.cmsVariants);
        fsUtil.writeFile(this.cmsVariantGroupPath, this.cmsVariantGroups);
        if (jobRes)
          log(this.config, this.$t(this.messages.CREATE_SUCCESS, { module: 'Variant & Variant groups' }), 'info');

        if (this.personalizationConfig.importData) {
          //attach content types in experiences
        }
      } catch (error: any) {
        if (error?.errorMessage || error?.message || error?.error_message) {
          log(this.config, this.$t(this.messages.CREATE_FAILURE, { module: 'Experiences' }), 'error');
        } else {
          log(this.config, error, 'error');
        }
      }
    }
  }

  /**
   * function to validate if all variant groups and variants have been created using personalization background job
   * store the variant groups data in mapper/personalization/experiences/cms-variant-groups.json and the variants data
   * in mapper/personalization/experiences/cms-variants.json. If not, invoke validateVariantGroupAndVariantsCreated after some delay.
   * @param retryCount Counter to track the number of times the function has been called
   * @returns
   */
  async validateVariantGroupAndVariantsCreated(retryCount = 0): Promise<any> {
    try {
      const promises = this.pendingVariantAndVariantGrpForExperience.map(async (expUid) => {
        const expRes = await this.getExperience(expUid);
        if (expRes?._cms) {
          this.cmsVariants[expUid] = expRes._cms?.variants ?? {};
          this.cmsVariantGroups[expUid] = expRes._cms?.variantGroup ?? {};
          return expUid; // Return the expUid for filtering later
        }
      });

      await Promise.all(promises);
      retryCount++;

      if (this.pendingVariantAndVariantGrpForExperience?.length) {
        if (retryCount !== this.maxValidateRetry) {
          this.delay(5000);
          // Filter out the processed elements
          this.pendingVariantAndVariantGrpForExperience = this.pendingVariantAndVariantGrpForExperience.filter(
            (uid) => !this.cmsVariants[uid],
          );
          return this.validateVariantGroupAndVariantsCreated(retryCount);
        } else {
          log(this.config, this.messages.PERSONALIZATION_JOB_FAILURE, 'info');
          fsUtil.writeFile(this.failedCmsExpPath, this.pendingVariantAndVariantGrpForExperience);
          return false;
        }
      } else {
        return true;
      }
    } catch (error) {
      throw error;
    }
  }
}
