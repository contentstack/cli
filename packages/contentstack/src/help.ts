import { default as Help } from '@oclif/plugin-help';
import figlet from 'figlet';
import { cliux } from '@contentstack/cli-utilities';
import { CLIConfig } from './interfaces';

export default class MyHelpClass extends Help {
  constructor(config, opts) {
    super(config, opts);
  }

  showRootHelp(): void {
    // Shows Contentstack graphics
    cliux.print(
      figlet.textSync('Contentstack', {
        horizontalLayout: 'default',
        verticalLayout: 'default',
      }),
    );
  }

  showCommandHelp(command, topics): void {
    if (command.id === 'cm:bulk-publish') {
      const { context: { plugin: { commands = [] } = {} } = {} } = this.config as CLIConfig;
      topics = commands.map((c) => {
        return { ...c, name: c.id };
      });
      const title = command.description && this.render(command.description).split('\n')[0];
      if (title) console.log(title + '\n');
      console.log(this.command(command));
      console.log('');
      if (topics.length > 0) {
        console.log(this.topics(topics));
        console.log('');
      }

      return;
    }

    super.showCommandHelp(command, topics);
  }
}
