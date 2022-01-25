export { default as authHandler } from './auth-handler';
export { default as CLIError } from './cli-error';
export { default as messageHandler } from './message-handler';
export { default as logger } from './logger';
export { default as cliux } from './cli-ux';
export * as interactive from './interactive';
export * as tokenValidation from './tokens-validation';
export { default as Queue } from './queue';
export * as flagValidation from './flags-validation';
export * as store from './store'
export { default as req } from './request'

const chalk = require('chalk')
const fs = require('fs')

export function prettyPrint(data) {
	console.log(chalk.yellow('Configuration to be used for executing this command:'))
	Object.keys(data).forEach((key, index) => {
		console.log(chalk.grey(`${key}: ${data[key]}`))
	})
	console.log('\n')
}

export function formatError(error) {
  try {
    if (typeof error === 'string') {
      error = JSON.parse(error)
    } else {
    	error = JSON.parse(error.message)
    }
  } catch(e) {
    error = error.message
  }
  let message = (error.errorMessage) ? error.errorMessage : (error.error_message) ? error.error_message : error
  if (error.errors && Object.keys(error.errors).length > 0){
    Object.keys(error.errors).forEach((e) => {
      let entity = e
      if (e === 'authorization')
        entity = 'Management Token'
      if (e === 'api_key')
        entity = 'Stack API key'
      if (e === 'uid')
        entity = 'Content Type'
      if (e === 'access_token')
        entity = 'Delivery Token'
      message += ' ' + [entity, error.errors[e]].join(' ')
    })
  }
  return message
}

export function formatHostname(hostname) {
  return hostname.split('//').pop()
}

export function setDelayForBulkPublish(queue) {
  // queue.requestBatchSize = 1
  // queue.delay = 1
}

export function getNumberOfBulkPublishRequests(count) {
  // for example, if the total count of elements is 738
  // then the number of requets that'll be required are (if there are 10 elements per request)
  // (738 - 8)/10 + 1 = 74 requests
  return (count - (count % 10))/10 + 1
}

export function isEmpty(file) {
  return new Promise((resolve) => {
    fs.readFile(file, (err, data) => {
      if (data.length === 0){
        return resolve(true)
      }
      return resolve(false)
    })
  })
}

export async function setupBranches(context, managementAPIClient, exportConfig): Promise<any> {
  if (typeof exportConfig !== 'object') {
    throw new Error('Invalid config to setup the branch');
  }

  try {
    let branches = [];
    if (typeof exportConfig.branchName === 'string') {
      //check branch exists
      const result = await managementAPIClient.axiosInstance.get({
        url: `${context.region.cma}/${context.version || 'v3'}/stacks/branches/${exportConfig.branchName}`,
        headers: {
          api_key: exportConfig.apiKey,
          authtoken: context.user.authtoken,
        },
      });
      if (result && typeof result.body === 'object' && typeof result.body.branch === 'object') {
        branches.push(result.body.branch);
      }
      return Promise.reject('No branch found with the name ' + exportConfig.branchName);
    } else {
      const result = await managementAPIClient.axiosInstance.get({
        url: `${context.region.cma}/${context.version || 'v3'}/stacks/branches`,
        headers: {
          api_key: exportConfig.apiKey,
          authtoken: context.user.authtoken,
        },
      });
      if (result && result.body && Array.isArray(result.body.branches) && result.body.branches.length > 0) {
        branches = result.body.branches;
      }
    }
    // add branches list in the
    exportConfig.branches = branches;
  } catch (error) {
    logger.debug('failed to setup the branch', error && error.body);
  }
}