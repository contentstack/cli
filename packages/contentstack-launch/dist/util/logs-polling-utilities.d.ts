import { ObservableQuery } from "@apollo/client/core";
import { LogPollingInput } from "../types";
export default class LogPolling {
    private config;
    private $event;
    private apolloLogsClient;
    private apolloManageClient;
    deploymentStatus: string;
    startTime: number;
    endTime: number;
    constructor(params: LogPollingInput);
    /**
     * @method getDeploymentStatus - deployment status polling
     *
     * @return {*}  {ObservableQuery<any, {query: {
                      uid: string | undefined;
                     environment: string | undefined;
                     };}>}
     * @memberof LogPolling
   */
    getDeploymentStatus(): ObservableQuery<any, {
        query: {
            uid: string | undefined;
            environment: string | undefined;
        };
    }>;
    /**
     * @method deploymentLogs - subscribe deployment status and deployment logs polling
     *
     * @return {*}  {Promise<void>}
     * @memberof LogPolling
     */
    deploymentLogs(): Promise<void>;
    /**
     * @method subscribeDeploymentLogs - subscribe deployment logs
     *
     * @return {*}  {void}
     * @memberof LogPolling
     */
    subscribeDeploymentLogs(logsWatchQuery: ObservableQuery<any, {
        deploymentUid: string | undefined;
    }>): void;
    /**
     * @method serverLogs - server logs polling
     *
     * @return {*}  {void}
     * @memberof LogPolling
     */
    serverLogs(): Promise<void>;
    /**
     * @method subscribeServerLogs - subscribe server logs
     *
     * @return {*}  {void}
     * @memberof LogPolling
     */
    subscribeServerLogs(serverLogsWatchQuery: ObservableQuery<any, {
        query: {
            environmentUid: string | undefined;
            startTime: number;
            endTime: number;
        };
    }>): void;
}
