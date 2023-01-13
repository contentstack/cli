import { cliux } from '@contentstack/cli-utilities';
import * as path from 'path';

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
