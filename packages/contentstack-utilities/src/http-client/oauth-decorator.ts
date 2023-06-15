import { BaseClientDecorator } from './base-client-decorator';
import { HttpClient } from './client';
import { IHttpClient } from './client-interface';
import { HttpResponse } from './http-response';
import configStore from '../config-handler';
import authHandler from '../auth-handler';

export class OauthDecorator extends BaseClientDecorator {
  protected client: IHttpClient;
  constructor(client: IHttpClient) {
    super(client);
    this.client = client;
  }

  public async preHeadersCheck(config: any) {
    const headers: any = {};
    headers.organization_uid = config.org_uid;
    const authorisationType = configStore.get('authorisationType');
    if (authorisationType === 'BASIC') {
      headers.authtoken = configStore.get('authtoken');
    } else if (authorisationType === 'OAUTH') {
      await authHandler.compareOAuthExpiry();
      headers.authorization = `Bearer ${configStore.get('oauthAccessToken')}`;
    } else {
      headers.authtoken = '';
      headers.authorization = '';
    }
    return headers;
  }

  public headers(headers: any): HttpClient {
    return this.client.headers(headers);
  }
  public contentType(contentType: string): HttpClient {
    return this.client.contentType(contentType);
  }
  public get<R>(url: string, queryParams: object): Promise<HttpResponse<R>> {
    return this.client.get(url, queryParams);
  }
  public post<R>(url: string, payload?: object): Promise<HttpResponse<R>> {
    return this.client.post(url, payload);
  }
  public put<R>(url: string, payload?: object): Promise<HttpResponse<R>> {
    return this.client.put(url, payload);
  }
  public delete<R>(url: string, queryParams?: object): Promise<HttpResponse<R>> {
    return this.client.delete(url, queryParams);
  }
}