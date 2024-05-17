/* eslint-disable no-console */
/*!
 * Contentstack Import
 * Copyright (c) 2024 Contentstack LLC
 * MIT Licensed
 */

import * as _ from 'lodash';
import * as path from 'path';
import { HttpClient, managementSDKClient, isAuthenticated, sanitizePath } from '@contentstack/cli-utilities';
import { readFileSync, readdirSync, readFile } from './file-helper';
import chalk from 'chalk';
import { log } from './logger';
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
  if (importConfig.email && importConfig.password && !importConfig.target_stack) {
    log(importConfig, chalk.red('Kindly provide api_token'), 'error');
    return 'error';
  } else if (
    !importConfig.email &&
    !importConfig.password &&
    !importConfig.management_token &&
    importConfig.target_stack &&
    !isAuthenticated()
  ) {
    log(importConfig, chalk.red('Kindly provide management_token or email and password'), 'error');
    return 'error';
  } else if (!importConfig.email && !importConfig.password && importConfig.preserveStackVersion) {
    log(importConfig, chalk.red('Kindly provide Email and password for old version stack'), 'error');
    return 'error';
  } else if ((importConfig.email && !importConfig.password) || (!importConfig.email && importConfig.password)) {
    log(importConfig, chalk.red('Kindly provide Email and password'), 'error');
    return 'error';
  }
};

export const buildAppConfig = (importConfig: ImportConfig) => {
  importConfig = _.merge(defaultConfig, importConfig);
  return importConfig;
};

export const sanitizeStack = (importConfig: ImportConfig) => {
  if (typeof importConfig.preserveStackVersion !== 'boolean' || !importConfig.preserveStackVersion) {
    return Promise.resolve();
  }
  log(importConfig, 'Running script to maintain stack version.', 'success');
  try {
    const httpClient = HttpClient.create();
    httpClient.headers(importConfig.headers);
    return httpClient.get(`https://${importConfig.host}/v3${importConfig.apis.stacks}`).then((stackDetails) => {
      if (stackDetails.data && stackDetails.data.stack && stackDetails.data.stack.settings) {
        const newStackVersion = stackDetails.data.stack.settings.version;
        const newStackDate = new Date(newStackVersion).toString();
        const stackFilePath = path.join(
          sanitizePath(importConfig.data),
          sanitizePath(importConfig.modules.stack.dirName),
          sanitizePath(importConfig.modules.stack.fileName),
        );

        const oldStackDetails = readFileSync(stackFilePath);
        if (!oldStackDetails || !oldStackDetails.settings || !oldStackDetails.settings.hasOwnProperty('version')) {
          throw new Error(`${JSON.stringify(oldStackDetails)} is invalid!`);
        }
        const oldStackDate = new Date(oldStackDetails.settings.version).toString();

        if (oldStackDate > newStackDate) {
          throw new Error(
            'Migration Error. You cannot migrate data from new stack onto old. Kindly contact support@contentstack.com for more details.',
          );
        } else if (oldStackDate === newStackDate) {
          log(importConfig, 'The version of both the stacks are same.', 'success');
          return Promise.resolve();
        }
        log(importConfig, 'Updating stack version.', 'success');

        return httpClient
          .put(`https://${importConfig.host}/v3${importConfig.apis.stacks}settings/set-version`, {
            stack_settings: {
              version: '2017-10-14', // This can be used as a variable
            },
          })
          .then((response) => {
            log(importConfig, `Stack version preserved successfully!\n${JSON.stringify(response.data)}`, 'success');
          });
      }
      throw new Error(`Unexpected stack details ${stackDetails && JSON.stringify(stackDetails.data)}`);
    });
  } catch (error) {
    console.log(error);
  }
};

export const masterLocalDetails = (stackAPIClient: any): Promise<{ code: string }> => {
  return stackAPIClient
    .locale()
    .query({ query: { fallback_locale: null } })
    .find()
    .then(({ items }: Record<string, any>) => items[0]);
};

export const field_rules_update = (importConfig: ImportConfig, ctPath: string) => {
  return new Promise(async (resolve, reject) => {
    let client = await managementSDKClient(config);

    readFile(path.join(ctPath + '/field_rules_uid.json'))
      .then(async (data) => {
        const ct_field_visibility_uid = JSON.parse(data);
        let ct_files = readdirSync(ctPath);
        if (ct_field_visibility_uid && ct_field_visibility_uid != 'undefined') {
          for (const ele of ct_field_visibility_uid) {
            if (ct_files.indexOf(ele + '.json') > -1) {
              let schema = require(path.resolve(ctPath, ele));
              // await field_rules_update(schema)
              let fieldRuleLength = schema.field_rules.length;
              for (let k = 0; k < fieldRuleLength; k++) {
                let fieldRuleConditionLength = schema.field_rules[k].conditions.length;
                for (let i = 0; i < fieldRuleConditionLength; i++) {
                  if (schema.field_rules[k].conditions[i].operand_field === 'reference') {
                    let entryMapperPath = path.resolve(importConfig.data, 'mapper', 'entries');
                    let entryUidMapperPath = path.join(entryMapperPath, 'uid-mapping.json');
                    let fieldRulesValue = schema.field_rules[k].conditions[i].value;
                    let fieldRulesArray = fieldRulesValue.split('.');
                    let updatedValue = [];
                    for (const element of fieldRulesArray) {
                      let splitedFieldRulesValue = element;
                      let oldUid = readFileSync(path.join(entryUidMapperPath));
                      if (oldUid.hasOwnProperty(splitedFieldRulesValue)) {
                        updatedValue.push(oldUid[splitedFieldRulesValue]);
                      } else {
                        updatedValue.push(element);
                      }
                    }
                    schema.field_rules[k].conditions[i].value = updatedValue.join('.');
                  }
                }
                const stackAPIClient = client.stack({
                  api_key: importConfig.target_stack,
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
                    return resolve('');
                  })
                  .catch((error: Error) => {
                    return reject(error);
                  });
              }
            }
          }
        }
      })
      .catch(reject);
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
  } catch (e) { }
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
  if (typeof handler !== 'function') {
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
    try {
      const data = await stackAPIClient.branch(branch).fetch();
      if (data && typeof data === 'object') {
        if (data.error_message) {
          log(config, chalk.red(data.error_message), 'error');
          log(config, chalk.red('No branch found with the name ' + branch), 'error');
          reject({ message: 'No branch found with the name ' + branch, error: data.error_message });
        } else {
          resolve(data);
        }
      } else {
        reject({ message: 'No branch found with the name ' + branch, error: {} });
      }
    } catch (error) {
      log(config, chalk.red('No branch found with the name ' + branch), 'error');
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
