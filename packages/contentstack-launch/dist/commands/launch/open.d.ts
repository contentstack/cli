import { FlagInput } from '@contentstack/cli-utilities';
import { BaseCommand } from './base-command';
export default class Open extends BaseCommand<typeof Open> {
    static hidden: boolean;
    static description: string;
    static examples: string[];
    static flags: FlagInput;
    run(): Promise<void>;
    /**
     * @method openWebsite - Open website URL on browser
     *
     * @memberof Open
     */
    openWebsite(): void;
    /**
     * @method checkAndSetProjectDetails - validate and set project details (ex. organizationUid, uid, environment, deployment)
     *
     * @return {*}  {Promise<void>}
     * @memberof Logs
     */
    prepareProjectDetails(): Promise<void>;
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
    /**
     * @method validateAndSelectEnvironment - check whether environment is validate or not. If not then option to select environment
     *
     * @return {*}  {Promise<void>}
     * @memberof Logs
     */
    validateAndSelectEnvironment(): Promise<void>;
    /**
     * @method selectEnvironment - select environment
     *
     * @return {*}  {Promise<void>}
     * @memberof Logs
     */
    selectEnvironment(): Promise<void>;
}
