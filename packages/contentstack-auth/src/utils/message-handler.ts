import * as fs from 'fs';
import * as path from 'path';

/**
 * Message handler
 */
class Messages {
  private readonly messages: any;

  constructor() {
    this.messages = JSON.parse(fs.readFileSync(path.join(__dirname, '../messages/index.json'), 'utf-8'));
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
