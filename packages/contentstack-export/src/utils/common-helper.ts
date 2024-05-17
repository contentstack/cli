/*!
 * Contentstack Export
 * Copyright (c) 2024 Contentstack LLC
 * MIT Licensed
 */

import promiseLimit from 'promise-limit';
import * as path from 'path';
import { isAuthenticated } from '@contentstack/cli-utilities';
import { ExternalConfig, ExportConfig } from '../types';
import { fsUtil } from './file-helper';
import { sanitizePath } from '@contentstack/cli-utilities';

export const validateConfig = function (config: ExternalConfig) {
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
    !isAuthenticated()
  ) {
    throw new Error('Kindly provide management_token or email and password');
  } else if (
    config.email &&
    config.password &&
    !config.access_token &&
    config.source_stack &&
    !config.management_token &&
    !isAuthenticated()
  ) {
    throw new Error('Kindly provide access_token or management_token');
  } else if (!config.email && !config.password && config.preserveStackVersion) {
    throw new Error('Kindly provide Email and password for stack details');
  }
};

export const formatError = function (error: any) {
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

export const executeTask = function (
  tasks: unknown[] = [],
  handler: (task: unknown) => Promise<unknown>,
  options: { concurrency: number },
) {
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

// Note: we can add more useful details in meta file
export const writeExportMetaFile = (exportConfig: ExportConfig, metaFilePath?: string) => {
  const exportMeta = {
    contentVersion: exportConfig.contentVersion,
    logsPath: path.join(sanitizePath(exportConfig.exportDir), 'logs', 'export'),
  };
  fsUtil.writeFile(path.join(sanitizePath(metaFilePath || exportConfig.exportDir), 'export-info.json'), exportMeta);
};
