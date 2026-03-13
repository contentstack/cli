import * as shortUUID from 'short-uuid';
import * as path from 'node:path';
import { configHandler, pathValidator, sanitizePath } from '@contentstack/cli-utilities';
import { machineIdSync } from 'node-machine-id';

interface CliOpts {
  id?: string;
}

interface CliCommand {
  pluginName?: string;
}

interface PluginRuntimeConfig {
  messageFilePath?: string;
  shortCommandName?: Record<string, string>;
}

interface CliPlugin {
  root?: string;
  pjson?: {
    csdxConfig?: PluginRuntimeConfig;
  };
  name?: string;
  config: PluginRuntimeConfig;
}

interface CliConfig {
  findCommand?: (id?: string) => CliCommand | undefined;
  platform?: string;
  arch?: string;
  version?: string;
  plugins?: Map<string, CliPlugin>;
}

export default class CsdxContext {
  readonly sessionId: string;
  readonly clientId: string;
  readonly user?: object;
  readonly region?: object;
  readonly config: Record<string, unknown>;
  readonly info: {
    command?: string;
    shortCommandName?: string;
  };
  readonly plugin: CliPlugin;
  readonly pluginConfig: PluginRuntimeConfig;
  readonly messageFilePath: string;
  readonly analyticsInfo: string;
  public flagWarningPrintState: Record<string, unknown>;
  public flags: Record<string, unknown>;
  public cliVersion: string;

  constructor(cliOpts: CliOpts, cliConfig: CliConfig) {
    const analyticsInfo = [];
    const commandId = cliOpts.id;
    const command = (commandId && cliConfig.findCommand?.(commandId)) || {};
    const config = configHandler;
    const platform = cliConfig.platform && cliConfig.arch ? `${cliConfig.platform}-${cliConfig.arch}` : 'none';
    const nodeVersion = process.versions.node ? `v${process.versions.node}` : process.version;
    analyticsInfo.push(platform, nodeVersion || 'none', cliConfig.version || 'none');
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
    this.cliVersion = cliConfig.version || 'none';
    this.region = configHandler.get('region');
    this.info = { command: commandId };
    this.plugin = { config: {} };
    this.pluginConfig = {};
    this.messageFilePath = '';
    if (command.pluginName) {
      const resolvedPlugin = (cliConfig.plugins || new Map()).get(command.pluginName);
      if (resolvedPlugin) this.plugin = { ...resolvedPlugin, config: resolvedPlugin.config || {} };
      this.plugin.name = command.pluginName;
      const pluginCsdxConfig = this.plugin.pjson?.csdxConfig;
      this.plugin.config = pluginCsdxConfig ? { ...pluginCsdxConfig } : {};
      this.pluginConfig = { ...this.plugin.config };
      this.messageFilePath = pathValidator(
        path.resolve(sanitizePath(this.plugin.root), sanitizePath(this.pluginConfig.messageFilePath) || './messages/index.json'),
      );
      this.info.shortCommandName = commandId ? this.pluginConfig.shortCommandName?.[commandId] : undefined;
      analyticsInfo.push(this.info.shortCommandName || commandId || 'none');
    }
    this.flagWarningPrintState = {};
    this.flags = {};
    this.analyticsInfo = analyticsInfo.join(';');
  }

  getToken(alias: string) {
    if (alias) {
      const token = configHandler.get(`tokens.${alias}`);
      if (token) return token;
    }
  }
}
