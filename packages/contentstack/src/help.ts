import * as figlet from 'figlet';
import { cliux, Help } from '@contentstack/cli-utilities';
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

  formatCommands(commands): string {
    if (commands.length === 0) return '';

    const body = this.renderList(
      commands
        // if aliases do not contain the current command's id it is the main command
        .filter(c => !c.aliases.some(a => a === c.id))
        .map(c => {
          if (this.config.topicSeparator !== ':') c.id = c.id.replace(/:/g, this.config.topicSeparator);
          // Add aliases at the end of summary
          const summary = c.aliases.length > 0 ? `${this.summary(c)} (ALIASES: ${c.aliases.join(', ')})` : this.summary(c);
          return [c.id, summary];
        }),
      {
        spacer: '\n',
        stripAnsi: this.opts.stripAnsi,
        indentation: 2
      }
    );

    return this.section('COMMANDS', body);
  }
}
