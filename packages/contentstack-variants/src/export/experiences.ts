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
      baseURL: exportConfig.modules.personalization.baseURL,
      headers: { authtoken: exportConfig.auth_token, 'X-Project-Uid': exportConfig.project_id },
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
      const experiences: Array<ExperienceStruct>  = await this.getExperiences() || [];
      if (!experiences || experiences?.length < 1) {
        log(this.exportConfig, 'No Experiences found with the give project', 'info');
        return;
      }
      fsUtil.writeFile(path.resolve(this.experiencesFolderPath, 'experiences.json'), experiences);
      const experienceToVarianceStrList: Array<string> = [];
      for (let experience of experiences) {
        let variants = experience?._cms?.variants ?? {}; // Add nullish coalescing operator
        if (variants) {
          Object.keys(variants).forEach((variantShortId: string) => {
            const experienceToVarianceStr = `${experience.uid}-${variantShortId}-${variants[variantShortId]}`;
            experienceToVarianceStrList.push(experienceToVarianceStr);
          });
        }
      }
      fsUtil.writeFile(
        path.resolve(this.experiencesFolderPath, 'experiences-variants-ids.json'),
        experienceToVarianceStrList,
      );
      log(this.exportConfig, 'All the experiences have been exported successfully!', 'success');
    } catch (error) {
      log(this.exportConfig, `Failed to export experiences  ${formatError(error)}`, 'error');
      throw error;
    }
  }
}
