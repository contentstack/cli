import chalk from 'chalk';
import { log } from '@contentstack/cli-utilities';
import { ImportConfig } from 'src/types';

export const validateBranch = async (stackAPIClient: any, config: ImportConfig, branch: any) => {
  return new Promise(async (resolve, reject) => {
    try {
      const data = await stackAPIClient.branch(branch).fetch();
      if (data && typeof data === 'object') {
        if (data.error_message) {
          log.error(chalk.red(data.error_message), { error: data.error_message });
          log.error(chalk.red('No branch found with the name ' + branch), { branch });
          reject({ message: 'No branch found with the name ' + branch, error: data.error_message });
        } else {
          resolve(data);
        }
      } else {
        reject({ message: 'No branch found with the name ' + branch, error: {} });
      }
    } catch (error) {
      log.error(chalk.red('No branch found with the name ' + branch), { error, branch });
      reject({ message: 'No branch found with the name ' + branch, error });
    }
  });
};
