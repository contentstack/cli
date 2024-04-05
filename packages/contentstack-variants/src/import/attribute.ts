import { join } from 'path';
import { existsSync, readFileSync } from 'fs';

import { PersonalizationAdapter } from '../utils';
import { APIConfig, AttributeStruct, ImportConfig, LogType } from '../types';

export default class Attribute extends PersonalizationAdapter<ImportConfig> {
  constructor(public readonly config: ImportConfig, private readonly log: LogType = console.log) {
    const conf: APIConfig = {
      config,
      baseURL: config.personalizationHost,
      headers: { 'x-project-uid': config.project_uid, authtoken: config.auth_token },
    };
    super(Object.assign(config, conf));
  }

  /**
   * The function asynchronously imports attributes from a JSON file and creates them in the system.
   */
  async import() {
    const personalization = this.config.modules.personalization;
    const { dirName, fileName } = personalization.attributes;
    const attributesPath = join(this.config.data, personalization.dirName, dirName, fileName);

    if (existsSync(attributesPath)) {
      try {
        const attributes = JSON.parse(readFileSync(attributesPath, 'utf8')) as AttributeStruct[];

        for (const attribute of attributes) {
          const { key, name, description } = attribute
          await this.createAttribute({ key, name, description })
        }

        this.log(this.config, this.$t(this.messages.CREATE_SUCCESS, { module: 'Attributes' }), 'info');
      } catch (error) {
        this.log(this.config, this.$t(this.messages.CREATE_FAILURE, { module: 'Attributes' }), 'error');
        this.log(this.config, error, 'error');
      }
    }
  }
}
