const { join } = require("path");
const filter = require("lodash/filter");
const forEach = require("lodash/forEach");
const isEmpty = require("lodash/isEmpty");
const isArray = require("lodash/isArray");
const includes = require("lodash/includes");
const { existsSync, readdirSync } = require("fs");
const { INTEGRATION_EXECUTION_ORDER, IS_TS } = require("./config.json");

const testFileExtension = IS_TS ? '.ts' : '.js'

/**
 * @method getFileName
 * @param {string} file
 * @returns {string}
 */
const getFileName = (file) => {
  if (includes(file, ".test") && includes(file, testFileExtension)) return file;
  else if (includes(file, ".test")) return `${file}${testFileExtension}`;
  else if (!includes(file, ".test")) return `${file}.test${testFileExtension}`;
  else return `${file}.test${testFileExtension}`;
};

/**
 * @method includeTestFiles
 * @param {Array<string>} files
 * @param {string} basePath
 */
const includeTestFiles = (files, basePath = "integration") => {
  forEach(files, (file) => {
    const filename = getFileName(file);
    const filePath = join(__dirname, basePath, filename);
    try {
      if (existsSync(filePath)) {
        require(filePath);
      } else {
        console.error(`File not found - ${filename}`);
      }
    } catch (err) { }
  });
};

/**
 * @method run
 * @param {Array<string> | undefined | null | unknown} executionOrder
 * @param {boolean} isIntegrationTest
 */
const run = (
  executionOrder,
  isIntegrationTest = true
) => {
  const testFolder = isIntegrationTest ? "integration" : "unit";

  if (isArray(executionOrder) && !isEmpty(executionOrder)) {
    includeTestFiles(executionOrder, testFolder);
  } else {
    const basePath = join(__dirname, testFolder);
    const allIntegrationTestFiles = filter(readdirSync(basePath), (file) =>
      includes(file, `.test${testFileExtension}`)
    );

    includeTestFiles(allIntegrationTestFiles);
  }
};

const args = process.argv.slice(2);

if (includes(args, "--integration-test")) {
  run(INTEGRATION_EXECUTION_ORDER);
} else if (includes(args, "--unit-test")) {
  // NOTE unit test case will be handled here
  // run(UNIT_EXECUTION_ORDER, false);
}
