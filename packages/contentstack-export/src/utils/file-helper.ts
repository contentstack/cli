import * as fs from 'fs';
import * as path from 'path';
import * as mkdirp from 'mkdirp';

export const readFileSync = function (filePath, parse): any {
  let data;
  parse = typeof parse === 'undefined' ? true : parse;
  filePath = path.resolve(filePath);
  if (fs.existsSync(filePath)) {
    data = parse ? JSON.parse(fs.readFileSync(filePath, 'utf-8')) : data;
  }
  return data;
};

export const writeFileSync = function (filePath, data): void {
  data = typeof data === 'object' ? JSON.stringify(data) : data || '{}';
  fs.writeFileSync(filePath, data);
};

export const makeDirectorySync = function (): void {
  for (let key in arguments) {
    const dirname = path.resolve(arguments[key]);
    if (!fs.existsSync(dirname)) {
      mkdirp.sync(dirname);
    }
  }
};

export const makeDirectory = async function (path: string): Promise<any> {
  return mkdirp(path);
};

export const writeFile = function (filePath, data): Promise<any> {
  return new Promise((resolve, reject) => {
    data = typeof data === 'object' ? JSON.stringify(data) : data || '{}';
    fs.writeFile(filePath, data, (error) => {
      if (error) {
        return reject(error);
      }
      resolve('done');
    });
  });
};

export const writeFileStream = function (filePath, data, writer) {
  if (!writer) {
    writer = fs.createWriteStream(filePath);
  }
  data = typeof data === 'object' ? JSON.stringify(data) : data || '{}';
  writer.write(data);
  return writer;
};

export const readdir = function (dirPath): any {
  if (fs.existsSync(dirPath)) {
    return fs.readdirSync(dirPath);
  } else {
    return [];
  }
};

export const readJSONFile = async (filePath: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    filePath = path.resolve(filePath);
    fs.readFile(filePath, 'utf-8', (error, data) => {
      if (error) {
        reject(error);
      } else {
        resolve(JSON.parse(data));
      }
    });
  });
};
