import omit from 'lodash/omit';
import { resolve as pResolve } from 'node:path';
import { v2Logger, handleAndLogError } from '@contentstack/cli-utilities';

import { formatError, fsUtil, PersonalizationAdapter, log } from '../utils';
import { PersonalizeConfig, ExportConfig, AudienceStruct, AudiencesConfig } from '../types';

export default class ExportAudiences extends PersonalizationAdapter<ExportConfig> {
  private audiencesConfig: AudiencesConfig;
  private audiencesFolderPath: string;
  private audiences: Record<string, unknown>[];
  public personalizeConfig: PersonalizeConfig;

  constructor(readonly exportConfig: ExportConfig) {
    super({
      config: exportConfig,
      baseURL: exportConfig.modules.personalize.baseURL[exportConfig.region.name],
      headers: { 'X-Project-Uid': exportConfig.project_id },
    });
    this.personalizeConfig = exportConfig.modules.personalize;
    this.audiencesConfig = exportConfig.modules.audiences;
    this.audiencesFolderPath = pResolve(
      exportConfig.data,
      exportConfig.branchName || '',
      this.personalizeConfig.dirName,
      this.audiencesConfig.dirName,
    );
    this.audiences = [];
  }

  async start() {
    try {
      v2Logger.info('Starting audiences export', this.exportConfig.context);
      await this.init();
      await fsUtil.makeDirectory(this.audiencesFolderPath);
      this.audiences = (await this.getAudiences()) as AudienceStruct[];

      if (!this.audiences?.length) {
        v2Logger.info('No Audiences found with the given project!', this.exportConfig.context);
        return;
      } else {
        this.sanitizeAttribs();
        fsUtil.writeFile(pResolve(this.audiencesFolderPath, this.audiencesConfig.fileName), this.audiences);
        v2Logger.success(
          `Audiences exported successfully! Total audiences: ${this.audiences.length}`,
          this.exportConfig.context,
        );
        return;
      }
    } catch (error) {
      handleAndLogError(error, { ...this.exportConfig.context });
    }
  }

  /**
   * function to remove invalid keys from audience object
   */
  sanitizeAttribs() {
    this.audiences = this.audiences?.map((audience) => omit(audience, this.audiencesConfig.invalidKeys)) || [];
  }
}
