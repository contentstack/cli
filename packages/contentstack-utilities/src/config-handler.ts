import Conf from 'conf';
import { v4 as uuidv4 } from 'uuid';

const CONFIG_NAME = 'contentstack_cli';
const ENC_CONFIG_NAME = 'contentstack_cli_obfuscate';
class Config {
  private config: Conf;

  constructor() {
    this.init();
  }

  init() {
    const obfuscationKeyName = 'obfuscation_key';
    const encConfig = new Conf({ configName: ENC_CONFIG_NAME });
    let obfuscation_key: any = encConfig.get(obfuscationKeyName);
    if (!obfuscation_key) {
      let obfuscationKey = uuidv4();
      encConfig.set(obfuscationKeyName, obfuscationKey);
      obfuscation_key = encConfig.get(obfuscationKeyName);
    }
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
    this.config.clear();
  }
}

export default new Config();
