/* eslint-disable no-console */
/*!
 * Contentstack Import
 * Copyright (c) 2026 Contentstack LLC
 * MIT Licensed
 */

import * as _ from 'lodash';
import * as path from 'path';
import {
  HttpClient,
  managementSDKClient,
  isAuthenticated,
  sanitizePath,
  log,
  handleAndLogError,
} from '@contentstack/cli-utilities';
import { PATH_CONSTANTS } from '../constants';
import { readFileSync, readdirSync, readFile, fileExistsSync } from './file-helper';

import chalk from 'chalk';
import defaultConfig from '../config';
import promiseLimit from 'promise-limit';
import { ImportConfig } from '../types';

let config: ImportConfig;
export const initialization = (configData: ImportConfig) => {
  config = buildAppConfig(configData);
  const res = validateConfig(config);

  if ((res && res !== 'error') || res === undefined) {
    return config;
  }
};

export const validateConfig = (importConfig: ImportConfig) => {
  log.debug('Validating import configuration');

  if (importConfig.email && importConfig.password && !importConfig.apiKey) {
    log.debug('Target stack API token is required when using email/password authentication');
    return 'error';
  } else if (
    !importConfig.email &&
    !importConfig.password &&
    !importConfig.management_token &&
    importConfig.apiKey &&
    !isAuthenticated()
  ) {
    log.debug('Authentication credentials missing - either management token or email/password required');
    return 'error';
  } else if (!importConfig.email && !importConfig.password && importConfig.preserveStackVersion) {
    log.debug('Email and password required for stack version preservation');
    return 'error';
  } else if ((importConfig.email && !importConfig.password) || (!importConfig.email && importConfig.password)) {
    log.debug('Both email and password must be provided together');
    return 'error';
  }
};

export const buildAppConfig = (importConfig: ImportConfig) => {
  log.debug('Building application configuration with defaults');
  importConfig = _.merge(defaultConfig, importConfig);
  return importConfig;
};

export const sanitizeStack = (importConfig: ImportConfig) => {
  if (typeof importConfig.preserveStackVersion !== 'boolean' || !importConfig.preserveStackVersion) {
    log.debug('Stack version preservation not enabled, skipping sanitization');
    return Promise.resolve();
  }

  if (importConfig.management_token) {
    log.info('Skipping stack version sanitization: Operation is not supported when using a management token.');
    return Promise.resolve();
  }

  try {
    const httpClient = HttpClient.create();
    httpClient.headers(importConfig.headers);

    return httpClient.get(`https://${importConfig.host}/v3${importConfig.apis.stacks}`).then((stackDetails) => {
      if (stackDetails.data && stackDetails.data.stack && stackDetails.data.stack.settings) {
        const newStackVersion = stackDetails.data.stack.settings.version;
        const newStackDate = new Date(newStackVersion).toString();

        log.debug(`New stack version: ${newStackVersion} (${newStackDate})`);

        const stackFilePath = path.join(
          sanitizePath(importConfig.contentDir),
          sanitizePath(importConfig.modules.stack.dirName),
          sanitizePath(importConfig.modules.stack.fileName),
        );

        log.debug(`Reading stack file from: ${stackFilePath}`);
        const oldStackDetails = readFileSync(stackFilePath);

        if (!oldStackDetails || !oldStackDetails.settings || !oldStackDetails.settings.hasOwnProperty('version')) {
          throw new Error(`${JSON.stringify(oldStackDetails)} is invalid!`);
        }

        const oldStackDate = new Date(oldStackDetails.settings.version).toString();
        log.debug(`Old stack version: ${oldStackDetails.settings.version} (${oldStackDate})`);

        if (oldStackDate > newStackDate) {
          throw new Error(
            'Migration Error. You cannot migrate data from new stack onto old. Kindly contact support@contentstack.com for more details.',
          );
        } else if (oldStackDate === newStackDate) {
          return Promise.resolve();
        }

        log.debug('Updating stack version to preserve compatibility');

        return httpClient
          .put(`https://${importConfig.host}/v3${importConfig.apis.stacks}settings/set-version`, {
            stack_settings: {
              version: '2017-10-14', // This can be used as a variable
            },
          })
          .then((response) => {
            log.info(`Stack version preserved successfully!\n${JSON.stringify(response.data)}`);
          });
      }

      throw new Error(`Unexpected stack details ${stackDetails && JSON.stringify(stackDetails.data)}`);
    });
  } catch (error) {
    console.log(error);
  }
};

export const masterLocalDetails = (stackAPIClient: any): Promise<{ code: string }> => {
  log.debug('Fetching master locale details');
  return stackAPIClient
    .locale()
    .query({ query: { fallback_locale: null } })
    .find()
    .then(({ items }: Record<string, any>) => {
      log.debug(`Found master locale: ${items[0]?.code}`);
      return items[0];
    });
};

