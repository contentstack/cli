'use strict';

const getCallsites = require('callsites');
const { parse, resolve } = require('path');
const { pathValidator, sanitizePath } = require('@contentstack/cli-utilities');

function getFileDirectory(path) {
  const parentPath = pathValidator(resolve(sanitizePath(path), '../')); // Assuming that will be 2 folders up
  return parse(parentPath).dir;
}

module.exports = () => {
  const thisDir = getFileDirectory(__filename);
  const callsites = getCallsites();

  const externalFile = callsites.find((callsite) => {
    const currentDir = getFileDirectory(callsite.getFileName());
    const isNotThisDir = thisDir !== currentDir;
    return isNotThisDir;
  });

  return externalFile;
};
