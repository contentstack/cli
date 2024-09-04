import { cliux, validatePath } from '@contentstack/cli-utilities';
import * as path from 'path';
import first from 'lodash/first';
import split from 'lodash/split';

export const askContentDir = async (): Promise<string> => {
  let result = await cliux.inquire<string>({
    type: 'input',
    message: 'Enter the path for the content',
    name: 'dir',
    validate: validatePath,
  });
  result = result.replace(/["']/g, '');
  return path.resolve(result);
};

export const askAPIKey = async (): Promise<string> => {
  return cliux.inquire<string>({
    type: 'input',
    message: 'Enter the stack api key',
    name: 'apiKey',
  });
};
