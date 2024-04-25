import { resolve } from 'path';
import { existsSync } from 'fs';
import values from 'lodash/values';
import cloneDeep from 'lodash/cloneDeep';

import { PersonalizationAdapter, fsUtil, lookUpAudiences, lookUpEvents } from '../utils';
import { APIConfig, ImportConfig, ExperienceStruct, CreateExperienceInput, LogType } from '../types';

export default class Experiences extends PersonalizationAdapter<ImportConfig> {
  private createdCTs: string[];
  private mapperDirPath: string;
  private cmsVariantPath: string;
  private cTsSuccessPath: string;
  private failedCmsExpPath: string;
  private expMapperDirPath: string;
  private eventsMapperPath: string;
  private audiencesMapperPath: string;
  private cmsVariantGroupPath: string;
  private experienceVariantsIdsPath: string;
  private variantUidMapperFilePath: string;
  private expThresholdTimer: number;
  private maxValidateRetry: number;
  private experiencesUidMapperPath: string;
  private expCheckIntervalDuration: number;
  private cmsVariants: Record<string, Record<string, string>>;
  private cmsVariantGroups: Record<string, unknown>;
  private experiencesUidMapper: Record<string, string>;
  private pendingVariantAndVariantGrpForExperience: string[];
  private personalizationConfig: ImportConfig['modules']['personalization'];
  private audienceConfig: ImportConfig['modules']['personalization']['audiences'];
  private experienceConfig: ImportConfig['modules']['personalization']['experiences'];

  constructor(public readonly config: ImportConfig, private readonly log: LogType = console.log) {
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
    this.failedCmsExpPath = resolve(this.expMapperDirPath, 'failed-cms-experience.json');
    this.experienceVariantsIdsPath = resolve(
      this.config.data,
      this.personalizationConfig.dirName,
      this.experienceConfig.dirName,
      'experience-variants-ids.json',
    );
    this.variantUidMapperFilePath = resolve(this.expMapperDirPath, 'variants-uid-mapping.json');
    this.experiencesUidMapper = {};
    this.cmsVariantGroups = {};
    this.cmsVariants = {};
    this.expThresholdTimer = this.experienceConfig?.thresholdTimer ?? 60000;
    this.expCheckIntervalDuration = this.experienceConfig?.checkIntervalDuration ?? 10000;
    this.maxValidateRetry = Math.round(this.expThresholdTimer / this.expCheckIntervalDuration);
    this.pendingVariantAndVariantGrpForExperience = [];
    this.cTsSuccessPath = resolve(this.config.backupDir, 'mapper', 'content_types', 'success.json');
    this.createdCTs = [];
  }

  /**
   * The function asynchronously imports experiences from a JSON file and creates them in the system.
   */
  async import() {
    this.log(this.config, this.$t(this.messages.IMPORT_MSG, { module: 'Experiences' }), 'info');

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
        this.log(this.config, this.$t(this.messages.CREATE_SUCCESS, { module: 'Experiences' }), 'info');

        this.log(this.config, this.messages.VALIDATE_VARIANT_AND_VARIANT_GRP, 'info');
        this.pendingVariantAndVariantGrpForExperience = values(cloneDeep(this.experiencesUidMapper));
        const jobRes = await this.validateVariantGroupAndVariantsCreated();
        fsUtil.writeFile(this.cmsVariantPath, this.cmsVariants);
        fsUtil.writeFile(this.cmsVariantGroupPath, this.cmsVariantGroups);
        if (jobRes)
          this.log(this.config, this.$t(this.messages.CREATE_SUCCESS, { module: 'Variant & Variant groups' }), 'info');

        if (this.personalizationConfig.importData) {
          this.log(this.config, this.messages.UPDATING_CT_IN_EXP, 'info');
          await this.attachCTsInExperience();
        }

        await this.createVariantIdMapper();
      } catch (error: any) {
        if (error?.errorMessage || error?.message || error?.error_message) {
          this.log(this.config, this.$t(this.messages.CREATE_FAILURE, { module: 'Experiences' }), 'error');
        } else {
          this.log(this.config, error, 'error');
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
          await this.delay(5000);
          // Filter out the processed elements
          this.pendingVariantAndVariantGrpForExperience = this.pendingVariantAndVariantGrpForExperience.filter(
            (uid) => !this.cmsVariants[uid],
          );
          return this.validateVariantGroupAndVariantsCreated(retryCount);
        } else {
          this.log(this.config, this.messages.PERSONALIZATION_JOB_FAILURE, 'info');
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

  async attachCTsInExperience() {
    try {
      // Read the created content types from the file
      this.createdCTs = fsUtil.readFile(this.cTsSuccessPath, true) as any;
      await Promise.allSettled(
        Object.entries(this.experiencesUidMapper).map(async ([oldExpUid, newExpUid]) => {
          // Get old experience content type details asynchronously
          const expRes = await this.getCTsFromExperience(oldExpUid);

          if (this.createdCTs && expRes?.contentTypes) {
            // Filter content types that were created
            const updatedContentTypes = expRes.contentTypes?.filter((ct: string) => this.createdCTs.includes(ct));
            if (updatedContentTypes?.length) {
              // Update content types detail in the new experience asynchronously
              await this.updateCTsInExperience({ contentTypes: updatedContentTypes }, newExpUid);
            }
          } else {
            this.log(this.config, `Failed to attach content type for ${newExpUid}`, 'error');
          }
        }),
      );
    } catch (error) {
      throw error;
    }
  }

  async createVariantIdMapper() {
    try {
      const experienceVariantIds: any = fsUtil.readFile(this.experienceVariantsIdsPath, true) || [];
      const variantUIDMapper: Record<string, string> = {};
      for (let experienceVariantId of experienceVariantIds) {
        const [experienceId, variantShortId, oldVariantId] = experienceVariantId.split('-');
        const latestVariantId = this.cmsVariants[this.experiencesUidMapper[experienceId]]?.[variantShortId];
        if (latestVariantId) {
          variantUIDMapper[oldVariantId] = latestVariantId;
        }
      }

      fsUtil.writeFile(this.variantUidMapperFilePath, variantUIDMapper);
    } catch (error) {
      throw error;
    }
  }
}



