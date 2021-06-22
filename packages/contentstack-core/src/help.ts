import { default as Help } from '@oclif/plugin-help';
import figlet from 'figlet';
import { cliux } from './utils';

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
}
