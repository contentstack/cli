import { resolve } from 'path';
import { existsSync } from 'fs';
import { sanitizePath } from '@contentstack/cli-utilities';
import { PersonalizationAdapter, fsUtil } from '../utils';
import { APIConfig, AttributeStruct, ImportConfig, LogType } from '../types';

export default class Attribute extends PersonalizationAdapter<ImportConfig> {
  private mapperDirPath: string;
  private attrMapperDirPath: string;
  private attributesUidMapperPath: string;
  private attributesUidMapper: Record<string, unknown>;
  private personalizeConfig: ImportConfig['modules']['personalize'];
  private attributeConfig: ImportConfig['modules']['personalize']['attributes'];

  constructor(public readonly config: ImportConfig, private readonly log: LogType = console.log) {
    const conf: APIConfig = {
      config,
      baseURL: config.modules.personalize.baseURL[config.region.name],
      headers: { 'X-Project-Uid': config.modules.personalize.project_id },
    };
    super(Object.assign(config, conf));
    this.personalizeConfig = this.config.modules.personalize;
    this.attributeConfig = this.personalizeConfig.attributes;
    this.mapperDirPath = resolve(
      sanitizePath(this.config.backupDir),
      'mapper',
      sanitizePath(this.personalizeConfig.dirName),
    );
    this.attrMapperDirPath = resolve(sanitizePath(this.mapperDirPath), sanitizePath(this.attributeConfig.dirName));
    this.attributesUidMapperPath = resolve(sanitizePath(this.attrMapperDirPath), 'uid-mapping.json');
    this.attributesUidMapper = {};
  }

  /**
   * The function asynchronously imports attributes from a JSON file and creates them in the system.
   */
  async import() {
    this.log(this.config, this.$t(this.messages.IMPORT_MSG, { module: 'Attributes' }), 'info');
    await this.init();
    await fsUtil.makeDirectory(this.attrMapperDirPath);
    const { dirName, fileName } = this.attributeConfig;
    const attributesPath = resolve(
      sanitizePath(this.config.data),
      sanitizePath(this.personalizeConfig.dirName),
      sanitizePath(dirName),
      sanitizePath(fileName),
    );

    if (existsSync(attributesPath)) {
      try {
        const attributes = fsUtil.readFile(attributesPath, true) as AttributeStruct[];

        for (const attribute of attributes) {
          const { key, name, description, uid } = attribute;
          // skip creating preset attributes, as they are already present in the system
          if (attribute.__type === 'PRESET') {
            continue;
          }
          try {
            const attributeRes = await this.createAttribute({ key, name, description });
            //map old attribute uid to new attribute uid
            //mapper file is used to check whether attribute created or not before creating audience
            this.attributesUidMapper[uid] = attributeRes?.uid ?? '';
          } catch (error) {
            this.log(this.config, `Failed to create attribute ${name}!`, 'error');
            this.log(this.config, error, 'error');
          }
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
