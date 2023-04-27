import { FlagInput } from '@contentstack/cli-utilities';
import { BaseCommand } from './base-command';
import { PreCheck } from '../../adapters';
export default class Launch extends BaseCommand<typeof Launch> {
    preCheck: PreCheck;
    static hidden: boolean;
    static description: string;
    static examples: string[];
    static flags: FlagInput;
    run(): Promise<void>;
    /**
     * @method manageFlowBasedOnProvider - Manage launch flow based on provider (GitHb, FileUpload etc.,)
     *
     * @return {*}  {Promise<void>}
     * @memberof Launch
     */
    manageFlowBasedOnProvider(): Promise<void>;
    /**
     * @method preCheckAndInitConfig - prepare and initialize the configurations
     *
     * @return {*}  {Promise<void>}
     * @memberof Launch
     */
    preCheckAndInitConfig(): Promise<void>;
}
