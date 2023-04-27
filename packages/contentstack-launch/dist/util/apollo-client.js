"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const cross_fetch_1 = tslib_1.__importDefault(require("cross-fetch"));
const merge_1 = tslib_1.__importDefault(require("lodash/merge"));
const entries_1 = tslib_1.__importDefault(require("lodash/entries"));
const isArray_1 = tslib_1.__importDefault(require("lodash/isArray"));
const includes_1 = tslib_1.__importDefault(require("lodash/includes"));
const isObject_1 = tslib_1.__importDefault(require("lodash/isObject"));
const error_1 = require("@apollo/client/link/error");
const retry_1 = require("@apollo/client/link/retry");
const context_1 = require("@apollo/client/link/context");
const core_1 = require("@apollo/client/core");
const cli_utilities_1 = require("@contentstack/cli-utilities");
const config_1 = tslib_1.__importDefault(require("../config"));
class GraphqlApiClient {
    constructor(params) {
        this.skipErrorCods = [401, 408, 429];
        this.params = params;
        this.cmaHost = params.cmaHost;
        this.authType = cli_utilities_1.configHandler.get("authorisationType");
        this.client = this.createGraphqlApiClient();
    }
    /**
     *
     * @readonly - apollo client instance
     * @type {Promise<ApolloClient<any>>}
     * @memberof GraphqlApiClient
     */
    get apolloClient() {
        return this.client;
    }
    /**
     * @method refreshToken - Refresh the token if the type is OAuth.
     *
     * @param {Operation} operation
     * @return {Promise<boolean>}  {Promise<boolean>}
     * @memberof GraphqlApiClient
     */
    refreshToken(operation) {
        return new Promise((resolve) => {
            if (this.authType === "BASIC") {
                // NOTE Handle basic auth 401 here
                resolve(false);
                cli_utilities_1.cliux.print("Session timed out, please login to proceed", {
                    color: "yellow",
                });
                process.exit();
            }
            else if (this.authType === "OAUTH") {
                cli_utilities_1.authHandler.host = this.cmaHost;
                // NOTE Handle OAuth refresh token
                cli_utilities_1.authHandler
                    .compareOAuthExpiry(true)
                    .then(() => {
                    const oldHeaders = operation.getContext().headers;
                    operation.setContext({
                        headers: {
                            ...oldHeaders,
                            authorization: `Bearer ${cli_utilities_1.configHandler.get('oauthAccessToken')}`,
                        },
                    });
                    resolve(true);
                })
                    .catch((error) => {
                    console.log(error);
                    resolve(false);
                });
            }
            else {
                resolve(false);
                cli_utilities_1.cliux.print("You do not have the permissions to perform this action, please login to proceed", { color: "yellow" });
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
        var _a;
        const authHeaders = {};
        switch (this.authType) {
            case "BASIC":
                authHeaders.authtoken =
                    ((_a = this.params.headers) === null || _a === void 0 ? void 0 : _a.authtoken) || cli_utilities_1.configHandler.get("authtoken");
                break;
            case "OAUTH":
                await cli_utilities_1.authHandler.compareOAuthExpiry();
                authHeaders.authorization = `Bearer ${cli_utilities_1.configHandler.get("oauthAccessToken")}`;
                break;
            default:
                if (cli_utilities_1.configHandler.get("authtoken")) {
                    authHeaders.authtoken = cli_utilities_1.configHandler.get("authtoken");
                }
                else {
                    cli_utilities_1.cliux.print("Session timed out, please login to proceed", {
                        color: "yellow",
                    });
                    process.exit(1);
                }
                break;
        }
        return (0, context_1.setContext)((_, { headers }) => {
            // NOTE return the headers to the context so httpLink can read them
            return {
                headers: (0, merge_1.default)(authHeaders, headers),
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
        return (0, error_1.onError)(({ graphQLErrors, networkError }) => {
            var _a, _b;
            if (!(0, includes_1.default)(this.skipErrorCods, ((_a = graphQLErrors === null || graphQLErrors === void 0 ? void 0 : graphQLErrors.response) === null || _a === void 0 ? void 0 : _a.status) ||
                ((_b = networkError === null || networkError === void 0 ? void 0 : networkError.response) === null || _b === void 0 ? void 0 : _b.status))) {
                if (!(0, isArray_1.default)(graphQLErrors) && (0, isObject_1.default)(graphQLErrors)) {
                    for (let [location, errors] of (0, entries_1.default)(graphQLErrors)) {
                        for (const error of errors) {
                            cli_utilities_1.cliux.print(`${location} ${error}`, { color: "red" });
                        }
                    }
                } // else if (isArray(graphQLErrors) && graphQLErrors.length) ux.print(JSON.stringify(graphQLErrors));
                if (networkError) {
                    cli_utilities_1.cliux.print(`\n[Network error]: ${networkError}\n`, { color: "red" });
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
        return new retry_1.RetryLink({
            delay: {
                initial: 300,
                max: Infinity,
                jitter: true, // NOTE Whether delays between attempts should be randomized.
            },
            attempts: {
                max: config_1.default.maxRetryCount || 3,
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
        return new core_1.HttpLink({
            fetch: cross_fetch_1.default,
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
        return new core_1.ApolloClient({
            cache: new core_1.InMemoryCache(),
            link: (0, core_1.from)([
                await this.setContextHook(),
                this.errorHook(),
                this.createRetryLink(),
                this.createHttpLink(),
            ]),
        });
    }
}
exports.default = GraphqlApiClient;
