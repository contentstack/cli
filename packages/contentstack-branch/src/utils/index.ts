/**
 * Command specific utilities can be written here
 */
import fs from 'fs';
import path from 'path';
import { configHandler, HttpClient } from '@contentstack/cli-utilities';

export const getbranchesList = (branchResult, baseBranch: string) => {
  const branches: Record<string, unknown>[] = [];

  branchResult.map((item) => {
    branches.push({
      Branch: item.uid,
      Source: item.source,
      Aliases: item.alias,
      Created: new Date(item.created_at).toLocaleDateString(),
      Updated: new Date(item.updated_at).toLocaleDateString(),
    });
  });

  const currentBranch = branches.filter((branch) => branch.Branch === baseBranch);
  const otherBranches = branches.filter((branch) => branch.Branch !== baseBranch);

  return { currentBranch, otherBranches, branches };
};

export const getbranchConfig = (stackApiKey: string) => {
  return configHandler.get(`baseBranch.${stackApiKey}`);
};

export const refreshbranchConfig = async (apiKey, branchUid) => {
  const branchConfig = configHandler.get(`baseBranch.${apiKey}`);
  if (branchConfig === branchUid) {
    await configHandler.set(`baseBranch.${apiKey}`, 'main');
  }
};

export const writeFile = (filePath, data) => {
  return new Promise((resolve, reject) => {
    data = typeof data === 'object' ? JSON.stringify(data, null, 2) : data || '{}';
    fs.writeFile(path.resolve(filePath), data, (error) => {
      if (error) {
        return reject(error);
      }
      resolve('done');
    });
  });
};

export const apiGetRequest = async (payload): Promise<any> => {
  const authToken = configHandler.get('authtoken');
  const headers = {
    authtoken: authToken,
    api_key: payload.apiKey,
    'Content-Type': 'application/json',
  };
  const response = await new HttpClient()
    .headers(headers)
    .queryParams(payload.params)
    .get(payload.url)
    .then(({ data }) => data);
  return response;
};

export const apiPostRequest = async (payload): Promise<any> => {
  const authToken = configHandler.get('authtoken');
  const headers = {
    authtoken: authToken,
    api_key: payload.apiKey,
    'Content-Type': 'application/json',
  };
  const response = await new HttpClient()
    .headers(headers)
    .queryParams(payload.params)
    .post(payload.url, {})
    .then(({ data }) => data);
  return response;
};

export * from './interactive';
export * from './merge-helper';
export * as interactive from './interactive';
export * as branchDiffUtility from './branch-diff-utility';
