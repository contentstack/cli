const { join } = require("path");
const filter = require("lodash/filter");
const forEach = require("lodash/forEach");
const isEmpty = require("lodash/isEmpty");
const isArray = require("lodash/isArray");
const includes = require("lodash/includes");
const { existsSync, readdirSync } = require("fs");
const { INTEGRATION_EXECUTION_ORDER, IS_TS } = require("./config.json");

let testType = 'integration'
const args = process.argv.slice(2);
const testFileExtension = IS_TS ? '.ts' : '.js'

if (includes(args, "--unit-test")) {
  testType = 'unit'
}

process.env.ENCRYPT_CONF = true
process.env.ENC_KEY = `${testType}TestEncryptionKey`;
process.env.CONFIG_NAME = `${testType}_test_contentstack_cli`;
process.env.ENC_CONFIG_NAME = `${testType}_test_contentstack_cli_obfuscate`;

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
 * @method includeInitFileIfExist
 * @param {String} basePath 
 */
const includeInitFileIfExist = (basePath) => {
  const filePath = join(__dirname, basePath, `init.test${testFileExtension}`);

  try {
    if (existsSync(filePath)) {
      require(filePath);
    }
  } catch (err) { }
}

/**
 * @method includeCleanUpFileIfExist
 * @param {String} basePath 
 */
const includeCleanUpFileIfExist = (basePath) => {
  const filePath = join(__dirname, basePath, `clean-up.test${testFileExtension}`);

  try {
    if (existsSync(filePath)) {
      require(filePath);
    }
  } catch (err) { }
}

/**
 * @method includeTestFiles
 * @param {Array<string>} files
 * @param {string} basePath
 */
const includeTestFiles = (files, basePath = "integration") => {
  includeInitFileIfExist(basePath) // NOTE Run all the pre configurations

  files = filter(files, (name) => (
    !includes(`init.test${testFileExtension}`, name) &&
    !includes(`clean-up.test${testFileExtension}`, name)
  )) // NOTE remove init, clean-up files

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

  includeCleanUpFileIfExist(basePath) // NOTE run all cleanup code/commands
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

if (includes(args, "--integration-test")) {
  run(INTEGRATION_EXECUTION_ORDER);
} else if (includes(args, "--unit-test")) {
  // NOTE unit test case will be handled here
  // run(UNIT_EXECUTION_ORDER, false);
}
