/* eslint-disable node/no-extraneous-require */
/* eslint-disable node/no-unsupported-features/es-syntax */
/* eslint-disable no-negated-condition */
/* eslint-disable no-console */
const chalk = require('chalk');
const path = require('path');
const { formatError } = require('../util');
const apiVersionForNRP = '3.2';
const nrpApiVersionWarning = `Provided apiVersion is invalid. ${apiVersionForNRP} is only supported value. Continuing with regular bulk-publish for now.`;

const { getLoggerInstance, addLogs, getLogsDirPath } = require('../util/logger');
const { sanitizePath } = require('@contentstack/cli-utilities');
const logsDir = getLogsDirPath();
const { handleRateLimit, fetchBulkPublishLimit } = require('../util/common-utility');
const { createSmartRateLimiter } = require('../util/smart-rate-limiter');

// Simple delay function
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

let logger;
let fileNme;
let smartRateLimiter;

function initializeLogger(fileName) {
  fileNme = fileName;
  fileNme = `${Date.now()}.${fileNme}`;
  logger = getLoggerInstance(fileNme);
  return path.join(logsDir, sanitizePath(fileNme));
}

/* eslint-disable camelcase */
function removePublishDetails(elements) {
  if (elements && elements.length > 0) {
    return elements.map(({ publish_details, ...rest }) => rest);
  } else {
    delete elements.publish_details;
  }
  return elements;
}

function displayEntriesDetails(sanitizedData, action, mapping = []) {
  if (action === 'bulk_publish') {
    sanitizedData.forEach((entry) => {
      entry?.publish_details.forEach((pd) => {
        if (Object.keys(mapping).includes(pd.environment)) {
          console.log(
            chalk.green(
              `Entry UID '${entry.uid}' of CT '${entry.content_type}' in locale '${entry.locale}' version '${pd.version}' in environment '${pd.environment}'`,
            ),
          )
        }
      });
      if(!Array.isArray(entry.publish_details)){
        console.log(chalk.green(`Entry UID '${entry.uid}' of CT '${entry.content_type}' in locale '${entry.locale}'`));
      }
    });
  } else if (action === 'bulk_unpublish') {
    sanitizedData.forEach((entry) => {
      console.log(chalk.green(`Entry UID '${entry.uid}' of CT '${entry.content_type}' in locale '${entry.locale}'`));
    });
  }
}

function displayAssetsDetails(sanitizedData, action, mapping) {
  if (action === 'bulk_publish') {
    sanitizedData.forEach((asset) => {
      asset?.publish_details.forEach((pd) => {
        if (Object.keys(mapping).includes(pd.environment)) {
          const versionText = pd.version ? `and version '${pd.version}'` : '';
          const localeText = asset.locale ? `in locale '${asset.locale}'` : '';
          console.log(
            chalk.green(
              `Asset UID '${asset.uid}' ${versionText} ${localeText} in environment ${pd.environment}`,
            ),
          );
        }
      });
    });
  } else if (action === 'bulk_unpublish') {
    sanitizedData.forEach((asset) => {
      const versionText = asset.version ? `and version '${asset.version}'` : '';
      const localeText = asset.locale ? `in locale '${asset.locale}'` : '';
      console.log(
        chalk.green(
          `Asset UID '${asset.uid}' and version ${versionText} in locale ${localeText}`,
        ),
      );
    });
  }
}
async function publishEntry(data, _config, queue) {
  const lang = [];
  const entryObj = data.obj;
  const stack = entryObj.stack;
  
  // Get smart rate limiter instance (singleton per organization)
  smartRateLimiter = createSmartRateLimiter(stack?.org_uid);
  
  lang.push(entryObj.locale);
  
  // Check if we can process this item
  if (!smartRateLimiter.canProcess(1)) {
    smartRateLimiter.logStatus();
    // Put the item back in queue and wait
    await delay(1000);
    queue.Enqueue(data);
    return;
  }
  
  // Log request attempt
  smartRateLimiter.logRequestAttempt('publish', 'entry', entryObj.entryUid);
  
  stack
    .contentType(entryObj.content_type)
    .entry(entryObj.entryUid)
    .publish({
      publishDetails: { environments: entryObj.environments, locales: lang },
      locale: entryObj.locale || 'en-us',
    })
    .then((publishEntryResponse) => {
      if (!publishEntryResponse.error_message) {
        // Update rate limit from server response
        smartRateLimiter.updateRateLimit(publishEntryResponse);
        
        // Log success
        smartRateLimiter.logRequestSuccess('publish', 'entry', entryObj.entryUid, publishEntryResponse);
        
        console.log(
          chalk.green(
            `entry published with ContentType uid=${entryObj.content_type} Entry uid=${entryObj.entryUid} locale=${entryObj.locale}`,
          ),
        );
        delete entryObj.stack;
        addLogs(
          logger,
          { options: entryObj, api_key: stack.stackHeaders.api_key, alias: stack.alias, host: stack.host },
          'info',
        );
      } else {
        throw publishEntryResponse;
      }
    })
    .catch(async (error) => {
      // Log failure
      smartRateLimiter.logRequestFailure('publish', 'entry', entryObj.entryUid, error);
      
      if (error.errorCode === 429 && data.retry < 2) {
        data.retry++;
        smartRateLimiter.logStatus();
        // Wait and retry
        await delay(1000);
        queue.Enqueue(data);
      } else {
        delete entryObj.stack;
        console.log(
          chalk.red(
            `entry could not be published with ContentType uid=${entryObj.content_type} entry uid=${
              entryObj.entryUid
            } locale=${entryObj.locale} error=${formatError(error)}`,
          ),
        );
        addLogs(
          logger,
          {
            options: removePublishDetails(entryObj),
            api_key: stack.stackHeaders.api_key,
            alias: stack.alias,
            host: stack.host,
          },
          'error',
        );
      }
    });
}

