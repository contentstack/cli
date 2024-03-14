import { cliux } from '@contentstack/cli-utilities';

export default async function (_opts): Promise<void> {
  const { context: { plugin: { config: { expiredCommands = {} } = {} } = {}, info: { command = null } = {} } = {} } =
    this.config;
  if (expiredCommands.hasOwnProperty(command)) {
    cliux.print(
      `WARNING!!! You're using the old (soon to be deprecated) Contentstack CLI command. We recommend you to use the latest ${expiredCommands[command]} command.`,
      { color: 'yellow' },
    );
  }
}
