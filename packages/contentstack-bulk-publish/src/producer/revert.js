/* eslint-disable node/no-extraneous-require */
/* eslint-disable no-await-in-loop */
/* eslint-disable require-atomic-updates */
/* eslint-disable no-console */
/* eslint-disable new-cap */
/* eslint-disable camelcase */
const chalk = require('chalk');
const { getAllLogs } = require('../util/logger');
const { getQueue } = require('../util/queue');
const { validateFile } = require('../util/fs');
const { configHandler } = require('@contentstack/cli-utilities');
let config = configHandler
const { initializeLogger, performBulkUnPublish, publishUsingVersion } = require('../consumer/publish');
const getStack = require('../util/client.js').getStack;

const intervalBetweenPublishRequests = 3; // interval in seconds

const unpublishQueue = getQueue();
const publishQueue = getQueue();

const revertLogFileName = 'revert';

function setConfig(conf) {
  config = conf;
  unpublishQueue.config = conf;
  publishQueue.config = conf;
  unpublishQueue.consumer = performBulkUnPublish;
  publishQueue.consumer = publishUsingVersion;
}

function getLogFileDataType(data) {
  const element = data[0];
  if (element.message.options.Type) {
    return element.message.options.Type;
  }
  if (element.message.options.entryUid) {
    return 'entry';
  }
  return 'asset';
}

async function getEnvironmentUids(stack, environments) {
  return new Promise((resolve, reject) => {
    stack
      .environment()
      .query()
      .find()
      .then((allEnvironments) => {
        const filteredEnvironments = allEnvironments.items
          .filter((environment) => environments.indexOf(environment.name) !== -1)
          .map(({ name, uid }) => ({ name, uid }));
        resolve(filteredEnvironments);
      })
      .catch((error) => reject(error));
  });
}

function filterPublishDetails(elements, environments, locale) {
  if (locale && locale.length > 0) {
    locale.forEach((loc) => {
      elements[loc].forEach((entry) => {
        if (entry.publish_details.length > 0) {
          entry.publish_details = entry.publish_details.filter(
            (element) => environments.indexOf(element.environment) !== -1 && element.locale === loc,
          );
        }
      });
    });
  } else {
    for (let i = 0; i < elements.length; i += 1) {
      if (elements[i].publish_details.length > 0) {
        elements[i].publish_details = elements[i].publish_details.filter(
          (element) => environments.indexOf(element.environment) !== -1,
        );
      }
    }
  }
  return elements;
}

async function formatLogData(stack, data) {
  const formattedLogs = {};
  const type = getLogFileDataType(data);

  switch (type) {
    case 'entry':
      formattedLogs.entries = {};
      formattedLogs.locale = [];
      for (let i = 0; i < data.length; i += 1) {
        if (formattedLogs.locale.indexOf(data[i].message.options.locale) === -1) {
          formattedLogs.locale.push(data[i].message.options.locale);
        }
        if (!formattedLogs.entries[data[i].message.options.locale])
          formattedLogs.entries[data[i].message.options.locale] = [];
        if (data[i].message.options.entries) {
          // for handling bulk-publish-entries logs
          formattedLogs.entries[data[i].message.options.locale] = formattedLogs.entries[
            data[i].message.options.locale
          ].concat(data[i].message.options.entries);
        } else {
          // for handling logs created by publishing in a regular way
          formattedLogs.entries[data[i].message.options.locale].push({
            uid: data[i].message.options.entryUid,
            content_type: data[i].message.options.content_type,
            locale: data[i].message.options.locale,
            publish_details: data[i].message.options.publish_details,
          });
        }
        if (!formattedLogs.environments) formattedLogs.environments = data[i].message.options.environments;
        if (!formattedLogs.api_key) formattedLogs.api_key = data[i].message.api_key;
      }
      break;
    case 'asset':
      formattedLogs.assets = [];
      for (let i = 0; i < data.length; i += 1) {
        if (data[i].message.options.assets) {
          // for handling bulk-publish-assets logs
          formattedLogs.assets = formattedLogs.assets.concat(data[i].message.options.assets);
        } else {
          // for handling logs created by publishing assets in a regular way
          formattedLogs.assets.push({
            uid: data[i].message.options.assetUid,
            publish_details: data[i].message.options.publish_details,
          });
        }
        if (!formattedLogs.environments) formattedLogs.environments = data[i].message.options.environments;
        if (!formattedLogs.api_key) formattedLogs.api_key = data[i].message.api_key;
      }
      break;
    default:
      break;
  }

  formattedLogs.environments = await getEnvironmentUids(stack, formattedLogs.environments);
  formattedLogs.type = type;
  if (type === 'entry') {
    formattedLogs.entries = filterPublishDetails(
      formattedLogs.entries,
      formattedLogs.environments.map(({ uid }) => uid),
      formattedLogs.locale,
    );
  } else {
    formattedLogs.assets = filterPublishDetails(
      formattedLogs.assets,
      formattedLogs.environments.map(({ uid }) => uid),
    );
  }

  return formattedLogs;
}

