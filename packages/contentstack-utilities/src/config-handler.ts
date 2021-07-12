import * as ConfigStore from 'configstore';
const CONFIG_NAMESPACE = 'contentstack_cli';

class Config {
  private configHandler: typeof ConfigStore;
  private config: object;

  constructor() {
    this.configHandler = new ConfigStore(CONFIG_NAMESPACE);
    this.config = null;
  }

  init() {
    this.config = this.configHandler.all;
    return this.config;
  }

  get(key) {
    if (!this.config) {
      this.init();
    }

    return this.config[key];
  }

  async set(key, value) {
    if (this.config) {
      this.init();
    }
    this.config[key] = value;
    this.configHandler.set(key, value);
    return this.config;
  }

  delete(key) {
    if (!this.config) {
      this.init();
    }
    delete this.config[key];
    this.configHandler.delete(key);
    return this.config;
  }

  clear() {
    this.config = {};
    this.configHandler.all = {};
  }
}

export default new Config();
