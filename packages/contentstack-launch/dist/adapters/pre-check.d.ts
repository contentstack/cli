import BaseClass from "./base-class";
import { AdapterConstructorInputs } from "../types";
export default class PreCheck extends BaseClass {
    projectBasePath: string;
    constructor(options: AdapterConstructorInputs);
    /**
     * @method run
     *
     * @param {boolean} [identifyProject=true]
     * @return {*}  {Promise<void>}
     * @memberof PreCheck
     */
    run(identifyProject?: boolean): Promise<void>;
    /**
     * @method performValidations - Validate if the current project is an existing launch project
     *
     * @return {*}  {(Promise<boolean | void>)}
     * @memberof PreCheck
     */
    performValidations(): Promise<boolean | void>;
    /**
     * @method displayPreDeploymentDetails
     *
     * @memberof GitHub
     */
    displayPreDeploymentDetails(): Promise<void>;
    /**
     * @method validateLaunchConfig
     *
     * @memberof PreCheck
     */
    validateLaunchConfig(): void;
    /**
     * @method identifyWhatProjectItIs - identify if the project type (is GitHub, BitBucket, FileUpload etc.,)
     *
     * @return {*}  {Promise<void>}
     * @memberof PreCheck
     */
    identifyWhatProjectItIs(): Promise<void>;
}
