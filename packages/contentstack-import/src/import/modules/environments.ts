import * as path from 'path';
import { logger } from '@contentstack/cli-utilities';
import * as pLimit from 'promise-limit';
import { fileHelper } from '../../utils';

export default class EnvironmentsImport {
  private context: any;
  private stackAPIClient: any;
  private importConfig: any;
  private envConfig: any;
  private envFolderPath: any;
  private envMapperPath: any;
  private envUidMapperPath: any;

  constructor(context, stackAPIClient, importConfig) {
    this.context = context;
    this.stackAPIClient = stackAPIClient;
    this.importConfig = importConfig;
    this.envConfig = importConfig.moduleLevelConfig.environments;

    this.envFolderPath = path.resolve(importConfig.backupDir, this.envConfig.dirName);
    this.envMapperPath = path.resolve(importConfig.backupDir, 'mapper', 'environments');
    this.envUidMapperPath = path.resolve(importConfig.backupDir, 'mapper', 'environments', 'uid-mapper.json');
  }

  async start() {
    try {
      await fileHelper.makeDirectory(this.envMapperPath);
      const environments = await fileHelper.readJSONFile(path.resolve(this.envFolderPath, this.envConfig.fileName));
      if (!environments) {
        logger.info('No environments found to import');
        return;
      }
      let envUidMapper = {};
      if (await fileHelper.isFolderExist(this.envUidMapperPath)) {
        envUidMapper = (await fileHelper.readJSONFile(this.envUidMapperPath)) || {};
      }

      let envUids = Object.keys(environments);
      if (!Array.isArray(envUids) || envUids.length <= 0) {
        throw new Error('No environments found to import');
      }

      // concurrent task runner
      const promiseRunner = pLimit(this.importConfig.concurrency);
      const result = await Promise.all(
        envUids.map(async (envUid) =>
          promiseRunner(() => {
            let environment = environments[envUid];
            if (!envUidMapper.hasOwnProperty(envUid)) {
              return this.createEnvironment(envUid, environment, envUidMapper);
            }
          }),
        ),
      );
      logger.info('Completed environments import');
    } catch (error) {
      logger.error('Failed import environments', error);
    }
  }

  async createEnvironment(envUid: string, environment: any, envUidMapper: any): Promise<any> {
    const requestOption = {
      environment,
    };
    try {
      const envResponse = await this.stackAPIClient.environment().create(requestOption);
      envUidMapper[envUid] = envResponse.uid;
      await fileHelper.writeFile(this.envUidMapperPath, envUidMapper);
    } catch (error) {
      logger.error('Failed to create environment with id ' + envUid);
    }
  }
}