async function publishAsset(data, _config, queue) {
  const assetobj = data.obj;
  const stack = assetobj.stack;
  
  // Get smart rate limiter instance (singleton per organization)
  smartRateLimiter = createSmartRateLimiter(stack?.org_uid);
  
  // Check if we can process this item
  if (!smartRateLimiter.canProcess(1)) {
    smartRateLimiter.logStatus();
    // Put the item back in queue and wait
    await delay(1000);
    queue.Enqueue(data);
    return;
  }

  // Log request attempt
  smartRateLimiter.logRequestAttempt('publish', 'asset', assetobj.assetUid);

  stack
    .asset(assetobj.assetUid)
    .publish({ publishDetails: { environments: assetobj.environments, locales: [assetobj.locale || 'en-us'] } })
    .then((publishAssetResponse) => {
      if (!publishAssetResponse.error_message) {
        // Update rate limit from server response
        smartRateLimiter.updateRateLimit(publishAssetResponse);
        
        // Log success
        smartRateLimiter.logRequestSuccess('publish', 'asset', assetobj.assetUid, publishAssetResponse);
        
        console.log(chalk.green(`asset published with Asset uid=${assetobj.assetUid}, locale=${assetobj.locale}`));
        delete assetobj.stack;
        addLogs(
          logger,
          { options: assetobj, api_key: stack.stackHeaders.api_key, alias: stack.alias, host: stack.host },
          'info',
        );
      } else {
        throw publishAssetResponse;
      }
    })
    .catch(async (error) => {
      // Log failure
      smartRateLimiter.logRequestFailure('publish', 'asset', assetobj.assetUid, error);
      
      if (error.errorCode === 429 && data.retry < 2) {
        data.retry++;
        smartRateLimiter.logStatus();
        // Wait and retry
        await delay(1000);
        queue.Enqueue(data);
      } else {
        delete assetobj.stack;
        console.log(chalk.red(`Could not publish because of Error=${formatError(error)}`));
        addLogs(
          logger,
          {
            options: removePublishDetails(assetobj),
            api_key: stack.stackHeaders.api_key,
            alias: stack.alias,
            host: stack.host,
          },
          'error',
        );
      }
    });
}

