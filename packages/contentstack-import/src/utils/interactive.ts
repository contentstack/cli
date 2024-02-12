import { cliux } from '@contentstack/cli-utilities';
import * as path from 'path';
import first from 'lodash/first';
import split from 'lodash/split';

export const askContentDir = async (): Promise<string> => {
  const result = await cliux.inquire<string>({
    type: 'input',
    message: 'Enter the path for the content',
    name: 'dir',
  });
  return path.resolve(result);
};

export const askAPIKey = async (): Promise<string> => {
  return cliux.inquire<string>({
    type: 'input',
    message: 'Enter the stack api key',
    name: 'apiKey',
  });
};


export const askEncryptionKey = async(defaultValue: unknown): Promise<string> => {
  return await cliux.inquire({
    type: 'input',
    name: 'name',
    default: defaultValue,
    validate: (key) => {
      if (!key) return "Encryption key can't be empty.";

      return true;
    },
    message: 'Enter marketplace app configurations encryption key',
  });
}

export const askAppName = async(app: any, appSuffix: number):Promise<string> =>{
  return await cliux.inquire({
    type: 'input',
    name: 'name',
    validate: validateAppName,
    default: getAppName(app.name, appSuffix),
    message: `${app.name} app already exist. Enter a new name to create an app.?`,
  });
}

export const getAppName= (name: string, appSuffix = 1) => {
  if (name.length >= 19) name = name.slice(0, 18);
  name = `${first(split(name, '◈'))}◈${appSuffix}`;
  return name;
}

const validateAppName =(name: string ) =>{
  if (name.length < 3 || name.length > 20) {
    return 'The app name should be within 3-20 characters long.';
  }

  return true;
}

export const selectConfiguration = async():Promise<string> =>{
  return await cliux.inquire({
    choices: [
      'Update it with the new configuration.',
      'Do not update the configuration (WARNING!!! If you do not update the configuration, there may be some issues with the content which you import).',
      'Exit',
    ],
    type: 'list',
    name: 'value',
    message: 'Choose the option to proceed',
  });
}