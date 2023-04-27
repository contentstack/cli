import { AxiosRequestConfig, AxiosResponse } from 'axios';
import { IHttpClient } from './client-interface';
import { HttpResponse } from './http-response';
export declare class HttpClient implements IHttpClient {
    /**
     * The request configuration.
     */
    private request;
    /**
     * The request configuration.
     */
    private readonly axiosInstance;
    /**
     * The payload format for a JSON or form-url-encoded request.
     */
    private bodyFormat;
    /**
     * Createa new pending HTTP request instance.
     */
    constructor(request?: AxiosRequestConfig);
    /**
     * Create a reusable HttpClient instance.
     *
     * @returns {HttpClient}
     */
    static create(request?: AxiosRequestConfig): HttpClient;
    /**
     * Returns the Axios request config.
     *
     * @returns {AxiosRequestConfig}
     */
    requestConfig(): AxiosRequestConfig;
    /**
     * Resets the request config.
     *
     * @returns {AxiosRequestConfig}
     */
    resetConfig(): HttpClient;
    /**
     * Use the given `baseUrl` for all requests.
     *
     * @param {String} baseUrl
     *
     * @returns {HttpClient}
     */
    baseUrl(baseUrl: string): HttpClient;
    /**
     * Add request headers.
     * @returns {HttpClient}
     */
    headers(headers: any): HttpClient;
    /**
     * Add query parameters to the request.
     *
     * @param {Object} queryParams
     *
     * @returns {HttpClient}
     */
    queryParams(queryParams: object): HttpClient;
    /**
     * Add basic authentication via `username` and `password` to the request.
     *
     * @param {String} username
     * @param {String} password
     *
     * @returns {HttpClient}
     */
    basicAuth(username: string, password: string): HttpClient;
    /**
     * Add an authorization `token` to the request.
     *
     * @param {String} token
     * @param {String} type
     *
     * @returns {HttpClient}
     */
    token(token: string, type?: string): HttpClient;
    /**
     * Merge your own custom Axios options into the request.
     *
     * @param {Object} options
     *
     * @returns {HttpClient}
     */
    options(options?: AxiosRequestConfig): HttpClient;
    /**
     * Add a request payload.
     *
     * @param {*} data
     *
     * @returns {HttpClient}
     */
    payload(data: any): HttpClient;
    /**
     * Define the request `timeout` in milliseconds.
     *
     * @param {Number} timeout
     *
     * @returns {HttpClient}
     */
    timeout(timeout: number): HttpClient;
    /**
     * Tell HttpClient to send the request as JSON payload.
     *
     * @returns {HttpClient}
     */
    asJson(): HttpClient;
    /**
     * Tell HttpClient to send the request as form parameters,
     * encoded as URL query parameters.
     *
     * @returns {HttpClient}
     */
    asFormParams(): HttpClient;
    /**
     * Set the request payload format.
     *
     * @param {String} format
     *
     * @returns {HttpClient}
     */
    payloadFormat(format: BodyFormat): HttpClient;
    /**
     * Set the `Accept` request header. This indicates what
     * content type the server should return.
     *
     * @param {String} accept
     *
     * @returns {HttpClient}
     */
    accept(accept: string): HttpClient;
    /**
     * Set the `Accept` request header to JSON. This indicates
     * that the server should return JSON data.
     *
     * @param {String} accept
     *
     * @returns {HttpClient}
     */
    acceptJson(): HttpClient;
    /**
     * Set the `Content-Type` request header.
     *
     * @param {String} contentType
     *
     * @returns {HttpClient}
     */
    contentType(contentType: string): HttpClient;
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
    get<R>(url: string, queryParams?: object): Promise<HttpResponse<R>>;
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
    post<R>(url: string, payload?: any): Promise<HttpResponse<R>>;
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
    put<R>(url: string, payload?: any): Promise<HttpResponse<R>>;
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
    patch<R>(url: string, payload?: any): Promise<HttpResponse<R>>;
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
    delete<R>(url: string, queryParams?: object): Promise<HttpResponse<R>>;
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
    send<R>(method: HttpMethod, url: string): Promise<HttpResponse<R>>;
    /**
     * Create and send the HTTP request.
     *
     * @param {String} method
     * @param {String} url
     *
     * @returns {Request}
     */
    createAndSendRequest(method: HttpMethod, url: string): Promise<AxiosResponse>;
    /**
     * Returns the request payload depending on the selected request payload format.
     */
    prepareRequestPayload(): any;
    refreshToken(): Promise<{
        authorization: string;
    }>;
}
export interface HttpRequestConfig extends AxiosRequestConfig {
}
type BodyFormat = 'json' | 'formParams';
type HttpMethod = 'GET' | 'HEAD' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS';
export {};