async function UnpublishEntry(data, _config, queue) {
  const lang = [];
  const entryObj = data.obj;
  const stack = entryObj.stack;
  
  // Get smart rate limiter instance (singleton per organization)
  smartRateLimiter = createSmartRateLimiter(stack?.org_uid);
  
  lang.push(entryObj.locale);
  
  // Check if we can process this item
  if (!smartRateLimiter.canProcess(1)) {
    smartRateLimiter.logStatus();
    // Put the item back in queue and wait
    await delay(1000);
    queue.Enqueue(data);
    return;
  }
  
  // Log request attempt
  smartRateLimiter.logRequestAttempt('unpublish', 'entry', entryObj.entryUid);
  
  stack
    .contentType(entryObj.content_type)
    .entry(entryObj.entryUid)
    .unpublish({ publishDetails: { environments: entryObj.environments, locales: lang }, locale: entryObj.locale })
    .then((unpublishEntryResponse) => {
      if (!unpublishEntryResponse.error_message) {
        // Update rate limit from server response
        smartRateLimiter.updateRateLimit(unpublishEntryResponse);
        
        // Log success
        smartRateLimiter.logRequestSuccess('unpublish', 'entry', entryObj.entryUid, unpublishEntryResponse);
        
        delete entryObj.stack;
        console.log(
          chalk.green(
            `Entry unpublished with ContentType uid=${entryObj.content_type} Entry uid=${entryObj.entryUid} locale=${entryObj.locale}`,
          ),
        );
        addLogs(
          logger,
          { options: entryObj, api_key: stack.stackHeaders.api_key, alias: stack.alias, host: stack.host },
          'info',
        );
      } else {
        throw unpublishEntryResponse;
      }
    })
    .catch(async (error) => {
      // Log failure
      smartRateLimiter.logRequestFailure('unpublish', 'entry', entryObj.entryUid, error);
      
      if (error.errorCode === 429 && data.retry < 2) {
        data.retry++;
        smartRateLimiter.logStatus();
        // Wait and retry
        await delay(1000);
        queue.Enqueue(data);
      } else {
        delete entryObj.stack;
        console.log(
          chalk.red(
            `Entry could not be unpublished with ContentType uid=${entryObj.content_type} Entry uid=${
              entryObj.entryUid
            } locale=${entryObj.locale} error=${formatError(error)}`,
          ),
        );
        addLogs(
          logger,
          { options: entryObj, api_key: stack.stackHeaders.api_key, alias: stack.alias, host: stack.host },
          'error',
        );
      }
    });
}

async function UnpublishAsset(data, _config, queue) {
  const assetobj = data.obj;
  const stack = assetobj.stack;
  
  // Get smart rate limiter instance (singleton per organization)
  smartRateLimiter = createSmartRateLimiter(stack?.org_uid);
  
  // Check if we can process this item
  if (!smartRateLimiter.canProcess(1)) {
    smartRateLimiter.logStatus();
    // Put the item back in queue and wait
    await delay(1000);
    queue.Enqueue(data);
    return;
  }

  // Log request attempt
  smartRateLimiter.logRequestAttempt('unpublish', 'asset', assetobj.assetUid);

  stack
    .asset(assetobj.assetUid)
    .unpublish({ publishDetails: { environments: assetobj.environments, locales: [assetobj.locale || 'en-us'] } })
    .then((unpublishAssetResponse) => {
      if (!unpublishAssetResponse.error_message) {
        // Update rate limit from server response
        smartRateLimiter.updateRateLimit(unpublishAssetResponse);
        
        // Log success
        smartRateLimiter.logRequestSuccess('unpublish', 'asset', assetobj.assetUid, unpublishAssetResponse);
        
        delete assetobj.stack;
        console.log(chalk.red(`Could not Unpublish because of error=${formatError(error)}`));
        addLogs(
          logger,
          { options: assetobj, api_key: stack.stackHeaders.api_key, alias: stack.alias, host: stack.host },
          'error',
        );
      } else {
        throw unpublishAssetResponse;
      }
    })
    .catch(async (error) => {
      // Log failure
      smartRateLimiter.logRequestFailure('unpublish', 'asset', assetobj.assetUid, error);
      
      if (error.errorCode === 429 && data.retry < 2) {
        data.retry++;
        smartRateLimiter.logStatus();
        // Wait and retry
        await delay(1000);
        queue.Enqueue(data);
      } else {
        delete assetobj.stack;
        console.log(chalk.red(`Could not Unpublish because of error=${formatError(error)}`));
        addLogs(
          logger,
          { options: assetobj, api_key: stack.stackHeaders.api_key, alias: stack.alias, host: stack.host },
          'error',
        );
      }
    });
}

