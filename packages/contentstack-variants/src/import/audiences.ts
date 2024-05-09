import { resolve } from 'path';
import { existsSync } from 'fs';

import { APIConfig, AudienceStruct, ImportConfig, LogType } from '../types';
import { PersonalizationAdapter, fsUtil, lookUpAttributes } from '../utils';

export default class Audiences extends PersonalizationAdapter<ImportConfig> {
  private mapperDirPath: string;
  private audienceMapperDirPath: string;
  private attributesMapperPath: string;
  private audiencesUidMapperPath: string;
  private audiencesUidMapper: Record<string, unknown>;
  private personalizationConfig: ImportConfig['modules']['personalization'];
  private audienceConfig: ImportConfig['modules']['personalization']['audiences'];
  public attributeConfig: ImportConfig['modules']['personalization']['attributes'];

  constructor(public readonly config: ImportConfig, private readonly log: LogType = console.log) {
    const conf: APIConfig = {
      config,
      baseURL: config.modules.personalization.baseURL[config.region.name],
      headers: { 'X-Project-Uid': config.modules.personalization.project_id, authtoken: config.auth_token },
    };
    super(Object.assign(config, conf));
    this.personalizationConfig = this.config.modules.personalization;
    this.audienceConfig = this.personalizationConfig.audiences;
    this.attributeConfig = this.personalizationConfig.attributes;
    this.mapperDirPath = resolve(this.config.backupDir, 'mapper', this.personalizationConfig.dirName);
    this.audienceMapperDirPath = resolve(this.mapperDirPath, this.audienceConfig.dirName);
    this.audiencesUidMapperPath = resolve(this.audienceMapperDirPath, 'uid-mapping.json');
    this.attributesMapperPath = resolve(this.mapperDirPath, this.attributeConfig.dirName, 'uid-mapping.json');
    this.audiencesUidMapper = {};
  }

  /**
   * The function asynchronously imports audiences from a JSON file and creates them in the system.
   */
  async import() {
    this.log(this.config, this.$t(this.messages.IMPORT_MSG, { module: 'Audiences' }), 'info');

    await fsUtil.makeDirectory(this.audienceMapperDirPath);
    const { dirName, fileName } = this.audienceConfig;
    const audiencesPath = resolve(this.config.data, this.personalizationConfig.dirName, dirName, fileName);

    if (existsSync(audiencesPath)) {
      try {
        const audiences = fsUtil.readFile(audiencesPath, true) as AudienceStruct[];
        const attributesUid = (fsUtil.readFile(this.attributesMapperPath, true) as Record<string, string>) || {};

        for (const audience of audiences) {
          let { name, definition, description, uid } = audience;
          //check whether reference attributes exists or not
          if (definition.rules?.length) {
            definition.rules = lookUpAttributes(definition.rules, attributesUid);
          }
          const audienceRes = await this.createAudience({ definition, name, description });
          //map old audience uid to new audience uid
          //mapper file is used to check whether audience created or not before creating experience
          this.audiencesUidMapper[uid] = audienceRes?.uid ?? '';
        }

        fsUtil.writeFile(this.audiencesUidMapperPath, this.audiencesUidMapper);
        this.log(this.config, this.$t(this.messages.CREATE_SUCCESS, { module: 'Audiences' }), 'info');
      } catch (error: any) {
        if (error?.errorMessage || error?.message || error?.error_message) {
          this.log(this.config, this.$t(this.messages.CREATE_FAILURE, { module: 'Audiences' }), 'error');
        }
        throw error;
      }
    }
  }
}
