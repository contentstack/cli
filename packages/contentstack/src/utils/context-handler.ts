import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import { configHandler } from '@contentstack/cli-utilities';

export default class CsdxContext {
  readonly id: string;
  readonly user?: object;
  readonly region?: object;
  readonly config: object;
  readonly info: object;
  readonly plugin: any;
  readonly pluginConfig: any;
  readonly messageFilePath: string;
  public flagWarningPrintState: any;

  constructor(cliOpts: any, cliConfig: any) {
    const command = cliConfig.findCommand(cliOpts.id) || {};
    const config = configHandler
    let sessionId = configHandler.get('sessionId');
    if (!sessionId) {
      sessionId = uuidv4();
      configHandler.set('sessionId', sessionId);
    }

    this.id = sessionId;
    this.user = {
      authtoken: configHandler.get('authtoken'),
      email: configHandler.get('email'),
    };
    this.config = { ...config } // configHandler.init();
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
    }
    this.flagWarningPrintState = {}
  }

  getToken(alias: string) {
    if (alias) {
      const token = configHandler.get(`tokens.${alias}`);
      if (token) return token;
    }
  }
}
