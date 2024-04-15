import { resolve } from 'path';
import { existsSync } from 'fs';

import { APIConfig, ImportConfig, ExperienceStruct, CreateExperienceInput } from '../types';
import { PersonalizationAdapter, fsUtil, log, lookUpAudiences, lookUpEvents } from '../utils';

export default class Experiences extends PersonalizationAdapter<ImportConfig> {
  private mapperDirPath: string;
  private cmsVariantPath: string;
  private expMapperDirPath: string;
  private eventsMapperPath: string;
  private audiencesMapperPath: string;
  private cmsVariantGroupPath: string;
  private experiencesUidMapperPath: string;
  private cmsVariants: Record<string, unknown>;
  private personalizationThresholdTimer: number;
  private cmsVariantGroups: Record<string, unknown>;
  private experiencesUidMapper: Record<string, string>;
  private personalizationCheckIntervalDuration: number;
  private personalizationConfig: ImportConfig['modules']['personalization'];
  private audienceConfig: ImportConfig['modules']['personalization']['audiences'];
  private experienceConfig: ImportConfig['modules']['personalization']['experiences'];

  constructor(public readonly config: ImportConfig) {
    const conf: APIConfig = {
      config,
      baseURL: config.personalizationHost,
      headers: { authtoken: config.auth_token, 'X-Project-Uid': config.project_id },
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
    this.experiencesUidMapper = {};
    this.cmsVariantGroups = {};
    this.cmsVariants = {};
    this.personalizationThresholdTimer = this.personalizationConfig?.thresholdTimer ?? 60000;
    this.personalizationCheckIntervalDuration = this.personalizationConfig?.checkIntervalDuration ?? 10000;
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
        await this.validateVariantGroupAndVariantsCreated();
        if (this.personalizationConfig.importData) {
          log(this.config, this.$t(this.messages.CREATE_SUCCESS, { module: 'Variant & Variant groups' }), 'info');
          //attach content types in experiences
        } else {
          log(this.config, this.messages.SKIP_PERSONALIZATION_IMPORT, 'info');
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
   * in mapper/personalization/experiences/cms-variants.json. If not, invoke validateVariantGroupAndVariantsCreated after some interval.
   * @returns Promise<any>
   */
  validateVariantGroupAndVariantsCreated(): Promise<any> {
    return new Promise(async (resolve, reject) => {
      try {
        const promises = Object.keys(this.experiencesUidMapper)?.map(async (exp) => {
          const expUid = this.experiencesUidMapper[exp];
          const expRes = await this.getExperience(expUid);
          if (expRes?._cms) {
            this.cmsVariants[expUid] = expRes._cms?.variants ?? {};
            this.cmsVariantGroups[expUid] = expRes._cms?.variantGroup ?? {};    
          } else {
            this.personalizationConfig.importData = false;
          }
        });

        await Promise.all(promises);
        // Counter to track the number of times the function has been called
        let count = 0;
        const maxTries = Math.round(this.personalizationThresholdTimer / this.personalizationCheckIntervalDuration);

        // Invoke validateVariantGroupAndVariantsCreated after some interval if any variants or variant groups associated with experience have not been created yet.
        if (
          Object.keys(this.experiencesUidMapper)?.length !== Object.keys(this.cmsVariants)?.length ||
          Object.keys(this.experiencesUidMapper)?.length !== Object.keys(this.cmsVariantGroups)?.length
        ) {
          const intervalId = setInterval(() => {
            this.validateVariantGroupAndVariantsCreated().then(resolve).catch(reject);
            count++;
            // Check if maxTries has passed
            if (count === maxTries) {
              this.personalizationConfig.importData = false;
              clearInterval(intervalId); // Stop the interval
              reject(this.messages.PERSONALIZATION_JOB_FAILURE);
            }
          }, this.personalizationCheckIntervalDuration);
        } else {
          this.personalizationConfig.importData = true;
          fsUtil.writeFile(this.cmsVariantPath, this.cmsVariants);
          fsUtil.writeFile(this.cmsVariantGroupPath, this.cmsVariantGroups);
          resolve(true);
        }
      } catch (error) {
        reject(error);
      }
    });
  }
}
