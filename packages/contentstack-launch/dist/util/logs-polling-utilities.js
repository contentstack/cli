"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cli_utilities_1 = require("@contentstack/cli-utilities");
const graphql_1 = require("../graphql");
class LogPolling {
    constructor(params) {
        const { apolloLogsClient, apolloManageClient, config, $event } = params;
        this.apolloLogsClient = apolloLogsClient;
        this.apolloManageClient = apolloManageClient;
        this.config = config;
        if ($event)
            this.$event = $event;
    }
    /**
     * @method getDeploymentStatus - deployment status polling
     *
     * @return {*}  {ObservableQuery<any, {query: {
                      uid: string | undefined;
                     environment: string | undefined;
                     };}>}
     * @memberof LogPolling
   */
    getDeploymentStatus() {
        const statusWatchQuery = this.apolloManageClient.watchQuery({
            fetchPolicy: "network-only",
            query: graphql_1.deploymentQuery,
            variables: {
                query: {
                    uid: this.config.deployment,
                    environment: this.config.environment,
                },
            },
            pollInterval: this.config.pollingInterval,
        });
        return statusWatchQuery;
    }
    /**
     * @method deploymentLogs - subscribe deployment status and deployment logs polling
     *
     * @return {*}  {Promise<void>}
     * @memberof LogPolling
     */
    async deploymentLogs() {
        let statusWatchQuery = this.getDeploymentStatus();
        statusWatchQuery.subscribe(({ data, errors, error }) => {
            var _a;
            if (error) {
                this.$event.emit("deployment-logs", {
                    message: error === null || error === void 0 ? void 0 : error.message,
                    msgType: "error",
                });
            }
            if ((errors === null || errors === void 0 ? void 0 : errors.length) && data === null) {
                this.$event.emit("deployment-logs", {
                    message: errors,
                    msgType: "error",
                });
                statusWatchQuery.stopPolling();
            }
            this.deploymentStatus = (_a = data === null || data === void 0 ? void 0 : data.Deployment) === null || _a === void 0 ? void 0 : _a.status;
            if (this.config.deploymentStatus.includes(this.deploymentStatus)) {
                statusWatchQuery.stopPolling();
            }
        });
        const logsWatchQuery = this.apolloLogsClient.watchQuery({
            fetchPolicy: "network-only",
            query: graphql_1.deploymentLogsQuery,
            variables: {
                deploymentUid: this.config.deployment,
            },
            pollInterval: this.config.pollingInterval,
        });
        this.subscribeDeploymentLogs(logsWatchQuery);
    }
    /**
     * @method subscribeDeploymentLogs - subscribe deployment logs
     *
     * @return {*}  {void}
     * @memberof LogPolling
     */
    subscribeDeploymentLogs(logsWatchQuery) {
        let timestamp = 0;
        logsWatchQuery.subscribe(({ data, errors, error }) => {
            cli_utilities_1.ux.action.start("Loading deployment logs...");
            if (error) {
                cli_utilities_1.ux.action.stop();
                this.$event.emit("deployment-logs", {
                    message: error === null || error === void 0 ? void 0 : error.message,
                    msgType: "error",
                });
                this.$event.emit("deployment-logs", {
                    message: "DONE",
                    msgType: "debug",
                });
                logsWatchQuery.stopPolling();
            }
            if ((errors === null || errors === void 0 ? void 0 : errors.length) && data === null) {
                cli_utilities_1.ux.action.stop();
                this.$event.emit("deployment-logs", {
                    message: errors,
                    msgType: "error",
                });
                this.$event.emit("deployment-logs", {
                    message: "DONE",
                    msgType: "debug",
                });
                logsWatchQuery.stopPolling();
            }
            if (this.deploymentStatus) {
                let logsData = data === null || data === void 0 ? void 0 : data.getLogs;
                if (logsData === null || logsData === void 0 ? void 0 : logsData.length) {
                    cli_utilities_1.ux.action.stop();
                    this.$event.emit("deployment-logs", {
                        message: logsData,
                        msgType: "info",
                    });
                    timestamp =
                        new Date(logsData[logsData.length - 1].timestamp).getTime() + 1;
                    logsWatchQuery.setVariables({
                        deploymentUid: this.config.deployment,
                        timestamp: new Date(timestamp).toISOString(),
                    });
                }
                if (this.config.deploymentStatus.includes(this.deploymentStatus)) {
                    logsWatchQuery.stopPolling();
                    this.$event.emit("deployment-logs", {
                        message: "DONE",
                        msgType: "debug",
                    });
                }
            }
        });
    }
    /**
     * @method serverLogs - server logs polling
     *
     * @return {*}  {void}
     * @memberof LogPolling
     */
    async serverLogs() {
        this.startTime = new Date().getTime() - 10 * 1000;
        this.endTime = new Date().getTime();
        const serverLogsWatchQuery = this.apolloLogsClient.watchQuery({
            fetchPolicy: "network-only",
            query: graphql_1.serverlessLogsQuery,
            variables: {
                query: {
                    environmentUid: this.config.environment,
                    startTime: this.startTime,
                    endTime: this.endTime,
                },
            },
            pollInterval: this.config.pollingInterval,
        });
        this.subscribeServerLogs(serverLogsWatchQuery);
    }
    /**
     * @method subscribeServerLogs - subscribe server logs
     *
     * @return {*}  {void}
     * @memberof LogPolling
     */
    subscribeServerLogs(serverLogsWatchQuery) {
        serverLogsWatchQuery.subscribe(({ data, errors, error }) => {
            var _a;
            cli_utilities_1.ux.action.start("Loading server logs...");
            if (error) {
                cli_utilities_1.ux.action.stop();
                this.$event.emit("server-logs", { message: error === null || error === void 0 ? void 0 : error.message, msgType: "error" });
            }
            if ((errors === null || errors === void 0 ? void 0 : errors.length) && data === null) {
                cli_utilities_1.ux.action.stop();
                this.$event.emit("server-logs", { message: errors, msgType: "error" });
                serverLogsWatchQuery.stopPolling();
            }
            let logsData = (_a = data === null || data === void 0 ? void 0 : data.getServerlessLogs) === null || _a === void 0 ? void 0 : _a.logs;
            let logsLength = logsData === null || logsData === void 0 ? void 0 : logsData.length;
            if (logsLength > 0) {
                cli_utilities_1.ux.action.stop();
                this.$event.emit("server-logs", { message: logsData, msgType: "info" });
                this.startTime =
                    new Date(logsData[logsLength - 1].timestamp).getTime() + 1;
                this.endTime = this.startTime + 10 * 1000;
            }
            else if (logsLength === 0) {
                this.endTime = this.endTime + 10 * 1000;
            }
            serverLogsWatchQuery.setVariables({
                query: {
                    environmentUid: this.config.environment,
                    startTime: this.startTime,
                    endTime: this.endTime,
                },
            });
        });
    }
}
exports.default = LogPolling;
