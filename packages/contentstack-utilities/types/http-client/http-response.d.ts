import { AxiosResponse } from 'axios';
export declare class HttpResponse<ResponseType = any> {
    /**
     * The Axios response object.
     */
    private readonly response;
    /**
     * Wrap the given Axios `response` into a new response instance.
     *
     * @param {AxiosResponse} response
     */
    constructor(response: AxiosResponse);
    /**
     * Returns the response status.
     *
     * @returns {Number}
     */
    get status(): number;
    /**
     * Returns the response payload. This method is an alias for `response.payload()`.
     *
     * @returns {*}
     */
    get data(): any;
    /**
     * Returns the response payload.
     *
     * @returns {*}
     */
    get payload(): any;
    /**
     * Returns the response headers.
     *
     * @returns {Object}
     */
    get headers(): import("axios").AxiosResponseHeaders;
}
