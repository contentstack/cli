import Conf from 'conf';

const CONFIG_NAME = 'contentstack_cli';
const ENC_KEY = 'encryptionKey';
class Config {
  private config: Conf;

  constructor() {
    this.config = new Conf({ configName: CONFIG_NAME, encryptionKey: ENC_KEY });
  }

  init() {
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
