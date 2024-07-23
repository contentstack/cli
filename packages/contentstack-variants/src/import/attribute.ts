import { resolve } from 'path';
import { existsSync } from 'fs';

import { PersonalizationAdapter, fsUtil } from '../utils';
import { APIConfig, AttributeStruct, ImportConfig, LogType } from '../types';

export default class Attribute extends PersonalizationAdapter<ImportConfig> {
  private mapperDirPath: string;
  private attrMapperDirPath: string;
  private attributesUidMapperPath: string;
  private attributesUidMapper: Record<string, unknown>;
  private personalizationConfig: ImportConfig['modules']['personalization'];
  private attributeConfig: ImportConfig['modules']['personalization']['attributes'];

  constructor(public readonly config: ImportConfig, private readonly log: LogType = console.log) {
    const conf: APIConfig = {
      config,
      baseURL: config.modules.personalization.baseURL[config.region.name],
      headers: { 'X-Project-Uid': config.modules.personalization.project_id, authtoken: config.auth_token },
    };
    super(Object.assign(config, conf));
    this.personalizationConfig = this.config.modules.personalization;
    this.attributeConfig = this.personalizationConfig.attributes;
    this.mapperDirPath = resolve(this.config.backupDir, 'mapper', this.personalizationConfig.dirName);
    this.attrMapperDirPath = resolve(this.mapperDirPath, this.attributeConfig.dirName);
    this.attributesUidMapperPath = resolve(this.attrMapperDirPath, 'uid-mapping.json');
    this.attributesUidMapper = {};
  }

  /**
   * The function asynchronously imports attributes from a JSON file and creates them in the system.
   */
  async import() {
    this.log(this.config, this.$t(this.messages.IMPORT_MSG, { module: 'Attributes' }), 'info');

    await fsUtil.makeDirectory(this.attrMapperDirPath);
    const { dirName, fileName } = this.attributeConfig;
    const attributesPath = resolve(this.config.data, this.personalizationConfig.dirName, dirName, fileName);

    if (existsSync(attributesPath)) {
      try {
        const attributes = fsUtil.readFile(attributesPath, true) as AttributeStruct[];

        for (const attribute of attributes) {
          const { key, name, description, uid } = attribute;
          const attributeRes = await this.createAttribute({ key, name, description });
          //map old attribute uid to new attribute uid
          //mapper file is used to check whether attribute created or not before creating audience
          this.attributesUidMapper[uid] = attributeRes?.uid ?? '';
        }

        fsUtil.writeFile(this.attributesUidMapperPath, this.attributesUidMapper);
        this.log(this.config, this.$t(this.messages.CREATE_SUCCESS, { module: 'Attributes' }), 'info');
      } catch (error) {
        this.log(this.config, this.$t(this.messages.CREATE_FAILURE, { module: 'Attributes' }), 'error');
        this.log(this.config, error, 'error');
      }
    }
  }
}
