import * as fs from 'fs';
import * as path from 'path';
import * as mkdirp from 'mkdirp';

export const readFile = function (filePath, parse): any {
  let data;
  parse = typeof parse === 'undefined' ? true : parse;
  filePath = path.resolve(filePath);
  if (fs.existsSync(filePath)) {
    data = parse ? JSON.parse(fs.readFileSync(filePath, 'utf-8')) : data;
  }
  return data;
};

export const writeFile = function (filePath, data): void {
  data = typeof data === 'object' ? JSON.stringify(data) : data || '{}';
  fs.writeFileSync(filePath, data);
};

export const makeDirectory = function (): void {
  for (let key in arguments) {
    const dirname = path.resolve(arguments[key]);
    if (!fs.existsSync(dirname)) {
      mkdirp.sync(dirname);
    }
  }
};

export const readdir = function (dirPath): any {
  if (fs.existsSync(dirPath)) {
    return fs.readdirSync(dirPath);
  } else {
    return [];
  }
};

export const readJSONFile = function (filePath, parse): any {
  let data;
  parse = typeof parse === 'undefined' ? true : parse;
  filePath = path.resolve(filePath);
  if (fs.existsSync(filePath)) {
    data = parse ? JSON.parse(fs.readFileSync(filePath, 'utf-8')) : data;
  }
  return data;
};
