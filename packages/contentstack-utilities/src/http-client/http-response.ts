'use strict';

import { AxiosResponse, AxiosResponseHeaders, RawAxiosResponseHeaders } from 'axios';

export class HttpResponse<ResponseType = any> {
  /**
   * The Axios response object.
   */
  private readonly response: AxiosResponse;

  /**
   * Wrap the given Axios `response` into a new response instance.
   *
   * @param {AxiosResponse} response
   */
  constructor(response: AxiosResponse) {
    this.response = response;
  }

  /**
   * Returns the response status.
   *
   * @returns {Number}
   */
  get status() {
    return this.response.status;
  }

  /**
   * Returns the response payload. This method is an alias for `response.payload()`.
   *
   * @returns {*}
   */
  get data() {
    return this.payload;
  }

  /**
   * Returns the response payload.
   *
   * @returns {*}
   */
  get payload() {
    return this.response.data;
  }

  /**
   * Returns the response headers.
   *
   * @returns {Object}
   */
  get headers(): RawAxiosResponseHeaders | AxiosResponseHeaders {
    return this.response.headers;
  }
}
