/* eslint-disable no-console */
/*!
 * Contentstack Import
 * Copyright (c) 2019 Contentstack LLC
 * MIT Licensed
 */

var _ = require('lodash');
const { HttpClient } = require('@contentstack/cli-utilities');
var fs = require('./fs');
var path = require('path');
var chalk = require('chalk');
var { addlogs } = require('./log');
var defaultConfig = require('../../config/default');
const stack = require('./contentstack-management-sdk');
const promiseLimit = require('promise-limit');
var config;

exports.initialization = function (configData) {
  config = this.buildAppConfig(configData);
  var res = this.validateConfig(config);

  if ((res && res !== 'error') || res === undefined) {
    return config;
  }
};

exports.validateConfig = function (importConfig) {
  if (importConfig.email && importConfig.password && !importConfig.target_stack) {
    addlogs(importConfig, chalk.red('Kindly provide api_token'), 'error');
    return 'error';
  } else if (
    !importConfig.email &&
    !importConfig.password &&
    !importConfig.management_token &&
    importConfig.target_stack &&
    !importConfig.auth_token
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

exports.buildAppConfig = function (importConfig) {
  importConfig = _.merge(defaultConfig, importConfig);
  return importConfig;
};

exports.sanitizeStack = function (importConfig) {
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

exports.masterLocalDetails = function (credentialConfig) {
  let client = stack.Client(credentialConfig);
  return new Promise((resolve, reject) => {
    var result = client
      .stack({ api_key: credentialConfig.target_stack, management_token: credentialConfig.management_token })
      .locale()
      .query();
    result
      .find()
      .then((response) => {
        var masterLocalObj = response.items.filter((obj) => {
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

exports.field_rules_update = function (importConfig, ctPath) {
  return new Promise(function (resolve, reject) {
    let client = stack.Client(importConfig);

    fs.readFileSync(path.join(ctPath + '/field_rules_uid.json'), async (err, data) => {
      if (err) {
        throw err;
      }
      var ct_field_visibility_uid = JSON.parse(data);
      let ct_files = fs.readdirSync(ctPath);
      if (ct_field_visibility_uid && ct_field_visibility_uid != 'undefined') {
        for (let index = 0; index < ct_field_visibility_uid.length; index++) {
          if (ct_files.indexOf(ct_field_visibility_uid[index] + '.json') > -1) {
            let schema = require(path.resolve(ctPath, ct_field_visibility_uid[index]));
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
                  for (let j = 0; j < fieldRulesArray.length; j++) {
                    let splitedFieldRulesValue = fieldRulesArray[j];
                    let oldUid = helper.readFileSync(path.join(entryUidMapperPath));
                    if (oldUid.hasOwnProperty(splitedFieldRulesValue)) {
                      updatedValue.push(oldUid[splitedFieldRulesValue]);
                    } else {
                      updatedValue.push(fieldRulesArray[j]);
                    }
                  }
                  schema.field_rules[k].conditions[i].value = updatedValue.join('.');
                }
              }
            }
            let ctObj = client
              .stack({ api_key: importConfig.target_stack, management_token: importConfig.management_token })
              .contentType(schema.uid);
            Object.assign(ctObj, _.cloneDeep(schema));
            ctObj
              .update()
              .then(() => {
                return resolve();
              })
              .catch(function (error) {
                return reject(error);
              });
          }
        }
      }
    });
  });
};

exports.getConfig = function () {
  return config;
};

exports.formatError = function (error) {
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
  return message;
};

exports.executeTask = function (tasks = [], handler, options) {
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
