import axios, { AxiosRequestConfig } from 'axios';

interface RequestConfig extends AxiosRequestConfig {
  url: string;
}

/**
 * http client for contentstack plugins
 * @param {RequestConfig} options for the request
 */

export const call = async function (options: RequestConfig): Promise<any> {
  return axios(options);
};
