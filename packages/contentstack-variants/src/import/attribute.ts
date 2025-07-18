import { resolve } from 'path';
import { existsSync } from 'fs';
import { sanitizePath, log, handleAndLogError } from '@contentstack/cli-utilities';
import { PersonalizationAdapter, fsUtil } from '../utils';
import { APIConfig, AttributeStruct, ImportConfig, LogType } from '../types';

export default class Attribute extends PersonalizationAdapter<ImportConfig> {
  private mapperDirPath: string;
  private attrMapperDirPath: string;
  private attributesUidMapperPath: string;
  private attributesUidMapper: Record<string, unknown>;
  private personalizeConfig: ImportConfig['modules']['personalize'];
  private attributeConfig: ImportConfig['modules']['personalize']['attributes'];

  constructor(public readonly config: ImportConfig) {   
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
    this.config.context.module = 'attributes';
  }

  /**
   * The function asynchronously imports attributes from a JSON file and creates them in the system.
   */
  async import() {  
    await this.init();
    await fsUtil.makeDirectory(this.attrMapperDirPath);
    log.debug(`Created mapper directory: ${this.attrMapperDirPath}`, this.config.context);
    
    const { dirName, fileName } = this.attributeConfig;
    const attributesPath = resolve(
      sanitizePath(this.config.data),
      sanitizePath(this.personalizeConfig.dirName),
      sanitizePath(dirName),
      sanitizePath(fileName),
    );

    log.debug(`Checking for attributes file: ${attributesPath}`, this.config.context);
    
    if (existsSync(attributesPath)) {
      try {
        const attributes = fsUtil.readFile(attributesPath, true) as AttributeStruct[];
        log.info(`Found ${attributes.length} attributes to import`, this.config.context);

        for (const attribute of attributes) {
          const { key, name, description, uid } = attribute;
          log.debug(`Processing attribute: ${name} - ${attribute.__type}`, this.config.context);
          
          // skip creating preset attributes, as they are already present in the system
          if (attribute.__type === 'PRESET') {
            log.debug(`Skipping preset attribute: ${name}`, this.config.context);
            continue;
          }
          
          try {
            log.debug(`Creating custom attribute: ${name}`, this.config.context);
            const attributeRes = await this.createAttribute({ key, name, description });
            //map old attribute uid to new attribute uid
            //mapper file is used to check whether attribute created or not before creating audience
            this.attributesUidMapper[uid] = attributeRes?.uid ?? '';
            log.debug(`Created attribute: ${uid} -> ${attributeRes?.uid}`, this.config.context);
          } catch (error) {
            handleAndLogError(error, this.config.context, `Failed to create attribute: ${name}`);
          }
        }

        fsUtil.writeFile(this.attributesUidMapperPath, this.attributesUidMapper);
        log.debug(`Saved ${Object.keys(this.attributesUidMapper).length} attribute mappings to: ${this.attributesUidMapperPath}`, this.config.context);
        log.success('Attributes imported successfully', this.config.context);
      } catch (error) {
        handleAndLogError(error, this.config.context);
      }
    } else {
      log.warn(`Attributes file not found: ${attributesPath}`, this.config.context);
    }
  }
}
