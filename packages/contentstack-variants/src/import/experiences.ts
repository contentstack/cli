import { join, resolve } from 'path';
import { existsSync } from 'fs';
import values from 'lodash/values';
import cloneDeep from 'lodash/cloneDeep';
import { sanitizePath } from '@contentstack/cli-utilities';
import { PersonalizationAdapter, fsUtil, lookUpAudiences, lookUpEvents } from '../utils';
import {
  APIConfig,
  ImportConfig,
  ExperienceStruct,
  CreateExperienceInput,
  LogType,
  CreateExperienceVersionInput,
} from '../types';
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

  constructor(public readonly config: ImportConfig, private readonly log: LogType = console.log) {
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
  }

  /**
   * The function asynchronously imports experiences from a JSON file and creates them in the system.
   */
  async import() {
    this.log(this.config, this.$t(this.messages.IMPORT_MSG, { module: 'Experiences' }), 'info');
    await this.init();
    await fsUtil.makeDirectory(this.expMapperDirPath);

    if (existsSync(this.experiencesPath)) {
      try {
        const experiences = fsUtil.readFile(this.experiencesPath, true) as ExperienceStruct[];

        for (const experience of experiences) {
          const { uid, ...restExperienceData } = experience;
          //check whether reference audience exists or not that referenced in variations having __type equal to AudienceBasedVariation & targeting
          let experienceReqObj: CreateExperienceInput = lookUpAudiences(restExperienceData, this.audiencesUid);
          //check whether events exists or not that referenced in metrics
          experienceReqObj = lookUpEvents(experienceReqObj, this.eventsUid);

          const expRes = (await this.createExperience(experienceReqObj)) as ExperienceStruct;
          //map old experience uid to new experience uid
          this.experiencesUidMapper[uid] = expRes?.uid ?? '';

          try {
            // import versions of experience
            await this.importExperienceVersions(expRes, uid);
          } catch (error) {
            this.log(this.config, `Error while importing experience versions of ${expRes.uid}`, 'error');
            this.log(this.config, error, 'error');
          }
        }
        fsUtil.writeFile(this.experiencesUidMapperPath, this.experiencesUidMapper);
        this.log(this.config, this.$t(this.messages.CREATE_SUCCESS, { module: 'Experiences' }), 'info');

        this.log(this.config, this.messages.VALIDATE_VARIANT_AND_VARIANT_GRP, 'info');
        this.pendingVariantAndVariantGrpForExperience = values(cloneDeep(this.experiencesUidMapper));
        const jobRes = await this.validateVariantGroupAndVariantsCreated();
        fsUtil.writeFile(this.cmsVariantPath, this.cmsVariants);
        fsUtil.writeFile(this.cmsVariantGroupPath, this.cmsVariantGroups);
        if (jobRes) {
          this.log(this.config, this.$t(this.messages.CREATE_SUCCESS, { module: 'Variant & Variant groups' }), 'info');
        } else {
          console.log('🚀 ~ Experiences ~ import ~ jobRes:', jobRes);
          this.personalizeConfig.importData = false;
        }

        if (this.personalizeConfig.importData) {
          this.log(this.config, this.messages.UPDATING_CT_IN_EXP, 'info');
          await this.attachCTsInExperience();
          this.log(this.config, this.messages.UPDATED_CT_IN_EXP, 'info');
        }

        await this.createVariantIdMapper();
      } catch (error) {
        this.log(this.config, this.$t(this.messages.CREATE_FAILURE, { module: 'Experiences' }), 'error');
        this.log(this.config, error, 'error');
      }
    }
  }

  /**
   * function import experience versions from a JSON file and creates them in the project.
   */
  async importExperienceVersions(experience: ExperienceStruct, oldExperienceUid: string) {
    const versionsPath = resolve(
      sanitizePath(this.experiencesDirPath),
      'versions',
      `${sanitizePath(oldExperienceUid)}.json`,
    );

    if (!existsSync(versionsPath)) {
      return;
    }

    const versions = fsUtil.readFile(versionsPath, true) as ExperienceStruct[];
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
    const { ACTIVE, DRAFT, PAUSE } = versionMap;
    let latestVersionUsed = false;

    if (ACTIVE) {
      await this.updateExperienceVersion(experience.uid, experience.latestVersion, ACTIVE);
      latestVersionUsed = true;
    }

    if (DRAFT) {
      if (latestVersionUsed) {
        await this.createExperienceVersion(experience.uid, DRAFT);
      } else {
        await this.updateExperienceVersion(experience.uid, experience.latestVersion, DRAFT);
        latestVersionUsed = true;
      }
    }

    if (PAUSE) {
      if (latestVersionUsed) {
        await this.createExperienceVersion(experience.uid, PAUSE);
      } else {
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
    try {
      const promises = this.pendingVariantAndVariantGrpForExperience.map(async (expUid) => {
        const expRes = await this.getExperience(expUid);
        console.log('🚀 ~ Experiences ~ promises ~ expRes:', expRes);
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
          await this.delay(this.expCheckIntervalDuration);
          // Filter out the processed elements
          this.pendingVariantAndVariantGrpForExperience = this.pendingVariantAndVariantGrpForExperience.filter(
            (uid) => !this.cmsVariants[uid],
          );
          return this.validateVariantGroupAndVariantsCreated(retryCount);
        } else {
          this.log(this.config, this.messages.PERSONALIZE_JOB_FAILURE, 'error');
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
      if (!this.createdCTs) {
        this.log(this.config, 'No Content types created, skipping following process', 'error');
        return;
      }
      const experienceCTsMap = fsUtil.readFile(this.experienceCTsPath, true) as Record<string, string[]>;
      return await Promise.allSettled(
        Object.entries(this.experiencesUidMapper).map(async ([oldExpUid, newExpUid]) => {
          if (experienceCTsMap[oldExpUid]?.length) {
            // Filter content types that were created
            const updatedContentTypes = experienceCTsMap[oldExpUid].filter(
              (ct: any) => this.createdCTs.includes(ct?.uid) && ct.status === 'linked',
            );
            if (updatedContentTypes?.length) {
              const { variant_groups: [variantGroup] = [] } =
                (await this.getVariantGroup({ experienceUid: newExpUid })) || {};
              variantGroup.content_types = updatedContentTypes;
              // Update content types detail in the new experience asynchronously
              return await this.updateVariantGroup(variantGroup);
            }
          }
        }),
      );
    } catch (error) {
      this.log(this.config, `Error while attaching content type with experience`, 'error');
      this.log(this.config, error, 'error');
    }
  }

  async createVariantIdMapper() {
    try {
      const experienceVariantIds: any = fsUtil.readFile(this.experienceVariantsIdsPath, true) || [];
      const variantUIDMapper: Record<string, string> = {};
      for (let experienceVariantId of experienceVariantIds) {
        console.log('🚀 ~ Experiences ~ createVariantIdMapper ~ experienceVariantId:', experienceVariantId);
        const [experienceId, variantShortId, oldVariantId] = experienceVariantId.split('-');
        const latestVariantId = this.cmsVariants[this.experiencesUidMapper[experienceId]]?.[variantShortId];
        console.log('🚀 ~ Experiences ~ createVariantIdMapper ~ latestVariantId:', latestVariantId);
        if (latestVariantId) {
          variantUIDMapper[oldVariantId] = latestVariantId;
          console.log(
            '🚀 ~ Experiences ~ createVariantIdMapper ~  variantUIDMapper[oldVariantId]:',
            variantUIDMapper[oldVariantId],
          );
        }
      }

      fsUtil.writeFile(this.variantUidMapperFilePath, variantUIDMapper);
    } catch (error) {
      throw error;
    }
  }
}
