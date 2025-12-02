import { resolve } from 'path';
import { existsSync } from 'fs';
import { sanitizePath, log, handleAndLogError } from '@contentstack/cli-utilities';
import { APIConfig, AudienceStruct, ImportConfig } from '../types';
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

  constructor(public readonly config: ImportConfig ) {  
    const conf: APIConfig = {
      config,
      baseURL: config.modules.personalize.baseURL[config.region.name],
      headers: { 'X-Project-Uid': config.modules.personalize.project_id },
    };
    super(Object.assign(config, conf));
    
    this.personalizeConfig = this.config.modules.personalize;
    this.audienceConfig = this.personalizeConfig.audiences;
    this.attributeConfig = this.personalizeConfig.attributes;
    this.mapperDirPath = resolve(
      sanitizePath(this.config.backupDir),
      'mapper',
      sanitizePath(this.personalizeConfig.dirName),
    );
    this.audienceMapperDirPath = resolve(sanitizePath(this.mapperDirPath), sanitizePath(this.audienceConfig.dirName));
    this.audiencesUidMapperPath = resolve(sanitizePath(this.audienceMapperDirPath), 'uid-mapping.json');
    this.attributesMapperPath = resolve(
      sanitizePath(this.mapperDirPath),
      sanitizePath(this.attributeConfig.dirName),
      'uid-mapping.json',
    );
    this.audiencesUidMapper = {};
    this.config.context.module = 'audiences';
  }

  /**
   * The function asynchronously imports audiences from a JSON file and creates them in the system.
   */
  async import() {   
    await this.init();
    await fsUtil.makeDirectory(this.audienceMapperDirPath);
    log.debug(`Created mapper directory: ${this.audienceMapperDirPath}`, this.config.context);
    
    const { dirName, fileName } = this.audienceConfig;
    const audiencesPath = resolve(
      sanitizePath(this.config.data),
      sanitizePath(this.personalizeConfig.dirName),
      sanitizePath(dirName),
      sanitizePath(fileName),
    );

    log.debug(`Checking for audiences file: ${audiencesPath}`, this.config.context);
    
    if (existsSync(audiencesPath)) {
      try {
        const audiences = fsUtil.readFile(audiencesPath, true) as AudienceStruct[];
        log.info(`Found ${audiences.length} audiences to import`, this.config.context);
        
        const attributesUid = (fsUtil.readFile(this.attributesMapperPath, true) as Record<string, string>) || {};
        log.debug(`Loaded ${Object.keys(attributesUid).length} attribute mappings`, this.config.context);

        for (const audience of audiences) {
          let { name, definition, description, uid } = audience;
          log.debug(`Processing audience: ${name} (${uid})`, this.config.context);
          
          try {
            //check whether reference attributes exists or not
            if (definition.rules?.length) {
              log.debug(`Processing ${definition.rules.length} definition rules for audience: ${name}`, this.config.context);
              definition.rules = lookUpAttributes(definition.rules, attributesUid);
              log.debug(`Processed definition rules.`, this.config.context);
            } else {
              log.debug(`No definition rules found for audience: ${name}`, this.config.context);
            }
            
            log.debug(`Creating audience: ${name}`, this.config.context);
            const audienceRes = await this.createAudience({ definition, name, description });
            //map old audience uid to new audience uid
            //mapper file is used to check whether audience created or not before creating experience
            this.audiencesUidMapper[uid] = audienceRes?.uid ?? '';
            log.debug(`Created audience: ${uid} -> ${audienceRes?.uid}`, this.config.context);
          } catch (error) {
            handleAndLogError(error, this.config.context, `Failed to create audience: ${name} (${uid})`);
          }
        }

        fsUtil.writeFile(this.audiencesUidMapperPath, this.audiencesUidMapper);
        log.debug(`Saved ${Object.keys(this.audiencesUidMapper).length} audience mappings`, this.config.context);
        log.success('Audiences imported successfully', this.config.context);
      } catch (error) {
        handleAndLogError(error, this.config.context);
      }
    } else {
      log.warn(`Audiences file not found: ${audiencesPath}`, this.config.context);
    }
  }
}
