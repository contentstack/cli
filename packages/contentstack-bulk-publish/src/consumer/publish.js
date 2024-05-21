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

let logger;
let fileNme;

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

function displayEntriesDetails(sanitizedData) {
  sanitizedData.forEach((entry) => {
    console.log(chalk.green(`Entry UID '${entry.uid}' of CT '${entry.content_type}' in locale '${entry.locale}'`));
  });
}

function displayAssetsDetails(sanitizedData) {
  sanitizedData.forEach((asset) => {
    console.log(
      chalk.green(
        `Asset UID '${asset.uid}' ${asset.version ? `and version '${asset.version}'` : ''} ${
          asset.locale ? `in locale '${asset.locale}'` : ''
        }`,
      ),
    );
  });
}
async function publishEntry(data, _config, queue) {
  const lang = [];
  const entryObj = data.obj;
  const stack = entryObj.stack;
  lang.push(entryObj.locale);
  stack
    .contentType(entryObj.content_type)
    .entry(entryObj.entryUid)
    .publish({
      publishDetails: { environments: entryObj.environments, locales: lang },
      locale: entryObj.locale || 'en-us',
    })
    .then((publishEntryResponse) => {
      if (!publishEntryResponse.error_message) {
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
    .catch((error) => {
      if (error.errorCode === 429 && data.retry < 2) {
        data.retry++;
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

  stack
    .asset(assetobj.assetUid)
    .publish({ publishDetails: { environments: assetobj.environments, locales: [assetobj.locale || 'en-us'] } })
    .then((publishAssetResponse) => {
      if (!publishAssetResponse.error_message) {
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
    .catch((error) => {
      if (error.errorCode === 429 && data.retry < 2) {
        data.retry++;
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
  lang.push(entryObj.locale);
  stack
    .contentType(entryObj.content_type)
    .entry(entryObj.entryUid)
    .unpublish({ publishDetails: { environments: entryObj.environments, locales: lang }, locale: entryObj.locale })
    .then((unpublishEntryResponse) => {
      if (!unpublishEntryResponse.error_message) {
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
    .catch((error) => {
      if (error.errorCode === 429 && data.retry < 2) {
        data.retry++;
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

  stack
    .asset(assetobj.assetUid)
    .unpublish({ publishDetails: { environments: assetobj.environments, locales: [assetobj.locale || 'en-us'] } })
    .then((unpublishAssetResponse) => {
      if (!unpublishAssetResponse.error_message) {
        delete assetobj.stack;
        console.log(`Asset unpublished with Asset uid=${assetobj.assetUid}`);
        addLogs(
          logger,
          { options: assetobj, api_key: stack.stackHeaders.api_key, alias: stack.alias, host: stack.host },
          'info',
        );
      } else {
        throw unpublishAssetResponse;
      }
    })
    .catch((error) => {
      if (error.errorCode === 429 && data.retry < 2) {
        data.retry++;
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

async function performBulkPublish(data, _config, queue) {
  // add validation for user uid
  // if user not logged in, then user uid won't be available and NRP too won't work
  let conf;
  const bulkPublishObj = data.obj;
  const stack = bulkPublishObj.stack;
  let payload = {};
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
      stack
        .bulkOperation()
        .publish(payload)
        .then((bulkPublishEntriesResponse) => {
          if (!bulkPublishEntriesResponse.error_message) {
            const sanitizedData = removePublishDetails(bulkPublishObj.entries);
            console.log(
              chalk.green(`Bulk entries sent for publish`),
              bulkPublishEntriesResponse.job_id ? chalk.yellow(`job_id: ${bulkPublishEntriesResponse.job_id}`) : '',
            );
            displayEntriesDetails(sanitizedData);
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
        .catch((error) => {
          if (error.errorCode === 429 && data.retry < 2) {
            data.retry++;
            queue.Enqueue(data);
          } else {
            delete bulkPublishObj.stack;
            console.log(chalk.red(`Bulk entries failed to publish with error ${formatError(error)}`));
            let sanitizedData = removePublishDetails(bulkPublishObj.entries);
            displayEntriesDetails(sanitizedData);
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
        } else {
          if (bulkPublishObj.apiVersion !== '3') {
            // because 3 is the default value for api-version, and it exists for the purpose of display only
            console.log(chalk.yellow(nrpApiVersionWarning));
          }
        }
      }
      stack
        .bulkOperation()
        .publish(payload)
        .then((bulkPublishAssetsResponse) => {
          if (!bulkPublishAssetsResponse.error_message) {
            console.log(
              chalk.green(
                `Bulk assets sent for publish`,
                bulkPublishAssetsResponse.job_id ? chalk.yellow(`job_id: ${bulkPublishAssetsResponse.job_id}`) : '',
              ),
            );
            let sanitizedData = removePublishDetails(bulkPublishObj.assets);
            displayAssetsDetails(sanitizedData);
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
        .catch((error) => {
          if (error.errorCode === 429 && data.retry < 2) {
            data.retry++;
            queue.Enqueue(data);
          } else {
            delete bulkPublishObj.stack;
            console.log(chalk.red(`Bulk assets failed to publish with error ${formatError(error)}`));

            let sanitizedData = removePublishDetails(bulkPublishObj.assets);
            displayAssetsDetails(sanitizedData);
            addLogs(
              logger,
              { options: bulkPublishObj, api_key: stack.stackHeaders.api_key, alias: stack.alias, host: stack.host },
              'error',
            );
          }
        });
      break;
    default:
      console.log('No such type');
  }
}

async function performBulkUnPublish(data, _config, queue) {
  let conf;
  const bulkUnPublishObj = data.obj;
  const stack = bulkUnPublishObj.stack;
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
      stack
        .bulkOperation()
        .unpublish(payload)
        .then((bulkUnPublishEntriesResponse) => {
          if (!bulkUnPublishEntriesResponse.error_message) {
            delete bulkUnPublishObj.stack;

            console.log(
              chalk.green(
                `Bulk entries sent for Unpublish`,
                bulkUnPublishEntriesResponse.job_id
                  ? chalk.yellow(`job_id: ${bulkUnPublishEntriesResponse.job_id}`)
                  : '',
              ),
            );
            let sanitizedData = removePublishDetails(bulkUnPublishObj.entries);
            displayEntriesDetails(sanitizedData);
            addLogs(
              logger,
              { options: bulkUnPublishObj, api_key: stack.stackHeaders.api_key, alias: stack.alias, host: stack.host },
              'info',
            );
          } else {
            throw bulkUnPublishEntriesResponse;
          }
        })
        .catch((error) => {
          if (error.errorCode === 429 && data.retry < 2) {
            data.retry++;
            queue.Enqueue(data);
          } else {
            delete bulkUnPublishObj.stack;
            console.log(chalk.red(`Bulk entries failed to Unpublish with error ${formatError(error)}`));
            let sanitizedData = removePublishDetails(bulkUnPublishObj.entries);
            displayEntriesDetails(sanitizedData);
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
      stack
        .bulkOperation()
        .unpublish(payload)
        .then((bulkUnPublishAssetsResponse) => {
          if (!bulkUnPublishAssetsResponse.error_message) {
            delete bulkUnPublishObj.stack;
            let sanitizedData = removePublishDetails(bulkUnPublishObj.assets);
            console.log(
              chalk.green(
                `Bulk assets sent for Unpublish`,
                bulkUnPublishAssetsResponse.job_id ? chalk.yellow(`job_id: ${bulkUnPublishAssetsResponse.job_id}`) : '',
              ),
            );
            displayAssetsDetails(sanitizedData);
            addLogs(
              logger,
              { options: bulkUnPublishObj, api_key: stack.stackHeaders.api_key, alias: stack.alias, host: stack.host },
              'info',
            );
          } else {
            throw bulkUnPublishAssetsResponse;
          }
        })
        .catch((error) => {
          if (error.errorCode === 429 && data.retry < 2) {
            data.retry++;
            queue.Enqueue(data);
          } else {
            delete bulkUnPublishObj.stack;
            console.log(chalk.red(`Bulk assets failed to Unpublish with error ${formatError(error)}`));
            let sanitizedData = removePublishDetails(bulkUnPublishObj.assets);
            displayAssetsDetails(sanitizedData);
            addLogs(
              logger,
              { options: bulkUnPublishObj, api_key: stack.stackHeaders.api_key, alias: stack.alias, host: stack.host },
              'error',
            );
          }
        });
      break;
    default:
      console.log('No such type');
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
        stack
          .contentType(entry.content_type)
          .entry(entry.uid)
          .publish(conf)
          .then((publishEntriesResponse) => {
            if (!publishEntriesResponse.error_message) {
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
          .catch((error) => {
            if (error.errorCode === 429 && data.retry < 2) {
              data.retry++;
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
        stack
          .asset(asset.uid)
          .publish(conf)
          .then((publishAssetsResponse) => {
            if (!publishAssetsResponse.error_message) {
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
          .catch((error) => {
            if (error.errorCode === 429 && data.retry < 2) {
              data.retry++;
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
