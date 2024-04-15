import { resolve } from 'path';
import { existsSync } from 'fs';

import { PersonalizationAdapter, fsUtil, log } from '../utils';
import { APIConfig, AttributeStruct, ImportConfig } from '../types';

export default class Attribute extends PersonalizationAdapter<ImportConfig> {
  private mapperDirPath: string;
  private attrMapperDirPath: string;
  private attributesUidMapperPath: string;
  private attributesUidMapper: Record<string, unknown>;
  private personalizationConfig: ImportConfig['modules']['personalization'];
  private attributeConfig: ImportConfig['modules']['personalization']['attributes'];

  constructor(public readonly config: ImportConfig) {
    const conf: APIConfig = {
      config,
      baseURL: config.personalizationHost,
      headers: { 'X-Project-Uid': config.project_id, authtoken: config.auth_token },
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
    log(this.config, this.$t(this.messages.IMPORT_MSG, { module: 'Attributes' }), 'info');

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
        log(this.config, this.$t(this.messages.CREATE_SUCCESS, { module: 'Attributes' }), 'info');
      } catch (error: any) {
        if (error?.errorMessage || error?.message || error?.error_message) {
          log(this.config, this.$t(this.messages.CREATE_FAILURE, { module: 'Attributes' }), 'error');
        }
        throw error;
      }
    }
  }
}
