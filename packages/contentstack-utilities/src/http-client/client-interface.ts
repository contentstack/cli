import { HttpClient } from './client';
import { HttpResponse } from './http-response';

export interface IHttpClient {
  headers(headers: any): HttpClient;
  contentType(contentType: string): HttpClient;
  get<R>(url: string, queryParams: object): Promise<HttpResponse<R>>;
  post<R>(url: string, payload?: any): Promise<HttpResponse<R>>;
  put<R>(url: string, payload?: any): Promise<HttpResponse<R>>;
  delete<R>(url: string, queryParams: object): Promise<HttpResponse<R>>;
}