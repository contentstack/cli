import { Parser } from '@oclif/core';
import shortUUID from 'short-uuid';
import * as path from 'path';
import { configHandler } from '@contentstack/cli-utilities';
import { machineIdSync } from 'node-machine-id';

export default class CsdxContext {
  readonly sessionId: string;
  readonly clientId: string;
  readonly user?: object;
  readonly region?: object;
  readonly config: object;
  readonly info: any;
  readonly plugin: any;
  readonly pluginConfig: any;
  readonly messageFilePath: string;
  readonly analyticsInfo: string;
  public flagWarningPrintState: any;
  public flags: any;

  constructor(cliOpts: any, cliConfig: any) {
    const analyticsInfo = [];
    const command = cliConfig.findCommand(cliOpts.id) || {};
    // this.getCommandFlags(cliOpts, command);
    const config = configHandler;
    const platform = cliConfig.platform && cliConfig.arch ? `${cliConfig.platform}-${cliConfig.arch}` : 'none';
    analyticsInfo.push(platform);
    const nodeVersion = process.versions.node ? `v${process.versions.node}` : process.version;
    analyticsInfo.push(nodeVersion || 'none');
    analyticsInfo.push(cliConfig.version || 'none');
    this.clientId = configHandler.get('clientId');
    if (!this.clientId) {
      this.clientId = machineIdSync(true);
      configHandler.set('clientId', this.clientId);
    }
    analyticsInfo.push(this.clientId);
    const sessionId = shortUUID.generate();
    configHandler.set('sessionId', sessionId);
    this.sessionId = sessionId;
    analyticsInfo.push(this.sessionId);
    this.user = {
      authtoken: configHandler.get('authtoken'),
      email: configHandler.get('email'),
    };
    this.config = { ...config };
    this.region = configHandler.get('region');
    this.info = { command: cliOpts.id };
    if (command.pluginName) {
      this.plugin = (cliConfig.plugins || []).find((p) => p.name === command.pluginName) || {};
      this.plugin.name = command.pluginName;
      this.plugin.config = { ...((this.plugin.pjson && this.plugin.pjson.csdxConfig) || {}) };
      this.messageFilePath = path.resolve(
        this.plugin.root,
        this.plugin.config.messageFilePath || './messages/index.json',
      );

      this.info.shortCommandName = this.plugin?.config?.shortCommandName;
      analyticsInfo.push(this.plugin?.config?.shortCommandName || cliOpts.id);
    }
    this.flagWarningPrintState = {};
    this.analyticsInfo = analyticsInfo.join(';');
  }

  getToken(alias: string) {
    if (alias) {
      const token = configHandler.get(`tokens.${alias}`);
      if (token) return token;
    }
  }

  // async getCommandFlags(cliOpts, command) {
  //   while (this.argv.length > 0) {
  //     const input = this.argv.shift();
  //     if (parsingFlags && input.startsWith('-') && input !== '-') {
  //       // attempt to parse as arg
  //       if (this.input['--'] !== false && input === '--') {
  //         parsingFlags = false;
  //         continue;
  //       }
  //       if (parseFlag(input)) {
  //         continue;
  //       }
  //       // not actually a flag if it reaches here so parse as an arg
  //     }
  //     if (parsingFlags && this.currentFlag && this.currentFlag.multiple) {
  //       this.raw.push({ type: 'flag', flag: this.currentFlag.name, input });
  //       continue;
  //     }
  //     // not a flag, parse as arg
  //     const arg = this.input.args[this._argTokens.length];
  //     if (arg) arg.input = input;
  //     this.raw.push({ type: 'arg', input });
  //   }
  // }
}
