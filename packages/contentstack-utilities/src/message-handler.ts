import fs from 'fs';
import CLIError from './cli-error';

const STORE_KEY = '__cs_messages__';

/**
 * Message handler
 */
class Messages {
  init(context) {
    if (!context.messageFilePath) {
      return;
    }
    try {
      const loaded = JSON.parse(fs.readFileSync(context.messageFilePath, 'utf-8'));
      (globalThis as any)[STORE_KEY] = { ...(globalThis as any)[STORE_KEY], ...loaded };
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw new CLIError(`Error: ${error.message}`);
      }
    }
  }

  parse(messageKey: string, ...substitutions: Array<any>): string {
    const store = (globalThis as any)[STORE_KEY] || {};
    const msg = store[messageKey];
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