async function getEnvironment(stack, environment) {
  const mapping = {};
  if (Array.isArray(environment) && environment.length) {
    for (let i = 0; i < environment.length; i++) {
      const key = await stack.environment(environment[i]).fetch();
      mapping[key.uid] = environment[i];
    }
  } else {
    const key = await stack.environment(environment[i]).fetch();
    mapping[key.uid] = environment[i];
  }
  return mapping;
}

async function performBulkPublish(data, _config, queue) {
  // add validation for user uid
  // if user not logged in, then user uid won't be available and NRP too won't work
  let conf;
  const bulkPublishObj = data.obj;
  const stack = bulkPublishObj.stack;
  
  // Get smart rate limiter instance (singleton per organization)
  smartRateLimiter = createSmartRateLimiter(stack?.org_uid);
  
  let payload = {};
  const mapping = await getEnvironment(stack, bulkPublishObj.environments);
  switch (bulkPublishObj.Type) {
    case 'entry':
      conf = {
        entries: removePublishDetails(bulkPublishObj.entries),
        locales: [bulkPublishObj.locale],
        environments: bulkPublishObj.environments,
      };
      payload['details'] = conf;
      if (bulkPublishObj.apiVersion) {
        if (!isNaN(bulkPublishObj.apiVersion) && bulkPublishObj.apiVersion === apiVersionForNRP) {
          payload['api_version'] = bulkPublishObj.apiVersion;
          payload.details.publish_with_reference = true;
        } else {
          if (bulkPublishObj.apiVersion !== '3') {
            // because 3 is the default value for api-version, and it exists for the purpose of display only
            console.log(chalk.yellow(nrpApiVersionWarning));
          }
        }
      }
      // Check if we can process this bulk operation
      const entriesToProcess = bulkPublishObj.entries ? bulkPublishObj.entries.length : 1;
      if (!smartRateLimiter.canProcess(entriesToProcess)) {
        smartRateLimiter.logStatus();
        // Put the item back in queue and wait
        await delay(1000);
        queue.Enqueue(data);
        return;
      }
      
      // Log bulk request attempt
      const entryIds = bulkPublishObj.entries ? bulkPublishObj.entries.map(e => e.uid).join(',') : 'bulk_entries';
      smartRateLimiter.logRequestAttempt('bulk_publish', 'entries', entryIds);
      
      stack
        .bulkOperation()
        .publish(payload)
        .then((bulkPublishEntriesResponse) => {
          if (!bulkPublishEntriesResponse.error_message) {
            // Log success
            smartRateLimiter.logRequestSuccess('bulk_publish', 'entries', entryIds, bulkPublishEntriesResponse);
            
            console.log(
              chalk.green(`Bulk entries sent for publish`),
              bulkPublishEntriesResponse.job_id ? chalk.yellow(`job_id: ${bulkPublishEntriesResponse.job_id}`) : '',
            );
            // Only display entry details once per bulk operation, not per entry
            displayEntriesDetails(bulkPublishObj.entries, 'bulk_publish', mapping);
            delete bulkPublishObj.stack;
            addLogs(
              logger,
              { options: bulkPublishObj, api_key: stack.stackHeaders.api_key, alias: stack.alias, host: stack.host },
              'info',
            );
          } else {
            throw bulkPublishEntriesResponse;
          }
        })
        .catch(async (error) => {
          // Log failure
          smartRateLimiter.logRequestFailure('bulk_publish', 'entries', entryIds, error);
          
          if (error.errorCode === 429 && data.retry < 2) {
            data.retry++;
            smartRateLimiter.logStatus();
            // Wait and retry
            await delay(1000);
            queue.Enqueue(data);
          } else {
            delete bulkPublishObj.stack;
            console.log(chalk.red(`Bulk entries failed to publish with error ${formatError(error)}`));
            displayEntriesDetails(bulkPublishObj.entries, 'bulk_publish', mapping);
            addLogs(
              logger,
              { options: bulkPublishObj, api_key: stack.stackHeaders.api_key, alias: stack.alias, host: stack.host },
              'error',
            );
          }
        });
      break;
    case 'asset':
      conf = {
        assets: removePublishDetails(bulkPublishObj.assets),
        locales: [bulkPublishObj.locale],
        environments: bulkPublishObj.environments,
      };
      payload['details'] = conf;
      if (bulkPublishObj.apiVersion) {
        if (!isNaN(bulkPublishObj.apiVersion) && bulkPublishObj.apiVersion === apiVersionForNRP) {
          payload['api_version'] = bulkPublishObj.apiVersion;
          payload.details.publish_with_reference = true;
        } else {
          if (bulkPublishObj.apiVersion !== '3') {
            console.log(chalk.yellow(nrpApiVersionWarning));
          }
        }
      }
      // Check if we can process this bulk operation
      const assetsToProcess = bulkPublishObj.assets ? bulkPublishObj.assets.length : 1;
      if (!smartRateLimiter.canProcess(assetsToProcess)) {
        smartRateLimiter.logStatus();
        // Put the item back in queue and wait
        await delay(1000);
        queue.Enqueue(data);
        return;
      }
      
      // Log bulk request attempt
      const assetIds = bulkPublishObj.assets ? bulkPublishObj.assets.map(a => a.uid).join(',') : 'bulk_assets';
      smartRateLimiter.logRequestAttempt('bulk_publish', 'assets', assetIds);
      
      stack
        .bulkOperation()
        .publish(payload)
        .then((bulkPublishAssetsResponse) => {
          if (!bulkPublishAssetsResponse.error_message) {
            // Log success
            smartRateLimiter.logRequestSuccess('bulk_publish', 'assets', assetIds, bulkPublishAssetsResponse);
            
            console.log(
              chalk.green(`Bulk assets sent for publish`),
              bulkPublishAssetsResponse.job_id ? chalk.yellow(`job_id: ${bulkPublishAssetsResponse.job_id}`) : '',
            );
            // Only display asset details once per bulk operation, not per asset
            displayAssetsDetails(bulkPublishObj.assets, 'bulk_publish', mapping);
            delete bulkPublishObj.stack;
            addLogs(
              logger,
              { options: bulkPublishObj, api_key: stack.stackHeaders.api_key, alias: stack.alias, host: stack.host },
              'info',
            );
          } else {
            throw bulkPublishAssetsResponse;
          }
        })
        .catch(async (error) => {
          // Log failure
          smartRateLimiter.logRequestFailure('bulk_publish', 'assets', assetIds, error);
          
          if (error.errorCode === 429 && data.retry < 2) {
            data.retry++;
            smartRateLimiter.logStatus();
            // Wait and retry
            await delay(1000);
            queue.Enqueue(data);
          } else {
            delete bulkPublishObj.stack;
            console.log(chalk.red(`Bulk assets failed to publish with error ${formatError(error)}`));
            displayAssetsDetails(bulkPublishObj.assets, 'bulk_publish', mapping);
            addLogs(
              logger,
              { options: bulkPublishObj, api_key: stack.stackHeaders.api_key, alias: stack.alias, host: stack.host },
              'error',
            );
          }
        });
      break;
    default:
      console.log(chalk.red(`Invalid bulk publish type: ${bulkPublishObj.Type}`));
      break;
  }
}