async function mapSeries(iterable, action) {
  for (let x of iterable) {
    await action(x);
  }
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function processPublishRequests(data) {
  return sleep(intervalBetweenPublishRequests * 1000).then(() => {
    publishQueue.Enqueue(data);
  });
}

async function revertUsingLogs(logFileName) {
  let bulkUnpublishSet = [];
  const setOfBulkPublishRequestPayloads = [];
  let bulkPublishSet = [];

  if (validateFile(logFileName)) {
    const response = await getAllLogs(logFileName);
    let logs;

    if (response.file.length > 0) {
      initializeLogger(revertLogFileName);
      const stack = await getStack({
        apikey: response.file[0].message.api_key,
        alias: response.file[0].message.alias,
        host: response.file[0].message.host,
        branch: response.file[0].message.branch || 'main'
      });
      logs = await formatLogData(stack, response.file);

      logs.environments.forEach((environment, envIndex) => {
        switch (logs.type) {
          case 'entry':
            logs.locale.forEach((loc, locIndex) => {
              logs.entries[loc].forEach(({ publish_details, uid, locale, content_type }, entryIndex) => {
                const publishDetailsForThisEnvironment = publish_details.filter(
                  (publishDetail) => publishDetail.environment === environment.uid,
                );

                if (publishDetailsForThisEnvironment.length > 0) {
                  // handle revert case

                  publishDetailsForThisEnvironment.forEach((publishDetail) => {
                    if (bulkPublishSet.length < 10) {
                      bulkPublishSet.push({
                        uid,
                        version: publishDetail.version,
                        locale,
                        content_type,
                        publish_details: [publishDetail],
                      });
                    }

                    if (bulkPublishSet.length === 10) {
                      const data = {
                        entries: bulkPublishSet,
                        environments: [environment.name],
                        locale: loc,
                        Type: 'entry',
                        stack: stack,
                      };
                      setOfBulkPublishRequestPayloads.push(data);
                      bulkPublishSet = [];
                    }
                  });
                } else {
                  if (bulkUnpublishSet.length < 10) {
                    bulkUnpublishSet.push({
                      uid,
                      locale,
                      content_type,
                      publish_details: [],
                    });
                  }

                  if (bulkUnpublishSet.length === 10) {
                    unpublishQueue.Enqueue({
                      entries: bulkUnpublishSet,
                      environments: [environment.name],
                      locale: loc,
                      Type: 'entry',
                      stack: stack,
                    });
                    bulkUnpublishSet = [];
                  }
                }

                if (entryIndex === logs.entries[loc].length - 1) {
                  if (bulkUnpublishSet.length <= 10 && bulkUnpublishSet.length !== 0) {
                    unpublishQueue.Enqueue({
                      entries: bulkUnpublishSet,
                      environments: [environment.name],
                      locale: loc,
                      Type: 'entry',
                      stack: stack,
                    });
                    bulkUnpublishSet = [];
                  }

                  if (bulkPublishSet.length <= 10 && bulkPublishSet.length !== 0) {
                    const data = {
                      entries: bulkPublishSet,
                      environments: [environment.name],
                      locale: loc,
                      Type: 'entry',
                      stack: stack,
                    };
                    setOfBulkPublishRequestPayloads.push(data);
                    bulkPublishSet = [];
                  }
                }

                if (
                  envIndex === logs.environments.length - 1 &&
                  locIndex === logs.locale.length - 1 &&
                  entryIndex === logs.entries[loc].length - 1
                ) {
                  mapSeries(setOfBulkPublishRequestPayloads, processPublishRequests);
                }
              });
            });
            break;
          case 'asset':
            logs.assets.forEach(({ publish_details, uid }, assetIndex) => {
              const publishDetailsForThisEnvironment = publish_details.filter(
                (publishDetail) => publishDetail.environment === environment.uid,
              );

              if (publishDetailsForThisEnvironment.length > 0) {
                // handle revert case

                publishDetailsForThisEnvironment.forEach((publishDetail) => {
                  if (bulkPublishSet.length < 10) {
                    bulkPublishSet.push({
                      uid,
                      version: publishDetail.version,
                      publish_details: [publishDetail],
                    });
                  }

                  if (bulkPublishSet.length === 10) {
                    const data = {
                      assets: bulkPublishSet,
                      environments: [environment.name],
                      locale: 'en-us',
                      Type: 'asset',
                      stack: stack,
                    };
                    setOfBulkPublishRequestPayloads.push(data);
                    bulkPublishSet = [];
                  }
                });
              } else {
                if (bulkUnpublishSet.length < 10) {
                  bulkUnpublishSet.push({
                    uid,
                    publish_details: [],
                  });
                }

                if (bulkUnpublishSet.length === 10) {
                  unpublishQueue.Enqueue({
                    assets: bulkUnpublishSet,
                    environments: [environment.name],
                    Type: 'asset',
                    stack: stack,
                  });
                  bulkUnpublishSet = [];
                }
              }

              if (assetIndex === logs.assets.length - 1) {
                if (bulkUnpublishSet.length <= 10 && bulkUnpublishSet.length !== 0) {
                  unpublishQueue.Enqueue({
                    assets: bulkUnpublishSet,
                    environments: [environment.name],
                    Type: 'asset',
                    stack: stack,
                  });
                  bulkUnpublishSet = [];
                }

                if (bulkPublishSet.length <= 10 && bulkPublishSet.length !== 0) {
                  const data = {
                    assets: bulkPublishSet,
                    environments: [environment.name],
                    locale: 'en-us',
                    Type: 'asset',
                    stack: stack,
                  };
                  setOfBulkPublishRequestPayloads.push(data);
                  bulkPublishSet = [];
                }
              }

              if (envIndex === logs.environments.length - 1 && assetIndex === logs.assets.length - 1) {
                mapSeries(setOfBulkPublishRequestPayloads, processPublishRequests);
              }
            });
            break;
          default:
            break;
        }
      });
    } else {
      console.log(chalk.red('Error: This log file is empty. Please check error logs if any'));
    }
  }
}

async function start({ retryFailed, logFile }, cfg) {
  setConfig(cfg);
  if (retryFailed) {
    if (typeof retryFailed === 'string') {
      if (!validateFile(retryFailed, ['revert'])) {
        return false;
      }

      revertUsingLogs(retryFailed);
    }
  } else {
    revertUsingLogs(logFile);
  }
}

module.exports = {
  setConfig,
  revertUsingLogs,
  start,
};
