import chalk from 'chalk';
import { log as defaultLog } from '@contentstack/cli-utilities';
import { ImportConfig } from 'src/types';

/**
 * Dependencies for validateBranch - can be injected for testing
 */
export interface ValidateBranchDeps {
  log?: typeof defaultLog;
}

export const validateBranch = async (
  stackAPIClient: any,
  config: ImportConfig,
  branch: any,
  deps: ValidateBranchDeps = {},
) => {
  const log = deps.log ?? defaultLog;

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
