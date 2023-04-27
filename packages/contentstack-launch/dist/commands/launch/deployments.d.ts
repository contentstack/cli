import { FlagInput } from '@contentstack/cli-utilities';
import { BaseCommand } from './base-command';
export default class Deployments extends BaseCommand<typeof Deployments> {
    static hidden: boolean;
    static description: string;
    static examples: string[];
    static flags: FlagInput;
    run(): Promise<void>;
    /**
     * @method showDeployments
     *
     * @memberof Deployments
     */
    showDeployments(): Promise<void>;
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
    getEnvironments(): Promise<any>;
}
