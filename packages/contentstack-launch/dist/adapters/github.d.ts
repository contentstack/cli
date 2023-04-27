import BaseClass from "./base-class";
import { AdapterConstructorInputs } from "../types";
export default class GitHub extends BaseClass {
    constructor(options: AdapterConstructorInputs);
    /**
     * @method run - initialization function
     *
     * @return {*}  {Promise<void>}
     * @memberof GitHub
     */
    run(): Promise<void>;
    /**
     * @method createNewProject - Create new launch project
     *
     * @return {*}  {Promise<void>}
     * @memberof GitHub
     */
    createNewProject(): Promise<void>;
    /**
     * @method prepareForNewProjectCreation - Preparing all the data for new project creation
     *
     * @return {*}  {Promise<void>}
     * @memberof BaseClass
     */
    prepareForNewProjectCreation(): Promise<void>;
    /**
     * @method checkGitHubConnected - GitHub connection validation
     *
     * @return {*}  {(Promise<{
     *     userUid: string;
     *     provider: string;
     *   } | void>)}
     * @memberof GitHub
     */
    checkGitHubConnected(): Promise<{
        userUid: string;
        provider: string;
    } | void>;
    /**
     * @method checkGitRemoteAvailableAndValid - GitHub repository verification
     *
     * @return {*}  {(Promise<boolean | void>)}
     * @memberof GitHub
     */
    checkGitRemoteAvailableAndValid(): Promise<boolean | void>;
    /**
     * @method checkUserGitHubAccess - GitHub user access validation
     *
     * @return {*}  {Promise<boolean>}
     * @memberof GitHub
     */
    checkUserGitHubAccess(): Promise<boolean>;
}
