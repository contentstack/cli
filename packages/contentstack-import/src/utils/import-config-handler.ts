import merge from 'merge';
import * as path from 'path';
import { CLIError } from '@contentstack/cli-utilities';
import defaultConfig from '../config';
import { readJSONFile } from './file-helper';
import { askContentDir, askAPIKey } from './interactive';

const setupConfig = async (context, userInputPayload): Promise<any> => {
  let config = merge({}, defaultConfig);
  // setup the config
  if (userInputPayload['external-config-path']) {
    const externalConfig = await readJSONFile(userInputPayload['external-config-path']);
    config = merge.recursive(config, externalConfig);
  }
  config.contentDir = userInputPayload['content-dir'] || (await askContentDir());
  config.contentDir = path.resolve(config.contentDir);
  config.apiKey = userInputPayload['api-key'] || (await askAPIKey());
  if (!config.apiKey) {
    throw new CLIError('API Key is mandatory');
  }

  if (userInputPayload['mtoken-alias']) {
    config.mToken = context.getToken(userInputPayload['mtoken-alias']);
    if (!config.mToken) {
      throw new CLIError('Management token is mandatory');
    }
  }
  if (!context.user && !context.user.authtoken && !userInputPayload['mtoken-alias']) {
    // TBD: ask the auth method and get the either of the token and continue
    throw new CLIError('Invalid auth method');
  }
  if (userInputPayload['branch']) {
    config.branchName = userInputPayload['branch'];
  }
  if (userInputPayload['module']) {
    config.moduleName = userInputPayload['module'];
    config.singleModuleImport = true;
  }

  return config;
};

export default setupConfig;
