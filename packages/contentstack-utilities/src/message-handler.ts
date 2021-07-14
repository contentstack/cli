import * as fs from 'fs';
import CLIError from './cli-error';

/**
 * Message handler
 */
class Messages {
  private messages: object;
  messageFilePath: any;

  constructor() {
    this.messages = {};
  }

  init(context) {
    if (!context.messageFilePath) {
      throw new CLIError({ message: 'Invalid message file path' });
    }
    try {
      this.messages = JSON.parse(fs.readFileSync(context.messageFilePath, 'utf-8'));
    } catch (error) {
      // create empty messages if not exist
      if (error.code === 'ENOENT') {
        this.messages = {};
      }
      throw new CLIError({ message: `${error.message}` });
    }
  }

  parse(messageKey: string, ...substitutions: Array<any>): string {
    const msg = this.messages[messageKey];
    if (!msg) {
      return messageKey;
    }
    if (substitutions.length > 0) {
      const callSite = msg.split('%s');
      callSite.push('');
      return String.raw({ raw: callSite } as TemplateStringsArray, ...substitutions);
    }
    return msg;
  }
}

export default new Messages();
