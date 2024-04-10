import { resolve } from 'path';
import { existsSync } from 'fs';

import { APIConfig, ImportConfig, ExperienceStruct, CreateExperienceInput } from '../types';
import { PersonalizationAdapter, fsUtil, log, lookUpAudiences, lookUpEvents } from '../utils';

export default class Experiences extends PersonalizationAdapter<ImportConfig> {
  private mapperDirPath: string;
  private eventsMapperPath: string;
  private audiencesMapperPath: string;
  private experiencesUidMapperPath: string;
  private experiencesUidMapper: Record<string, unknown>;
  private personalizationConfig: ImportConfig['modules']['personalization'];
  public audienceConfig: ImportConfig['modules']['personalization']['audiences'];
  private experienceConfig: ImportConfig['modules']['personalization']['experiences'];

  constructor(public readonly config: ImportConfig) {
    const conf: APIConfig = {
      config,
      baseURL: config.personalizationHost,
      headers: { authtoken: config.auth_token, 'X-Project-Uid': config.project_id},
    };
    super(Object.assign(config, conf));
    this.personalizationConfig = this.config.modules.personalization;
    this.experienceConfig = this.personalizationConfig.experiences;
    this.audienceConfig = this.personalizationConfig.audiences;
    this.mapperDirPath = resolve(
      this.config.backupDir,
      'mapper',
      this.personalizationConfig.dirName,
      this.experienceConfig.dirName,
    );
    this.experiencesUidMapperPath = resolve(this.mapperDirPath, 'uid-mapping.json');
    this.audiencesMapperPath = resolve(
      this.config.backupDir,
      'mapper',
      this.personalizationConfig.dirName,
      this.audienceConfig.dirName,
      'uid-mapping.json',
    );
    this.eventsMapperPath = resolve(
      this.config.backupDir,
      'mapper',
      this.personalizationConfig.dirName,
      'events',
      'uid-mapping.json',
    );
    this.experiencesUidMapper = {};
  }

  /**
   * The function asynchronously imports experiences from a JSON file and creates them in the system.
   */
  async import() {
    log(this.config, this.$t(this.messages.IMPORT_MSG, { module: 'Experiences' }), 'info');

    await fsUtil.makeDirectory(this.mapperDirPath);
    const { dirName, fileName } = this.experienceConfig;
    const experiencePath = resolve(this.config.data, this.personalizationConfig.dirName, dirName, fileName);

    if (existsSync(experiencePath)) {
      try {
        const experiences = fsUtil.readFile(experiencePath, true) as ExperienceStruct[];
        const audiencesUid = fsUtil.readFile(this.audiencesMapperPath, true) as Record<string, string> || {};
        const eventsUid = fsUtil.readFile(this.eventsMapperPath, true) as Record<string, string> || {};

        for (const experience of experiences) {
          const { uid, ...restExperienceData } = experience;
          let experienceReqObj: CreateExperienceInput = { ...restExperienceData };
          //check whether reference audience exists or not that referenced in variations having __type equal to AudienceBasedVariation & targeting
          experienceReqObj = lookUpAudiences(experienceReqObj, audiencesUid);
          //check whether events exists or not that referenced in metrics
          experienceReqObj = lookUpEvents(experienceReqObj, eventsUid);

          const expRes = await this.createExperience(experienceReqObj);
          //map old experience uid to new experience uid
          this.experiencesUidMapper[uid] = expRes?.uid ?? '';
        }

        fsUtil.writeFile(this.experiencesUidMapperPath, this.experiencesUidMapper);
        log(this.config, this.$t(this.messages.CREATE_SUCCESS, { module: 'Experiences' }), 'info');
      } catch (error: any) {
        if (error?.errorMessage || error?.message || error?.error_message) {
          log(this.config, this.$t(this.messages.CREATE_FAILURE, { module: 'Experiences' }), 'error');
        } else {
          log(this.config, error, 'error');
        }
      }
    }
  }
}
