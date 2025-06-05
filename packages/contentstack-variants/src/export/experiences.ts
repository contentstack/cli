import * as path from 'path';
import { sanitizePath, v2Logger, handleAndLogError } from '@contentstack/cli-utilities';
import { PersonalizeConfig, ExportConfig, ExperienceStruct } from '../types';
import { formatError, fsUtil, log, PersonalizationAdapter } from '../utils';

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
      v2Logger.info('Starting experiences export', this.exportConfig.context);
      await this.init();
      await fsUtil.makeDirectory(this.experiencesFolderPath);
      await fsUtil.makeDirectory(path.resolve(sanitizePath(this.experiencesFolderPath), 'versions'));
      const experiences: Array<ExperienceStruct> = (await this.getExperiences()) || [];
      if (!experiences || experiences?.length < 1) {
        v2Logger.info('No Experiences found with the given project!', this.exportConfig.context);
        return;
      }
      fsUtil.writeFile(path.resolve(sanitizePath(this.experiencesFolderPath), 'experiences.json'), experiences);

      const experienceToVariantsStrList: Array<string> = [];
      const experienceToContentTypesMap: Record<string, string[]> = {};
      for (let experience of experiences) {
        // create id mapper for experience to variants
        let variants = experience?._cms?.variants ?? {};
        Object.keys(variants).forEach((variantShortId: string) => {
          const experienceToVariantsStr = `${experience.uid}-${variantShortId}-${variants[variantShortId]}`;
          experienceToVariantsStrList.push(experienceToVariantsStr);
        });

        try {
          // fetch versions of experience
          const experienceVersions = (await this.getExperienceVersions(experience.uid)) || [];
          if (experienceVersions.length > 0) {
            fsUtil.writeFile(
              path.resolve(sanitizePath(this.experiencesFolderPath), 'versions', `${experience.uid}.json`),
              experienceVersions,
            );
          } else {
            v2Logger.info(
              `No versions found for experience '${experience.name}'`,
              this.exportConfig.context,
            );
          }
        } catch (error) {
          handleAndLogError(
            error,
            {...this.exportConfig.context},
            `Failed to fetch versions of experience ${experience.name}`
          );
        }

        try {
          // fetch content of experience
          const { variant_groups: [variantGroup] = [] } =
            (await this.getVariantGroup({ experienceUid: experience.uid })) || {};
          if (variantGroup?.content_types?.length) {
            experienceToContentTypesMap[experience.uid] = variantGroup.content_types;
          }
        } catch (error) {
          handleAndLogError(
            error,
            {...this.exportConfig.context},
            `Failed to fetch content types of experience ${experience.name}`
          );
        }
      }
      fsUtil.writeFile(
        path.resolve(sanitizePath(this.experiencesFolderPath), 'experiences-variants-ids.json'),
        experienceToVariantsStrList,
      );

      fsUtil.writeFile(
        path.resolve(sanitizePath(this.experiencesFolderPath), 'experiences-content-types.json'),
        experienceToContentTypesMap,
      );
      v2Logger.success('Experiences exported successfully!', this.exportConfig.context);
    } catch (error) {
      handleAndLogError(error, {...this.exportConfig.context});
    }
  }
}
