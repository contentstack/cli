import { existsSync, mkdirSync, readFileSync, readFile as fsReadFile } from 'fs';
import path from 'path';
import { pathValidator } from '@contentstack/cli-utilities';

export const existsSyncHelper = (filePath: string): boolean => existsSync(filePath);

export const makeDir = (dirname: string): void => {
  !existsSyncHelper(dirname) && mkdirSync(dirname, { recursive: true });
};

export const readFile = (filePath: string): string => {
  if (!existsSync(filePath)) throw new Error('File does not exist');
  return readFileSync(filePath, 'utf-8');
};

export const readJSONFile = (filePath: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    filePath = pathValidator(filePath);
    fsReadFile(filePath, 'utf-8', (error: any, data: string) => {
      if (error) {
        reject(error);
      } else {
        try {
          resolve(JSON.parse(data));
        } catch (parseError) {
          reject(parseError);
        }
      }
    });
  });
};
