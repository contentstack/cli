import { resolve } from 'path';
import { existsSync } from 'fs';
import { sanitizePath } from '@contentstack/cli-utilities';
import { APIConfig, AudienceStruct, ImportConfig, LogType } from '../types';
import { PersonalizationAdapter, fsUtil, lookUpAttributes } from '../utils';

export default class Audiences extends PersonalizationAdapter<ImportConfig> {
  private mapperDirPath: string;
  private audienceMapperDirPath: string;
  private attributesMapperPath: string;
  private audiencesUidMapperPath: string;
  private audiencesUidMapper: Record<string, unknown>;
  private personalizeConfig: ImportConfig['modules']['personalize'];
  private audienceConfig: ImportConfig['modules']['personalize']['audiences'];
  public attributeConfig: ImportConfig['modules']['personalize']['attributes'];

  constructor(public readonly config: ImportConfig, private readonly log: LogType = console.log) {
    const conf: APIConfig = {
      config,
      baseURL: config.modules.personalize.baseURL[config.region.name],
      headers: { 'X-Project-Uid': config.modules.personalize.project_id, authtoken: config.auth_token },
    };
    super(Object.assign(config, conf));
    this.personalizeConfig = this.config.modules.personalize;
    this.audienceConfig = this.personalizeConfig.audiences;
    this.attributeConfig = this.personalizeConfig.attributes;
    this.mapperDirPath = resolve(sanitizePath(this.config.backupDir), 'mapper', sanitizePath(this.personalizeConfig.dirName));
    this.audienceMapperDirPath = resolve(sanitizePath(this.mapperDirPath), sanitizePath(this.audienceConfig.dirName));
    this.audiencesUidMapperPath = resolve(sanitizePath(this.audienceMapperDirPath), 'uid-mapping.json');
    this.attributesMapperPath = resolve(sanitizePath(this.mapperDirPath), sanitizePath(this.attributeConfig.dirName), 'uid-mapping.json');
    this.audiencesUidMapper = {};
  }

  /**
   * The function asynchronously imports audiences from a JSON file and creates them in the system.
   */
  async import() {
    this.log(this.config, this.$t(this.messages.IMPORT_MSG, { module: 'Audiences' }), 'info');

    await fsUtil.makeDirectory(this.audienceMapperDirPath);
    const { dirName, fileName } = this.audienceConfig;
    const audiencesPath = resolve(sanitizePath(this.config.data), sanitizePath(this.personalizeConfig.dirName), sanitizePath(dirName), sanitizePath(fileName));

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
      } catch (error) {
        this.log(this.config, this.$t(this.messages.CREATE_FAILURE, { module: 'Audiences' }), 'error');
        this.log(this.config, error, 'error');
      }
    }
  }
}
