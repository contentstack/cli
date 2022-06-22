import { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { HttpResponse } from '../src/http-client';

type BodyFormat = 'json' | 'formParams';

type HttpMethod = 'GET' | 'HEAD' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS';

/**
 * CLI HttpClient
 */
export declare class HttpClient {
  private request: AxiosRequestConfig;
  private readonly axiosInstance: AxiosInstance;
  constructor();
  static create(): HttpClient;
  requestConfig(): AxiosRequestConfig;
  resetConfig(): HttpClient;
  baseUrl(baseUrl: string): HttpClient;
  headers(headers: any): HttpClient;
  queryParams(queryParams: object): HttpClient;
  basicAuth(username: string, password: string): HttpClient;
  token(token: string, type: string): HttpClient;
  options(options: AxiosRequestConfig): HttpClient;
  payload(data: any): HttpClient;
  timeout(timeout: number): this;
  asJson(): HttpClient;
  asFormParams(): HttpClient;
  payloadFormat(format: BodyFormat): HttpClient;
  accept(accept: string): HttpClient;
  acceptJson(): HttpClient;
  contentType(contentType: string): HttpClient;
  get<R>(url: string, queryParams?: object): Promise<HttpResponse<R>>;
  post<R>(url: string, payload?: any): Promise<HttpResponse<R>>;
  put<R>(url: string, payload?: any): Promise<HttpResponse<R>>;
  patch<R>(url: string, payload?: any): Promise<HttpResponse<R>>;
  delete<R>(url: string, queryParams?: object): Promise<HttpResponse<R>>;
  send<R>(method: HttpMethod, url: string): Promise<HttpResponse<R>>;
  createAndSendRequest(method: HttpMethod, url: string): Promise<AxiosResponse>;
  prepareRequestPayload(): any;
}

/**
 * CLI HttpClient
 */
export declare class HttpResponse {
  private readonly response: AxiosResponse;
  constructor();
  get status(): number;
  get data();
  get payload();
  get headers();
}

export interface HttpRequestConfig extends AxiosRequestConfig {}
