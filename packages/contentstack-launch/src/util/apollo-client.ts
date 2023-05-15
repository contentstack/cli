import fetch from "cross-fetch";
import merge from 'lodash/merge';
import entries from "lodash/entries";
import isArray from "lodash/isArray";
import includes from "lodash/includes";
import isObject from "lodash/isObject";
import { onError } from "@apollo/client/link/error";
import { RetryLink } from "@apollo/client/link/retry";
import { setContext } from "@apollo/client/link/context";
import {
  from,
  HttpLink,
  Operation,
  ApolloClient,
  InMemoryCache,
} from "@apollo/client/core";
import { cliux as ux, authHandler, configHandler } from '@contentstack/cli-utilities';

import config from '../config';
import { GraphqlApiClientInput } from '../types';

export default class GraphqlApiClient {
  private authType: string;
  private cmaHost: string | undefined;
  private params: GraphqlApiClientInput;
  private client: Promise<ApolloClient<any>>;
  readonly skipErrorCods = [401, 408, 429];

  constructor(params: GraphqlApiClientInput) {
    this.params = params;
    this.cmaHost = params.cmaHost;
    this.authType = configHandler.get("authorisationType");

    this.client = this.createGraphqlApiClient();
  }

  /**
   *
   * @readonly - apollo client instance
   * @type {Promise<ApolloClient<any>>}
   * @memberof GraphqlApiClient
   */
  get apolloClient(): Promise<ApolloClient<any>> {
    return this.client;
  }

  /**
   * @method refreshToken - Refresh the token if the type is OAuth.
   *
   * @param {Operation} operation
   * @return {Promise<boolean>}  {Promise<boolean>}
   * @memberof GraphqlApiClient
   */
  refreshToken(operation: Operation): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      if (this.authType === "BASIC") {
        // NOTE Handle basic auth 401 here
        resolve(false);
        ux.print("Session timed out, please login to proceed", {
          color: "yellow",
        });
        process.exit();
      } else if (this.authType === "OAUTH") {
        authHandler.host = this.cmaHost;
        // NOTE Handle OAuth refresh token
        authHandler
          .compareOAuthExpiry(true)
          .then(() => {
            const oldHeaders = operation.getContext().headers;
            operation.setContext({
              headers: {
                ...oldHeaders,
                authorization: `Bearer ${configHandler.get('oauthAccessToken')}`,
              },
            });
            resolve(true);
          })
          .catch((error: any) => {
            console.log(error);
            resolve(false);
          });
      } else {
        resolve(false);
        ux.print(
          "You do not have the permissions to perform this action, please login to proceed",
          { color: "yellow" }
        );
        process.exit();
      }
    });
  }

  /**
   * @method setContextHook - Set the dynamic context for the apollo client like HTTP Headers etc.,
   *
   * @return {Function} setContext function
   * @memberof GraphqlApiClient
   */
  async setContextHook() {
    const authHeaders: Record<string, undefined | string> = {};

    switch (this.authType) {
      case "BASIC":
        authHeaders.authtoken =
          this.params.headers?.authtoken || configHandler.get("authtoken");
        break;
      case "OAUTH":
        await authHandler.compareOAuthExpiry();
        authHeaders.authorization = `Bearer ${configHandler.get(
          "oauthAccessToken"
        )}`;
        break;
      default:
        if (configHandler.get("authtoken")) {
          authHeaders.authtoken = configHandler.get("authtoken");
        } else {
          ux.print("Session timed out, please login to proceed", {
            color: "yellow",
          });
          process.exit(1);
        }
        break;
    }

    return setContext((_, { headers }) => {
      // NOTE return the headers to the context so httpLink can read them
      return {
        headers: merge(authHeaders, headers),
      };
    });
  }

  /**
   * @method errorHook - Manage error logs hook
   *
   * @return {Function} onError method
   * @memberof GraphqlApiClient
   */
  errorHook() {
    return onError(({ graphQLErrors, networkError }) => {
      if (
        !includes(
          this.skipErrorCods,
          (graphQLErrors as any)?.response?.status ||
            (networkError as any)?.response?.status
        )
      ) {
        if (!isArray(graphQLErrors) && isObject(graphQLErrors)) {
          for (let [location, errors] of entries(graphQLErrors)) {
            for (const error of errors as any) {
              ux.print(`${location} ${error}`, { color: "red" });
            }
          }
        } // else if (isArray(graphQLErrors) && graphQLErrors.length) ux.print(JSON.stringify(graphQLErrors));

        if (networkError) {
          ux.print(`\n[Network error]: ${networkError}\n`, { color: "red" });
        }
      }
    });
  }

  /**
   * @method createRetryLink - Create retry link with proper configurations
   *
   * @return {InstanceType} Apollo RetryLink class instance
   * @memberof GraphqlApiClient
   */
  createRetryLink() {
    return new RetryLink({
      delay: {
        initial: 300, // NOTE The number of milliseconds to wait before attempting the first retry.
        max: Infinity, // NOTE The maximum number of milliseconds that the link should wait for any retry.
        jitter: true, // NOTE Whether delays between attempts should be randomized.
      },
      attempts: {
        max: config.maxRetryCount || 3,
        retryIf: (error, operation) => {
          if (error.response && error.response.status) {
            switch (error.response.status) {
              case 401:
                // NOTE Refresh the token if the type is OAuth.
                return this.refreshToken(operation);
              case 429:
              case 408:
                return true;

              default:
                return false;
            }
          }

          return !!error;
        },
      },
    });
  }

  /**
   * @method createHttpLink - Create http link with basic User Agent and header configurations
   *
   * @return {InstanceType} HttpLink class instance
   * @memberof GraphqlApiClient
   */
  createHttpLink() {
    return new HttpLink({
      fetch,
      uri: this.params.baseUrl,
      headers: this.params.headers,
    });
  }

  /**
   *  @method createGraphqlApiClient - Create apollo client
   *
   * @return {InstanceType} ApolloClient class instance
   * @memberof GraphqlApiClient
   */
  async createGraphqlApiClient() {
    return new ApolloClient({
      cache: new InMemoryCache(),
      link: from([
        await this.setContextHook(),
        this.errorHook(),
        this.createRetryLink(),
        this.createHttpLink(),
      ]),
    });
  }
}
