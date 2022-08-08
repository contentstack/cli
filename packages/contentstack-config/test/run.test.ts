import { join, resolve } from "path";
import { existsSync, readdirSync } from "fs";
import {
  IS_TS,
  UNIT_EXECUTION_ORDER,
  INTEGRATION_EXECUTION_ORDER,
  // @ts-ignore
} from "./config.json";

const filter = require("lodash/filter");
const forEach = require("lodash/forEach");
const isEmpty = require("lodash/isEmpty");
const isArray = require("lodash/isArray");
const includes = require("lodash/includes");

const testFileExtension = IS_TS ? ".ts" : ".js";
process.env.TS_NODE_PROJECT = resolve("test/tsconfig.json");

/**
 * @method getFileName
 * @param {string} file
 * @returns {string}
 */
const getFileName = (file: string): string => {
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
const includeTestFiles = (files: Array<string>, basePath = "integration") => {
  forEach(files, (file) => {
    const filename = getFileName(file);
    const filePath = join(__dirname, basePath, filename);
    try {
      if (existsSync(filePath)) {
        require(filePath);
      } else {
        console.error(`File not found - ${filename}`);
      }
    } catch (err) {}
  });
};

/**
 * @method run
 * @param {Array<string> | undefined | null} executionOrder
 * @param {boolean} isIntegrationTest
 */
const run = (
  executionOrder: Array<string> | undefined | null,
  isIntegrationTest = true
) => {
  const testFolder = isIntegrationTest ? "integration" : "unit";

  if (executionOrder && isArray(executionOrder) && !isEmpty(executionOrder)) {
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
  run(UNIT_EXECUTION_ORDER, false);
}
