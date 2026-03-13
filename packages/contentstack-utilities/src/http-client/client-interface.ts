import { HttpClient } from './client';
import { HttpResponse } from './http-response';

export interface IHttpClient {
  headers(headers: Record<string, string>): HttpClient;
  contentType(contentType: string): HttpClient;
  get<R>(url: string, queryParams: object): Promise<HttpResponse<R>>;
  post<R>(url: string, payload?: unknown): Promise<HttpResponse<R>>;
  put<R>(url: string, payload?: unknown): Promise<HttpResponse<R>>;
  delete<R>(url: string, queryParams: object): Promise<HttpResponse<R>>;
}