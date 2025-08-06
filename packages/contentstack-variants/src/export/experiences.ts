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
    this.exportConfig.context.module = 'experiences';
  }

  async start() {
    try {
      log.debug('Starting experiences export process...', this.exportConfig.context);
      log.info('Starting experiences export', this.exportConfig.context);

      const { experiences } = await this.withLoadingSpinner(
        'EXPERIENCES: Initializing export and fetching data...',
        async () => {
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

          return { experiences };
        },
      );

      if (!experiences || experiences?.length < 1) {
        log.debug('No experiences found, completing export', this.exportConfig.context);
        log.info('No Experiences found with the given project!', this.exportConfig.context);
        return;
      }

      // Create progress manager - use parent if available, otherwise create simple
      let progress: any;
      if (this.parentProgressManager) {
        // Use parent progress manager - we're part of the personalize modules process
        progress = this.parentProgressManager;
        this.progressManager = this.parentProgressManager;
      } else {
        // Create our own progress for standalone execution
        progress = this.createSimpleProgress('Experiences', experiences.length + 1);
      }

      log.debug(`Processing ${experiences.length} experiences`, this.exportConfig.context);

      // Update progress with process name
      const processName = 'Experiences';
      progress.updateStatus('Writing experiences data...', processName);

      // Process and export experiences
      const experiencesFilePath = path.resolve(sanitizePath(this.experiencesFolderPath), 'experiences.json');
      log.debug(`Writing experiences to: ${experiencesFilePath}`, this.exportConfig.context);
      fsUtil.writeFile(experiencesFilePath, experiences);

      const experienceToVariantsStrList: Array<string> = [];
      const experienceToContentTypesMap: Record<string, string[]> = {};

      log.debug(
        `Processing ${experiences.length} experiences for variants and content types`,
        this.exportConfig.context,
      );

      progress.updateStatus('Processing experiences variants and content types...', processName);

      for (let experienceIndex = 0; experienceIndex < experiences.length; experienceIndex++) {
        const experience = experiences[experienceIndex];
        try {
          log.debug(
            `Processing experience: ${experience.name} (${experience.uid}) - ${experienceIndex + 1}/${
              experiences.length
            }`,
            this.exportConfig.context,
          );

          // create id mapper for experience to variants
          let variants = experience?._cms?.variants ?? {};
          log.debug(
            `Found ${Object.keys(variants).length} variants for experience: ${experience.name}`, // talisman:disable-line
            this.exportConfig.context,
          );

                      Object.keys(variants).forEach((variantShortId: string) => { // talisman:disable-line
            const experienceToVariantsStr = `${experience.uid}-${variantShortId}-${variants[variantShortId]}`;
            experienceToVariantsStrList.push(experienceToVariantsStr);
            log.debug(`Added variant mapping: ${experienceToVariantsStr}`, this.exportConfig.context);
          });

          // Fetch versions of experience
          try {
            log.debug(`Fetching versions for experience: ${experience.name}`, this.exportConfig.context);
            const experienceVersions = (await this.getExperienceVersions(experience.uid)) || [];
            log.debug(
              `Fetched ${experienceVersions.length} versions for experience: ${experience.name}`,
              this.exportConfig.context,
            );

            if (experienceVersions.length > 0) {
              const versionsFilePath = path.resolve(
                sanitizePath(this.experiencesFolderPath),
                'versions',
                `${experience.uid}.json`,
              );
              log.debug(`Writing experience versions to: ${versionsFilePath}`, this.exportConfig.context);
              fsUtil.writeFile(versionsFilePath, experienceVersions);
            } else {
              log.debug(`No versions found for experience: ${experience.name}`, this.exportConfig.context);
              log.info(`No versions found for experience '${experience.name}'`, this.exportConfig.context);
            }
          } catch (error: any) {
            log.debug(
              `Error occurred while fetching versions for experience: ${experience.name}`,
              this.exportConfig.context,
            );
            handleAndLogError(
              error,
              { ...this.exportConfig.context },
              `Failed to fetch versions of experience ${experience.name}`,
            );
          }

          // Fetch content types of experience
          try {
            log.debug(`Fetching variant group for experience: ${experience.name}`, this.exportConfig.context);
            const { variant_groups: [variantGroup] = [] } =
              (await this.getVariantGroup({ experienceUid: experience.uid })) || {};

            if (variantGroup?.content_types?.length) {
              log.debug(
                `Found ${variantGroup.content_types.length} content types for experience: ${experience.name}`,
                this.exportConfig.context,
              );
              experienceToContentTypesMap[experience.uid] = variantGroup.content_types;
            } else {
              log.debug(`No content types found for experience: ${experience.name}`, this.exportConfig.context);
            }
          } catch (error: any) {
            log.debug(
              `Error occurred while fetching content types for experience: ${experience.name}`,
              this.exportConfig.context,
            );
            handleAndLogError(
              error,
              { ...this.exportConfig.context },
              `Failed to fetch content types of experience ${experience.name}`,
            );
          }

          // Update progress for each processed experience
          if (this.progressManager) {
            this.updateProgress(
              true,
              `experience ${experienceIndex + 1}/${experiences.length}: ${experience.name} (${experience.uid})`,
              undefined,
              processName,
            );
          }
        } catch (error: any) {
          log.debug(`Error occurred while processing experience: ${experience.name}`, this.exportConfig.context);

          // Update progress for failed experience
          if (this.progressManager) {
            this.updateProgress(
              false,
              `experience ${experienceIndex + 1}/${experiences.length}: ${experience.name} (${experience.uid})`,
              error?.message || 'Failed to process experience',
              processName,
            );
          }

          handleAndLogError(error, { ...this.exportConfig.context }, `Failed to process experience ${experience.name}`);
        }
      }

      progress.updateStatus('Writing final mapping files...', processName);

      // Write final mapping files
      const variantsIdsFilePath = path.resolve(
        sanitizePath(this.experiencesFolderPath),
        'experiences-variants-ids.json',
      );
      log.debug(`Writing experience variants mapping to: ${variantsIdsFilePath}`, this.exportConfig.context);
      fsUtil.writeFile(variantsIdsFilePath, experienceToVariantsStrList);

      const contentTypesFilePath = path.resolve(
        sanitizePath(this.experiencesFolderPath),
        'experiences-content-types.json',
      );
      log.debug(`Writing experience content types mapping to: ${contentTypesFilePath}`, this.exportConfig.context);
      fsUtil.writeFile(contentTypesFilePath, experienceToContentTypesMap);

      // Final progress update
      if (this.progressManager) {
        this.updateProgress(true, `${experiences.length} experiences exported`, undefined, processName);
      }

      // Complete progress only if we're managing our own progress
      if (!this.parentProgressManager) {
        this.completeProgress(true);
      }

      log.debug('Experiences export completed successfully', this.exportConfig.context);
      log.success('Experiences exported successfully!', this.exportConfig.context);
    } catch (error: any) {
      log.debug(`Error occurred during experiences export: ${error}`, this.exportConfig.context);
      this.completeProgress(false, error?.message || 'Experiences export failed');
      handleAndLogError(error, { ...this.exportConfig.context });
    }
  }
}
