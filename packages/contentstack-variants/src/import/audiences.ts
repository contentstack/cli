import { resolve } from 'path';
import { existsSync } from 'fs';

import { APIConfig, AudienceStruct, ImportConfig, LogType } from '../types';
import { PersonalizationAdapter, fsUtil, log, lookUpAttributes } from '../utils';

export default class Audiences extends PersonalizationAdapter<ImportConfig> {
  private mapperDirPath: string;
  private attributesMapperPath: string;
  private audiencesUidMapperPath: string;
  private audiencesUidMapper: Record<string, unknown>;
  private personalizationConfig: ImportConfig['modules']['personalization'];
  private audienceConfig: ImportConfig['modules']['personalization']['audiences'];

  constructor(public readonly config: ImportConfig) {
    const conf: APIConfig = {
      config,
      baseURL: config.personalizationHost,
      headers: { authtoken: config.auth_token, 'X-Project-Uid': config.project_id },
    };
    super(Object.assign(config, conf));
    this.personalizationConfig = this.config.modules.personalization;
    this.audienceConfig = this.personalizationConfig.audiences;
    this.mapperDirPath = resolve(
      this.config.backupDir,
      'mapper',
      this.personalizationConfig.dirName,
      this.audienceConfig.dirName,
    );
    this.audiencesUidMapperPath = resolve(this.mapperDirPath, 'uid-mapping.json');
    this.attributesMapperPath = resolve(
      this.config.backupDir,
      'mapper',
      this.personalizationConfig.dirName,
      'attributes',
      'uid-mapping.json',
    );
    this.audiencesUidMapper = {};
  }

  /**
   * The function asynchronously imports audiences from a JSON file and creates them in the system.
   */
  async import() {
    log(this.config, this.$t(this.messages.IMPORT_MSG, { module: 'Audiences' }), 'info');

    await fsUtil.makeDirectory(this.mapperDirPath);
    const { dirName, fileName } = this.audienceConfig;
    const audiencesPath = resolve(this.config.data, this.personalizationConfig.dirName, dirName, fileName);

    if (existsSync(audiencesPath)) {
      try {
        const audiences = fsUtil.readFile(audiencesPath, true) as AudienceStruct[];
        const attributesUid = fsUtil.readFile(this.attributesMapperPath, true) as Record<string, string>;

        for (const audience of audiences) {
          let { name, definition, description, uid } = audience;
          //check whether reference attributes exists or not
          if (definition.rules?.length) {
            const updatedDefRules = lookUpAttributes(definition.rules, attributesUid);
            definition.rules = updatedDefRules;
          }
          const audienceRes = await this.createAudience({ definition, name, description });
          //map old audience uid to new audience uid
          //mapper file is used to check whether audience created or not before creating experience
          this.audiencesUidMapper[uid] = audienceRes?.uid ?? '';
        }

        fsUtil.writeFile(this.audiencesUidMapperPath, this.audiencesUidMapper);
        log(this.config, this.$t(this.messages.CREATE_SUCCESS, { module: 'Audiences' }), 'info');
      } catch (error: any) {
        if (error?.errorMessage || error?.message || error?.error_message) {
          log(this.config, this.$t(this.messages.CREATE_FAILURE, { module: 'Audiences' }), 'error');
        }
        throw error;
      }
    }
  }
}
