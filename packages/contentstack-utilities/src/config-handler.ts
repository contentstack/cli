import Conf from 'conf';
import has from 'lodash/has';
import { v4 as uuid } from 'uuid';
import { existsSync, unlinkSync, readFileSync } from 'fs';
import chalk from 'chalk';
import { cliux } from '.';

const ENC_KEY = process.env.ENC_KEY || 'encryptionKey';
const ENCRYPT_CONF: boolean = has(process.env, 'ENCRYPT_CONF') ? process.env.ENCRYPT_CONF === 'true' : true;
const CONFIG_NAME = process.env.CONFIG_NAME || 'contentstack_cli';
const ENC_CONFIG_NAME = process.env.ENC_CONFIG_NAME || 'contentstack_cli_obfuscate';
const OLD_CONFIG_BACKUP_FLAG = 'isOldConfigBackup';

const xdgBasedir = require('xdg-basedir');
const path = require('path');
const os = require('os');
const uniqueString = require('unique-string');
const oldConfigDirectory = xdgBasedir.config || path.join(os.tmpdir(), uniqueString());
const pathPrefix = path.join('configstore', `${CONFIG_NAME}.json`);
const oldConfigPath = path.join(oldConfigDirectory, pathPrefix);

const cwd = process.env.CS_CLI_CONFIG_PATH;

class Config {
  private config: Conf;
  private initialized: boolean = false;

  constructor() {
    // Don't initialize eagerly - wait for first access
  }

  init() {
    return ENCRYPT_CONF === true ? this.getEncryptedConfig() : this.getDecryptedConfig();
  }

  importOldConfig() {
    if (!this.get(OLD_CONFIG_BACKUP_FLAG)) {
      try {
        const oldConfigStoreData = this.getOldConfig();
        if (oldConfigStoreData) {
          this.setOldConfigStoreData(oldConfigStoreData, '');
          this.removeOldConfigStoreFile();
        }
      } catch (error) {
        console.log('No data to be imported from Old config file');
      }

      this.set(OLD_CONFIG_BACKUP_FLAG, true);
    }
  }

  // Recursive function to migrate from the old config
  setOldConfigStoreData(data, _path = '') {
    for (const key in data) {
      const value = data[key];
      const setPath = _path ? _path + '.' + key : key;

      if (typeof value == 'object') {
        this.setOldConfigStoreData(value, setPath);
      } else {
        this.set(setPath, value);
      }
    }
  }

  isConfigFileValid(configPath: string): boolean {
    try {
      const content = readFileSync(configPath, 'utf8');
      JSON.parse(content);
      return true;
    } catch (e) {
      return false;
    }
  }

  safeDeleteConfigIfInvalid(configFilePath: string) {
    if (existsSync(configFilePath) && !this.isConfigFileValid(configFilePath)) {
      console.warn(chalk.yellow(`Warning: Detected corrupted config at ${configFilePath}. Removing...`));
      unlinkSync(configFilePath);
    }
  }

  removeOldConfigStoreFile() {
    if (existsSync(oldConfigPath)) {
      unlinkSync(oldConfigPath); // NOTE remove old configstore file
    }
  }

  private getOldConfig() {
    try {
      return JSON.parse(readFileSync(oldConfigPath, 'utf8'));
    } catch (error) {
      return undefined;
    }
  }

  private fallbackInit(): Conf {
    try {
      return new Conf({ configName: CONFIG_NAME, encryptionKey: ENC_KEY });
    } catch (error) {
      // If even fallback fails, use the safe fallback
      console.warn('Fallback config initialization failed, using safe fallback');
      return this.createSafeFallbackConfig();
    }
  }

