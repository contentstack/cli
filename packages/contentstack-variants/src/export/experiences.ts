import * as path from 'path';
import { sanitizePath, log, handleAndLogError } from '@contentstack/cli-utilities';
import { PersonalizeConfig, ExportConfig, ExperienceStruct } from '../types';
import { fsUtil, PersonalizationAdapter } from '../utils';

export default class ExportExperiences extends PersonalizationAdapter<ExportConfig> {
  private experiencesFolderPath: string;
  public exportConfig: ExportConfig;
  public personalizeConfig: PersonalizeConfig;
  constructor(exportConfig: ExportConfig) {
    super({
      config: exportConfig,
      baseURL: exportConfig.modules.personalize.baseURL[exportConfig.region.name],
      headers: { 'X-Project-Uid': exportConfig.project_id },
      cmaConfig: {
        baseURL: exportConfig.region.cma + `/v3`,
        headers: { api_key: exportConfig.apiKey },
      },
    });
    this.exportConfig = exportConfig;
    this.personalizeConfig = exportConfig.modules.personalize;
    this.experiencesFolderPath = path.resolve(
      sanitizePath(exportConfig.data),
      sanitizePath(exportConfig.branchName || ''),
      sanitizePath(this.personalizeConfig.dirName),
      'experiences',
    );
  }

  async start() {
    try {
      // get all experiences
      // loop through experiences and get content types attached to it
      // write experiences in to a file
      log.debug('Starting experiences export process...', this.exportConfig.context);
      log.info('Starting experiences export', this.exportConfig.context);
      
      log.debug('Initializing personalization adapter...', this.exportConfig.context);
      await this.init();
      log.debug('Personalization adapter initialized successfully', this.exportConfig.context);
      
      log.debug(`Creating experiences directory at: ${this.experiencesFolderPath}`, this.exportConfig.context);
      await fsUtil.makeDirectory(this.experiencesFolderPath);
      log.debug('Experiences directory created successfully', this.exportConfig.context);
      
      const versionsDirPath = path.resolve(sanitizePath(this.experiencesFolderPath), 'versions');
      log.debug(`Creating versions directory at: ${versionsDirPath}`, this.exportConfig.context);
      await fsUtil.makeDirectory(versionsDirPath);
      log.debug('Versions directory created successfully', this.exportConfig.context);
      
      log.debug('Fetching experiences from personalization API...', this.exportConfig.context);
      const experiences: Array<ExperienceStruct> = (await this.getExperiences()) || [];
      log.debug(`Fetched ${experiences?.length || 0} experiences`, this.exportConfig.context);
      
      if (!experiences || experiences?.length < 1) {
        log.debug('No experiences found, completing export', this.exportConfig.context);
        log.info('No Experiences found with the given project!', this.exportConfig.context);
        return;
      }
      
      const experiencesFilePath = path.resolve(sanitizePath(this.experiencesFolderPath), 'experiences.json');
      log.debug(`Writing experiences to: ${experiencesFilePath}`, this.exportConfig.context);
      fsUtil.writeFile(experiencesFilePath, experiences);

      const experienceToVariantsStrList: Array<string> = [];
      const experienceToContentTypesMap: Record<string, string[]> = {};
      
      log.debug(`Processing ${experiences.length} experiences for variants and content types`, this.exportConfig.context);
      
      for (let experience of experiences) {
        log.debug(`Processing experience: ${experience.name} (${experience.uid})`, this.exportConfig.context);
        
        // create id mapper for experience to variants
        let variants = experience?._cms?.variants ?? {};
        log.debug(`Found ${Object.keys(variants).length} variants for experience: ${experience.name}`, this.exportConfig.context);
        
        Object.keys(variants).forEach((variantShortId: string) => {
          const experienceToVariantsStr = `${experience.uid}-${variantShortId}-${variants[variantShortId]}`;
          experienceToVariantsStrList.push(experienceToVariantsStr);
          log.debug(`Added variant mapping: ${experienceToVariantsStr}`, this.exportConfig.context);
        });

        try {
          // fetch versions of experience
          log.debug(`Fetching versions for experience: ${experience.name}`, this.exportConfig.context);
          const experienceVersions = (await this.getExperienceVersions(experience.uid)) || [];
          log.debug(`Fetched ${experienceVersions.length} versions for experience: ${experience.name}`, this.exportConfig.context);
          
          if (experienceVersions.length > 0) {
            const versionsFilePath = path.resolve(sanitizePath(this.experiencesFolderPath), 'versions', `${experience.uid}.json`);
            log.debug(`Writing experience versions to: ${versionsFilePath}`, this.exportConfig.context);
            fsUtil.writeFile(versionsFilePath, experienceVersions);
          } else {
            log.debug(`No versions found for experience: ${experience.name}`, this.exportConfig.context);
            log.info(
              `No versions found for experience '${experience.name}'`,
              this.exportConfig.context,
            );
          }
        } catch (error) {
          log.debug(`Error occurred while fetching versions for experience: ${experience.name}`, this.exportConfig.context);
          handleAndLogError(
            error,
            {...this.exportConfig.context},
            `Failed to fetch versions of experience ${experience.name}`
          );
        }

        try {
          // fetch content of experience
          log.debug(`Fetching variant group for experience: ${experience.name}`, this.exportConfig.context);
          const { variant_groups: [variantGroup] = [] } =
            (await this.getVariantGroup({ experienceUid: experience.uid })) || {};
          
          if (variantGroup?.content_types?.length) {
            log.debug(`Found ${variantGroup.content_types.length} content types for experience: ${experience.name}`, this.exportConfig.context);
            experienceToContentTypesMap[experience.uid] = variantGroup.content_types;
          } else {
            log.debug(`No content types found for experience: ${experience.name}`, this.exportConfig.context);
          }
        } catch (error) {
          log.debug(`Error occurred while fetching content types for experience: ${experience.name}`, this.exportConfig.context);
          handleAndLogError(
            error,
            {...this.exportConfig.context},
            `Failed to fetch content types of experience ${experience.name}`
          );
        }
      }
      
      const variantsIdsFilePath = path.resolve(sanitizePath(this.experiencesFolderPath), 'experiences-variants-ids.json');
      log.debug(`Writing experience variants mapping to: ${variantsIdsFilePath}`, this.exportConfig.context);
      fsUtil.writeFile(variantsIdsFilePath, experienceToVariantsStrList);

      const contentTypesFilePath = path.resolve(sanitizePath(this.experiencesFolderPath), 'experiences-content-types.json');
      log.debug(`Writing experience content types mapping to: ${contentTypesFilePath}`, this.exportConfig.context);
      fsUtil.writeFile(contentTypesFilePath, experienceToContentTypesMap);
      
      log.debug('Experiences export completed successfully', this.exportConfig.context);
      log.success('Experiences exported successfully!', this.exportConfig.context);
    } catch (error) {
      log.debug(`Error occurred during experiences export: ${error}`, this.exportConfig.context);
      handleAndLogError(error, {...this.exportConfig.context});
    }
  }
}
