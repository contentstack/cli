import * as path from 'path';
import { PersonalizationConfig, ExportConfig, ExperienceStruct } from '../types';
import { formatError, fsUtil, log, PersonalizationAdapter } from '../utils';

export default class ExportExperiences extends PersonalizationAdapter<ExportConfig> {
  private experiencesFolderPath: string;
  public exportConfig: ExportConfig;
  public personalizationConfig: PersonalizationConfig;
  constructor(exportConfig: ExportConfig) {
    super({
      config: exportConfig,
      baseURL: exportConfig.modules.personalization.baseURL[exportConfig.region.name],
      headers: { authtoken: exportConfig.auth_token, 'X-Project-Uid': exportConfig.project_id },
      cmaConfig: {
        baseURL: exportConfig.region.cma + `/v3`,
        headers: { authtoken: exportConfig.auth_token, api_key: exportConfig.apiKey },
      },
    });
    this.exportConfig = exportConfig;
    this.personalizationConfig = exportConfig.modules.personalization;
    this.experiencesFolderPath = path.resolve(
      exportConfig.data,
      exportConfig.branchName || '',
      this.personalizationConfig.dirName,
      'experiences',
    );
  }

  async start() {
    try {
      // get all experiences
      // loop through experiences and get content types attached to it
      // write experiences in to a file
      log(this.exportConfig, 'Starting experiences export', 'info');
      await fsUtil.makeDirectory(this.experiencesFolderPath);
      const experiences: Array<ExperienceStruct> = (await this.getExperiences()) || [];
      if (!experiences || experiences?.length < 1) {
        log(this.exportConfig, 'No Experiences found with the give project', 'info');
        return;
      }
      fsUtil.writeFile(path.resolve(this.experiencesFolderPath, 'experiences.json'), experiences);

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
        path.resolve(this.experiencesFolderPath, 'experiences-variants-ids.json'),
        experienceToVariantsStrList,
      );

      fsUtil.writeFile(
        path.resolve(this.experiencesFolderPath, 'experiences-content-types.json'),
        experienceToContentTypesMap,
      );
      log(this.exportConfig, 'All the experiences have been exported successfully!', 'success');
    } catch (error) {
      log(this.exportConfig, `Failed to export experiences!`, 'error');
      log(this.config, error, 'error');
    }
  }
}
