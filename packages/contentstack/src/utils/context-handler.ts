import * as shortUUID from 'short-uuid';
import * as path from 'path';
import { configHandler, pathValidator, sanitizePath } from '@contentstack/cli-utilities';
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
      this.plugin = (cliConfig.plugins || new Map()).get(command.pluginName) || {};
      this.plugin.name = command.pluginName;
      this.plugin.config = { ...((this.plugin.pjson && this.plugin.pjson.csdxConfig) || {}) };
      this.messageFilePath = pathValidator(
        path.resolve(sanitizePath(this.plugin.root), sanitizePath(this.plugin.config.messageFilePath) || './messages/index.json'),
      );
      this.info.shortCommandName = this.plugin?.config?.shortCommandName?.[cliOpts.id];
      analyticsInfo.push(this.info.shortCommandName || cliOpts.id);
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
}