async function performBulkUnPublish(data, _config, queue) {
  let conf;
  const bulkUnPublishObj = data.obj;
  const stack = bulkUnPublishObj.stack;
  
  // Get smart rate limiter instance (singleton per organization)
  smartRateLimiter = createSmartRateLimiter(stack?.org_uid);
  
  let payload = {};
  switch (bulkUnPublishObj.Type) {
    case 'entry':
      conf = {
        entries: removePublishDetails(bulkUnPublishObj.entries),
        locales: [bulkUnPublishObj.locale],
        environments: bulkUnPublishObj.environments,
      };
      payload['details'] = conf;
      if (bulkUnPublishObj.apiVersion) {
        if (!isNaN(bulkUnPublishObj.apiVersion) && bulkUnPublishObj.apiVersion === apiVersionForNRP) {
          payload['api_version'] = bulkUnPublishObj.apiVersion;
        } else {
          if (bulkUnPublishObj.apiVersion !== '3') {
            // because 3 is the default value for api-version, and it exists for the purpose of display only
            console.log(chalk.yellow(nrpApiVersionWarning));
          }
        }
      }
      // Check if we can process this bulk operation
      const entriesToUnpublish = bulkUnPublishObj.entries ? bulkUnPublishObj.entries.length : 1;
      if (!smartRateLimiter.canProcess(entriesToUnpublish)) {
        smartRateLimiter.logStatus();
        // Put the item back in queue and wait
        await delay(1000);
        queue.Enqueue(data);
        return;
      }
      
      // Log bulk request attempt
      const entryIds = bulkUnPublishObj.entries ? bulkUnPublishObj.entries.map(e => e.uid).join(',') : 'bulk_entries';
      smartRateLimiter.logRequestAttempt('bulk_unpublish', 'entries', entryIds);
      
      stack
        .bulkOperation()
        .unpublish(payload)
        .then((bulkUnPublishEntriesResponse) => {
          if (!bulkUnPublishEntriesResponse.error_message) {
            // Log success
            smartRateLimiter.logRequestSuccess('bulk_unpublish', 'entries', entryIds, bulkUnPublishEntriesResponse);
            
            delete bulkUnPublishObj.stack;

            console.log(
              chalk.green(`Bulk entries sent for Unpublish`),
              bulkUnPublishEntriesResponse.job_id
                ? chalk.yellow(`job_id: ${bulkUnPublishEntriesResponse.job_id}`)
                : '',
            );
            displayEntriesDetails(bulkUnPublishObj.entries, 'bulk_unpublish');
            addLogs(
              logger,
              { options: bulkUnPublishObj, api_key: stack.stackHeaders.api_key, alias: stack.alias, host: stack.host },
              'info',
            );
          } else {
            throw bulkUnPublishEntriesResponse;
          }
        })
        .catch(async (error) => {
          // Log failure
          smartRateLimiter.logRequestFailure('bulk_unpublish', 'entries', entryIds, error);
          
          if (error.errorCode === 429 && data.retry < 2) {
            data.retry++;
            smartRateLimiter.logStatus();
            // Wait and retry
            await delay(1000);
            queue.Enqueue(data);
          } else {
            delete bulkUnPublishObj.stack;
            console.log(chalk.red(`Bulk entries failed to Unpublish with error ${formatError(error)}`));
            displayEntriesDetails(bulkUnPublishObj.entries, 'bulk_unpublish');
            addLogs(
              logger,
              { options: bulkUnPublishObj, api_key: stack.stackHeaders.api_key, alias: stack.alias, host: stack.host },
              'error',
            );
          }
        });
      break;
    case 'asset':
      conf = {
        assets: removePublishDetails(bulkUnPublishObj.assets),
        locales: [bulkUnPublishObj.locale || 'en-us'],
        environments: bulkUnPublishObj.environments,
      };
      payload['details'] = conf;
      if (bulkUnPublishObj.apiVersion) {
        if (!isNaN(bulkUnPublishObj.apiVersion) && bulkUnPublishObj.apiVersion === apiVersionForNRP) {
          payload['api_version'] = bulkUnPublishObj.apiVersion;
        } else {
          if (bulkUnPublishObj.apiVersion !== '3') {
            // because 3 is the default value for api-version, and it exists for the purpose of display only
            console.log(chalk.yellow(nrpApiVersionWarning));
          }
        }
      }
      // Check if we can process this bulk operation
      const assetsToUnpublish = bulkUnPublishObj.assets ? bulkUnPublishObj.assets.length : 1;
      if (!smartRateLimiter.canProcess(assetsToUnpublish)) {
        smartRateLimiter.logStatus();
        // Put the item back in queue and wait
        await delay(1000);
        queue.Enqueue(data);
        return;
      }
      
      // Log bulk request attempt
      const assetIds = bulkUnPublishObj.assets ? bulkUnPublishObj.assets.map(a => a.uid).join(',') : 'bulk_assets';
      smartRateLimiter.logRequestAttempt('bulk_unpublish', 'assets', assetIds);
      
      stack
        .bulkOperation()
        .unpublish(payload)
        .then((bulkUnPublishAssetsResponse) => {
          if (!bulkUnPublishAssetsResponse.error_message) {
            // Log success
            smartRateLimiter.logRequestSuccess('bulk_unpublish', 'assets', assetIds, bulkUnPublishAssetsResponse);
            
            delete bulkUnPublishObj.stack;
            console.log(
              chalk.green(`Bulk assets sent for Unpublish`),
              bulkUnPublishAssetsResponse.job_id ? chalk.yellow(`job_id: ${bulkUnPublishAssetsResponse.job_id}`) : '',
            );
            displayAssetsDetails(bulkUnPublishObj.assets, 'bulk_unpublish');
            addLogs(
              logger,
              { options: bulkUnPublishObj, api_key: stack.stackHeaders.api_key, alias: stack.alias, host: stack.host },
              'info',
            );
          } else {
            throw bulkUnPublishAssetsResponse;
          }
        })
        .catch(async (error) => {
          // Log failure
          smartRateLimiter.logRequestFailure('bulk_unpublish', 'assets', assetIds, error);
          
          if (error.errorCode === 429 && data.retry < 2) {
            data.retry++;
            smartRateLimiter.logStatus();
            // Wait and retry
            await delay(1000);
            queue.Enqueue(data);
          } else {
            delete bulkUnPublishObj.stack;
            console.log(chalk.red(`Bulk assets failed to Unpublish with error ${formatError(error)}`));
            displayAssetsDetails(bulkUnPublishObj.assets, 'bulk_unpublish');
            addLogs(
              logger,
              { options: bulkUnPublishObj, api_key: stack.stackHeaders.api_key, alias: stack.alias, host: stack.host },
              'error',
            );
          }
        });
      break;
    default:
      console.log(chalk.red(`Invalid bulk unpublish type: ${bulkUnPublishObj.Type}`));
      break;
  }
}