  private createSafeFallbackConfig(): Conf {
    // Create a completely safe fallback that won't fail
    const safeConfigName = `safe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const tempDir = require('os').tmpdir();
    
    try {
      return new Conf({ 
        configName: safeConfigName,
        cwd: tempDir
      });
    } catch (error) {
      // If even this fails, we have a serious problem - just return a mock config
      console.error('All config initialization methods failed, using mock config');
      return {
        get: () => undefined,
        set: () => {},
        delete: () => {},
        clear: () => {}
      } as any;
    }
  }

  private getObfuscationKey() {
    const obfuscationKeyName = 'obfuscation_key';
    const encConfig = new Conf({ configName: ENC_CONFIG_NAME, cwd });
    let obfuscationKey: any = encConfig?.get(obfuscationKeyName);

    if (!obfuscationKey) {
      encConfig.set(obfuscationKeyName, uuid());
      obfuscationKey = encConfig?.get(obfuscationKeyName);
    }

    return obfuscationKey;
  }

  private getConfigDataAndUnlinkConfigFile(config: Conf) {
    let configData;

    if (config?.path) {
      if (existsSync(config.path)) {
        try {
          configData = JSON.parse(JSON.stringify(config?.store || {})); // NOTE convert prototype object to plain object
          unlinkSync(config.path); // NOTE remove old config file
        } catch (error) {
          // If config file is corrupted, just remove it and continue
          console.warn(`Corrupted config file detected at ${config.path}, removing...`);
          unlinkSync(config.path);
          configData = {};
        }
      }
    }

    return configData;
  }

  private getEncryptedConfig(configData?: Record<string, unknown>, skip = false) {
    const getEncryptedDataElseFallBack = () => {
      try {
        // NOTE reading current code base encrypted file if exist
        const encryptionKey: any = this.getObfuscationKey();
        this.safeDeleteConfigIfInvalid(oldConfigPath);
        try {
          this.config = new Conf({ configName: CONFIG_NAME, encryptionKey, cwd });
        } catch (confError) {
          // If Conf constructor fails due to corrupted config, use fallback
          console.warn('Conf constructor failed, using fallback config');
          try {
            this.config = this.fallbackInit();
          } catch (fallbackError) {
            this.config = this.createSafeFallbackConfig();
          }
        }

        if (Object.keys(configData || {})?.length) {
          this.config.set(configData); // NOTE set config data if passed any
        }
      } catch (error) {
        // NOTE reading old code base encrypted file if exist
        try {
          const config = this.fallbackInit();
          const oldConfigData = this.getConfigDataAndUnlinkConfigFile(config);
          this.getEncryptedConfig(oldConfigData, true);
        } catch (_error) {
          // Use console instead of cliux during build time
          if (process.env.NODE_ENV === 'production' || process.env.CI) {
            console.warn('Config file is corrupted, using fallback config');
            try {
              this.config = this.fallbackInit();
            } catch (fallbackError) {
              this.config = this.createSafeFallbackConfig();
            }
          } else {
            if (typeof cliux !== 'undefined' && cliux.print) {
              cliux.print(chalk.red('Error: Config file is corrupted'));
              cliux.print(_error);
            } else {
              console.error('Error: Config file is corrupted');
              console.error(_error);
            }
            process.exit(1);
          }
        }
      }
    };

    try {
      if (skip === false) {
        this.safeDeleteConfigIfInvalid(oldConfigPath);
        const config = new Conf({ configName: CONFIG_NAME });
        const oldConfigData = this.getConfigDataAndUnlinkConfigFile(config);
        this.getEncryptedConfig(oldConfigData, true);
      } else {
        getEncryptedDataElseFallBack();
      }
    } catch (error) {
      // console.trace(error.message)
      // NOTE reading current code base encrypted file if exist
      getEncryptedDataElseFallBack();
    }

    return this.config;
  }

  private getDecryptedConfig(configData?: Record<string, unknown>) {
    try {
      this.safeDeleteConfigIfInvalid(oldConfigPath);
      try {
        this.config = new Conf({ configName: CONFIG_NAME, cwd });
        } catch (confError) {
          // If Conf constructor fails due to corrupted config, use fallback
          console.warn('Conf constructor failed, using fallback config');
          try {
            this.config = this.fallbackInit();
          } catch (fallbackError) {
            this.config = this.createSafeFallbackConfig();
          }
        }

      if (Object.keys(configData || {})?.length) {
        this.config.set(configData); // NOTE set config data if passed any
      }
    } catch (error) {
      // console.trace(error.message)

      try {
        const encryptionKey: any = this.getObfuscationKey();
        this.safeDeleteConfigIfInvalid(oldConfigPath);
        let config;
        try {
          config = new Conf({ configName: CONFIG_NAME, encryptionKey, cwd });
        } catch (confError) {
          console.warn('Conf constructor failed, using fallback config');
          try {
            config = this.fallbackInit();
          } catch (fallbackError) {
            config = this.createSafeFallbackConfig();
          }
        }
        const oldConfigData = this.getConfigDataAndUnlinkConfigFile(config);
        this.getDecryptedConfig(oldConfigData); // NOTE NOTE reinitialize the config with old data and new decrypted file
      } catch (_error) {
        // console.trace(error.message)

        try {
          const config = this.fallbackInit();
          const _configData = this.getConfigDataAndUnlinkConfigFile(config);
          this.getDecryptedConfig(_configData); // NOTE reinitialize the config with old data and new decrypted file
        } catch (__error) {
          // console.trace(error.message)
          // Use console instead of cliux during build time
          if (process.env.NODE_ENV === 'production' || process.env.CI) {
            console.warn('Config file is corrupted, using fallback config');
            try {
              this.config = this.fallbackInit();
            } catch (fallbackError) {
              this.config = this.createSafeFallbackConfig();
            }
          } else {
            if (typeof cliux !== 'undefined' && cliux.print) {
              cliux.print(chalk.red('Error: Config file is corrupted'));
              cliux.print(_error);
            } else {
              console.error('Error: Config file is corrupted');
              console.error(_error);
            }
            process.exit(1);
          }
        }
      }
    }

    return this.config;
  }

  private ensureInitialized() {
    if (!this.initialized) {
      try {
        this.init();
        this.importOldConfig();
        this.initialized = true;
      } catch (error) {
        // If initialization fails during build time, create a fallback config
        console.warn('Config initialization failed, using fallback config');
        try {
          this.config = this.fallbackInit();
        } catch (fallbackError) {
          // If fallback also fails, use the ultimate safe fallback
          console.warn('Fallback config also failed, using safe fallback');
          this.config = this.createSafeFallbackConfig();
        }
        this.initialized = true;
      }
    }
  }

  get(key): string | any {
    this.ensureInitialized();
    return this.config?.get(key);
  }

  set(key, value) {
    this.ensureInitialized();
    this.config?.set(key, value);
    return this.config;
  }

  delete(key) {
    this.ensureInitialized();
    this.config?.delete(key);
    return this.config;
  }

  clear() {
    this.ensureInitialized();
    this.config?.clear();
  }
}

let configInstance: Config | null = null;

function createConfigInstance(): Config {
  return new Config();
}

function getConfigInstance(): Config {
  if (!configInstance) {
    configInstance = createConfigInstance();
  }
  return configInstance;
}

// Sinon based lazy config object
const lazyConfig = {
  // false positive - no hardcoded secret here
  // @ts-ignore-next-line secret-detection
  get(key: string) {
    return getConfigInstance().get(key);
  },

  // false positive - no hardcoded secret here
  // @ts-ignore-next-line secret-detection
  set(key: string, value: any) {
    return getConfigInstance().set(key, value);
  },

  // false positive - no hardcoded secret here
  // @ts-ignore-next-line secret-detection
  delete(key: string) {
    return getConfigInstance().delete(key);
  },

  clear() {
    return getConfigInstance().clear();
  },
};

export default lazyConfig;
