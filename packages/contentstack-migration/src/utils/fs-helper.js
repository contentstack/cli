'use strict';

const { existsSync, mkdirSync, readFileSync, readFile } = require('fs');
const path = require('path');
const { pathValidator } = require('@contentstack/cli-utilities');

exports.makeDir = (dirname) => {
  !this.existsSync(dirname) && mkdirSync(dirname);
};

exports.existsSync = (filePath) => existsSync(filePath);

exports.readFile = (filePath) => {
  if (!existsSync(filePath)) throw new Error('File does not exist');
  return readFileSync(filePath, 'utf-8');
};

exports.readJSONFile = (filePath) => {
  return new Promise((resolve, reject) => {
    filePath = pathValidator(filePath);
    readFile(filePath, 'utf-8', (error, data) => {
      if (error) {
        reject(error);
      } else {
        resolve(JSON.parse(data));
      }
    });
  });
};
