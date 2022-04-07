import { cliux } from '@contentstack/cli-utilities';

export default async function (opts): Promise<void> {
  const { context: { plugin: { config: { expiredCommands = {} } = {} } = {}, info: { command = null } = {} } = {} } =
    this.config;
  if (expiredCommands.hasOwnProperty(command)) {
    cliux.print(`DEPRECATION WARNING: ${expiredCommands[command]}`, { color: 'yellow' });
  }
}
