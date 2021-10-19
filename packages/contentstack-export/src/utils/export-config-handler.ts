import merge from 'merge';
import * as path from 'path';
import { CLIError } from '@contentstack/cli-utilities';
import defaultConfig from '../config';
import { readJSONFile } from './file-helper';
import { askExportDir, askAPIKey } from './interactive';

const setupConfig = async (context, userInputPayload): Promise<any> => {
  let config = merge({}, defaultConfig);
  // setup the config
  if (userInputPayload['external-config-path']) {
    const externalConfig = await readJSONFile(userInputPayload['external-config-path']);
    config = merge.recursive(config, externalConfig);
  }
  config.exportDir = userInputPayload['export-dir'] || (await askExportDir());
  config.exportDir = path.resolve(config.exportDir);
  if (userInputPayload['mtoken-alias']) {
    let { token, apiKey } = context.getToken(userInputPayload['mtoken-alias']);
    if (!token) {
      throw new CLIError('Management token is invalid');
    }
    config.mToken = token;
    config.apiKey = apiKey;
  }

  if (!config.apiKey) {
    config.apiKey = userInputPayload['api-key'] || (await askAPIKey());
  }
  if (!config.apiKey) {
    throw new CLIError('API Key is mandatory');
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
    config.singleModuleExport = true;
  }

  //setup the export folder

  // check the dir path, if not ask the user to provide one
  // ask the user to select the stack if not provided
  // sets the authentication authtoken/mtoken
  // set branch name if provided
  // merge the external config
  // module name if provided

  return config;
};

export default setupConfig;
