/*!
 * Contentstack Export
 * Copyright (c) 2019 Contentstack LLC
 * MIT Licensed
 */

import promiseLimit from 'promise-limit';

export const validateConfig = function (config) {
  if (!config.host || !config.cdn) {
    throw new Error('Host/CDN end point is missing from config');
  }

  if (config.email && config.password && !config.access_token && !config.source_stack) {
    throw new Error('Kindly provide access_token or api_token');
  } else if (
    !config.email &&
    !config.password &&
    !config.management_token &&
    config.source_stack &&
    !config.access_token &&
    !config.auth_token
  ) {
    throw new Error('Kindly provide management_token or email and password');
  } else if (
    config.email &&
    config.password &&
    !config.access_token &&
    config.source_stack &&
    !config.management_token &&
    !config.auth_token
  ) {
    throw new Error('Kindly provide access_token or management_token');
  } else if (!config.email && !config.password && config.preserveStackVersion) {
    throw new Error('Kindly provide Email and password for stack details');
  }
};

export const formatError = function (error) {
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

export const executeTask = function (tasks = [], handler, options) {
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
