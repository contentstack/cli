/* eslint-disable no-console */
/*!
 * Contentstack Import
 * Copyright (c) 2019 Contentstack LLC
 * MIT Licensed
 */

const _ = require('lodash');
const { HttpClient, managementSDKClient, isAuthenticated } = require('@contentstack/cli-utilities');
const fs = require('./fs');
const path = require('path');
const chalk = require('chalk');
const { addlogs } = require('./log');
const defaultConfig = require('../../config/default');
const promiseLimit = require('promise-limit');
let config;

exports.initialization = (configData) => {
  config = this.buildAppConfig(configData);
  const res = this.validateConfig(config);

  if ((res && res !== 'error') || res === undefined) {
    return config;
  }
};

exports.validateConfig = (importConfig) => {
  if (importConfig.email && importConfig.password && !importConfig.target_stack) {
    addlogs(importConfig, chalk.red('Kindly provide api_token'), 'error');
    return 'error';
  } else if (
    !importConfig.email &&
    !importConfig.password &&
    !importConfig.management_token &&
    importConfig.target_stack &&
    !isAuthenticated()
  ) {
    addlogs(importConfig, chalk.red('Kindly provide management_token or email and password'), 'error');
    return 'error';
  } else if (!importConfig.email && !importConfig.password && importConfig.preserveStackVersion) {
    addlogs(importConfig, chalk.red('Kindly provide Email and password for old version stack'), 'error');
    return 'error';
  } else if ((importConfig.email && !importConfig.password) || (!importConfig.email && importConfig.password)) {
    addlogs(importConfig, chalk.red('Kindly provide Email and password'), 'error');
    return 'error';
  }
};

exports.buildAppConfig = (importConfig) => {
  importConfig = _.merge(defaultConfig, importConfig);
  return importConfig;
};

exports.sanitizeStack = (importConfig) => {
  if (typeof importConfig.preserveStackVersion !== 'boolean' || !importConfig.preserveStackVersion) {
    return Promise.resolve();
  }
  addlogs(importConfig, 'Running script to maintain stack version.', 'success');
  try {
    const httpClient = HttpClient.create();
    httpClient.headers(importConfig.headers);
    return httpClient.get(`https://${importConfig.host}/v3${importConfig.apis.stacks}`).then((stackDetails) => {
      if (stackDetails.data && stackDetails.data.stack && stackDetails.data.stack.settings) {
        const newStackVersion = stackDetails.data.stack.settings.version;
        const newStackDate = new Date(newStackVersion).toString();
        const stackFilePath = path.join(
          importConfig.data,
          importConfig.modules.stack.dirName,
          importConfig.modules.stack.fileName,
        );

        const oldStackDetails = fs.readFileSync(stackFilePath);
        if (!oldStackDetails || !oldStackDetails.settings || !oldStackDetails.settings.hasOwnProperty('version')) {
          throw new Error(`${JSON.stringify(oldStackDetails)} is invalid!`);
        }
        const oldStackDate = new Date(oldStackDetails.settings.version).toString();

        if (oldStackDate > newStackDate) {
          throw new Error(
            'Migration Error. You cannot migrate data from new stack onto old. Kindly contact support@contentstack.com for more details.',
          );
        } else if (oldStackDate === newStackDate) {
          addlogs(importConfig, 'The version of both the stacks are same.', 'success');
          return Promise.resolve();
        }
        addlogs(importConfig, 'Updating stack version.', 'success');

        return httpClient
          .put(`https://${importConfig.host}/v3${importConfig.apis.stacks}settings/set-version`, {
            stack_settings: {
              version: '2017-10-14', // This can be used as a variable
            },
          })
          .then((response) => {
            addlogs(importConfig, `Stack version preserved successfully!\n${JSON.stringify(response.data)}`, 'success');
          });
      }
      throw new Error(`Unexpected stack details ${stackDetails && JSON.stringify(stackDetails.data)}`);
    });
  } catch (error) {
    console.log(error);
  }
};

exports.masterLocalDetails = (stackAPIClient) => {
  return new Promise((resolve, reject) => {
    const result = stackAPIClient.locale().query();
    result
      .find()
      .then((response) => {
        const masterLocalObj = response.items.filter((obj) => {
          if (obj.fallback_locale === null) {
            return obj;
          }
        });
        return resolve(masterLocalObj[0]);
      })
      .catch((error) => {
        return reject(error);
      });
  });
};

exports.field_rules_update = (importConfig, ctPath) => {
  return new Promise((resolve, reject) => {
    managementSDKClient(config)
      .then((APIClient) => {
        fs.readFileSync(path.join(ctPath + '/field_rules_uid.json'), async (err, data) => {
          if (err) {
            throw err;
          }
          const ct_field_visibility_uid = JSON.parse(data);
          let ct_files = fs.readdirSync(ctPath);
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
                        let oldUid = helper.readFileSync(path.join(entryUidMapperPath));
                        if (oldUid.hasOwnProperty(splitedFieldRulesValue)) {
                          updatedValue.push(oldUid[splitedFieldRulesValue]);
                        } else {
                          updatedValue.push(element);
                        }
                      }
                      schema.field_rules[k].conditions[i].value = updatedValue.join('.');
                    }
                  }
                }
                const stackAPIClient = APIClient.stack({
                  api_key: importConfig.target_stack,
                  management_token: importConfig.management_token,
                });
                let ctObj = stackAPIClient.contentType(schema.uid);
                Object.assign(ctObj, _.cloneDeep(schema));
                ctObj
                  .update()
                  .then(() => {
                    return resolve();
                  })
                  .catch((error) => {
                    return reject(error);
                  });
              }
            }
          }
        });
      })
      .catch(reject);
  });
};

exports.getConfig = () => {
  return config;
};

exports.formatError = (error) => {
  let message_content_type = "";
  if(error.request!==undefined && JSON.parse(error.request.data).content_type!==undefined) {
    if(JSON.parse(error.request.data).content_type.uid) {
      message_content_type = " Update the content type with content_type_uid  - "+JSON.parse(error.request.data).content_type.uid;
    } else if (JSON.parse(error.request.data).content_type.title) {
      message_content_type = " Update the content type with content_type_title  - "+JSON.parse(error.request.data).content_type.title;
    }
  }

  try {
    if (typeof error === 'string') {
      error = JSON.parse(error);
    } else {
      error = JSON.parse(error.message);
    }
  } catch (e) {}
  let message = error.errorMessage || error.error_message || error.message || error;
  if (error.errors && Object.keys(error.errors).length > 0) {
    Object.keys(error.errors).forEach((e) => {
      let entity = e;
      if (e === 'authorization') entity = 'Management Token';
      if (e === 'api_key') entity = 'Stack API key';
      if (e === 'uid') entity = 'Content Type';
      if (e === 'access_token') entity = 'Delivery Token';
      message += ' ' + [entity, error.errors[e]].join(' ');
    });
  }
  return message+message_content_type;
};

exports.executeTask = (handler, options, tasks = []) => {
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
