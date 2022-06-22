import Axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { HttpResponse } from './http-response';

export class HttpClient {
  /**
   * The request configuration.
   */
  private request: AxiosRequestConfig;

  /**
   * The request configuration.
   */
  private readonly axiosInstance: AxiosInstance;

  /**
   * The payload format for a JSON or form-url-encoded request.
   */
  private bodyFormat: BodyFormat = 'json';

  /**
   * Createa new pending HTTP request instance.
   */
  constructor() {
    this.request = {};
    this.axiosInstance = Axios.create();

    // Sets payload format as json by default
    this.asJson();
  }

  /**
   * Create a reusable HttpClient instance.
   *
   * @returns {HttpClient}
   */
  static create(): HttpClient {
    return new this();
  }

  /**
   * Returns the Axios request config.
   *
   * @returns {AxiosRequestConfig}
   */
  requestConfig(): AxiosRequestConfig {
    return this.request;
  }

  /**
   * Resets the request config.
   *
   * @returns {AxiosRequestConfig}
   */
  resetConfig(): HttpClient {
    this.request = {};
    return this;
  }

  /**
   * Use the given `baseUrl` for all requests.
   *
   * @param {String} baseUrl
   *
   * @returns {HttpClient}
   */
  baseUrl(baseUrl: string): HttpClient {
    if (typeof baseUrl !== 'string') {
      throw new Error(`The base URL must be a string. Received "${typeof baseUrl}"`);
    }

    this.request.baseURL = baseUrl;

    return this;
  }

  /**
   * Add request headers.
   * @returns {HttpClient}
   */
  headers(headers: any): HttpClient {
    this.request.headers = { ...this.request.headers, ...headers };

    return this;
  }

  /**
   * Add query parameters to the request.
   *
   * @param {Object} queryParams
   *
   * @returns {HttpClient}
   */
  queryParams(queryParams: object): HttpClient {
    this.request.params = { ...this.request.params, ...queryParams };

    return this;
  }

  /**
   * Add basic authentication via `username` and `password` to the request.
   *
   * @param {String} username
   * @param {String} password
   *
   * @returns {HttpClient}
   */
  basicAuth(username: string, password: string): HttpClient {
    this.request.auth = { username, password };

    return this;
  }

  /**
   * Add an authorization `token` to the request.
   *
   * @param {String} token
   * @param {String} type
   *
   * @returns {HttpClient}
   */
  token(token: string, type: string = 'Bearer'): HttpClient {
    return this.headers({
      Authorization: `${type} ${token}`.trim(),
    });
  }

  /**
   * Merge your own custom Axios options into the request.
   *
   * @param {Object} options
   *
   * @returns {HttpClient}
   */
  options(options: AxiosRequestConfig = {}): HttpClient {
    Object.assign(this.request, options);

    return this;
  }

  /**
   * Add a request payload.
   *
   * @param {*} data
   *
   * @returns {HttpClient}
   */
  payload(data: any): HttpClient {
    this.request.data = data;

    return this;
  }

  /**
   * Define the request `timeout` in milliseconds.
   *
   * @param {Number} timeout
   *
   * @returns {HttpClient}
   */
  timeout(timeout: number): HttpClient {
    this.request.timeout = timeout;

    return this;
  }

  /**
   * Tell HttpClient to send the request as JSON payload.
   *
   * @returns {HttpClient}
   */
  asJson(): HttpClient {
    return this.payloadFormat('json').contentType('application/json');
  }

  /**
   * Tell HttpClient to send the request as form parameters,
   * encoded as URL query parameters.
   *
   * @returns {HttpClient}
   */
  asFormParams(): HttpClient {
    return this.payloadFormat('formParams').contentType('application/x-www-form-urlencoded');
  }

  /**
   * Set the request payload format.
   *
   * @param {String} format
   *
   * @returns {HttpClient}
   */
  payloadFormat(format: BodyFormat): HttpClient {
    this.bodyFormat = format;

    return this;
  }

