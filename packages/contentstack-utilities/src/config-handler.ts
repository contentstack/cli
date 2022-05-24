import Conf from 'conf';
import { randomUUID } from 'crypto';

const CONFIG_NAME = 'contentstack_cli';
const ENC_CONFIG_NAME = 'contentstack_cli_obfuscate';
class Config {
  private config: Conf;

  constructor() {
    // this.init()
  }

  init() {
    const obfuscationKeyName = 'obfuscation_key'
    const encConfig = new Conf({ configName: ENC_CONFIG_NAME })
    let obfuscation_key: any = encConfig.get(obfuscationKeyName)
    if (!obfuscation_key) encConfig.set(obfuscationKeyName, randomUUID())

    obfuscation_key = encConfig.get(obfuscationKeyName)
    this.config = new Conf({ configName: CONFIG_NAME, encryptionKey: obfuscation_key });
    return this.config;
  }

  get(key) {
    return this.config.get(key);
  }

  async set(key, value) {
    this.config.set(key, value);
    return this.config;
  }

  delete(key) {
    this.config.delete(key);
    return this.config;
  }

  clear() {
    this.config.clear()
  }
}

export default new Config();
