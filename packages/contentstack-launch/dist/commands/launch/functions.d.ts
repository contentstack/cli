import { FlagInput } from "@contentstack/cli-utilities";
import { BaseCommand } from "./base-command";
export default class Functions extends BaseCommand<typeof Functions> {
    static hidden: boolean;
    static description: string;
    static examples: string[];
    static flags: FlagInput;
    run(): Promise<void>;
}