export const field_rules_update = (importConfig: ImportConfig, ctPath: string) => {
  return new Promise(async (resolve, reject) => {
    log.debug('Starting field rules update process');
    let client = await managementSDKClient(config);

    readFile(path.join(ctPath + '/field_rules_uid.json'))
      .then(async (data) => {
        log.debug('Processing field rules UID mapping');
        const ct_field_visibility_uid = JSON.parse(data);
        let ct_files = readdirSync(ctPath);

        if (ct_field_visibility_uid && ct_field_visibility_uid != 'undefined') {
          log.debug(`Processing ${ct_field_visibility_uid.length} content types with field rules`);

          for (const ele of ct_field_visibility_uid) {
            if (ct_files.indexOf(ele + '.json') > -1) {
              log.debug(`Updating field rules for content type: ${ele}`);

              let schema = require(path.resolve(ctPath, ele));
              let fieldRuleLength = schema.field_rules.length;

              for (let k = 0; k < fieldRuleLength; k++) {
                let fieldRuleConditionLength = schema.field_rules[k].conditions.length;

                for (let i = 0; i < fieldRuleConditionLength; i++) {
                  if (schema.field_rules[k].conditions[i].operand_field === 'reference') {
                    log.debug(`Processing reference field rule condition`);

                    let entryMapperPath = path.resolve(
                      importConfig.contentDir,
                      PATH_CONSTANTS.MAPPER,
                      PATH_CONSTANTS.MAPPER_MODULES.ENTRIES,
                    );
                    let entryUidMapperPath = path.join(entryMapperPath, PATH_CONSTANTS.FILES.UID_MAPPING);
                    let fieldRulesValue = schema.field_rules[k].conditions[i].value;
                    let fieldRulesArray = fieldRulesValue.split('.');
                    let updatedValue = [];

                    for (const element of fieldRulesArray) {
                      let splitedFieldRulesValue = element;
                      let oldUid = readFileSync(path.join(entryUidMapperPath));

                      if (oldUid.hasOwnProperty(splitedFieldRulesValue)) {
                        log.debug(`Mapped UID: ${splitedFieldRulesValue} -> ${oldUid[splitedFieldRulesValue]}`);
                        updatedValue.push(oldUid[splitedFieldRulesValue]);
                      } else {
                        log.debug(`No mapping found for UID: ${splitedFieldRulesValue}`);
                        updatedValue.push(element);
                      }
                    }
                    schema.field_rules[k].conditions[i].value = updatedValue.join('.');
                  }
                }

                const stackAPIClient = client.stack({
                  api_key: importConfig.apiKey,
                  management_token: importConfig.management_token,
                });
                let ctObj = stackAPIClient.contentType(schema.uid);

                //NOTE:- Remove this code Object.assign(ctObj, _.cloneDeep(schema)); -> security vulnerabilities due to mass assignment
                const schemaKeys = Object.keys(schema);
                for (const key of schemaKeys) {
                  ctObj[key] = _.cloneDeep(schema[key]);
                }

                ctObj
                  .update()
                  .then(() => {
                    log.debug(`Successfully updated field rules for content type: ${schema.uid}`);
                    return resolve('');
                  })
                  .catch((error: Error) => {
                    log.error(`Failed to update field rules for content type: ${schema.uid}`);
                    return reject(error);
                  });
              }
            }
          }
        }
      })
      .catch((error) => {
        reject(error);
      });
  });
};

export const getConfig = () => {
  return config;
};

export const formatError = (error: any) => {
  try {
    if (typeof error === 'string') {
      error = JSON.parse(error);
    } else {
      error = JSON.parse(error.message);
    }
  } catch (e) {}

  let message = error?.errorMessage || error?.error_message || error?.message || error;

  if (error && error.errors && Object.keys(error.errors).length > 0) {
    Object.keys(error.errors).forEach((e) => {
      let entity = e;
      if (e === 'authorization') entity = 'Management Token';
      if (e === 'api_key') entity = 'Stack API key';
      if (e === 'uid') entity = 'Content Type';
      if (e === 'access_token') entity = 'Delivery Token';
      message += ' ' + [entity, error.errors[e]].join(' ');
    });
  }

  return message;
};

export const executeTask = (
  tasks: unknown[] = [],
  handler: (task: unknown) => Promise<unknown>,
  options: { concurrency: number },
) => {
  log.debug(`Executing ${tasks.length} tasks with concurrency: ${options.concurrency}`);

  if (typeof handler !== 'function') {
    log.error('Invalid handler function provided for task execution');
    throw new Error('Invalid handler');
  }

  const { concurrency = 1 } = options;
  const limit = promiseLimit(concurrency);

  return Promise.all(
    tasks.map((task) => {
      return limit(() => handler(task));
    }),
  );
};

export const validateBranch = async (stackAPIClient: any, config: ImportConfig, branch: any) => {
  return new Promise(async (resolve, reject) => {
    log.debug(`Validating branch: ${branch}`);

    try {
      const data = await stackAPIClient.branch(branch).fetch();

      if (data && typeof data === 'object') {
        if (data.error_message) {
          log.error(`Branch validation failed: ${data.error_message}`);
          reject({ message: 'No branch found with the name ' + branch, error: data.error_message });
        } else {
          log.info(`Branch validation successful: ${branch}`);
          resolve(data);
        }
      } else {
        log.error(`Invalid branch data received for: ${branch}`);
        reject({ message: 'No branch found with the name ' + branch, error: {} });
      }
    } catch (error) {
      log.error(`No branch found with the name: ${branch}`);
      reject({ message: 'No branch found with the name ' + branch, error });
    }
  });
};

export const formatDate = (date: Date = new Date()) => {
  // Format the date manually
  const formattedDate = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date
    .getDate()
    .toString()
    .padStart(2, '0')}T${date.getHours().toString().padStart(2, '0')}-${date
    .getMinutes()
    .toString()
    .padStart(2, '0')}-${date.getSeconds().toString().padStart(2, '0')}-${date
    .getMilliseconds()
    .toString()
    .padStart(3, '0')}Z`;

  return formattedDate;
};


