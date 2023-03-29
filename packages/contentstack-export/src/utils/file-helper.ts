import * as fs from 'fs';
import * as path from 'path';
import * as mkdirp from 'mkdirp';
import bigJSON from 'big-json';

export const readFileSync = function (filePath, parse): any {
  let data;
  parse = typeof parse === 'undefined' ? true : parse;
  filePath = path.resolve(filePath);
  if (fs.existsSync(filePath)) {
    data = parse ? JSON.parse(fs.readFileSync(filePath, 'utf8')) : data;
  }
  return data;
};

// by default file type is json
export const readFile = async (filePath: string, options = { type: 'json' }): Promise<any> => {
  return new Promise((resolve, reject) => {
    filePath = path.resolve(filePath);
    fs.readFile(filePath, 'utf-8', (error, data) => {
      if (error) {
        reject(error);
      } else {
        if (options.type !== 'json') {
          return resolve(data);
        }
        resolve(JSON.parse(data));
      }
    });
  });
};

export const readLargeFile = function (filePath, options: any = {}): Promise<any> {
  if (typeof filePath !== 'string') {
    return;
  }
  filePath = path.resolve(filePath);
  if (fs.existsSync(filePath)) {
    return new Promise((resolve, reject) => {
      const readStream = fs.createReadStream(filePath, { encoding: 'utf-8' });
      const parseStream = bigJSON.createParseStream();
      parseStream.on('data', function (data) {
        if (options.type === 'array') {
          return resolve(Object.values(data));
        }
        resolve(data);
      });
      parseStream.on('error', (error) => {
        console.log('error', error);
        reject(error);
      });
      readStream.pipe(parseStream);
    });
  }
};

export const writeFileSync = function (filePath, data): void {
  data = typeof data === 'object' ? JSON.stringify(data) : data || '{}';
  fs.writeFileSync(filePath, data);
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

export const writeLargeFile = function (filePath, data): Promise<any> {
  if (typeof filePath !== 'string' || typeof data !== 'object') {
    return;
  }
  filePath = path.resolve(filePath);
  return new Promise((resolve, reject) => {
    const stringifyStream = bigJSON.createStringifyStream({
      body: data,
    });
    var writeStream = fs.createWriteStream(filePath, 'utf-8');
    stringifyStream.pipe(writeStream);
    writeStream.on('finish', () => {
      resolve('');
    });
    writeStream.on('error', (error) => {
      reject(error);
    });
  });
};

export const makeDirectory = function (dir): void {
  for (const key in arguments) {
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

exports.fileExistsSync = function (path) {
  return fs.existsSync(path);
};