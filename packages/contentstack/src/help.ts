import { Help } from '@oclif/core';
import * as figlet from 'figlet';
import { cliux } from '@contentstack/cli-utilities';

export default class MyHelpClass extends Help {
  constructor(config, opts) {
    super(config, opts);
  }

  showRootHelp(): any {
    // Shows Contentstack graphics
    cliux.print(
      figlet.textSync('Contentstack', {
        horizontalLayout: 'default',
        verticalLayout: 'default',
      }),
    );
    super.showRootHelp();
  }

  showCommandHelp(command): any {
    if (command.id === 'cm:bulk-publish') {
      let { context: { plugin: { commands = [] } = {} } = {} } = this.config as any;
      commands = commands.map((c) => {
        return { ...c, name: c.id };
      });
      const title = command.description && this.render(command.description).split('\n')[0];
      if (title) console.log(title + '\n');
      console.log(this.formatCommand(command));
      console.log('');
      if (commands.length > 0) {
        console.log(this.formatCommands(commands));
        console.log('');
      }
      return;
    }

    super.showCommandHelp(command);
  }
}
