/* eslint-disable no-console */
/*!
 * Contentstack Import
 * Copyright (c) 2019 Contentstack LLC
 * MIT Licensed
 */

var _ = require('lodash')
var fs = require('./fs')
var path = require('path')
var chalk = require('chalk')
var {addlogs} = require('./log')
var request = require('./request')
var defaultConfig = require('../../config/default')
const stack = require('./contentstack-management-sdk')
var config 

exports.initialization = function(configData) {
  config = this.buildAppConfig(configData)
  var res = this.validateConfig(config)

  if (res && res !== 'error' || res === undefined) {
    return config
  }
}

exports.validateConfig = function (config) {
  if (config.email && config.password && !config.target_stack) {
    addlogs(config, chalk.red('Kindly provide api_token'), 'error')
    return 'error' 
  } if(!config.email && !config.password && !config.management_token && config.target_stack && !config.auth_token) {
    addlogs(config, chalk.red('Kindly provide management_token or email and password'), 'error')
    return 'error'
  } else if(!config.email && !config.password && config.preserveStackVersion) {
    addlogs(config, chalk.red('Kindly provide Email and password for old version stack'), 'error')
    return 'error'
  } else if(config.email && !config.password || !config.email && config.password) {
    addlogs(config, chalk.red('Kindly provide Email and password'), 'error')
    return 'error'
  }
  //  if(!config.languagesCode.includes(config.master_locale.code)) {
  //   addlogs(config, chalk.red('Kindly provide valid master_locale code'), 'error')
  //   return 'error'
  // }
}

exports.buildAppConfig = function (config) {
  config = _.merge(defaultConfig, config)
  return config
};

exports.sanitizeStack = function (config) {
  if (typeof config.preserveStackVersion !== 'boolean' || !config.preserveStackVersion) {
    return Promise.resolve()
  }
  addlogs(config, 'Running script to maintain stack version.', 'success')
  var getStackOptions = {
    url: config.host + config.apis.stacks,
    method: 'GET',
    headers: config.headers,
    json: true
  }

  try {
    return request(getStackOptions)
      .then((stackDetails) => {
        if (stackDetails.body && stackDetails.body.stack && stackDetails.body.stack.settings) {
          const newStackVersion = stackDetails.body.stack.settings.version
          const newStackDate = new Date(newStackVersion).toString()
          const stackFilePath = path.join(config.data, config.modules.stack.dirName, config.modules.stack.fileName)

          const oldStackDetails = fs.readFile(stackFilePath)
          if (!oldStackDetails || !oldStackDetails.settings || !oldStackDetails.settings.hasOwnProperty('version')) {
            throw new Error(`${JSON.stringify(oldStackDetails)} is invalid!`)
          }
          const oldStackDate = new Date(oldStackDetails.settings.version).toString()

          if (oldStackDate > newStackDate) {
            throw new Error('Migration Error. You cannot migrate data from new stack onto old. Kindly contact support@contentstack.com for more details.')
          } else if (oldStackDate === newStackDate) {
            addlogs(config, 'The version of both the stacks are same.', 'success')
            return Promise.resolve()
          }
          addlogs(config, 'Updating stack version.', 'success')
          // Update the new stack
          var updateStackOptions = {
            url: config.host + config.apis.stacks + 'settings/set-version',
            method: 'PUT',
            headers: config.headers,
            body: {
              stack_settings: {
                version: '2017-10-14' // This can be used as a variable
              }
            }
          }

          return request(updateStackOptions)
            .then((response) => {
              addlogs(config, `Stack version preserved successfully!\n${JSON.stringify(response.body)}`, 'success')
              return;
            })
        } 
          throw new Error(`Unexpected stack details ${stackDetails}. 'stackDetails.body.stack' not found!!`)
      })
  } catch(error) {
    console.log(error)
  }
}

exports.masterLocalDetails = function(credentialConfig) {
  let client = stack.Client(credentialConfig)
  return new Promise((resolve, reject) => {
    var result =  client.stack({ api_key: credentialConfig.target_stack, management_token: credentialConfig.management_token }).locale().query()
      result.find()
      .then(response => {
        var masterLocalObj = response.items.filter(obj => {
            if (obj.fallback_locale === null) {
              return obj
            }
            });
        return resolve(masterLocalObj)
      }).catch(error => {
        return reject(error)
      })
  })
};

exports.field_rules_update = function(config, ctPath) {
  return new Promise(function (resolve, reject) {
    let client = stack.Client(config)
    
    fs.readFile(path.join(ctPath + '/field_rules_uid.json'), async (err, data) => {
      if (err) {
        throw err;
      }
      var ct_field_visibility_uid = JSON.parse(data)
      let ct_files = fs.readdirSync(ctPath)
      if (ct_field_visibility_uid && ct_field_visibility_uid != 'undefined') {
        for (let index = 0; index < ct_field_visibility_uid.length; index++) {
          if (ct_files.indexOf(ct_field_visibility_uid[index] + '.json') > -1) {
            let schema = require(path.resolve(ctPath, ct_field_visibility_uid[index]))
            // await field_rules_update(schema)
            let fieldRuleLength = schema.field_rules.length
            for (let k = 0; k < fieldRuleLength; k++) {
              let fieldRuleConditionLength = schema.field_rules[k].conditions.length
              for (let i = 0; i < fieldRuleConditionLength; i++) {
                if (schema.field_rules[k].conditions[i].operand_field === 'reference') {
                  let entryMapperPath = path.resolve(config.data, 'mapper', 'entries')
                  let entryUidMapperPath = path.join(entryMapperPath, 'uid-mapping.json')
                  let fieldRulesValue = schema.field_rules[k].conditions[i].value
                  let fieldRulesArray = fieldRulesValue.split('.')
                  let updatedValue = []
                  for (let j = 0; j < fieldRulesArray.length; j++) {
                    let splitedFieldRulesValue = fieldRulesArray[j]
                    let oldUid = helper.readFile(path.join(entryUidMapperPath))
                    if (oldUid.hasOwnProperty(splitedFieldRulesValue)) {
                      updatedValue.push(oldUid[splitedFieldRulesValue])
                    } else {
                      updatedValue.push(fieldRulesArray[j])
                    }
                  }
                  schema.field_rules[k].conditions[i].value = updatedValue.join('.')
                }
              }
            }
            let ctObj = client.stack({ api_key: config.target_stack, management_token: config.management_token }).contentType(schema.uid)
            Object.assign(ctObj, _.cloneDeep(schema))
            ctObj.update()
              .then(() => {
                return resolve()
              }).catch(function (error) {
                return reject(error)
              })
          }
        }
      }
    })
  })
}

exports.getConfig = function() {
  return config
};