  /**
   * Set the `Accept` request header. This indicates what
   * content type the server should return.
   *
   * @param {String} accept
   *
   * @returns {HttpClient}
   */
  accept(accept: string): HttpClient {
    return this.headers({ Accept: accept });
  }

  /**
   * Set the `Accept` request header to JSON. This indicates
   * that the server should return JSON data.
   *
   * @param {String} accept
   *
   * @returns {HttpClient}
   */
  acceptJson(): HttpClient {
    return this.accept('application/json');
  }

  /**
   * Set the `Content-Type` request header.
   *
   * @param {String} contentType
   *
   * @returns {HttpClient}
   */
  contentType(contentType: string): HttpClient {
    return this.headers({ 'Content-Type': contentType });
  }

  /**
   * Send an HTTP GET request, optionally with the given `queryParams`.
   *
   * @param {String} url
   * @param {Object} queryParams
   *
   * @returns {HttpResponse}
   *
   * @throws
   */
  async get<R>(url: string, queryParams: object = {}): Promise<HttpResponse<R>> {
    this.queryParams(queryParams);

    return this.send<R>('GET', url);
  }

  /**
   * Send an HTTP POST request, optionally with the given `payload`.
   *
   * @param {String} url
   * @param {Object} payload
   *
   * @returns {HttpResponse}
   *
   * @throws
   */
  async post<R>(url: string, payload?: any): Promise<HttpResponse<R>> {
    if (payload) {
      this.payload(payload);
    }

    return this.send<R>('POST', url);
  }

  /**
   * Send an HTTP PUT request, optionally with the given `payload`.
   *
   * @param {String} url
   * @param {Object} payload
   *
   * @returns {HttpResponse}
   *
   * @throws
   */
  async put<R>(url: string, payload?: any): Promise<HttpResponse<R>> {
    if (payload) {
      this.payload(payload);
    }

    return this.send<R>('PUT', url);
  }

  /**
   * Send an HTTP PATCH request, optionally with the given `payload`.
   *
   * @param {String} url
   * @param {Object} payload
   *
   * @returns {HttpResponse}
   *
   * @throws
   */
  async patch<R>(url: string, payload?: any): Promise<HttpResponse<R>> {
    if (payload) {
      this.payload(payload);
    }

    return this.send<R>('PATCH', url);
  }

  /**
   * Send an HTTP DELETE request, optionally with the given `queryParams`.
   *
   * @param {String} url
   * @param {Object} queryParams
   *
   * @returns {HttpResponse}
   *
   * @throws
   */
  async delete<R>(url: string, queryParams: object = {}): Promise<HttpResponse<R>> {
    this.queryParams(queryParams);

    return this.send<R>('DELETE', url);
  }

  /**
   * Send the HTTP request.
   *
   * @param {String} method
   * @param {String} url
   *
   * @returns {HttpResponse}
   *
   * @throws
   */
  async send<R>(method: HttpMethod, url: string): Promise<HttpResponse<R>> {
    try {
      return new HttpResponse<R>(await this.createAndSendRequest(method, url));
    } catch (error: any) {
      if (error.response) {
        return new HttpResponse(error.response);
      }

      throw error;
    }
  }

  /**
   * Create and send the HTTP request.
   *
   * @param {String} method
   * @param {String} url
   *
   * @returns {Request}
   */
  async createAndSendRequest(method: HttpMethod, url: string): Promise<AxiosResponse> {
    return await this.axiosInstance({
      url,
      method,
      withCredentials: true,
      ...this.request,
      data: this.prepareRequestPayload(),
    });
  }

  /**
   * Returns the request payload depending on the selected request payload format.
   */
  prepareRequestPayload(): any {
    return this.bodyFormat === 'formParams' ? new URLSearchParams(this.request.data).toString() : this.request.data;
  }
}

type BodyFormat = 'json' | 'formParams';

type HttpMethod = 'GET' | 'HEAD' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS';
