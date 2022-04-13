'use strict';

const { existsSync, mkdirSync, readFileSync } = require('fs');

exports.makeDir = (dirname) => {
  !this.existsSync(dirname) && mkdirSync(dirname);
};

exports.existsSync = (filePath) => existsSync(filePath);

exports.readFile = (filePath) => {
  if (!existsSync(filePath)) throw new Error('File does not exist');
  return readFileSync(filePath, 'utf-8');
};
