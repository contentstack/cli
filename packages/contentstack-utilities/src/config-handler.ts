import Conf from 'conf';
import { v4 as uuid } from 'uuid';
import { existsSync, unlinkSync } from 'fs'

const ENC_KEY = process.env.ENC_KEY || 'encryptionKey';
const ENCRYPT_CONF: boolean = process.env.ENCRYPT_CONF === 'true' || false;
const CONFIG_NAME = process.env.CONFIG_NAME || 'contentstack_cli';
const ENC_CONFIG_NAME = process.env.ENC_CONFIG_NAME || 'contentstack_cli_obfuscate';

class Config {
  private config: Conf;

  constructor() {
    this.init()
  }

  init() {
    return ENCRYPT_CONF === true
      ? this.getEncryptedConfig()
      : this.getDecryptedConfig()
  }

  private fallbackInit(): Conf {
    return new Conf({ configName: CONFIG_NAME, encryptionKey: ENC_KEY })
  }

  private getObfuscationKey() {
    const obfuscationKeyName = 'obfuscation_key'
    const encConfig = new Conf({ configName: ENC_CONFIG_NAME })
    let obfuscationKey: any = encConfig.get(obfuscationKeyName)

    if (!obfuscationKey) {
      encConfig.set(obfuscationKeyName, uuid())
      obfuscationKey = encConfig.get(obfuscationKeyName)
    }

    return obfuscationKey
  }

  private getConfigDataAndUnlinkConfigFile(config: Conf) {
    let configData

    if (config?.path) {
      if (existsSync(config.path)) {
        configData = JSON.parse(JSON.stringify(config?.store || {})) // NOTE convert prototype object to plain object
        unlinkSync(config.path) // NOTE remove old config file
      }
    }

    return configData
  }

  private getEncryptedConfig(configData?: Record<string, unknown>, skip = false) {
    const getEncryptedDataElseFallBack = () => {
      try {
        // NOTE reading current code base encrypted file if exist
        const encryptionKey: any = this.getObfuscationKey()
        this.config = new Conf({ configName: CONFIG_NAME, encryptionKey })

        if (Object.keys(configData || {})?.length) {
          this.config.set(configData) // NOTE set config data if passed any
        }
      } catch (error) {
        // NOTE reading old code base encrypted file if exist
        try {
          const config = this.fallbackInit()
          const configData = this.getConfigDataAndUnlinkConfigFile(config)
          this.getEncryptedConfig(configData, true)
        } catch (error) {
          // console.trace(error.message)
        }
      }
    }

    try {
      if (skip === false) {
        const config = new Conf({ configName: CONFIG_NAME })
        const configData = this.getConfigDataAndUnlinkConfigFile(config)
        this.getEncryptedConfig(configData, true)
      } else {
        getEncryptedDataElseFallBack()
      }
    } catch (error) {
      // console.trace(error.message)
      // NOTE reading current code base encrypted file if exist
      getEncryptedDataElseFallBack()
    }

    return this.config
  }

  private getDecryptedConfig(configData?: Record<string, unknown>) {
    try {
      this.config = new Conf({ configName: CONFIG_NAME })

      if (Object.keys(configData || {})?.length) {
        this.config.set(configData) // NOTE set config data if passed any
      }
    } catch (error) {
      // console.trace(error.message)

      try {
        const encryptionKey: any = this.getObfuscationKey()
        let config = new Conf({ configName: CONFIG_NAME, encryptionKey })
        const configData = this.getConfigDataAndUnlinkConfigFile(config)
        this.getDecryptedConfig(configData) // NOTE NOTE reinitialize the config with old data and new decrypted file
      } catch (error) {
        // console.trace(error.message)

        try {
          const config = this.fallbackInit()
          const configData = this.getConfigDataAndUnlinkConfigFile(config)
          this.getDecryptedConfig(configData) // NOTE reinitialize the config with old data and new decrypted file
        } catch (error) {
          // console.trace(error.message)
        }
      }
    }

    return this.config
  }

  get(key): string | any {
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
