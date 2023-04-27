import { RetryLink } from "@apollo/client/link/retry";
import { HttpLink, Operation, ApolloClient } from "@apollo/client/core";
import { GraphqlApiClientInput } from '../types';
export default class GraphqlApiClient {
    private authType;
    private cmaHost;
    private params;
    private client;
    readonly skipErrorCods: number[];
    constructor(params: GraphqlApiClientInput);
    /**
     *
     * @readonly - apollo client instance
     * @type {Promise<ApolloClient<any>>}
     * @memberof GraphqlApiClient
     */
    get apolloClient(): Promise<ApolloClient<any>>;
    /**
     * @method refreshToken - Refresh the token if the type is OAuth.
     *
     * @param {Operation} operation
     * @return {Promise<boolean>}  {Promise<boolean>}
     * @memberof GraphqlApiClient
     */
    refreshToken(operation: Operation): Promise<boolean>;
    /**
     * @method setContextHook - Set the dynamic context for the apollo client like HTTP Headers etc.,
     *
     * @return {Function} setContext function
     * @memberof GraphqlApiClient
     */
    setContextHook(): Promise<import("@apollo/client/core").ApolloLink>;
    /**
     * @method errorHook - Manage error logs hook
     *
     * @return {Function} onError method
     * @memberof GraphqlApiClient
     */
    errorHook(): import("@apollo/client/core").ApolloLink;
    /**
     * @method createRetryLink - Create retry link with proper configurations
     *
     * @return {InstanceType} Apollo RetryLink class instance
     * @memberof GraphqlApiClient
     */
    createRetryLink(): RetryLink;
    /**
     * @method createHttpLink - Create http link with basic User Agent and header configurations
     *
     * @return {InstanceType} HttpLink class instance
     * @memberof GraphqlApiClient
     */
    createHttpLink(): HttpLink;
    /**
     *  @method createGraphqlApiClient - Create apollo client
     *
     * @return {InstanceType} ApolloClient class instance
     * @memberof GraphqlApiClient
     */
    createGraphqlApiClient(): Promise<ApolloClient<import("@apollo/client/core").NormalizedCacheObject>>;
}
