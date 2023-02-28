import { v4 as uuidv4 } from 'uuid';
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

  constructor(cliOpts: any, cliConfig: any) {
    const command = cliConfig.findCommand(cliOpts.id) || {};
    const config = configHandler;
    const analyticsInfo = [
      cliConfig.userAgent.split(' ').splice(0, 1, `v${cliConfig.version}`).join(';'),
      cliConfig.shell,
    ];
    this.clientId = configHandler.get('clientId');
    if (!this.clientId) {
      this.clientId = machineIdSync(true);
      configHandler.set('clientId', this.clientId);
    }
    analyticsInfo.push(this.clientId);

    const sessionId = uuidv4();
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

  getSystemInfo(cliConfig) {}
}
