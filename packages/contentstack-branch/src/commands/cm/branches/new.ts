import { Command } from '@contentstack/cli-utilities';
import { createMergeScripts } from '../../../../src/utils';

export default class createScript extends Command {
  async run(): Promise<any> {
    createMergeScripts({ uid: 'blog', status: 'created' }, `const API = 'hello'`);
  }
}
