/*!
 * Contentstack Import
 * Copyright (c) 2019 Contentstack LLC
 * MIT Licensed
 */

var fs = require('fs');
var path = require('path');
var mkdirp = require('mkdirp');
const bigJSON = require('big-json');

exports.readFileSync = function (filePath, parse) {
  let data;
  parse = typeof parse === 'undefined' ? true : parse;
  filePath = path.resolve(filePath);
  if (fs.existsSync(filePath)) {
    try {
      data = parse ? JSON.parse(fs.readFileSync(filePath, 'utf-8')) : data;
    } catch (error) {
      return data;
    }
  }
  return data;
};

// by default file type is json
exports.readFile = async (filePath, options = { type: 'json' }) => {
  return new Promise((resolve, reject) => {
    filePath = path.resolve(filePath);
    fs.readFile(filePath, 'utf-8', (error, data) => {
      if (error) {
        if (error.code === 'ENOENT') {
          return resolve();
        }
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

exports.writeFileSync = function (filePath, data) {
  data = typeof data === 'object' ? JSON.stringify(data) : data || '{}';
  fs.writeFileSync(filePath, data);
};

exports.writeFile = function (filePath, data) {
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

exports.makeDirectory = async function (path) {
  if (!path) {
    throw new Error('Invalid path to create directory');
  }
  return mkdirp(path);
};

exports.readLargeFile = function (filePath, opts = {}) {
  if (typeof filePath !== 'string') {
    return;
  }
  filePath = path.resolve(filePath);
  if (fs.existsSync(filePath)) {
    return new Promise((resolve, reject) => {
      const readStream = fs.createReadStream(filePath, { encoding: 'utf-8' });
      const parseStream = bigJSON.createParseStream();
      parseStream.on('data', function (data) {
        if (opts.type === 'array') {
          return resolve(Object.values(data));
        }
        resolve(data);
      });
      parseStream.on('error', function (error) {
        console.log('error', error);
        reject(error);
      });
      readStream.pipe(parseStream);
    });
  }
};

exports.writeLargeFile = function (filePath, data) {
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
      resolve();
    });
    writeStream.on('error', (error) => {
      reject(error);
    });
  });
};

exports.readdirSync = function (dirPath) {
  if (fs.existsSync(dirPath)) {
    return fs.readdirSync(dirPath);
  } else {
    return [];
  }
};

exports.fileExistsSync = function (path) {
  return fs.existsSync(path);
};