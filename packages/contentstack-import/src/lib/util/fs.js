/*!
 * Contentstack Import
 * Copyright (c) 2019 Contentstack LLC
 * MIT Licensed
 */

var fs = require('fs');
var path = require('path');
var mkdirp = require('mkdirp');
const bigJSON = require('big-json');

exports.readFile = function (filePath, parse) {
  var data;
  parse = typeof parse === 'undefined' ? true : parse;
  filePath = path.resolve(filePath);
  if (fs.existsSync(filePath)) {
    data = parse ? JSON.parse(fs.readFileSync(filePath, 'utf-8')) : data;
  }
  return data;
};

exports.writeFile = function (filePath, data) {
  data = typeof data === 'object' ? JSON.stringify(data) : data || '{}';
  fs.writeFileSync(filePath, data);
};

exports.makeDirectory = function () {
  for (var key in arguments) {
    var dirname = path.resolve(arguments[key]);
    if (!fs.existsSync(dirname)) {
      mkdirp.sync(dirname);
    }
  }
};

exports.readLargeFile = function (filePath) {
  filePath = path.resolve(filePath);
  if (fs.existsSync(filePath)) {
    return new Promise((resolve, reject) => {
      const readStream = fs.createReadStream(filePath, { encoding: 'utf-8' });
      const parseStream = bigJSON.createParseStream();

      parseStream.on('data', function (data) {
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

exports.readdir = function (dirPath) {
  if (fs.existsSync(path)) {
    return fs.readdirSync(dirPath);
  } else {
    return [];
  }
};
