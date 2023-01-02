import * as path from 'path';
import { logger } from '@contentstack/cli-utilities';
import { fileHelper } from '../../utils';
export default class EnvironmentsExport {
  private context: any;
  private stackAPIClient: any;
  private exportConfig: any;
  private qs: any;
  private environmentConfig: any;
  private environmentsPath: string;

  constructor(context, stackAPIClient, exportConfig) {
    this.context = context;
    this.stackAPIClient = stackAPIClient;
    this.exportConfig = exportConfig;
    this.environmentConfig = exportConfig.moduleLevelConfig.environments;
    this.qs = {
      include_count: true,
      asc: 'updated_at',
    };
    this.environmentsPath = path.resolve(
      exportConfig.branchDir || exportConfig.exportDir,
      this.environmentConfig.dirName,
    );
  }

  async start() {
    try {
      await fileHelper.makeDirectory(this.environmentsPath);
      const environments = await this.getEnviornments();
      await fileHelper.writeFile(path.join(this.environmentsPath, this.environmentConfig.fileName), environments);
      console.log('completed environments export');
    } catch (error) {
      console.log('Failed to export environments');
    }
  }

  async getEnviornments() {
    let environments = await this.stackAPIClient.environment().query(this.qs).find();
    if (Array.isArray(environments.items) && environments.items.length > 0) {
      let updatedEnvironments = this.sanitizeAttribs(environments.items);
      return updatedEnvironments;
    }
    logger.info('No Environments found');
  }

  async sanitizeAttribs(environments) {
    let updatedLocales = {};
    environments.forEach((environment) => {
      for (let key in environment) {
        delete environment['ACL'];
      }
      updatedLocales[environment.uid] = environment;
      delete environment.uid;
    });
    return updatedLocales;
  }
}
