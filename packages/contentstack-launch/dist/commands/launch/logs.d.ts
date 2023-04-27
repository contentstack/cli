import { FlagInput } from '@contentstack/cli-utilities';
import { BaseCommand } from './base-command';
import { EmitMessage } from '../../types';
export default class Logs extends BaseCommand<typeof Logs> {
    static hidden: boolean;
    static description: string;
    static examples: string[];
    static flags: FlagInput;
    run(): Promise<void>;
    /**
     * @method logPollingAndInitConfig - prepare and initialize the configurations
     *
     * @return {*}  {Promise<void>}
     * @memberof Logs
     */
    logPollingAndInitConfig(): Promise<void>;
    /**
     * @method checkAndSetProjectDetails - validate and set project details like organizationUid, uid, environment, deployment
     *
     * @return {*}  {Promise<void>}
     * @memberof Logs
     */
    checkAndSetProjectDetails(): Promise<void>;
    /**
     * @method selectEnvironment - select environment
     *
     * @return {*}  {Promise<void>}
     * @memberof Logs
     */
    selectEnvironment(): Promise<void>;
    /**
     * @method validateAndSelectEnvironment - check whether environment is validate or not. If not then option to select environment
     *
     * @return {*}  {Promise<void>}
     * @memberof Logs
     */
    validateAndSelectEnvironment(): Promise<void>;
    /**
     * @method validateDeployment - check whether deployment is validate or not.
     *
     * @return {*}  {Promise<void>}
     * @memberof Logs
     */
    validateDeployment(): Promise<void>;
    /**
     * @method showLogs - display emit messages.
     *
     * @return {*}  {void}
     * @memberof Logs
     */
    showLogs(event: EmitMessage): void;
    /**
     * @method fetchLatestDeployment - fetch latest deployment details.
     *
     * @return {*} {Promise<void>}
     * @memberof Logs
     */
    fetchLatestDeployment(): Promise<void>;
    /**
     * @method selectOrg - select organization
     *
     * @return {*}  {Promise<void>}
     * @memberof Logs
     */
    selectOrg(): Promise<void>;
    /**
     * @method selectProject - select projects
     *
     * @return {*}  {Promise<void>}
     * @memberof Logs
     */
    selectProject(): Promise<void>;
}
