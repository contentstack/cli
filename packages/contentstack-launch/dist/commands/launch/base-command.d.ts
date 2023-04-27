/// <reference types="node" />
import EventEmitter from "events";
import { ApolloClient } from "@apollo/client/core";
import { Command } from "@contentstack/cli-command";
import { FlagInput, Interfaces, ContentstackClient } from "@contentstack/cli-utilities";
import { Logger } from "../../util";
import { ConfigType, LogFn } from "../../types";
export type Flags<T extends typeof Command> = Interfaces.InferredFlags<typeof BaseCommand["baseFlags"] & T["flags"]>;
export type Args<T extends typeof Command> = Interfaces.InferredArgs<T["args"]>;
export declare abstract class BaseCommand<T extends typeof Command> extends Command {
    log: LogFn;
    logger: Logger;
    protected $event: EventEmitter;
    protected sharedConfig: ConfigType;
    protected apolloClient: ApolloClient<any>;
    protected managementSdk: ContentstackClient;
    protected apolloLogsClient: ApolloClient<any>;
    protected flags: Flags<T>;
    protected args: Args<T>;
    static hidden: boolean;
    static baseFlags: FlagInput;
    init(): Promise<void>;
    protected catch(err: Error & {
        exitCode?: number;
    }): Promise<any>;
    protected finally(_: Error | undefined): Promise<any>;
    /**
     * @method prepareConfig - init default Config data
     *
     * @memberof BaseCommand
     */
    prepareConfig(): Promise<void>;
    /**
     * @method getConfig - Get a config from list of existing .cs-launch.json file
     *
     * @return {*}  {Promise<void>}
     * @memberof BaseCommand
     */
    getConfig(): Promise<void>;
    /**
     * @methods prepareApiClients - Prepare Api Clients (Management SDK and apollo client)
     *
     * @return {*}  {Promise<void>}
     * @memberof BaseCommand
     */
    prepareApiClients(): Promise<void>;
    /**
     * @method initCmaSDK
     *
     * @memberof BaseCommand
     */
    initCmaSDK(): Promise<void>;
}
