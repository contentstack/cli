/// <reference types="node" />
import EventEmitter from "events";
import { ApolloClient } from "@apollo/client/core";
import { ContentstackClient } from "@contentstack/cli-utilities";
import { LogFn, ExitFn, ConfigType, AdapterConstructorInputs } from "../types";
export default class BaseClass {
    log: LogFn;
    exit: ExitFn;
    config: ConfigType;
    analyticsInfo: string;
    $event: EventEmitter;
    framework: Record<string, any>;
    apolloClient: ApolloClient<any>;
    projectCreationRetryCount: number;
    apolloLogsClient: ApolloClient<any> | undefined;
    envVariables: Array<Record<string, any>>;
    managementSdk: ContentstackClient | undefined;
    constructor(options: AdapterConstructorInputs);
    /**
     * @method initApolloClient - initialize Apollo client
     *
     * @memberof BaseClass
     */
    initApolloClient(): Promise<void>;
    /**
     * @method createNewDeployment - Create new deployment on existing launch project
     *
     * @return {*}  {Promise<void>}
     * @memberof GitHub
     */
    createNewDeployment(skipGitData?: boolean, uploadUid?: string): Promise<void>;
    /**
     * @method selectOrg - select organization
     *
     * @return {*}  {Promise<void>}
     * @memberof BaseClass
     */
    selectOrg(): Promise<void>;
    /**
     * @method selectProjectType - select project type/provider/adapter
     *
     * @return {*}  {Promise<void>}
     * @memberof BaseClass
     */
    selectProjectType(): Promise<void>;
    /**
     *  @method detectFramework - detect the project framework
     *
     * @return {*}  {Promise<void>}
     * @memberof BaseClass
     */
    detectFramework(): Promise<void>;
    /**
     *  @method getCmsEnvironmentVariables - get list of environment variables
     *
     * @return {*}  {Promise<void>}
     * @memberof BaseClass
     */
    getCmsEnvironmentVariables(): Promise<void>;
    /**
     * @method selectStack - Select stack to import variables, tokens
     *
     * @return {*}  {Promise<void>}
     * @memberof BaseClass
     */
    selectStack(): Promise<void>;
    /**
     * @method selectDeliveryToken - Select delivery token from a stack
     *
     * @return {*}  {Promise<any>}
     * @memberof BaseClass
     */
    selectDeliveryToken(): Promise<any>;
    /**
     * @method promptForEnvValues - Prompt and get manual entry of environment variables
     *
     * @return {*}  {Promise<void>}
     * @memberof BaseClass
     */
    promptForEnvValues(): Promise<void>;
    /**
     * @method prepareLaunchConfig - prepare and write launch config in to dist.
     *
     * @memberof BaseClass
     */
    prepareLaunchConfig(): void;
    /**
     * @method connectToAdapterOnUi - Open browser to connect with adapter with launch (GitHub etc.,)
     *
     * @param {boolean} [emit=true]
     * @return {*}  {Promise<void>}
     * @memberof BaseClass
     */
    connectToAdapterOnUi(emit?: boolean): Promise<void>;
    /**
     * @method queryBranches - Query all paginated branches
     *
     * @param {Record<string, any>} variables
     * @param {any[]} [branchesRes=[]]
     * @return {*}  {Promise<any[]>}
     * @memberof BaseClass
     */
    queryBranches(variables: Record<string, any>, branchesRes?: any[]): Promise<any[]>;
    /**
     * @method selectBranch - Select a branch for launch process
     *
     * @return {*}  {Promise<void>}
     * @memberof BaseClass
     */
    selectBranch(): Promise<void>;
    /**
     * @method inquireRequireValidation - Required validation for prompt
     *
     * @param {*} input
     * @return {*}  {(string | boolean)}
     * @memberof BaseClass
     */
    inquireRequireValidation(input: any): string | boolean;
    /**
     * @method handleEnvImportFlow - Manage variables flow whether to import or manual input.
     *
     * @return {*}  {Promise<void>}
     * @memberof BaseClass
     */
    handleEnvImportFlow(): Promise<void>;
    /**
     * @method importVariableFromLocalConfig - Import environment variable from local config
     *
     * @return {*}  {Promise<void>}
     * @memberof BaseClass
     */
    importVariableFromLocalConfig(): Promise<void>;
    /**
     * @method importEnvFromStack - Import environment variables from stack
     *
     * @return {*}  {Promise<void>}
     * @memberof BaseClass
     */
    importEnvFromStack(): Promise<void>;
    /**
     * @method printAllVariables - Print/Display all variables on ui
     *
     * @memberof BaseClass
     */
    printAllVariables(): void;
    /**
     * @method showLogs - show deployment logs on terminal/UI
     *
     * @return {*}  {Promise<boolean>}
     * @memberof BaseClass
     */
    showLogs(): Promise<boolean>;
    /**
     * @method handleNewProjectCreationError
     *
     * @param {*} error
     * @return {*}  {(Promise<boolean | void>)}
     * @memberof BaseClass
     */
    handleNewProjectCreationError(error: any): Promise<boolean | void>;
    /**
     * @method showDeploymentUrl - show deployment URL and open it on browser
     *
     * @param {boolean} [openOnUi=true]
     * @memberof BaseClass
     */
    showDeploymentUrl(openOnUi?: boolean): void;
    /**
     * @method showSuggestion - Show suggestion to add config file to .gitignore
     *
     * @return {*}
     * @memberof GitHub
     */
    showSuggestion(): void;
}
