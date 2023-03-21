import { HttpClient } from './client';
import { IHttpClient } from './client-interface';
import { HttpResponse } from './http-response';

export class BaseClientDecorator implements IHttpClient {
  protected client: IHttpClient;
  constructor(client: IHttpClient) {
    this.client = client;
  }
  public headers(headers: any): HttpClient {
    return this.client.headers(headers);
  }
  public contentType(contentType: string): HttpClient {
    return this.client.contentType(contentType);
  }
  public get<R>(url: string, queryParams: object = {}): Promise<HttpResponse<R>> {
    return this.client.get(url, queryParams);
  }
  public post<R>(url: string, payload?: any): Promise<HttpResponse<R>> {
    return this.client.post(url, payload);
  }
  public put<R>(url: string, payload?: any): Promise<HttpResponse<R>> {
    return this.client.put(url, payload);
  }
  public delete<R>(url: string, queryParams: object = {}): Promise<HttpResponse<R>> {
    return this.client.delete(url, queryParams);
  }
}