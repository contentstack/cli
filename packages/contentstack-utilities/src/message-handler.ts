import fs from 'fs';
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
      return;
    }
    try {
      this.messages = JSON.parse(fs.readFileSync(context.messageFilePath, 'utf-8'));
    } catch (error) {
      // create empty messages object if message file is not exist
      if (error.code === 'ENOENT') {
        this.messages = {};
      } else {
        throw new CLIError(error.message);
      }
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
