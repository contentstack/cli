import { BaseClientDecorator } from './base-client-decorator';
import { HttpClient } from './client';
import { IHttpClient } from './client-interface';
import { HttpResponse } from './http-response';

export class HttpClientDecorator extends BaseClientDecorator {
  protected client: IHttpClient;
  constructor(client: IHttpClient) {
    super(client);
    this.client = client;
  }
  public headers(headers: any): HttpClient {
    return this.client.headers({
      authtoken: headers.auth_token,
      organization_uid: headers.org_uid,
    });
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