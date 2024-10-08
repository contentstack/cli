import * as path from 'path';
import { sanitizePath } from '@contentstack/cli-utilities';
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
      log(this.exportConfig, 'Starting experiences export', 'info');
      await this.init();
      await fsUtil.makeDirectory(this.experiencesFolderPath);
      await fsUtil.makeDirectory(path.resolve(sanitizePath(this.experiencesFolderPath), 'versions'));
      const experiences: Array<ExperienceStruct> = (await this.getExperiences()) || [];
      if (!experiences || experiences?.length < 1) {
        log(this.exportConfig, 'No Experiences found with the give project', 'info');
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
            log(this.exportConfig, `No versions found for experience ${experience.name}`, 'info');
          }
        } catch (error) {
          log(this.exportConfig, `Failed to fetch versions of experience ${experience.name}`, 'error');
        }

        try {
          // fetch content of experience
          const { variant_groups: [variantGroup] = [] } =
            (await this.getVariantGroup({ experienceUid: experience.uid })) || {};
          if (variantGroup?.content_types?.length) {
            experienceToContentTypesMap[experience.uid] = variantGroup.content_types;
          }
        } catch (error) {
          log(this.exportConfig, `Failed to fetch content types of experience ${experience.name}`, 'error');
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
      log(this.exportConfig, 'All the experiences have been exported successfully!', 'success');
    } catch (error) {
      log(this.exportConfig, `Failed to export experiences!`, 'error');
      log(this.config, error, 'error');
    }
  }
}