// short-term fix for reverting to previous versions
/* eslint-disable no-case-declarations */
async function publishUsingVersion(data, _config, queue) {
  let conf;
  let successfullyPublished = [];
  let failedToPublish = [];
  let counter = 0;
  const bulkPublishObj = data.obj;
  const stack = bulkPublishObj.stack;
  
  // Get smart rate limiter instance (singleton per organization)
  smartRateLimiter = createSmartRateLimiter(stack?.org_uid);
  switch (bulkPublishObj.Type) {
    case 'entry':
      successfullyPublished = [];
      failedToPublish = [];
      counter = 0;
      const aggregatedEntries = {
        ...bulkPublishObj,
      };
      bulkPublishObj.entries.forEach(async (entry) => {
        conf = {
          publishDetails: {
            environments: bulkPublishObj.environments,
            locales: [bulkPublishObj.locale],
          },
          locale: bulkPublishObj.locale,
          version: entry.version,
        };
        // Check if we can process this item
        if (!smartRateLimiter.canProcess(1)) {
          smartRateLimiter.logStatus();
          // Put the item back in queue and wait
          await delay(1000);
          queue.Enqueue(data);
          return;
        }
        
        stack
          .contentType(entry.content_type)
          .entry(entry.uid)
          .publish(conf)
          .then((publishEntriesResponse) => {
            if (!publishEntriesResponse.error_message) {
              // Update rate limit from server response
              smartRateLimiter.updateRateLimit(publishEntriesResponse);
              console.log(chalk.green(`Entry=${entry.uid} sent for publish`));

              counter += 1;

              successfullyPublished.push({
                ...entry,
              });

              if (counter === bulkPublishObj.entries.length) {
                if (successfullyPublished.length > 0) {
                  aggregatedEntries.entries = successfullyPublished;
                  addLogs(
                    logger,
                    {
                      options: aggregatedEntries,
                      api_key: stack.stackHeaders.api_key,
                      alias: stack.alias,
                      host: stack.host,
                    },
                    'info',
                  );
                }

                if (failedToPublish.length > 0) {
                  aggregatedEntries.entries = failedToPublish;
                  addLogs(
                    logger,
                    {
                      options: bulkPublishObj,
                      api_key: stack.stackHeaders.api_key,
                      alias: stack.alias,
                      host: stack.host,
                    },
                    'error',
                  );
                }
              }
            } else {
              failedToPublish.push({
                ...entry,
              });

              // throw bulkPublishEntriesResponse;
            }
          })
          .catch(async (error) => {
            if (error.errorCode === 429 && data.retry < 2) {
              data.retry++;
              smartRateLimiter.logStatus();
              // Wait and retry
              await delay(1000);
              queue.Enqueue(data);
            } else {
              counter += 1;

              failedToPublish.push({
                ...entry,
              });

              if (counter === bulkPublishObj.entries.length) {
                if (successfullyPublished.length > 0) {
                  aggregatedEntries.entries = successfullyPublished;
                  addLogs(
                    logger,
                    {
                      options: aggregatedEntries,
                      api_key: stack.stackHeaders.api_key,
                      alias: stack.alias,
                      host: stack.host,
                    },
                    'info',
                  );
                }

                if (failedToPublish.length > 0) {
                  aggregatedEntries.entries = failedToPublish;
                  addLogs(
                    logger,
                    {
                      options: bulkPublishObj,
                      api_key: stack.stackHeaders.api_key,
                      alias: stack.alias,
                      host: stack.host,
                    },
                    'error',
                  );
                }
              }

              console.log(chalk.red(`Entry=${entry.uid} failed to publish with error ${formatError(error)}`));
            }
          });
      });
      break;
    case 'asset':
      successfullyPublished = [];
      failedToPublish = [];
      counter = 0;
      const aggregatedAssets = {
        ...bulkPublishObj,
      };
      bulkPublishObj.assets.forEach(async (asset) => {
        conf = {
          publishDetails: {
            environments: bulkPublishObj.environments,
            locales: [bulkPublishObj.locale],
          },
          version: asset.version,
        };
        // Check if we can process this item
        if (!smartRateLimiter.canProcess(1)) {
          smartRateLimiter.logStatus();
          // Put the item back in queue and wait
          await delay(1000);
          queue.Enqueue(data);
          return;
        }
        
        stack
          .asset(asset.uid)
          .publish(conf)
          .then((publishAssetsResponse) => {
            if (!publishAssetsResponse.error_message) {
              // Update rate limit from server response
              smartRateLimiter.updateRateLimit(publishAssetsResponse);
              console.log(chalk.green(`Asset=${asset.uid} sent for publish`));

              counter += 1;

              successfullyPublished.push({
                ...asset,
              });

              if (counter === bulkPublishObj.assets.length) {
                if (successfullyPublished.length > 0) {
                  aggregatedAssets.assets = successfullyPublished;
                  addLogs(
                    logger,
                    {
                      options: aggregatedAssets,
                      api_key: stack.stackHeaders.api_key,
                      alias: stack.alias,
                      host: stack.host,
                    },
                    'info',
                  );
                }

                if (failedToPublish.length > 0) {
                  aggregatedAssets.assets = failedToPublish;
                  addLogs(
                    logger,
                    {
                      options: bulkPublishObj,
                      api_key: stack.stackHeaders.api_key,
                      alias: stack.alias,
                      host: stack.host,
                    },
                    'error',
                  );
                }
              }
            } else {
              failedToPublish.push({
                ...asset,
              });

              // throw bulkPublishAssetsResponse;
            }
          })
          .catch(async (error) => {
            if (error.errorCode === 429 && data.retry < 2) {
              data.retry++;
              smartRateLimiter.logStatus();
              // Wait and retry
              await delay(1000);
              queue.Enqueue(data);
            } else {
              counter += 1;

              failedToPublish.push({
                ...asset,
              });

              if (counter === bulkPublishObj.assets.length) {
                if (successfullyPublished.length > 0) {
                  aggregatedAssets.assets = successfullyPublished;
                  addLogs(
                    logger,
                    {
                      options: aggregatedAssets,
                      api_key: stack.stackHeaders.api_key,
                      alias: stack.alias,
                      host: stack.host,
                    },
                    'info',
                  );
                }

                if (failedToPublish.length > 0) {
                  aggregatedAssets.assets = failedToPublish;
                  addLogs(
                    logger,
                    {
                      options: bulkPublishObj,
                      api_key: stack.stackHeaders.api_key,
                      alias: stack.alias,
                      host: stack.host,
                    },
                    'error',
                  );
                  }
                }

              console.log(chalk.red(`Asset=${asset.uid} failed to publish with error ${formatError(error)}`));
            }
          });
      });
      break;
    default:
      console.log('No such type');
  }
}

module.exports = {
  performBulkPublish,
  performBulkUnPublish,
  initializeLogger,
  publishEntry,
  publishAsset,
  UnpublishEntry,
  UnpublishAsset,
  publishUsingVersion,
};
