const messageFile = require('../messages/index.json');

class Messages {
  private readonly messages: any;

  constructor() {
    this.messages = messageFile;
  }

  parse(messageKey: string, ...substitutions: any) {
    const msg = this.messages[messageKey];
    if (!msg) {
      return;
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
